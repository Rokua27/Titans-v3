const SUPER_ADMINS = require("../../config/superadmins");

const {
    esFundador,
    agregarModerador
} = require("../../utils/moderacion");

const {
    equipo,
    error
} = require("../../utils/embeds");

const {
    obtenerNombreUsuario
} = require("../../utils/comunidad");
const monitor = require("../../utils/monitor");

module.exports = {

    nombre: "addmod",

    categoria: "moderacion",

    descripcion: "Agrega un Moderador.",

    uso: "!addmod @usuario",

    permisos: ["fundador"],

    alias: [],

    async ejecutar(sock, from, args, msg) {

        try {

            const sender = msg.key.participant || msg.key.remoteJid;

            const autorizado =
                SUPER_ADMINS.includes(sender) ||
                esFundador(sender);

            if (!autorizado) {

                return sock.sendMessage(from, {
                    text: error(
                        "Permisos",
                        "Solo el Fundador o un SuperAdmin pueden usar este comando."
                    )
                });

            }

            const usuario =
                msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

            if (!usuario) {

                return sock.sendMessage(from, {
                    text: error(
                        "Uso",
                        "Ejemplo:\n!addmod @usuario"
                    )
                });

            }

            agregarModerador(usuario);

            const nombre = obtenerNombreUsuario(usuario);

            await sock.sendMessage(from, {

                text: equipo(

                    "Moderador",

`🛡️ Nuevo Moderador

👤 ${nombre}

✅ Ahora pertenece al equipo de moderación.

👑 Asignado por
@${sender.split("@")[0]}`

                ),

                mentions: [sender, usuario]

            });

        } catch (err) {

            console.error(err);

            monitor.registrarEvento("ERROR_SISTEMA", {
                estado: "ERROR",
                componente: "ADDMOD",
                codigo: "SYSTEM_ERROR",
                descripcion: err.message
            });

            sock.sendMessage(from, {

                text: error(
                    "Sistema",
                    "No fue posible agregar el Moderador."
                )

            });

        }

    }

};
