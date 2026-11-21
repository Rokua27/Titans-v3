const fs = require("fs");
const path = require("path");

const database = require("./database");
const { resolverClaveUsuario } = require("./comunidad");
const { crearGestorEconomia } = require("./economiaTransaccional");
const { crearServicioDaily } = require("./dailyEconomia");
const { crearServicioEntregaPremios } =
    require("./servicioEntregaPremios.integrado.cjs");

const { crearColaEntregasPremios } =
    require("./colaEntregasPremios.cjs");

const directorio = path.join(__dirname, "..", "database");

const gestor = crearGestorEconomia({
    directorio,
    leerJSON: database.leerJSON,
    guardarJSON: database.guardarJSON
});

const daily = crearServicioDaily({
    gestor,
    resolverClaveUsuario
});

let colaEntregasPremios = null;

const entregaPremios = crearServicioEntregaPremios({
    gestor,
    leerJSON: database.leerJSON,
    obtenerEstadoCola: () => colaEntregasPremios?.obtenerEstado()
});

colaEntregasPremios = crearColaEntregasPremios({
    database,
    gestor,
    enviar: async (sock, operacion) => {
        const premio = entregaPremios.obtenerPremio(operacion.premioId);

        if (operacion.etapa === "datos-entregas") {
            if (
                operacion.destino !== "120363412275379586@g.us" ||
                premio.estado !== "DATOS_RECIBIDOS" ||
                !premio.datosJugador ||
                !/^\d{5,20}$/.test(premio.datosJugador.playerId) ||
                !/^\d{1,10}$/.test(premio.datosJugador.servidor)
            ) {
                throw new Error("Datos o destino interno no válidos.");
            }

            const enviado = await sock.sendMessage(operacion.destino, {
                text:
                    "🎁 *TITANS TEAM · NUEVA ENTREGA POR VERIFICAR*\n\n" +
                    `🆔 Premio: ${premio.id}\n` +
                    `🏆 Ganador: ${premio.ganadorNombre}\n` +
                    `🎁 Recompensa: ${premio.premio.nombre}\n` +
                    `🎮 Player ID: ${premio.datosJugador.playerId}\n` +
                    `🌐 Servidor: ${premio.datosJugador.servidor}\n\n` +
                    "🛡️ Datos enviados únicamente al grupo interno."
            });

            return { mensajeSalidaId: enviado?.key?.id };
        }

        if (operacion.etapa === "confirmacion-privada") {
            if (
                operacion.tipo !== "privado" ||
                premio.estado !== "ENTREGADO" ||
                premio.ganadorId !== operacion.destino ||
                premio.chatPrivado !== operacion.destino
            ) {
                throw new Error("Destino privado o estado del premio no válido.");
            }

            const enviado = await sock.sendMessage(operacion.destino, {
                text:
                    "📢 *TITANS TEAM · ENTREGA CONFIRMADA*\n\n" +
                    `🏆 ¡Felicidades, ${premio.ganadorNombre}!\n` +
                    `🎁 Tu recompensa: ${premio.premio.nombre}\n\n` +
                    "✅ La administración confirmó la entrega de tu premio real.\n" +
                    "Gracias por participar en Titans Team."
            });
            return { mensajeSalidaId: enviado?.key?.id };
        }

        if (operacion.etapa === "anuncio-publico") {
            if (
                operacion.destino !== "120363179556270758@g.us" ||
                !["ENTREGADO", "NOTIFICADO"].includes(premio.estado)
            ) {
                throw new Error("Destino o estado del anuncio público no válido.");
            }

            const enviado = await sock.sendMessage(operacion.destino, {
                text: entregaPremios.generarAnuncio(premio.id)
            });
            return { mensajeSalidaId: enviado?.key?.id };
        }

        throw new Error("Etapa de entrega no reconocida.");
    },
    alEnviarConfirmado: async operacion => {
        if (operacion.etapa === "datos-entregas") {
            await entregaPremios.marcarEnviadoEntregas(
                operacion.premioId
            );

            await entregaPremios.marcarPendienteConfirmacion(
                operacion.premioId
            );

            return;
        }

        if (
            operacion.etapa === "confirmacion-privada" ||
            operacion.etapa === "anuncio-publico"
        ) {
            await entregaPremios.marcarNotificacionEnviada(
                operacion.premioId,
                operacion.etapa
            );
        }
    },
    alError: error => {
        console.error("TitansB | Cola de premios:", error.message);
    }
});

async function activarColaEntregasPremios(sock) {
    return colaEntregasPremios.activar(sock);
}

function desactivarColaEntregasPremios(sock) {
    colaEntregasPremios.desactivar(sock);
}

function procesarColaEntregasPremios() {
    colaEntregasPremios.despertar();
}

async function recuperarCodigosPendientesEnvio() {
    const archivoLedger = path.join(directorio, "premiosReales.json");

    // Un ledger todavía inexistente es válido: aún no se han registrado premios.
    // Si existe pero está corrupto, el servicio debe detener la recuperación.
    if (!fs.existsSync(archivoLedger)) {
        return {
            revisados: 0,
            invalidados: 0,
            omitida: true,
            motivo: "Todavía no existe el ledger de premios."
        };
    }

    return entregaPremios.recuperarCodigosPendientesEnvio();
}

async function recuperarEconomia() {
    // En Termux no se crea la base de datos local.
    // En Render, prepare-storage.js crea el enlace persistente.
    if (!fs.existsSync(directorio)) {
        return {
            omitida: true,
            motivo: "No existe el almacenamiento persistente."
        };
    }

    return gestor.recuperar();
}

module.exports = {
    gestor,
    daily,
    recuperarEconomia,
    entregaPremios,
    recuperarCodigosPendientesEnvio,
    colaEntregasPremios,
    activarColaEntregasPremios,
    desactivarColaEntregasPremios,
    procesarColaEntregasPremios
};
