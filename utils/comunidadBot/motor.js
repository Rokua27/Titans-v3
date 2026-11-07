const fs = require("fs");
const path = require("path");
const { obtenerRespuesta } = require("./respuestas");
const {
    generarRespuesta,
    generarComunicado
} = require("../titansb/motor");
const chistes = require("./chistes");
const { obtenerNombre } = require("../usuarios");
const { leerJSON, guardarJSON } = require("../database");
const { esAdmin } = require("../admin");
const {
    resolverMiembroPorNombre,
    validarMiembroEnGrupo
} = require("../asistenteTorneos/menciones");

const { interpretarTorneo } = require("../asistenteTorneos/interprete");
const { planificarTorneo } = require("../asistenteTorneos/planificador");
const { validarPlanTorneo } = require("../asistenteTorneos/validador");
const { generarConfirmacion } = require("../asistenteTorneos/confirmacion");
const { ejecutarPlanTorneo } = require("../asistenteTorneos/ejecutor");
const {
    guardarConfirmacion,
    obtenerConfirmacion,
    eliminarConfirmacion
} = require("../asistenteTorneos/estado");

const {
    obtenerEstadoTorneo,
    obtenerEquiposInscritos,
    obtenerTablaPosiciones,
    obtenerFixtureActual,
    obtenerResultadosRegistrados,
    obtenerJornadas
} = require("../asistenteTorneos/consultas");

const {
    responderEstadoTorneo,
    responderEquipos,
    responderTabla,
    responderFixture,
    responderResultados,
    responderJornada,
    responderProgramacion
} = require("../asistenteTorneos/respuestasTorneo");

const {
    obtenerDestino,
    obtenerDestinos,
    obtenerOrigen
} = require("../asistenteTorneos/comunicacion");

const {
    prepararOrdenRemota
} = require("../asistenteTorneos/puenteRemoto");

const {
    ejecutarComandoRemoto
} = require("../asistenteTorneos/adaptadorRemoto");

const {
    prepararContextoRemotoConDestino
} = require("../asistenteTorneos/ejecutorRemoto");

const {
    guardarOrdenRemota,
    eliminarOrdenRemota
} = require("../asistenteTorneos/estadoRemoto");

const {
    seleccionarGrupoRemoto
} = require("../asistenteTorneos/seleccionRemota");

const {
    revalidarGrupoRemoto
} = require("../asistenteTorneos/revalidacionRemota");

const {
    enviarConfirmacionRemota
} = require("../asistenteTorneos/confirmacionRemota");
const {
    generarAnuncioTorneo,
    generarAnuncioOficial
} = require("../asistenteTorneos/anuncios");

// 🏆 Grupo principal de Liga Titans Team
const GRUPO_PRINCIPAL = "120363179556270758@g.us";

// 🔄 Ciclo de chistes por grupo
// Cada grupo recibe los 120 chistes sin repetir
// hasta completar el ciclo.
const ciclosChistes = new Map();

// ============================================================
// 🤖 TITANSB — MODO SOCIAL LIGERO
// ============================================================

// Registro de intervenciones por grupo y día
const intervenciones = new Map();
// ============================================================
// 💾 ESTADO PERSISTENTE DE MENSAJES SOCIALES
// ============================================================

const ARCHIVO_ESTADO_SOCIAL = "social_estado.json";
const RUTA_ESTADO_SOCIAL = path.join(
    __dirname,
    "..",
    "..",
    "database",
    ARCHIVO_ESTADO_SOCIAL
);

function cargarEstadoSocial() {
    let contenido;

    try {
        contenido = fs.readFileSync(RUTA_ESTADO_SOCIAL, "utf8");
    } catch (error) {
        if (error.code === "ENOENT") {
            return {};
        }

        throw new Error(
            `No se pudo leer ${ARCHIVO_ESTADO_SOCIAL}: ${error.message}`
        );
    }

    let estado;

    try {
        estado = JSON.parse(contenido);
    } catch (error) {
        throw new Error(
            `${ARCHIVO_ESTADO_SOCIAL} contiene JSON inválido: ${error.message}`
        );
    }

    if (
        !estado ||
        typeof estado !== "object" ||
        Array.isArray(estado)
    ) {
        throw new Error(
            `${ARCHIVO_ESTADO_SOCIAL} no contiene un objeto válido; se bloquean los envíos sociales.`
        );
    }

    for (const [clave, registro] of Object.entries(estado)) {
        if (
            !registro ||
            typeof registro !== "object" ||
            Array.isArray(registro)
        ) {
            throw new Error(
                `Registro social inválido (${clave}); se bloquean los envíos sociales.`
            );
        }
    }

    return estado;
}

function guardarEstadoSocial(estado) {
    if (
        !estado ||
        typeof estado !== "object" ||
        Array.isArray(estado)
    ) {
        throw new Error("Se rechazó guardar un estado social inválido.");
    }

    const temporal = `${RUTA_ESTADO_SOCIAL}.${process.pid}.${Date.now()}.tmp`;

    try {
        fs.writeFileSync(
            temporal,
            JSON.stringify(estado, null, 2),
            { encoding: "utf8", flag: "wx" }
        );

        fs.renameSync(temporal, RUTA_ESTADO_SOCIAL);
    } catch (error) {
        try {
            if (fs.existsSync(temporal)) {
                fs.unlinkSync(temporal);
            }
        } catch (errorLimpieza) {
            console.error(
                "❌ No se pudo limpiar el temporal del historial social:",
                errorLimpieza.message
            );
        }

        throw new Error(
            `No se pudo guardar de forma segura ${ARCHIVO_ESTADO_SOCIAL}: ${error.message}`
        );
    }
}

function claveEstadoSocial(fecha, grupo, tipo) {
    return `${fecha}:${grupo}:${tipo}`;
}

function obtenerRegistroSocial(fecha, grupo, tipo) {
    const estado = cargarEstadoSocial();
    const clave = claveEstadoSocial(fecha, grupo, tipo);

    return {
        estado,
        clave,
        registro: estado[clave] || null
    };
}

function saludoYaEnviado(fecha, grupo, tipo) {
    const { registro } = obtenerRegistroSocial(fecha, grupo, tipo);

    // Compatibilidad con el historial anterior, que guardaba enviado: true.
    return registro?.enviado === true ||
        ["enviando", "enviado", "incierto"].includes(registro?.estado);
}

function reservarSaludo(fecha, grupo, tipo, hora) {
    const { estado, clave, registro } = obtenerRegistroSocial(
        fecha,
        grupo,
        tipo
    );

    if (
        registro?.enviado === true ||
        ["enviando", "enviado", "incierto"].includes(registro?.estado)
    ) {
        return false;
    }

    estado[clave] = {
        ...(registro || {}),
        fecha,
        grupo,
        tipo,
        hora,
        estado: "enviando",
        iniciadoEn: new Date().toISOString(),
        enviado: false
    };

    // Si esta reserva no puede persistirse, no se intenta enviar.
    guardarEstadoSocial(estado);
    return true;
}

function actualizarEstadoSaludo(fecha, grupo, tipo, nuevoEstado) {
    const { estado, clave, registro } = obtenerRegistroSocial(
        fecha,
        grupo,
        tipo
    );

    estado[clave] = {
        ...(registro || {}),
        fecha,
        grupo,
        tipo,
        estado: nuevoEstado,
        actualizadoEn: new Date().toISOString(),
        enviado: nuevoEstado === "enviado"
    };

    guardarEstadoSocial(estado);
}


// Última respuesta cuando alguien se ríe
const ultimaRisa = new Map();

const COOLDOWN_RISA = 30 * 60 * 1000; // 30 minutos

// ============================================================
// 🛡️ ESTADO DEL MODO SOCIAL
// ============================================================

// Mantiene una sola tarea programada y siempre usa el socket vigente.
let intervaloSocial = null;
let socketSocialActual = null;
let revisionSocialEnCurso = false;
let revisionSocialPendiente = false;

// Evita inicializar el sistema social más de una vez.
let socialIniciado = false;

// ============================================================
// 🧠 NORMALIZACIÓN
// ============================================================

function normalizarTexto(texto) {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[¿?¡!.,;:()[\]{}"']/g, " ")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

// ============================================================
// 😂 DETECTAR RISAS
// ============================================================

function esRisa(texto) {
    const t = normalizarTexto(texto);

    return (
        t.includes("jajaja") ||
        t.includes("jajajaj") ||
        t.includes("jaj") ||
        t.includes("jejeje") ||
        t.includes("jejej") ||
        t.includes("xd") ||
        t.includes("xddd") ||
        t.includes("😂") ||
        t.includes("🤣") ||
        t.includes("me rio") ||
        t.includes("me río")
    );
}

// ============================================================
// 📅 FECHA COLOMBIA
// ============================================================

function obtenerFechaBogota() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Bogota",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date());
}

// ============================================================
// ⏰ HORA COLOMBIA
// ============================================================

function obtenerHoraBogota() {
    const partes = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Bogota",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).formatToParts(new Date());

    const hora = Number(
        partes.find(p => p.type === "hour").value
    );

    const minuto = Number(
        partes.find(p => p.type === "minute").value
    );

    return hora * 60 + minuto;
}

// ============================================================
// 🎲 HORA ALEATORIA POR FRANJA
// ============================================================

function horaAleatoria(minHora, maxHora) {
    const inicio = minHora * 60;
    const fin = maxHora * 60 + 59;

    return Math.floor(
        Math.random() * (fin - inicio + 1)
    ) + inicio;
}

function prepararHorario(fecha, grupo, tipo) {
    const clave = `${fecha}:${grupo}:${tipo}`;

    if (!intervenciones.has(clave)) {
        const { estado, clave: claveEstado, registro } = obtenerRegistroSocial(
            fecha,
            grupo,
            tipo
        );

        let hora = registro?.hora;

        if (!Number.isInteger(hora) || hora < 0 || hora > 1439) {
            if (tipo === "mañana") {
                hora = horaAleatoria(8, 11);
            } else if (tipo === "tarde") {
                hora = horaAleatoria(14, 18);
            } else if (tipo === "noche") {
                hora = horaAleatoria(20, 23);
            } else {
                throw new Error(`Franja social desconocida: ${tipo}`);
            }

            estado[claveEstado] = {
                ...(registro || {}),
                fecha,
                grupo,
                tipo,
                hora,
                estado: registro?.estado || "programado",
                enviado: registro?.enviado === true
            };

            guardarEstadoSocial(estado);
        }

        intervenciones.set(clave, {
            hora,
            enviado: registro?.enviado === true ||
                ["enviando", "enviado", "incierto"].includes(registro?.estado)
        });
    }

    return intervenciones.get(clave);
}

// ============================================================
// 😂 ELEGIR CHISTE
// ============================================================

function mezclarIndices(total) {
    const indices = Array.from(
        { length: total },
        (_, i) => i
    );

    // Fisher-Yates
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(
            Math.random() * (i + 1)
        );

        [indices[i], indices[j]] =
            [indices[j], indices[i]];
    }

    return indices;
}

function obtenerChiste(grupo) {

    if (!Array.isArray(chistes) || chistes.length === 0) {
        return "😂 Hoy el banco de chistes se quedó sin munición.";
    }

    let ciclo = ciclosChistes.get(grupo);

    // Crear un nuevo ciclo cuando no existe
    // o cuando se agotaron todos los chistes.
    if (!ciclo || ciclo.indices.length === 0) {

        ciclo = {
            indices: mezclarIndices(chistes.length),
            utilizados: 0
        };

        ciclosChistes.set(grupo, ciclo);

        console.log(
            `🔄 TitansB | nuevo ciclo de chistes | grupo=${grupo} | total=${chistes.length}`
        );
    }

    const indice = ciclo.indices.pop();

    ciclo.utilizados++;

    console.log(
        `😂 TitansB | chiste ${ciclo.utilizados}/${chistes.length} | grupo=${grupo}`
    );

    return chistes[indice];
}

// ============================================================
// 📤 ENVIAR MENSAJE
// ============================================================

async function enviarMensaje(sock, grupo, tipo) {
    try {
        await sock.sendMessage(grupo, {
            text: obtenerRespuesta(tipo)
        });

        console.log(
            `🤖 TitansB | mensaje social | grupo=${grupo} | tipo=${tipo}`
        );

        return true;

    } catch (error) {
        console.error(
            `❌ Error enviando mensaje social a ${grupo}:`,
            error.message
        );

        return false;
    }
}

// ============================================================
// ☀️🌤️🌙 MENSAJES PROGRAMADOS
// ============================================================

async function revisarMensajesSociales(sock) {

    if (
        !sock ||
        !sock.user ||
        !sock.ev ||
        sock !== socketSocialActual
    ) {
        return;
    }

    // Una sola revisión puede consultar y procesar saludos a la vez.
    if (revisionSocialEnCurso) {
        revisionSocialPendiente = true;
        return;
    }

    revisionSocialEnCurso = true;

    try {
        let grupos;

        try {
            grupos = await sock.groupFetchAllParticipating();

            if (sock !== socketSocialActual) {
                return;
            }
        } catch (error) {
            const mensaje = String(error?.message || error || "");

            if (
                !mensaje.includes("Connection Closed") &&
                !mensaje.includes("Connection closed")
            ) {
                console.error(
                    "❌ No se pudieron obtener los grupos:",
                    mensaje
                );
            }

            return;
        }

        const fecha = obtenerFechaBogota();
        const hora = obtenerHoraBogota();

        const gruposProgramados = Object.keys(grupos || {})
            .filter(id => id === GRUPO_PRINCIPAL);

        for (const id of gruposProgramados) {
            if (sock !== socketSocialActual) {
                return;
            }

            const franjas = [
                { tipo: "mañana" },
                { tipo: "tarde" },
                { tipo: "noche" }
            ];

            for (const franja of franjas) {
                if (sock !== socketSocialActual) {
                    return;
                }

                const programacion = prepararHorario(
                    fecha,
                    id,
                    franja.tipo
                );

                const persistenteBloqueado = saludoYaEnviado(
                    fecha,
                    id,
                    franja.tipo
                );

                if (
                    !programacion.enviado &&
                    !persistenteBloqueado &&
                    hora >= programacion.hora
                ) {
                    if (sock !== socketSocialActual) {
                        return;
                    }

                    // Reservar y persistir ANTES de llamar a WhatsApp.
                    // Si falla el guardado, el envío no se realiza.
                    const reservado = reservarSaludo(
                        fecha,
                        id,
                        franja.tipo,
                        programacion.hora
                    );

                    if (!reservado) {
                        programacion.enviado = true;
                        continue;
                    }

                    // La reserva queda bloqueada incluso si el proceso
                    // cae durante sendMessage: no habrá reintento ciego.
                    programacion.enviado = true;

                    const enviado = await enviarMensaje(
                        sock,
                        id,
                        franja.tipo
                    );

                    try {
                        actualizarEstadoSaludo(
                            fecha,
                            id,
                            franja.tipo,
                            enviado ? "enviado" : "incierto"
                        );
                    } catch (error) {
                        // El estado persistido seguirá como "enviando";
                        // también se bloquea cualquier reintento automático.
                        console.error(
                            "❌ No se pudo confirmar el estado del saludo social:",
                            error.message
                        );
                    }
                }
            }
        }
    } catch (error) {
        console.error(
            "❌ Revisión social detenida por protección del historial:",
            error.message
        );
    } finally {
        revisionSocialEnCurso = false;

        if (revisionSocialPendiente) {
            revisionSocialPendiente = false;
            const socket = socketSocialActual;

            if (socket) {
                setImmediate(() => revisarMensajesSociales(socket));
            }
        }
    }
}

// ============================================================
// 🧠 DETECTOR DE INTENCIÓN SOCIAL — FASE 2
// ============================================================

function detectarIntencionSocial(texto = "") {

    const original = String(texto || "").trim();

    if (!original) {
        return {
            intencion: "ninguna",
            responder: false,
            motivo: "mensaje_vacio"
        };
    }

    const normalizado = normalizarTexto(original);

    // ========================================================
    // 🚫 COMANDOS
    // ========================================================

    if (original.startsWith("!")) {
        return {
            intencion: "comando",
            responder: false,
            motivo: "comando"
        };
    }

    // ========================================================
    // 😂 RISAS
    // ========================================================

    if (esRisa(original)) {
        return {
            intencion: "risa",
            responder: true,
            motivo: "risa_detectada"
        };
    }

    // ========================================================
    // 🤖 MENCIÓN / LLAMADA DIRECTA A TITANSB
    // ========================================================

    const indicadoresDirectos = [
        "titansb",
        "titans b",
        "bot",
        "oye bot",
        "hey bot",
        "hola bot"
    ];

    if (
        indicadoresDirectos.some(
            indicador => normalizado.includes(indicador)
        )
    ) {
        return {
            intencion: "directo",
            responder: true,
            motivo: "llamada_directa"
        };
    }

    // ========================================================
    // 📢 C-10.9 — COMUNICACIÓN EXPLÍCITA
    // ========================================================
    // Detecta órdenes de comunicación como:
    // "Titans comunica al grupo principal que..."
    // "Titans informa a capitanes que..."
    //
    // ⚠️ "titans" por sí solo NO activa esta detección.
    // La orden debe contener un verbo de comunicación y
    // un destino reconocido.
    // ========================================================

    const comunicacionExplicita =
        /\b(?:comunica|comunicar|informa|informar|envia|enviar|manda|mandar|publica|publicar|anuncia|anunciar)\s+(?:(?:(?:un|este)\s+)?mensaje\s+)?(?:al|a|en|para)\s+(?:el\s+)?(?:(?:grupo\s+(?:de\s+)?(?:principal|capitanes|pruebas|justicia))|(?:principal|capitanes|pruebas|comite|comité|justicia)|(?:direccion\s+de\s+justicia(?:\s+competitiva)?)|(?:todos\s+los\s+grupos)|(?:todos\s+grupos))\b/i.test(
            normalizado
        );

    if (comunicacionExplicita) {
        return {
            intencion: "directo",
            responder: true,
            motivo: "comunicacion_explicita"
        };
    }

    // ========================================================
    // 🏆 LIGA TITANS
    // ========================================================

    const indicadoresLiga = [
        "liga titans",
        "titans team",
        "torneo",
        "competencia",
        "campeonato",
        "fixture",
          "programacion",
        "jornada",
        "partido",
        "partidos",
        "tabla",
        "clasificacion",
        "clasificación",
        "equipo",
        "equipos",
        "inscripcion",
        "inscripción",
        "inscrito",
        "inscritos",
        "reglamento",
        "premio",
        "octavos",
        "cuartos",
        "semifinal",
        "final"
    ];

    if (
        indicadoresLiga.some(
            indicador => normalizado.includes(
                normalizarTexto(indicador)
            )
        )
    ) {
        return {
            intencion: "liga",
            responder: true,
            motivo: "tema_liga"
        };
    }

    // ========================================================
    // 🏆 CONSULTAS ESPECÍFICAS DEL TORNEO
    // ========================================================
    // Estas consultas deben tener prioridad sobre la detección
    // genérica de preguntas para evitar que "¿Qué resultados hay?"
    // termine en la IA general.
    if (
        normalizado.includes("resultados") ||
        normalizado.includes("resultado del torneo") ||
        normalizado.includes("partidos jugados")
    ) {
        return {
            intencion: "liga",
            responder: true,
            motivo: "consulta_resultados_torneo"
        };
    }

    // ========================================================
    // ❓ PREGUNTA
    // ========================================================

    const tieneSignosDePregunta =
        /[¿?]/.test(original);

    const iniciosPregunta = [
        "quien ",
        "quienes ",
        "cuando ",
        "donde ",
        "como ",
        "cual ",
        "cuales ",
        "por que ",
        "cuanto ",
        "cuantos ",
        "cuanta ",
        "cuantas ",
        "hay ",
        "ya "
    ];

    const empiezaComoPregunta =
        iniciosPregunta.some(
            inicio => normalizado.startsWith(inicio)
        );

    // "que" por sí solo NO basta para considerar
    // el mensaje una pregunta.
    const esPreguntaConQue =
        normalizado.startsWith("que ") &&
        (
            tieneSignosDePregunta ||
            /\b(es|son|fue|fueron|paso|pasó|pasara|pasará|sucedio|sucedió|ocurrio|ocurrió|significa|opinas|piensas|sabes|conoces)\b/.test(
                normalizado
            ) ||
            /\bque\s+informacion\s+tienes\b/.test(normalizado) ||
            /\bque\s+puedes\s+decir(?:me)?\b/.test(normalizado)
        );

    const tienePregunta =
        tieneSignosDePregunta ||
        empiezaComoPregunta ||
        esPreguntaConQue;

    if (tienePregunta) {
        return {
            intencion: "pregunta",
            responder: true,
            motivo: "pregunta_detectada"
        };
    }

    // ========================================================
    // 💬 CONVERSACIÓN CASUAL
    // ========================================================

    return {
        intencion: "casual",
        responder: false,
        motivo: "conversacion_casual"
    };
}

// ============================================================
// 😂 RESPONDER A RISAS
// ============================================================


async function enviarComunicacionTorneo(
    sock,
    from,
    sender,
    destinos,
    texto,
    menciones = []
) {
    const origenGestiones = obtenerOrigen("gestiones");

    if (!origenGestiones || from !== origenGestiones) {
        return {
            ok: false,
            motivo: "origen_no_autorizado"
        };
    }

    const autorizado = await esAdmin(sock, from, sender);

    if (!autorizado) {
        return {
            ok: false,
            motivo: "usuario_no_autorizado"
        };
    }

    const destinosValidos = obtenerDestinos(destinos);

    if (destinosValidos.length === 0) {
        return {
            ok: false,
            motivo: "destinos_no_validos"
        };
    }

    /*
     * C-10.7 — Las menciones se resuelven siempre
     * contra el grupo principal de Liga Titans Team.
     *
     * Esto permite que un administrador escriba:
     *   @Carlos Pérez
     *
     * desde Gestiones TitansB aunque Carlos no pertenezca
     * al grupo de Gestiones.
     */
    const mencionesSolicitadas =
        Array.isArray(menciones)
            ? [
                ...new Set(
                    menciones
                        .filter(Boolean)
                        .map(nombre =>
                            String(nombre).trim()
                        )
                        .filter(Boolean)
                )
            ]
            : [];

    /*
     * C-10.8 — Resolver todas las menciones antes
     * de realizar cualquier envío.
     *
     * Regla:
     * - nombre inexistente → no enviar.
     * - nombre ambiguo → no enviar.
     * - nombre válido → continuar.
     *
     * Nunca adivinamos una identidad.
     */
    const miembrosResueltos = [];

    for (const nombreBuscado of mencionesSolicitadas) {
        const resultado =
            await resolverMiembroPorNombre(
                sock,
                GRUPO_PRINCIPAL,
                nombreBuscado
            );

        if (
            resultado.motivo ===
            "miembro_ambiguo"
        ) {
            return {
                ok: false,
                motivo: "mencion_ambigua",
                nombre: nombreBuscado,
                candidatos:
                    resultado.candidatos || []
            };
        }

        if (
            resultado.motivo ===
            "miembro_no_encontrado"
        ) {
            return {
                ok: false,
                motivo: "mencion_no_encontrada",
                nombre: nombreBuscado
            };
        }

        if (!resultado.ok) {
            return {
                ok: false,
                motivo: "error_resolviendo_mencion",
                nombre: nombreBuscado,
                detalle: resultado.motivo || ""
            };
        }

        miembrosResueltos.push({
            nombreSolicitado: nombreBuscado,
            jid: resultado.jid,
            nombre: resultado.nombre
        });
    }

    const resumenMenciones = [];
    const destinosEnviados = [];

    // ========================================================
    // 📢 C-10.9.1 — ASOCIACIÓN REAL DE MENCIONES
    // ========================================================

    for (const destino of destinosValidos) {
        const mentions = [];
        let textoConMenciones = texto;
        let destinoBloqueado = false;

        for (const persona of miembrosResueltos) {
            const validacion =
                await validarMiembroEnGrupo(
                    sock,
                    destino,
                    persona.jid
                );

            if (validacion.ok) {
                if (!mentions.includes(validacion.jid)) {
                    mentions.push(validacion.jid);
                }

                const jidMencion =
                    String(validacion.jid || "").trim();

                const identificador =
                    jidMencion.split("@")[0];

                if (identificador) {
                    const nombres = [
                        persona.nombreSolicitado,
                        persona.nombre
                    ]
                        .map(nombre =>
                            String(nombre || "").trim()
                        )
                        .filter(Boolean);

                    for (const nombre of nombres) {
                        const patron =
                            new RegExp(
                                "@" +
                                nombre.replace(
                                    /[.*+?^${}()|[\]\\]/g,
                                    "\\$&"
                                ),
                                "gi"
                            );

                        textoConMenciones =
                            textoConMenciones.replace(
                                patron,
                                "@" + identificador
                            );
                    }
                }

                continue;
            }

            console.warn(
                `⚠️ TitansB | ${persona.nombre} no pertenece al destino ${destino}.`
            );

            // C-10.14.24 — ABORTO SEGURO
            //
            // Una mención no válida no debe permitir que el mensaje
            // continúe hacia sendMessage(). El destino se cancela
            // completamente para evitar enviar un mensaje sin la
            // asociación real de la mención.
            resumenMenciones.push({
                destino,
                mentions: [],
                bloqueado: true,
                motivo: "miembro_no_pertenece_al_destino",
                jid: persona.jid,
                nombre: persona.nombre
            });

            destinoBloqueado = true;
            break;
        }

        // C-10.14.26 — ABORTO REAL DEL DESTINO
        // Una mención inválida cancela completamente este destino.
        if (destinoBloqueado) {
            continue;
        }

        const payload = {
            text: textoConMenciones
        };

        /*
         * Baileys utiliza "mentions" para asociar
         * las menciones reales del mensaje.
         *
         * Si no hay menciones válidas, no añadimos
         * la propiedad para mantener el comportamiento
         * original de las comunicaciones.
         */
        if (mentions.length > 0) {
            payload.mentions = mentions;
        }

        await sock.sendMessage(
            destino,
            payload
        );

        destinosEnviados.push(destino);

        resumenMenciones.push({
            destino,
            mentions,
            enviado: true,
            bloqueado: false
        });
    }

    return {
        ok: destinosEnviados.length > 0,
        motivo: destinosEnviados.length > 0
            ? null
            : "todos_los_destinos_bloqueados",
        destinos: destinosEnviados,
        destinosSolicitados: destinosValidos,
        menciones: resumenMenciones
    };
}

async function procesarMensaje(sock, msg, texto) {

    if (!texto) {
        return;
    }

    const from = msg?.key?.remoteJid;

    if (!from || !from.endsWith("@g.us")) {
        return;
    }

    // ========================================================
    // 👤 AUTOR ACTUAL DEL MENSAJE
    // ========================================================
    // El autor real puede llegar como @lid o @s.whatsapp.net.
    // El resolvedor central se encarga de ambas variantes.
    const sender =
        msg?.key?.participant ||
        msg?.participant ||
        msg?.key?.remoteJid;

    const autorNombre =
        obtenerNombre(sender);

    // Nunca responder al propio bot
    if (msg?.key?.fromMe) {
        return;
    }

    // ========================================================
    // ⚡ EJECUCIÓN REMOTA DESDE GESTIONES TITANSB
    // ========================================================

    // --------------------------------------------------------
    // 🔢 SELECCIÓN DE GRUPO PARA UNA ORDEN REMOTA PENDIENTE
    // --------------------------------------------------------
    const seleccionPendiente = seleccionarGrupoRemoto(
        from,
        sender,
        texto
    );

    if (
        seleccionPendiente.motivo === "seleccion_invalida" ||
        seleccionPendiente.motivo === "seleccion_fuera_de_rango"
    ) {
        const gruposDisponibles = Array.isArray(
            seleccionPendiente.grupos
        )
            ? seleccionPendiente.grupos
            : [];

        const cantidadGrupos = gruposDisponibles.length;

        await sock.sendMessage(from, {
            text:
                cantidadGrupos > 0
                    ? [
                        "⚠️ TITANSB • SELECCIÓN NO VÁLIDA",
                        "",
                        `Debes responder con un número entre 1 y ${cantidadGrupos}.`,
                        "",
                        "La orden remota sigue pendiente.",
                        "Selecciona nuevamente el grupo donde deseas ejecutarla."
                    ].join("\n")
                    : [
                        "⚠️ TITANSB • SELECCIÓN NO VÁLIDA",
                        "",
                        "Debes responder con el número de un grupo válido.",
                        "",
                        "La orden remota sigue pendiente."
                    ].join("\n")
        });

        console.log(
            `⚠️ TitansB | selección remota inválida | ` +
            `motivo=${seleccionPendiente.motivo} | ` +
            `actor=${sender}`
        );

        return;
    }

    if (seleccionPendiente.ok) {
        const ordenPendiente = seleccionPendiente.orden;
        const grupoSeleccionado = seleccionPendiente.grupo;

        const revalidacion =
            await revalidarGrupoRemoto(
                sock,
                ordenPendiente,
                grupoSeleccionado
            );

        if (!revalidacion.ok) {
            await sock.sendMessage(from, {
                text:
                    "❌ No se puede ejecutar la orden remota.\\n\\n" +
                    `Motivo: ${revalidacion.motivo}`
            });

            eliminarOrdenRemota(from, sender);

            console.log(
                `⚠️ TitansB | selección remota rechazada | ` +
                `motivo=${revalidacion.motivo} | ` +
                `actor=${sender}`
            );

            return;
        }

        const solicitudRevalidada = {
            ...ordenPendiente,
            objetivo: revalidacion.objetivo
        };

        const destinoRevalidado = {
            grupo: revalidacion.grupo
        };

        const validacionBotRevalidada = {
            ok: revalidacion.bot?.esAdmin === true,
            motivo: "bot_es_admin",
            botJid: revalidacion.bot?.jid || null
        };

        const contextoSeleccionado =
            prepararContextoRemotoConDestino(
                solicitudRevalidada,
                destinoRevalidado,
                ordenPendiente.capacidad || {
                    requiereGrupo: true,
                    permiteMultiplesObjetivos: false
                },
                validacionBotRevalidada
            );

        if (!contextoSeleccionado.ok) {
            await sock.sendMessage(from, {
                text:
                    "❌ No se puede preparar la orden remota seleccionada.\\n\\n" +
                    `Motivo: ${contextoSeleccionado.motivo}`
            });

            eliminarOrdenRemota(from, sender);

            console.log(
                `⚠️ TitansB | contexto remoto rechazado | ` +
                `motivo=${contextoSeleccionado.motivo} | ` +
                `actor=${sender}`
            );

            return;
        }

        const ejecucionRemota =
            await ejecutarComandoRemoto(
                sock,
                contextoSeleccionado
            );

        await enviarConfirmacionRemota(
            sock,
            contextoSeleccionado,
            ejecucionRemota
        );

        eliminarOrdenRemota(from, sender);

        console.log(
            `⚡ TitansB | selección remota ejecutada | ` +
            `comando=${contextoSeleccionado.comando} | ` +
            `objetivo=${contextoSeleccionado.objetivo?.jid} | ` +
            `grupo=${contextoSeleccionado.destino?.groupId}`
        );

        return;
    }

    const ordenRemota =
        await prepararOrdenRemota(
            sock,
            msg,
            texto,
            autorNombre
        );

    // --------------------------------------------------------
    // ⚠️ ORDEN CON VARIOS GRUPOS CANDIDATOS
    // --------------------------------------------------------
    if (
        !ordenRemota.ok &&
        ordenRemota.motivo === "miembro_en_multiples_grupos"
    ) {
        const grupos = Array.isArray(ordenRemota.grupos)
            ? ordenRemota.grupos
            : [];

        const solicitud = ordenRemota.solicitud;

        if (!solicitud || grupos.length === 0) {
            console.error(
                "❌ TitansB | orden múltiple sin solicitud/grupos válidos"
            );
        } else {
            const ordenPendiente = {
                ...solicitud,
                requiereSeleccionGrupo: true,
                gruposCandidatos: grupos
            };

            const guardada = guardarOrdenRemota(
                from,
                sender,
                ordenPendiente
            );

            if (!guardada) {
                await sock.sendMessage(from, {
                    text:
                        "❌ No fue posible guardar la orden remota pendiente."
                });

                return;
            }

            const nombreObjetivo =
                solicitud.objetivo?.nombre ||
                solicitud.objetivo?.jid ||
                "el usuario";

            const opciones = grupos.map(
                (grupo, indice) =>
                    `${indice + 1}️⃣ ${grupo.nombreGrupo || grupo.nombre || "Grupo"}`
            );

            await sock.sendMessage(from, {
                text: [
                    "╭─── ⚡ TITANSB • SELECCIÓN DE GRUPO",
                    "│",
                    `│ Usuario: ${nombreObjetivo}`,
                    `│ Comando: ${String(solicitud.comando || "").toUpperCase()}`,
                    "│",
                    "│ El usuario pertenece a varios grupos:",
                    "│",
                    ...opciones.map(linea => `│ ${linea}`),
                    "│",
                    "│ Responde únicamente con el número",
                    "│ del grupo donde deseas ejecutar la orden.",
                    "│",
                    "╰────────────────────────"
                ].join("\n")
            });

            console.log(
                `🔢 TitansB | selección remota pendiente | ` +
                `comando=${solicitud.comando} | ` +
                `objetivo=${solicitud.objetivo?.jid} | ` +
                `grupos=${grupos.length} | actor=${sender}`
            );

            return;
        }
    }

    if (ordenRemota.ok) {
        const ejecucionRemota =
            await ejecutarComandoRemoto(
                sock,
                ordenRemota.preparado
            );

        await enviarConfirmacionRemota(
            sock,
            ordenRemota.preparado,
            ejecucionRemota
        );

        console.log(
            `⚡ TitansB | ejecución remota | ` +
            `comando=${ordenRemota.preparado.comando} | ` +
            `objetivo=${ordenRemota.preparado.objetivo?.jid} | ` +
            `grupo=${ordenRemota.preparado.destino?.groupId}`
        );

        return;
    }

    const intencion =
        detectarIntencionSocial(texto);

    console.log(
        `🧠 TitansB | intención=${intencion.intencion} | ` +
        `responder=${intencion.responder} | ` +
        `motivo=${intencion.motivo} | grupo=${from}`
    );

    // ========================================================
    // 🚫 COMANDOS
    // ========================================================

    if (intencion.intencion === "comando") {
        return;
    }

    // ========================================================
    // 🔐 CONFIRMACIÓN DE TORNEO
    // ========================================================

    const textoConfirmacion = normalizarTexto(texto);

    const esConfirmacionPositiva = [
        "si",
        "confirmo",
        "confirmar",
        "acepto",
        "adelante",
        "hazlo",
        "proceder"
    ].includes(textoConfirmacion);

    const esCancelacion = [
        "no",
        "cancelar",
        "cancelo",
        "cancelado"
    ].includes(textoConfirmacion);

    if (esConfirmacionPositiva || esCancelacion) {
        const confirmacionPendiente =
            obtenerConfirmacion(from, sender);

        if (confirmacionPendiente) {
            if (esCancelacion) {
                eliminarConfirmacion(from, sender);

                await sock.sendMessage(from, {
                    text:
                        "❌ Propuesta de torneo cancelada. No se realizaron cambios."
                });

                console.log(
                    `🏆 TitansB | propuesta cancelada | grupo=${from} | autor=${sender}`
                );

                return;
            }

            const autorizadoAhora =
                await esAdmin(sock, from, sender);

            if (!autorizadoAhora) {
                eliminarConfirmacion(from, sender);

                await sock.sendMessage(from, {
                    text:
                        "❌ Tu autorización de administrador ya no está vigente.\n\n" +
                        "La propuesta de torneo pendiente fue cancelada y no se realizaron cambios."
                });

                console.log(
                    `🏆 TitansB | confirmación rechazada por pérdida de permisos | grupo=${from} | autor=${sender}`
                );

                return;
            }

            const plan = confirmacionPendiente.plan;

            const torneoActual =
                leerJSON("torneo.json") || {};

            const validacion =
                validarPlanTorneo(
                    plan,
                    torneoActual
                );

            if (!validacion.valido) {
                return await sock.sendMessage(from, {
                    text:
                        "❌ La propuesta ya no puede ejecutarse.\n\n" +
                        validacion.errores
                            .map(error => `• ${error}`)
                            .join("\n")
                });
            }

            const planEjecucion = {
                ...plan,
                requiereConfirmacion: false
            };

            const resultado =
                ejecutarPlanTorneo(
                    planEjecucion
                );

            if (!resultado.ejecutado) {
                return await sock.sendMessage(from, {
                    text:
                        "❌ No se pudo ejecutar la configuración del torneo.\n\n" +
                        resultado.errores
                            .map(error => `• ${error}`)
                            .join("\n")
                });
            }

            eliminarConfirmacion(from, sender);

            const cambiosTexto =
                resultado.cambiosAplicados
                    .map(cambio =>
                        `• ${cambio.campo}: ${cambio.valor}`
                    )
                    .join("\n");

            await sock.sendMessage(from, {
                text:
                    "✅ TORNEO CONFIGURADO CORRECTAMENTE\n\n" +
                    "Se aplicaron estos cambios:\n" +
                    cambiosTexto
            });

            console.log(
                `🏆 TitansB | torneo configurado | grupo=${from} | autor=${sender}`
            );

            return;
        }
    }


    // ========================================================
    // 💬 CONVERSACIÓN CASUAL
    // ========================================================

    if (intencion.intencion === "casual") {
        return;
    }

    // ========================================================
    // 😂 RISA
    // ========================================================

    if (intencion.intencion === "risa") {

        const ahora = Date.now();
        const ultima = ultimaRisa.get(from) || 0;

        if (ahora - ultima < COOLDOWN_RISA) {
            return;
        }

        ultimaRisa.set(from, ahora);

        try {

            await sock.sendMessage(from, {
                text: obtenerRespuesta("risa")
            });

            console.log(
                `😂 TitansB | respondió a una risa | grupo=${from}`
            );

        } catch (error) {

            console.error(
                "❌ Error respondiendo a risa:",
                error.message
            );
        }

        return;
    }

    // ========================================================
    // 🏆 ASISTENTE INTELIGENTE DE TORNEOS
    // ========================================================

    const interpretacionTorneo = interpretarTorneo(texto);

    const accionesConsultaTorneo = [
        "ver_torneo",
        "ver_equipos",
        "ver_tabla",
        "ver_programacion",
        "ver_fixture",
        "ver_resultados",
        "ver_jornada"
    ];

    const esConsultaTorneo =
        accionesConsultaTorneo.includes(
            interpretacionTorneo.accion
        );

    const accionesComunicacion = [
        "comunicacion_torneo",
        "comunicacion_programacion",
        "comunicacion_anuncio_oficial",
        "comunicacion_anuncio",
        "comunicacion_equipos",
        "comunicacion_inicio_cuartos",
        "comunicacion_resultado",
        "comunicacion_mensaje",
        "comunicacion_mensaje_ia",
        "comunicacion"
    ];

    const esComunicacion =
        accionesComunicacion.includes(
            interpretacionTorneo.accion
        );

    if (
        esComunicacion ||
        esConsultaTorneo
    ) {
        const interpretacion = interpretacionTorneo;

        // ========================================================
        // 📢 COMUNICACIÓN ENTRE GRUPOS
        // ========================================================
        if (
            interpretacion.accion === "comunicacion_torneo" ||
            interpretacion.accion === "comunicacion_programacion"
        ) {
            console.log(
                `📢 TitansB | Solicitud de comunicación | accion=${interpretacion.accion} | origen=${from}`
            );
        }

        // ========================================================
        // 🔎 CONSULTAS DEL TORNEO
        // ========================================================

        if (interpretacion.accion === "ver_torneo") {
            const estado = obtenerEstadoTorneo();

            await sock.sendMessage(from, {
                text: responderEstadoTorneo(estado)
            });

            console.log(
                `🏆 TitansB | consulta torneo | grupo=${from} | autor=${sender}`
            );

            return;
        }

        if (interpretacion.accion === "ver_equipos") {
            const equipos = obtenerEquiposInscritos();

            await sock.sendMessage(from, {
                text: responderEquipos(equipos)
            });

            console.log(
                `🏆 TitansB | consulta equipos | grupo=${from} | autor=${sender}`
            );

            return;
        }

        if (interpretacion.accion === "ver_tabla") {
            const tabla = obtenerTablaPosiciones();

            await sock.sendMessage(from, {
                text: responderTabla(tabla)
            });

            console.log(
                `🏆 TitansB | consulta tabla | grupo=${from} | autor=${sender}`
            );

            return;
        }

        if (interpretacion.accion === "ver_programacion") {
            const fixture = obtenerFixtureActual();
            const fecha = interpretacion.datos?.fecha || null;

            await sock.sendMessage(from, {
                text: responderProgramacion(fixture, fecha)
            });

            console.log(
                `🏆 TitansB | consulta programación | fecha=${fecha || "general"} | grupo=${from} | autor=${sender}`
            );

            return;
        }

        if (interpretacion.accion === "ver_fixture") {
            const fixture = obtenerFixtureActual();

            await sock.sendMessage(from, {
                text: responderFixture(fixture)
            });

            console.log(
                `🏆 TitansB | consulta fixture | grupo=${from} | autor=${sender}`
            );

            return;
        }

        if (interpretacion.accion === "ver_resultados") {
            const resultados = obtenerResultadosRegistrados();

            await sock.sendMessage(from, {
                text: responderResultados(resultados)
            });

            console.log(
                `🏆 TitansB | consulta resultados | grupo=${from} | autor=${sender}`
            );

            return;
        }

        if (interpretacion.accion === "ver_jornada") {
            const jornadas = obtenerJornadas();

            if (interpretacion.faltantes?.includes("numero_jornada")) {
                return await sock.sendMessage(from, {
                    text: '📅 Indícame qué jornada quieres consultar. Ejemplo: "muéstrame la jornada 7".'
                });
            }

            await sock.sendMessage(from, {
                text: responderJornada(
                    jornadas,
                    interpretacion.datos?.numero ?? null
                )
            });

            console.log(
                `🏆 TitansB | consulta jornada ${interpretacion.datos?.numero ?? "actual"} | grupo=${from} | autor=${sender}`
            );

            return;
        }

        // ========================================================
        // 📢 COMUNICACIÓN ENTRE GRUPOS
        // ========================================================

        if (interpretacion.accion === "comunicacion_torneo") {
            const estado = obtenerEstadoTorneo();
            const textoComunicacion =
                responderEstadoTorneo(estado);

            const resultado =
                await enviarComunicacionTorneo(
                    sock,
                    from,
                    sender,
                    interpretacion.datos?.destinos || [],
                    textoComunicacion,
                    interpretacion.datos?.menciones || []
                );

            if (!resultado.ok) {
                return await sock.sendMessage(from, {
                    text:
                        resultado.motivo === "origen_no_autorizado"
                            ? "⛔ Esta función solo puede utilizarse desde el grupo Gestiones TitansB."
                            : resultado.motivo === "usuario_no_autorizado"
                                ? "⛔ Solo los administradores de Gestiones TitansB pueden realizar envíos entre grupos."
                                : "❌ No hay destinos de comunicación autorizados."
                });
            }

            await sock.sendMessage(from, {
                text:
                    `✅ Comunicación enviada correctamente.\\n` +
                    `📢 Destinos: ${resultado.destinos.length}`
            });

            console.log(
                `📢 TitansB | torneo enviado | destinos=${resultado.destinos.join(",")}`
            );

            return;
        }

          if (interpretacion.accion === "comunicacion_anuncio_oficial") {
    const textoOficial =
        generarAnuncioOficial(
            "COMUNICADO OFICIAL",
            "La Liga Titans Team continúa avanzando. Manténganse atentos a las próximas novedades, indicaciones y actividades oficiales de la competencia."
        );

    const resultado =
        await enviarComunicacionTorneo(
            sock,
            from,
            sender,
            interpretacion.datos?.destinos || [],
            textoOficial
        );

    if (!resultado.ok) {
        return await sock.sendMessage(from, {
            text:
                resultado.motivo === "origen_no_autorizado"
                    ? "⛔ Esta función solo puede utilizarse desde el grupo Gestiones TitansB."
                    : resultado.motivo === "usuario_no_autorizado"
                        ? "⛔ Solo los administradores de Gestiones TitansB pueden realizar envíos entre grupos."
                        : "❌ No hay destinos de comunicación autorizados."
        });
    }

    await sock.sendMessage(from, {
        text:
            `✅ Comunicado oficial enviado correctamente.\\n` +
            `📢 Destinos: ${resultado.destinos.length}`
    });

    console.log(
        `📢 TitansB | comunicado oficial enviado | destinos=${resultado.destinos.join(",")}`
    );

    return;
}

if (interpretacion.accion === "comunicacion_anuncio") {
              const estado = obtenerEstadoTorneo();
              const fixture = obtenerFixtureActual();

              const tipoAnuncio =
                  interpretacion.datos?.tipo || "torneo";

              const partidosAnuncio =
                  tipoAnuncio === "cuartos"
                      ? fixture.partidos.filter(partido =>
                          String(partido.jornada || "")
                              .toLowerCase()
                              .includes("cuartos")
                      )
                      : [];

              const textoComunicacion =
                  generarAnuncioTorneo(
                      estado.torneo || {},
                      {
                          tipo: tipoAnuncio,
                          partidos: partidosAnuncio,
                          incluirEquipos: tipoAnuncio === "cuartos",
                          incluirPremio: true
                      }
                  );

              const resultado =
                  await enviarComunicacionTorneo(
                      sock,
                      from,
                      sender,
                      interpretacion.datos?.destinos || [],
                      textoComunicacion
                  );

              if (!resultado.ok) {
                  return await sock.sendMessage(from, {
                      text:
                          resultado.motivo === "origen_no_autorizado"
                              ? "⛔ Esta función solo puede utilizarse desde el grupo Gestiones TitansB."
                              : resultado.motivo === "usuario_no_autorizado"
                                  ? "⛔ Solo los administradores de Gestiones TitansB pueden realizar envíos entre grupos."
                                  : "❌ No hay destinos de comunicación autorizados."
                  });
              }

              await sock.sendMessage(from, {
                  text:
                      `✅ Anuncio enviado correctamente.\n` +
                      `📢 Destinos: ${resultado.destinos.length}`
              });

              console.log(
                  `📢 TitansB | anuncio ${tipoAnuncio} enviado | destinos=${resultado.destinos.join(",")}`
              );

              return;
          }

        if (interpretacion.accion === "comunicacion_equipos") {
            const estado = obtenerEstadoTorneo();
            const fixture = obtenerFixtureActual();

            const partidosCuartos = Array.isArray(fixture?.partidos)
                ? fixture.partidos.filter(partido =>
                    String(partido.jornada || "")
                        .toLowerCase()
                        .includes("cuartos")
                )
                : [];

            const textoComunicacion = generarAnuncioTorneo(
                estado.torneo || {},
                {
                    tipo: "cuartos",
                    partidos: partidosCuartos,
                    incluirEquipos: true,
                    incluirPremio: true
                }
            );

            const resultado = await enviarComunicacionTorneo(
                sock,
                from,
                sender,
                interpretacion.datos?.destinos || [],
                textoComunicacion
            );

            if (!resultado.ok) {
                return await sock.sendMessage(from, {
                    text:
                        resultado.motivo === "origen_no_autorizado"
                            ? "⛔ Esta función solo puede utilizarse desde el grupo Gestiones TitansB."
                            : resultado.motivo === "usuario_no_autorizado"
                                ? "⛔ Solo los administradores de Gestiones TitansB pueden realizar envíos entre grupos."
                                : "❌ No hay destinos de comunicación autorizados."
                });
            }

            await sock.sendMessage(from, {
                text:
                    `✅ Equipos clasificados enviados correctamente.\n` +
                    `📢 Destinos: ${resultado.destinos.length}`
            });

            console.log(
                `📢 TitansB | equipos clasificados enviados | destinos=${resultado.destinos.join(",")}`
            );

            return;
        }

        if (interpretacion.accion === "comunicacion_inicio_cuartos") {
            const estado = obtenerEstadoTorneo();
            const fixture = obtenerFixtureActual();

            const partidosCuartos = Array.isArray(fixture?.partidos)
                ? fixture.partidos.filter(partido =>
                    String(partido.jornada || "")
                        .toLowerCase()
                        .includes("cuartos")
                )
                : [];

            const textoComunicacion = generarAnuncioTorneo(
                estado.torneo || {},
                {
                    tipo: "cuartos",
                    partidos: partidosCuartos,
                    incluirEquipos: true,
                    incluirPremio: true
                }
            );

            const resultado = await enviarComunicacionTorneo(
                sock,
                from,
                sender,
                interpretacion.datos?.destinos || [],
                textoComunicacion
            );

            if (!resultado.ok) {
                return await sock.sendMessage(from, {
                    text:
                        resultado.motivo === "origen_no_autorizado"
                            ? "⛔ Esta función solo puede utilizarse desde el grupo Gestiones TitansB."
                            : resultado.motivo === "usuario_no_autorizado"
                                ? "⛔ Solo los administradores de Gestiones TitansB pueden realizar envíos entre grupos."
                                : "❌ No hay destinos de comunicación autorizados."
                });
            }

            await sock.sendMessage(from, {
                text:
                    `✅ Inicio de cuartos de final enviado correctamente.\n` +
                    `📢 Destinos: ${resultado.destinos.length}`
            });

            console.log(
                `📢 TitansB | inicio cuartos enviado | destinos=${resultado.destinos.join(",")}`
            );

            return;
        }

        if (interpretacion.accion === "comunicacion_resultado") {
    const resultados = obtenerResultadosRegistrados();
    const partidoNumero =
        Number(interpretacion.datos?.partidoNumero || 0);

    if (!partidoNumero) {
        return await sock.sendMessage(from, {
            text:
                "❌ Indícame qué resultado quieres enviar. Ejemplo: \"envía el resultado del partido 1\"."
        });
    }

    const resultadoOficial =
        resultados.resultados.find(
            resultado =>
                Number(resultado?.partidoNumero) === partidoNumero
        ) || null;

    if (!resultadoOficial || !resultadoOficial.texto) {
        return await sock.sendMessage(from, {
            text:
                `❌ No encontré un resultado oficial registrado para el partido ${partidoNumero}.`
        });
    }

    const resultado = await enviarComunicacionTorneo(
        sock,
        from,
        sender,
        interpretacion.datos?.destinos || [],
        resultadoOficial.texto
    );

    if (!resultado.ok) {
        return await sock.sendMessage(from, {
            text:
                resultado.motivo === "origen_no_autorizado"
                    ? "⛔ Esta función solo puede utilizarse desde el grupo Gestiones TitansB."
                    : resultado.motivo === "usuario_no_autorizado"
                        ? "⛔ Solo los administradores de Gestiones TitansB pueden realizar envíos entre grupos."
                        : "❌ No hay destinos de comunicación autorizados."
        });
    }

    await sock.sendMessage(from, {
        text:
            `✅ Resultado del partido ${partidoNumero} enviado correctamente.\n` +
            `📢 Destinos: ${resultado.destinos.length}`
    });

    console.log(
        `📢 TitansB | resultado partido ${partidoNumero} enviado | destinos=${resultado.destinos.join(",")}`
    );

    return;
}

if (interpretacion.accion === "comunicacion_programacion") {
            const fixture = obtenerFixtureActual();
            const fecha = interpretacion.datos?.fecha || null;

            if (!fecha) {
                return await sock.sendMessage(from, {
                    text:
                        "📅 Indícame qué programación quieres enviar: sábado o domingo."
                });
            }

            const textoComunicacion =
                responderProgramacion(fixture, fecha);

            const resultado =
                await enviarComunicacionTorneo(
                    sock,
                    from,
                    sender,
                    interpretacion.datos?.destinos || [],
                    textoComunicacion
                );

            if (!resultado.ok) {
                return await sock.sendMessage(from, {
                    text:
                        resultado.motivo === "origen_no_autorizado"
                            ? "⛔ Esta función solo puede utilizarse desde el grupo Gestiones TitansB."
                            : resultado.motivo === "usuario_no_autorizado"
                                ? "⛔ Solo los administradores de Gestiones TitansB pueden realizar envíos entre grupos."
                                : "❌ No hay destinos de comunicación autorizados."
                });
            }

            await sock.sendMessage(from, {
                text:
                    `✅ Programación de ${fecha} enviada correctamente.\\n` +
                    `📢 Destinos: ${resultado.destinos.length}`
            });

            console.log(
                `📢 TitansB | programación ${fecha} enviada | destinos=${resultado.destinos.join(",")}`
            );

            return;
        }

        // ========================================================
        // 📢 COMUNICACIÓN GENERAL — G-08.11.13-C
        // ========================================================
        if (interpretacion.accion === "comunicacion") {
            const instruccion =
                String(interpretacion.datos?.mensaje || "").trim();

            const modo =
                interpretacion.datos?.modo === "mejorar"
                    ? "mejorar"
                    : "generar";

            if (!instruccion) {
                return await sock.sendMessage(from, {
                    text:
                        modo === "mejorar"
                            ? "❌ Indícame el comunicado que quieres mejorar."
                            : "❌ Indícame qué información quieres comunicar."
                });
            }

            let resultadoComunicado = null;

            try {
                resultadoComunicado =
                    await generarComunicado(
                        instruccion,
                        {
                            autorId: sender,
                            autorNombre,
                            modo,
                            menciones: interpretacion.datos?.menciones || []
                        }
                    );

            } catch (error) {
                console.error(
                    "❌ TitansB | Error generando comunicación general:",
                    error.message
                );
            }

            if (
                !resultadoComunicado?.ok ||
                !resultadoComunicado.titulo ||
                !resultadoComunicado.contenido
            ) {
                return await sock.sendMessage(from, {
                    text:
                        "❌ No pude preparar el comunicado. Inténtalo nuevamente."
                });
            }

            const textoComunicacion =
                generarAnuncioOficial(
                    resultadoComunicado.titulo,
                    resultadoComunicado.contenido
                );

            const resultado =
                await enviarComunicacionTorneo(
                    sock,
                    from,
                    sender,
                    interpretacion.datos?.destinos || [],
                    textoComunicacion,
                    interpretacion.datos?.menciones || []
                );

            if (!resultado.ok) {

                if (
                    resultado.motivo ===
                    "mencion_ambigua"
                ) {
                    const candidatos =
                        Array.isArray(resultado.candidatos)
                            ? resultado.candidatos
                                .map(candidato =>
                                    String(
                                        candidato?.nombre || ""
                                    ).trim()
                                )
                                .filter(Boolean)
                            : [];

                    const listaCandidatos =
                        candidatos.length > 0
                            ? candidatos
                                .map(nombre => `• ${nombre}`)
                                .join("\n")
                            : "• No pude obtener los nombres disponibles.";

                    return await sock.sendMessage(from, {
                        text:
                            `⚠️ No pude determinar a qué "${resultado.nombre}" te refieres.\n\n` +
                            `Encontré estos miembros:\n` +
                            `${listaCandidatos}\n\n` +
                            `Indícame cuál deseas mencionar.`
                    });
                }

                if (
                    resultado.motivo ===
                    "mencion_no_encontrada"
                ) {
                    return await sock.sendMessage(from, {
                        text:
                            `❌ No encontré a "${resultado.nombre}" entre los miembros de Liga Titans Team.\n\n` +
                            `Verifica el nombre e inténtalo nuevamente.`
                    });
                }

                if (
                    resultado.motivo ===
                    "error_resolviendo_mencion"
                ) {
                    return await sock.sendMessage(from, {
                        text:
                            `❌ No pude resolver la mención de "${resultado.nombre}".\n\n` +
                            `No realizaré el envío para evitar mencionar a una persona incorrecta.`
                    });
                }

                if (
                    resultado.motivo ===
                    "todos_los_destinos_bloqueados"
                ) {
                    return await sock.sendMessage(from, {
                        text:
                            "🛑 Comunicado bloqueado de forma segura.\n\n" +
                            "No se realizó ningún envío porque las menciones solicitadas no son válidas en los destinos seleccionados.\n\n" +
                            "No enviaré el comunicado para evitar mencionar a una persona incorrecta."
                    });
                }

                return await sock.sendMessage(from, {
                    text:
                        resultado.motivo === "origen_no_autorizado"
                            ? "⛔ Esta función solo puede utilizarse desde el grupo Gestiones TitansB."
                            : resultado.motivo === "usuario_no_autorizado"
                                ? "⛔ Solo los administradores de Gestiones TitansB pueden realizar envíos entre grupos."
                                : "❌ No hay destinos de comunicación autorizados."
                });
            }

            await sock.sendMessage(from, {
                text:
                    modo === "mejorar"
                        ? `✅ Comunicado mejorado y enviado correctamente.
📢 Destinos: ${resultado.destinos.length}`
                        : `✅ Comunicado generado y enviado correctamente.
📢 Destinos: ${resultado.destinos.length}`
            });

            console.log(
                `📢 TitansB | comunicación general | modo=${modo} | destinos=${resultado.destinos.join(",")}`
            );

            return;
        }

        if (interpretacion.accion === "comunicacion_mensaje_ia") {
            const instruccion =
                String(interpretacion.datos?.mensaje || "").trim();

            if (!instruccion) {
                return await sock.sendMessage(from, {
                    text:
                        "❌ Indícame qué información quieres comunicar."
                });
            }

            let resultadoComunicado = null;

            try {
                resultadoComunicado =
                    await generarComunicado(
                        instruccion,
                        {
                            autorId: sender,
                            autorNombre,
                            menciones: interpretacion.datos?.menciones || []
                        }
                    );

            } catch (error) {
                console.error(
                    "❌ TitansB | Error generando comunicado IA:",
                    error.message
                );
            }

            if (
                !resultadoComunicado?.ok ||
                !resultadoComunicado.titulo ||
                !resultadoComunicado.contenido
            ) {
                return await sock.sendMessage(from, {
                    text:
                        "❌ No pude generar el contenido del comunicado. Inténtalo nuevamente."
                });
            }

            const textoComunicacion =
                generarAnuncioOficial(
                    resultadoComunicado.titulo,
                    resultadoComunicado.contenido
                );

            const resultado =
                await enviarComunicacionTorneo(
                    sock,
                    from,
                    sender,
                    interpretacion.datos?.destinos || [],
                    textoComunicacion,
                    interpretacion.datos?.menciones || []
                );

            if (!resultado.ok) {
                return await sock.sendMessage(from, {
                    text:
                        resultado.motivo === "origen_no_autorizado"
                            ? "⛔ Esta función solo puede utilizarse desde el grupo Gestiones TitansB."
                            : resultado.motivo === "usuario_no_autorizado"
                                ? "⛔ Solo los administradores de Gestiones TitansB pueden realizar envíos entre grupos."
                                : "❌ No hay destinos de comunicación autorizados."
                });
            }

            await sock.sendMessage(from, {
                text:
                    `✅ Comunicado generado y enviado correctamente.\n` +
                    `📢 Destinos: ${resultado.destinos.length}`
            });

            console.log(
                `📢 TitansB | comunicado IA enviado | destinos=${resultado.destinos.join(",")}`
            );

            return;
        }

        if (interpretacion.accion === "comunicacion_mensaje") {
            const mensaje =
                String(interpretacion.datos?.mensaje || "").trim();

            if (!mensaje) {
                return await sock.sendMessage(from, {
                    text:
                        "❌ Indícame qué mensaje quieres enviar. Ejemplo: \"envía al grupo de pruebas: Hola equipo\"."
                });
            }

            const resultado =
                await enviarComunicacionTorneo(
                    sock,
                    from,
                    sender,
                    interpretacion.datos?.destinos || [],
                    mensaje,
                    interpretacion.datos?.menciones || []
                );

            if (!resultado.ok) {
                return await sock.sendMessage(from, {
                    text:
                        resultado.motivo === "origen_no_autorizado"
                            ? "⛔ Esta función solo puede utilizarse desde el grupo Gestiones TitansB."
                            : resultado.motivo === "usuario_no_autorizado"
                                ? "⛔ Solo los administradores de Gestiones TitansB pueden realizar envíos entre grupos."
                                : "❌ No hay destinos de comunicación autorizados."
                });
            }

            await sock.sendMessage(from, {
                text:
                    `✅ Mensaje enviado correctamente.\n` +
                    `📢 Destinos: ${resultado.destinos.length}`
            });

            console.log(
                `📢 TitansB | mensaje enviado | destinos=${resultado.destinos.join(",")}`
            );

            return;
        }

        if (interpretacion.accion === "crear_torneo") {
            const torneoActual =
                leerJSON("torneo.json") || {};

            const plan =
                planificarTorneo(
                    interpretacion,
                    torneoActual
                );

            const validacion =
                validarPlanTorneo(
                    plan,
                    torneoActual
                );

            if (!validacion.valido) {
                return await sock.sendMessage(from, {
                    text:
                        "❌ No puedo preparar este torneo todavía.\\n\\n" +
                        validacion.errores
                            .map(error => `• ${error}`)
                            .join("\\n")
                });
            }

            const confirmacion =
                generarConfirmacion(
                    plan,
                    torneoActual
                );

            if (!confirmacion.valido) {
                return await sock.sendMessage(from, {
                    text: confirmacion.texto
                });
            }

            const administrador =
                await esAdmin(
                    sock,
                    from,
                    sender
                );

            if (!administrador) {
                return await sock.sendMessage(from, {
                    text:
                        "⛔ Solo los administradores pueden crear o configurar torneos mediante el asistente."
                });
            }

            guardarConfirmacion(
                from,
                sender,
                plan
            );

            await sock.sendMessage(from, {
                text: confirmacion.texto
            });

            console.log(
                `🏆 TitansB | propuesta de torneo guardada | grupo=${from} | autor=${sender}`
            );

            return;
        }
    }

    // ========================================================
    // 🧠 INTENCIONES PREPARADAS PARA IA
    // ========================================================

    if (
        intencion.intencion === "directo" ||
        intencion.intencion === "liga" ||
        intencion.intencion === "pregunta"
    ) {

        console.log(
            `🤖 TitansB | enviando a IA | ` +
            `tipo=${intencion.intencion} | grupo=${from}`
        );

        try {

            const resultado =
                await generarRespuesta(
                    texto,
                    from,
                    {
                        autorId: sender,
                        autorNombre
                    }
                );

            if (
                !resultado ||
                !resultado.texto
            ) {
                console.warn(
                    "⚠️ TitansB | La IA no produjo texto."
                );

                return;
            }

            await sock.sendMessage(
                from,
                {
                    text: resultado.texto
                }
            );

            console.log(
                `🤖 TitansB | respuesta IA enviada | ` +
                `grupo=${from}`
            );

        } catch (error) {

            console.error(
                "❌ TitansB | Error en respuesta IA:",
                error.message
            );
        }

        return;
    }
}


// ============================================================
// 🚀 INICIAR
// ============================================================

function iniciarComunidadBot(sock) {

    // ========================================================
    // 🛡️ EVITAR MÚLTIPLES INICIALIZACIONES
    // ========================================================

    if (!sock) {
        console.warn(
            "⚠️ TitansB | No se puede iniciar modo social: socket no disponible."
        );
        return;
    }

    // Actualizar siempre la referencia: Baileys llama esta función
    // nuevamente cuando una conexión nueva queda abierta.
    socketSocialActual = sock;

    // Si el intervalo ya existe, se conserva y utilizará el socket nuevo.
    if (socialIniciado && intervaloSocial) {
        console.log(
            "🔄 TitansB | Socket del modo social actualizado; intervalo conservado."
        );

        // Primera revisión con la conexión recién abierta.
        revisarMensajesSociales(socketSocialActual);
        return;
    }

    socialIniciado = true;

    console.log(
        "🤖 TitansB | Modo social ligero iniciado."
    );

    console.log(
        "☀️ Mañana | 🌤️ Tarde | 🌙 Noche | 😂 Risas"
    );

    // ========================================================
    // ⏱️ REVISIÓN PROGRAMADA
    // ========================================================

    intervaloSocial = setInterval(() => {
        const socket = socketSocialActual;

        if (socket) {
            revisarMensajesSociales(socket);
        }
    }, 10 * 60 * 1000);

    // Primera revisión
    revisarMensajesSociales(socketSocialActual);
}

// ============================================================
// 📦 EXPORTACIONES
// ============================================================

module.exports = {
    procesarMensaje,
    iniciarComunidadBot,
    normalizarTexto,
    esRisa,
    detectarIntencionSocial,
    enviarComunicacionTorneo
};
