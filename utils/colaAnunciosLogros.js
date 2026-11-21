const database = require("./database");
const { anuncioGlobal } = require("./anuncios");
const { obtenerLogros } = require("./logros");

const ARCHIVO = "anuncios_logros.json";
const MAX_INTENTOS = 5;
const ESPERA_BASE = 30000;

function crearColaAnunciosLogros(opciones = {}) {
    const db = opciones.database || database;
    const enviar = opciones.enviar || anuncioGlobal;
    const ahora = opciones.ahora || (() => Date.now());
    const programar = opciones.setTimeout || setTimeout;
    const cancelar = opciones.clearTimeout || clearTimeout;
    const maxIntentos = opciones.maxIntentos ?? MAX_INTENTOS;
    const esperaBase = opciones.esperaBase ?? ESPERA_BASE;

    let socketActivo = null;
    let temporizador = null;
    let procesando = false;
    let recuperacionAplicada = false;

    function leerEstado() {
        const estado = db.leerJSON(ARCHIVO);

        if (!estado || !Array.isArray(estado.anuncios)) {
            return { version: 1, anuncios: [] };
        }

        return estado;
    }

    function guardarEstado(estado) {
        db.guardarJSON(ARCHIVO, estado);
    }

    function obtenerEstado() {
        return leerEstado();
    }

    function registrar({ userId, logro, grupo, datos }) {
        if (!userId || !logro || !grupo || !datos) {
            throw new Error("Datos incompletos para registrar el anuncio.");
        }

        const estado = leerEstado();
        const id = `${userId}:${logro}`;
        const existente = estado.anuncios.find(item => item.id === id);

        if (existente) {
            return { nuevo: false, anuncio: existente };
        }

        const momento = ahora();

        const anuncio = {
            id,
            userId,
            logro,
            grupo,
            datos,
            estado: "pendiente",
            intentos: 0,
            creadoEn: momento,
            proximoIntento: momento,
            enviadoEn: null,
            ultimoError: null
        };

        estado.anuncios.push(anuncio);
        guardarEstado(estado);

        if (socketActivo) {
            procesarPendientes().catch(error => {
                console.error("❌ COLA LOGROS:", error.message);
            });
        }

        return { nuevo: true, anuncio };
    }

    function reconciliar({ userId, grupo, nombre }) {
        const resultado = {
            registrados: [],
            existentes: [],
            errores: []
        };

        if (!userId || !grupo) {
            return resultado;
        }

        const clavesPermitidas = new Set(["nivel_10", "nivel_25"]);
        const logros = obtenerLogros(userId).filter(
            logro => clavesPermitidas.has(logro.clave)
        );

        for (const logro of logros) {
            try {
                const registro = registrar({
                    userId,
                    logro: logro.clave,
                    grupo,
                    datos: {
                        nombre: nombre || "Titán",
                        logro: logro.nombre,
                        titulo: logro.titulo || "Aspirante Titán"
                    }
                });

                if (registro.nuevo) {
                    resultado.registrados.push(logro.clave);
                } else {
                    resultado.existentes.push(logro.clave);
                }
            } catch (error) {
                resultado.errores.push({
                    logro: logro.clave,
                    mensaje: String(error?.message || error).slice(0, 500)
                });

                console.error(
                    "❌ Error recuperando anuncio de logro:",
                    logro.clave,
                    error.message
                );
            }
        }

        return resultado;
    }

    function recuperarTrasReinicio() {
        if (recuperacionAplicada) return;

        const estado = leerEstado();
        let cambios = false;

        for (const anuncio of estado.anuncios) {
            if (anuncio.estado === "enviando") {
                anuncio.estado = "incierto";
                anuncio.ultimoError =
                    "El proceso se interrumpió durante el envío. Revisión manual necesaria.";
                cambios = true;
            }
        }

        if (cambios) {
            guardarEstado(estado);
        }

        recuperacionAplicada = true;
    }

    function detenerTemporizador() {
        if (temporizador !== null) {
            cancelar(temporizador);
            temporizador = null;
        }
    }

    function programarSiguiente() {
        detenerTemporizador();

        if (!socketActivo || procesando) return;

        const estado = leerEstado();
        const pendientes = estado.anuncios.filter(
            item => item.estado === "pendiente"
        );

        if (!pendientes.length) return;

        const siguiente = Math.min(
            ...pendientes.map(item => Number(item.proximoIntento) || 0)
        );

        const espera = Math.max(0, siguiente - ahora());

        temporizador = programar(() => {
            temporizador = null;

            procesarPendientes().catch(error => {
                console.error("❌ COLA LOGROS:", error.message);
            });
        }, espera);

        if (temporizador && typeof temporizador.unref === "function") {
            temporizador.unref();
        }
    }

    async function procesarPendientes() {
        if (!socketActivo || procesando) return;

        procesando = true;
        const socketProcesado = socketActivo;

        try {
            recuperarTrasReinicio();

            while (socketActivo === socketProcesado) {
                const estado = leerEstado();
                const momento = ahora();

                const anuncio = estado.anuncios.find(item =>
                    item.estado === "pendiente" &&
                    (Number(item.proximoIntento) || 0) <= momento
                );

                if (!anuncio) break;

                anuncio.estado = "enviando";
                guardarEstado(estado);

                // Separar el resultado del envío del guardado de confirmación.
                try {
                    await enviar(
                        socketProcesado,
                        anuncio.grupo,
                        "logro",
                        anuncio.datos
                    );
                } catch (error) {
                    const actualizado = leerEstado();
                    const registro = actualizado.anuncios.find(
                        item => item.id === anuncio.id
                    );

                    if (!registro) break;

                    registro.intentos += 1;
                    registro.ultimoError = String(
                        error?.message || error
                    ).slice(0, 500);

                    if (registro.intentos >= maxIntentos) {
                        registro.estado = "fallido";
                        registro.proximoIntento = null;
                    } else {
                        registro.estado = "pendiente";
                        registro.proximoIntento =
                            ahora() +
                            esperaBase * (2 ** (registro.intentos - 1));
                    }

                    guardarEstado(actualizado);
                    break;
                }

                // Si falla este guardado, NO se reenvía automáticamente.
                // El registro permanece "enviando" y será "incierto"
                // después de reiniciar el proceso.
                const actualizado = leerEstado();
                const registro = actualizado.anuncios.find(
                    item => item.id === anuncio.id
                );

                if (registro && registro.estado === "enviando") {
                    registro.estado = "enviado";
                    registro.enviadoEn = ahora();
                    registro.ultimoError = null;
                    guardarEstado(actualizado);
                }
            }
        } finally {
            procesando = false;
            programarSiguiente();
        }
    }

    function activar(sock) {
        if (!sock) return Promise.resolve();

        if (socketActivo === sock) {
            return Promise.resolve();
        }

        detenerTemporizador();
        socketActivo = sock;

        recuperarTrasReinicio();

        return procesarPendientes();
    }

    function desactivar(sock) {
        if (socketActivo !== sock) return;

        socketActivo = null;
        detenerTemporizador();
    }

    return {
        registrar,
        reconciliar,
        obtenerEstado,
        recuperarTrasReinicio,
        procesarPendientes,
        activar,
        desactivar
    };
}

const cola = crearColaAnunciosLogros();

module.exports = {
    crearColaAnunciosLogros,
    registrarAnuncioLogro: cola.registrar,
    reconciliarAnunciosLogros: cola.reconciliar,
    obtenerEstadoColaLogros: cola.obtenerEstado,
    activarColaLogros: cola.activar,
    desactivarColaLogros: cola.desactivar
};
