"use strict";

const {
    identidadAdmitida,
    iniciarEdicion
} = require("../community/profile-edit-handler");

module.exports = {
    nombre: "editarperfil",
    alias: ["editperfil"],
    categoria: "jugador",
    descripcion: "Permite editar tu perfil competitivo mediante una conversación privada.",
    uso: "!editarperfil",
    permisos: ["usuario"],

    async ejecutar(sock, from, args, msg) {
        const esGrupo = typeof from === "string" && from.endsWith("@g.us");

        if (!esGrupo) {
            return await sock.sendMessage(from, {
                text:
                    "📢 *TITANSB · EDICIÓN DE PERFIL*\n\n" +
                    "Para iniciar la edición, escribe *!editarperfil* " +
                    "en un grupo de la Liga Titans.\n\n" +
                    "🛡️ *Sistema de Moderación Titans Team*"
            });
        }

        const identidad = msg?.key?.participant;

        if (!identidadAdmitida(identidad)) {
            return await sock.sendMessage(from, {
                text:
                    "📢 *TITANSB · EDICIÓN DE PERFIL*\n\n" +
                    "No pude verificar tu identidad exacta. " +
                    "No se inició ninguna edición. Contacta con la administración.\n\n" +
                    "🛡️ *Sistema de Moderación Titans Team*"
            });
        }

        try {
            const resultado = await iniciarEdicion(sock, identidad);

            if (resultado?.iniciado) {
                await sock.sendMessage(from, {
                    text:
                        "📢 *TITANSB · EDICIÓN DE PERFIL*\n\n" +
                        "Te envié un mensaje privado para actualizar tu perfil. " +
                        "Continúa la conversación con TitansB por privado.\n\n" +
                        "🛡️ *Sistema de Moderación Titans Team*"
                });
            } else {
                await sock.sendMessage(from, {
                    text:
                        "📢 *TITANSB · EDICIÓN DE PERFIL*\n\n" +
                        "No se pudo iniciar la edición. Revisa tu mensaje privado " +
                        "o contacta con la administración.\n\n" +
                        "🛡️ *Sistema de Moderación Titans Team*"
                });
            }
        } catch (error) {
            console.error(
                "⚠️ TitansB | Error al iniciar edición:",
                error.message
            );

            await sock.sendMessage(from, {
                text:
                    "📢 *TITANSB · EDICIÓN DE PERFIL*\n\n" +
                    "No pude iniciar la edición de forma segura. " +
                    "Tu perfil no fue modificado.\n\n" +
                    "🛡️ *Sistema de Moderación Titans Team*"
            });
        }
    }
};
