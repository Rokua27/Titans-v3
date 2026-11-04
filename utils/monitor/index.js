const fs = require("fs");
const path = require("path");
const { GRUPO_MONITOR } = require("./configuracion");
const { obtenerEstado, actualizarEstado } = require("./estado");

let sockMonitor = null;

function iniciarMonitor() {
    actualizarEstado({
        iniciado: true,
        ultimoCambio: new Date().toISOString()
    });

    console.log("🛡️ TitansB Monitor iniciado");
    console.log(`📡 Grupo Monitor: ${GRUPO_MONITOR}`);

    return true;
}

function setSocket(sock) {
    sockMonitor = sock || null;

    console.log(
        sockMonitor
            ? "🔗 Monitor conectado al socket de WhatsApp"
            : "🔌 Monitor desconectado del socket de WhatsApp"
    );

    if (sockMonitor) {
        const estado = cargarConectividad();
        const alertaPendiente =
            estado.alertaDesconexionPendiente;

        /*
         * Reconciliación de estado:
         * una alerta 2-min solo puede existir mientras exista
         * la desconexión pendiente correspondiente.
         *
         * Si no existe desconexión pendiente, la alerta quedó
         * huérfana por una recuperación/reinicio anterior.
         * Se elimina únicamente del estado persistido y nunca
         * del historial de eventos.
         */
        if (
            alertaPendiente &&
            !estado.desconexionPendiente
        ) {
            delete estado.alertaDesconexionPendiente;
            guardarConectividad(estado);

            console.log(
                "🧹 MONITOR | Alerta 2 min huérfana limpiada al recuperar socket."
            );
        }

        const alertaPendienteActualizada =
            cargarConectividad().alertaDesconexionPendiente;

        if (
            alertaPendienteActualizada &&
            alertaPendienteActualizada.enviada !== true
        ) {
            if (enviandoAlertasPendientes) {
                console.log(
                    "⏳ MONITOR | Ya hay una entrega de alerta pendiente en curso."
                );
                return !!sockMonitor;
            }

            enviandoAlertasPendientes = true;

            console.log(
                "📬 MONITOR | Alerta 2 min pendiente detectada al recuperar socket."
            );

            Promise.resolve()
                .then(() =>
                    enviarAlertaDesconexionProlongada()
                )
                .then(resultado => {
                    if (resultado?.enviado === true) {
                        console.log(
                            "🟢 MONITOR | Alerta 2 min pendiente entregada automáticamente."
                        );
                    } else if (
                        resultado?.motivo !== "YA_ENVIADA"
                    ) {
                        console.log(
                            `⚠️ MONITOR | No se pudo entregar alerta pendiente: ${resultado?.motivo || "DESCONOCIDO"}`
                        );
                    }
                })
                .catch(error => {
                    console.error(
                        "❌ MONITOR | Error entregando alerta pendiente:",
                        error.message
                    );
                })
                .finally(() => {
                    enviandoAlertasPendientes = false;
                });
        }
    }

    return !!sockMonitor;
}

async function enviarAlerta(tipo, datos = {}, eventoExistente = null) {
    const evento = eventoExistente || registrarEvento(tipo, datos);

    if (!sockMonitor) {
        console.log("⚠️ MONITOR | No hay socket disponible para enviar alerta.");
        return {
            enviado: false,
            motivo: "SOCKET_NO_DISPONIBLE",
            evento
        };
    }

    try {
        const detalles = Object.entries(datos)
            .map(([clave, valor]) => `• ${clave}: ${valor}`)
            .join("\n");

        const texto =
`🛡️ ═════ TITANSB MONITOR ═════

🚨 EVENTO: ${tipo}

${detalles || "• Sin detalles adicionales"}

🕒 ${evento.fecha}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 TitansB • Sistema de Monitoreo`;

        await sockMonitor.sendMessage(GRUPO_MONITOR, {
            text: texto
        });

        console.log(
            `📡 MONITOR | Alerta enviada | grupo=${GRUPO_MONITOR} | tipo=${tipo}`
        );

        return {
            enviado: true,
            evento
        };

    } catch (error) {
        actualizarEstado({
            ultimoError: error.message,
            ultimoCambio: new Date().toISOString()
        });

        console.error(
            "❌ MONITOR | Error enviando alerta:",
            error.message
        );

        return {
            enviado: false,
            motivo: "ERROR_ENVIO",
            error: error.message,
            evento
        };
    }
}

const ARCHIVO_EVENTOS = path.join(
    process.cwd(),
    "database",
    "monitor_eventos.json"
);

const MAX_EVENTOS = 500;

// ============================================================
// M03.2 — MOTOR DE CONECTIVIDAD
// ============================================================

const ARCHIVO_CONECTIVIDAD = path.join(
    process.cwd(),
    "database",
    "monitor_conectividad.json"
);

const TIEMPO_ALERTA_DESCONEXION = 2 * 60 * 1000;
const INTERVALO_REPORTE_CONECTIVIDAD = 15 * 60 * 1000;

let desconexionPendiente = null;
let temporizadorDesconexion = null;
let temporizadorReporte = null;
let enviandoAlertasPendientes = false;

function cargarConectividad() {
    try {
        if (!fs.existsSync(ARCHIVO_CONECTIVIDAD)) {
            return {
                desconexionPendiente: null,
                recuperacionesPendientes: [],
                ultimoReporte: null
            };
        }

        const contenido = fs.readFileSync(
            ARCHIVO_CONECTIVIDAD,
            "utf8"
        ).trim();

        if (!contenido) {
            return {
                desconexionPendiente: null,
                recuperacionesPendientes: [],
                ultimoReporte: null
            };
        }

        const datos = JSON.parse(contenido);

        return {
            desconexionPendiente:
                datos?.desconexionPendiente || null,

            recuperacionesPendientes:
                Array.isArray(datos?.recuperacionesPendientes)
                    ? datos.recuperacionesPendientes
                    : [],

            ultimoReporte:
                datos?.ultimoReporte || null,

            alertaDesconexionPendiente:
                datos?.alertaDesconexionPendiente || null
        };
    } catch (error) {
        console.error(
            "⚠️ MONITOR | Error cargando conectividad:",
            error.message
        );

        return {
            desconexionPendiente: null,
            recuperacionesPendientes: [],
            ultimoReporte: null,
            alertaDesconexionPendiente: null
        };
    }
}

function guardarConectividad(datos) {
    try {
        fs.writeFileSync(
            ARCHIVO_CONECTIVIDAD,
            JSON.stringify(datos, null, 2) + "\n",
            "utf8"
        );

        return true;
    } catch (error) {
        console.error(
            "⚠️ MONITOR | Error guardando conectividad:",
            error.message
        );

        return false;
    }
}

function obtenerEstadoConectividad() {
    return cargarConectividad();
}

function formatearDuracion(ms) {
    const milisegundos = Math.max(
        0,
        Number(ms) || 0
    );

    const segundos = Math.floor(
        milisegundos / 1000
    );

    const minutos = Math.floor(
        segundos / 60
    );

    const segundosRestantes = segundos % 60;

    if (minutos > 0) {
        return `${minutos} min ${segundosRestantes} s`;
    }

    return `${segundosRestantes} s`;
}

async function enviarAlertaDesconexionProlongada() {
    const estado = cargarConectividad();

    const pendiente =
        desconexionPendiente ||
        estado.desconexionPendiente;

    if (!pendiente) {
        return {
            enviado: false,
            motivo: "SIN_DESCONEXION"
        };
    }

    if (
        estado.alertaDesconexionPendiente?.eventId ===
            pendiente.eventId
    ) {
        if (
            estado.alertaDesconexionPendiente.enviada === true
        ) {
            return {
                enviado: false,
                motivo: "YA_ENVIADA"
            };
        }

        if (
            estado.alertaDesconexionPendiente.enviando === true
        ) {
            console.log(
                "⏳ MONITOR | Alerta 2 min ya tiene una entrega en curso."
            );

            return {
                enviado: false,
                motivo: "ENTREGA_EN_CURSO",
                duplicada: true
            };
        }

        if (!sockMonitor) {
            console.log(
                "⏭️ MONITOR | Alerta 2 min ya está en cola; se evita duplicar."
            );

            return {
                enviado: false,
                motivo: "SOCKET_NO_DISPONIBLE",
                duplicada: true
            };
        }
    }

    const alerta = {
        eventId: pendiente.eventId,
        tipo: "WHATSAPP_DESCONECTADO_2MIN",
        fecha: new Date().toISOString(),
        estado: "DESCONECTADO",
        componente: "BAILEYS",
        codigo:
            pendiente.codigo ?? "DESCONOCIDO",
        descripcion:
            "TitansB continúa desconectado después de 2 minutos",
        duracion:
            formatearDuracion(
                Date.now() - pendiente.timestampMs
            ),
        enviada: false
    };

    estado.alertaDesconexionPendiente = alerta;

    /*
     * Reserva de entrega:
     * se persiste ANTES de sendMessage() para impedir
     * que otra ejecución concurrente envíe la misma alerta.
     */
    estado.alertaDesconexionPendiente.enviando = true;
    estado.alertaDesconexionPendiente.reservaEn =
        new Date().toISOString();

    guardarConectividad(estado);

    if (!sockMonitor) {
        const estadoSinSocket = cargarConectividad();

        if (
            estadoSinSocket.alertaDesconexionPendiente?.eventId ===
                pendiente.eventId
        ) {
            delete estadoSinSocket.alertaDesconexionPendiente.enviando;
            delete estadoSinSocket.alertaDesconexionPendiente.reservaEn;
            guardarConectividad(estadoSinSocket);
        }
        console.log(
            "⚠️ MONITOR | Alerta 2 min guardada en cola: no hay socket disponible."
        );

        return {
            enviado: false,
            motivo: "SOCKET_NO_DISPONIBLE"
        };
    }

    try {
        const evento = {
            eventId: alerta.eventId,
            fecha: alerta.fecha,
            tipo: alerta.tipo,
            categoria: "CONECTIVIDAD",
            nivel: "CRITICAL",
            componente: alerta.componente,
            estado: alerta.estado,
            codigo: alerta.codigo,
            descripcion: alerta.descripcion
        };

        const eventoCentral = {
            eventId: alerta.eventId,
            fecha: alerta.fecha,
            tipo: alerta.tipo,
            categoria: "CONECTIVIDAD",
            nivel: "CRITICAL",
            componente: alerta.componente,
            estado: alerta.estado,
            codigo: alerta.codigo,
            descripcion: alerta.descripcion,
            esIncidente: true,
            requiereAlerta: true,
            datos: {
                duracion: alerta.duracion
            }
        };

        registrarEventoIncidenteExistente(eventoCentral);

        const detalles = [
            `• estado: ${alerta.estado}`,
            `• componente: ${alerta.componente}`,
            `• codigo: ${alerta.codigo}`,
            `• descripcion: ${alerta.descripcion}`,
            `• duracion: ${alerta.duracion}`
        ].join("\n");

        const texto =
            `🛡️ ═════ TITANSB MONITOR ═════\n\n` +
            `🚨 EVENTO: WHATSAPP_DESCONECTADO_2MIN\n\n` +
            `${detalles}\n\n` +
            `🕒 ${evento.fecha}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🤖 TitansB • Sistema de Monitoreo`;

        await sockMonitor.sendMessage(
            GRUPO_MONITOR,
            { text: texto }
        );

        const actualizado =
            cargarConectividad();

        if (
            actualizado.alertaDesconexionPendiente?.eventId ===
                pendiente.eventId
        ) {
            actualizado.alertaDesconexionPendiente.enviada = true;
            actualizado.alertaDesconexionPendiente.enviadaEn =
                new Date().toISOString();

            delete actualizado.alertaDesconexionPendiente.enviando;
            delete actualizado.alertaDesconexionPendiente.reservaEn;

            guardarConectividad(actualizado);
        }

        console.log(
            "📡 MONITOR | Alerta 2 min enviada correctamente."
        );

        return {
            enviado: true
        };

    } catch (error) {
        console.error(
            "❌ MONITOR | Error enviando alerta 2 min:",
            error.message
        );

        return {
            enviado: false,
            motivo: "ERROR_ENVIO",
            error: error.message
        };
    }
}

function programarAlertaDesconexion() {
    if (temporizadorDesconexion) {
        clearTimeout(temporizadorDesconexion);
    }

    if (!desconexionPendiente) {
        return;
    }

    const transcurrido =
        Date.now() - desconexionPendiente.timestampMs;

    const restante =
        Math.max(
            0,
            TIEMPO_ALERTA_DESCONEXION - transcurrido
        );

    temporizadorDesconexion = setTimeout(() => {
        temporizadorDesconexion = null;

        if (!desconexionPendiente) {
            return;
        }

        const estadoActual = cargarConectividad();

        if (
            !estadoActual.desconexionPendiente ||
            estadoActual.desconexionPendiente.eventId !==
                desconexionPendiente.eventId
        ) {
            return;
        }

        enviarAlertaDesconexionProlongada();
    }, restante);
}

function registrarDesconexion(codigo = null, datos = {}) {
    const ahora = new Date();
    const estado = cargarConectividad();

    if (desconexionPendiente) {
        console.log(
            "⏭️ MONITOR | Desconexión ya pendiente; se evita duplicar."
        );

        return desconexionPendiente;
    }

    const evento = registrarEvento(
        "WHATSAPP_DESCONECTADO",
        {
            estado: "DESCONECTADO",
            componente: "BAILEYS",
            codigo,
            ...datos
        }
    );

    desconexionPendiente = {
        eventId: evento.eventId,
        fecha: ahora.toISOString(),
        timestampMs: ahora.getTime(),
        codigo
    };

    estado.desconexionPendiente =
        desconexionPendiente;

    guardarConectividad(estado);

    actualizarEstado({
        whatsapp: "DESCONECTADO",
        ultimoCambio: ahora.toISOString()
    });

    console.log(
        "🔴 MONITOR | Desconexión registrada. Ventana de alerta: 2 minutos."
    );

    programarAlertaDesconexion();

    iniciarReporteConectividad();

    return desconexionPendiente;
}

function registrarRecuperacion(codigoDesconexion = null) {
    const ahora = new Date();
    const estado = cargarConectividad();

    const pendiente =
        desconexionPendiente ||
        estado.desconexionPendiente;

    actualizarEstado({
        whatsapp: "CONECTADO",
        ultimoCambio: ahora.toISOString()
    });

    if (!pendiente) {
        console.log(
            "🟢 MONITOR | Conexión recuperada sin desconexión pendiente."
        );
        return null;
    }

    if (temporizadorDesconexion) {
        clearTimeout(temporizadorDesconexion);
        temporizadorDesconexion = null;
    }

    const duracionMs =
        ahora.getTime() - pendiente.timestampMs;

    const recuperacion = {
        eventId: pendiente.eventId,
        desconectadoDesde: pendiente.fecha,
        recuperadoEn: ahora.toISOString(),
        duracionMs,
        duracion: formatearDuracion(duracionMs),
        codigo:
            codigoDesconexion ??
            pendiente.codigo ??
            null,
        superoDosMinutos:
            duracionMs >= TIEMPO_ALERTA_DESCONEXION
    };

    estado.recuperacionesPendientes.push(
        recuperacion
    );

    if (
        estado.recuperacionesPendientes.length > 100
    ) {
        estado.recuperacionesPendientes =
            estado.recuperacionesPendientes.slice(-100);
    }

    estado.desconexionPendiente = null;

    /*
     * Limpieza condicional de la alerta 2-min:
     * solo se elimina la alerta si pertenece a la misma desconexión
     * que acaba de recuperarse.
     *
     * El evento histórico permanece en monitor_eventos.json.
     */
    if (
        estado.alertaDesconexionPendiente?.eventId ===
        pendiente.eventId
    ) {
        delete estado.alertaDesconexionPendiente;
        console.log(
            "🧹 MONITOR | Alerta 2 min pendiente limpiada tras recuperación."
        );
    }

    guardarConectividad(estado);

    desconexionPendiente = null;

    console.log(
        `🟢 MONITOR | Reconexión registrada | duración=${recuperacion.duracion}`
    );

    iniciarReporteConectividad();

    return recuperacion;
}

function generarReporteConectividad() {
    const estado = cargarConectividad();
    const recuperaciones =
        estado.recuperacionesPendientes || [];

    if (!recuperaciones.length) {
        return null;
    }

    const total = recuperaciones.length;

    const duraciones =
        recuperaciones.map(
            item => Number(item.duracionMs) || 0
        );

    const promedio =
        duraciones.reduce(
            (a, b) => a + b,
            0
        ) / total;

    const minima = Math.min(...duraciones);
    const maxima = Math.max(...duraciones);

    const mayoresDosMinutos =
        recuperaciones.filter(
            item => item.superoDosMinutos
        ).length;

    const codigos = [
        ...new Set(
            recuperaciones
                .map(item => item.codigo)
                .filter(
                    codigo =>
                        codigo !== null &&
                        codigo !== undefined
                )
                .map(String)
        )
    ];

    const detalle = recuperaciones
        .map(
            (item, indice) =>
                `${indice + 1}. ${item.desconectadoDesde} → ${item.recuperadoEn}\n` +
                `   ⏱️ Duración: ${item.duracion}\n` +
                `   🔢 Código: ${item.codigo ?? "DESCONOCIDO"}`
        )
        .join("\n\n");

    return [
        `🛡️ ═════ TITANSB MONITOR ═════`,
        ``,
        `📊 REPORTE DE CONECTIVIDAD`,
        ``,
        `🔄 Reconexiones: ${total}`,
        `⚠️ Superaron 2 min: ${mayoresDosMinutos}`,
        `⏱️ Promedio: ${formatearDuracion(promedio)}`,
        `⬇️ Mínima: ${formatearDuracion(minima)}`,
        `⬆️ Máxima: ${formatearDuracion(maxima)}`,
        `🔢 Códigos: ${codigos.length ? codigos.join(", ") : "N/D"}`,
        ``,
        `📋 DETALLE`,
        detalle,
        ``,
        `📡 Estado actual: ${
            obtenerEstado().whatsapp || "DESCONOCIDO"
        }`,
        ``,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `🤖 TitansB • Sistema de Monitoreo`
    ].join("\n");
}

async function enviarReporteConectividad() {
    const estado = cargarConectividad();

    if (
        !Array.isArray(
            estado.recuperacionesPendientes
        ) ||
        !estado.recuperacionesPendientes.length
    ) {
        return {
            enviado: false,
            motivo: "SIN_ACTIVIDAD"
        };
    }

    const recuperacionesReportadas =
        estado.recuperacionesPendientes.map(
            item => item.eventId
        );

    const texto =
        generarReporteConectividad();

    if (!texto) {
        return {
            enviado: false,
            motivo: "SIN_REPORTE"
        };
    }

    if (!sockMonitor) {
        console.log(
            "⚠️ MONITOR | Reporte pendiente: no hay socket disponible."
        );

        return {
            enviado: false,
            motivo: "SOCKET_NO_DISPONIBLE"
        };
    }

    try {
        await sockMonitor.sendMessage(
            GRUPO_MONITOR,
            { text: texto }
        );

        const actualizado =
            cargarConectividad();

        actualizado.recuperacionesPendientes =
            actualizado.recuperacionesPendientes.filter(
                item =>
                    !recuperacionesReportadas.includes(
                        item.eventId
                    )
            );

        actualizado.ultimoReporte =
            new Date().toISOString();

        guardarConectividad(actualizado);

        console.log(
            `📊 MONITOR | Reporte de conectividad enviado | reconexiones=${estado.recuperacionesPendientes.length}`
        );

        return {
            enviado: true
        };
    } catch (error) {
        console.error(
            "❌ MONITOR | Error enviando reporte:",
            error.message
        );

        return {
            enviado: false,
            motivo: "ERROR_ENVIO",
            error: error.message
        };
    }
}

function iniciarReporteConectividad() {
    if (temporizadorReporte) {
        return;
    }

    temporizadorReporte = setTimeout(
        async () => {
            temporizadorReporte = null;

            const resultado =
                await enviarReporteConectividad();

            if (
                !resultado.enviado &&
                resultado.motivo ===
                    "SOCKET_NO_DISPONIBLE"
            ) {
                iniciarReporteConectividad();
            }
        },
        INTERVALO_REPORTE_CONECTIVIDAD
    );
}

function sincronizarConectividadAlIniciar() {
    const estado = cargarConectividad();

    if (estado.desconexionPendiente) {
        desconexionPendiente =
            estado.desconexionPendiente;

        programarAlertaDesconexion();
        iniciarReporteConectividad();

        console.log(
            "🔄 MONITOR | Desconexión pendiente recuperada desde almacenamiento."
        );
    }

    if (
        Array.isArray(
            estado.recuperacionesPendientes
        ) &&
        estado.recuperacionesPendientes.length
    ) {
        iniciarReporteConectividad();
    }
}

sincronizarConectividadAlIniciar();



function obtenerClasificacionEvento(tipo) {
    const clasificaciones = {
        ERROR_SISTEMA: { categoria: "SISTEMA", nivel: "ERROR", esIncidente: false, requiereAlerta: false },
    ERROR_COMANDO: { categoria: "COMANDOS", nivel: "ERROR", esIncidente: false, requiereAlerta: false },
        COMANDO_EJECUTADO: {
            categoria: "COMANDOS",
            nivel: "INFO",
            esIncidente: false,
            requiereAlerta: false
        },
        RESPUESTA_TITANSB: {
            categoria: "TITANSB",
            nivel: "INFO",
            esIncidente: false,
            requiereAlerta: false
        },
        WHATSAPP_CONECTADO: {
            categoria: "CONECTIVIDAD",
            nivel: "INFO",
            esIncidente: false,
            requiereAlerta: false
        },

        WHATSAPP_DESCONECTADO: {
            categoria: "CONECTIVIDAD",
            nivel: "WARNING",
            esIncidente: false,
            requiereAlerta: false
        },

        WHATSAPP_DESCONECTADO_2MIN: {
            categoria: "CONECTIVIDAD",
            nivel: "CRITICAL",
            esIncidente: true,
            requiereAlerta: true
        },

        CONFLICTO_WHATSAPP_440: {
            categoria: "SESION",
            nivel: "CRITICAL",
            esIncidente: true,
            requiereAlerta: true
        },

        SESION_WHATSAPP_CERRADA: {
            categoria: "SESION",
            nivel: "CRITICAL",
            esIncidente: true,
            requiereAlerta: true
        }
    };

    return clasificaciones[tipo] || {
        categoria: "GENERAL",
        nivel: "INFO",
        esIncidente: false,
        requiereAlerta: false
    };
}

function generarEventId() {
    return "MON-" +
        Date.now().toString(36).toUpperCase() +
        "-" +
        Math.random().toString(36).slice(2, 8).toUpperCase();
}

function persistirEventoMonitor(evento) {
    try {
        let historial = [];

        if (fs.existsSync(ARCHIVO_EVENTOS)) {
            const contenido = fs.readFileSync(
                ARCHIVO_EVENTOS,
                "utf8"
            ).trim();

            if (contenido) {
                const datos = JSON.parse(contenido);

                if (Array.isArray(datos)) {
                    historial = datos;
                }
            }
        }

        historial.push(evento);

        if (historial.length > MAX_EVENTOS) {
            historial = historial.slice(-MAX_EVENTOS);
        }

        fs.writeFileSync(
            ARCHIVO_EVENTOS,
            JSON.stringify(historial, null, 2) + "\n",
            "utf8"
        );

        return true;
    } catch (error) {
        console.error(
            "⚠️ MONITOR | Error persistiendo evento:",
            error.message
        );

        return false;
    }
}

function registrarEventoIncidenteExistente(evento) {
    try {
        let historial = [];

        if (fs.existsSync(ARCHIVO_EVENTOS)) {
            const contenido = fs.readFileSync(
                ARCHIVO_EVENTOS,
                "utf8"
            ).trim();

            if (contenido) {
                const datos = JSON.parse(contenido);

                if (Array.isArray(datos)) {
                    historial = datos;
                }
            }
        }

        if (historial.some(item => item?.eventId === evento.eventId)) {
            return false;
        }

        historial.push(evento);

        if (historial.length > MAX_EVENTOS) {
            historial = historial.slice(-MAX_EVENTOS);
        }

        fs.writeFileSync(
            ARCHIVO_EVENTOS,
            JSON.stringify(historial, null, 2) + "\n",
            "utf8"
        );

        return true;
    } catch (error) {
        console.error(
            "⚠️ MONITOR | Error persistiendo incidente existente:",
            error.message
        );
        return false;
    }
}

function registrarEvento(tipo, datos = {}) {
    const clasificacion = obtenerClasificacionEvento(tipo);
    const fecha = new Date().toISOString();

    const {
        estado = null,
        componente = null,
        codigo = null,
        descripcion = null,
        ...datosExtra
    } = datos || {};

    const evento = {
        eventId: generarEventId(),
        fecha,
        tipo,
        categoria: clasificacion.categoria,
        nivel: clasificacion.nivel,
        componente,
        estado,
        codigo,
        descripcion,
        esIncidente: clasificacion.esIncidente,
        requiereAlerta: clasificacion.requiereAlerta,
        datos: datosExtra
    };

    console.log(`🛡️ MONITOR | ${tipo}`, evento);

    persistirEventoMonitor(evento);

    const estadoActual = obtenerEstado();

    actualizarEstado({
        ultimoCambio: evento.fecha,
        ...(evento.esIncidente
            ? { incidentes: estadoActual.incidentes + 1 }
            : {})
    });

    return evento;
}

module.exports = {
    iniciarMonitor,
    setSocket,
    enviarAlerta,
    registrarEvento,
    registrarEventoIncidenteExistente,
    obtenerEstado,
    registrarDesconexion,
    registrarRecuperacion,
    enviarAlertaDesconexionProlongada,
    generarReporteConectividad,
    enviarReporteConectividad,
    iniciarReporteConectividad,
    obtenerEstadoConectividad,
    GRUPO_MONITOR
};
