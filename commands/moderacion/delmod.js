const SUPER_ADMINS = require("../../config/superadmins");

const {
    esFundador,
    eliminarModerador
} = require("../../utils/moderacion");

const {
    equipo,
    error
} = require("../../utils/embeds");

const {
    obtenerNombreUsuario
} = require("../../utils/comunidad");

module.exports = {

    nombre: "delmod",

    categoria: "moderacion",

    descripcion: "Elimina un Moderador.",

    uso: "!delmod @usuario",

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
                        "Ejemplo:\n!delmod @usuario"
                    )
                });

            }

            eliminarModerador(usuario);

            const nombre = obtenerNombreUsuario(usuario);

            await sock.sendMessage(from, {

                text: equipo(

                    "Moderador Eliminado",

`❌ Moderador removido

👤 ${nombre}

👑 Acción realizada por
@${sender.split("@")[0]}`

                ),

                mentions: [sender, usuario]

            });

        } catch (err) {

            console.error(err);

            sock.sendMessage(from, {

                text: error(
                    "Sistema",
                    "No fue posible eliminar el Moderador."
                )

            });

        }

    }

};
