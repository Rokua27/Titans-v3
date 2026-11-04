const SUPER_ADMINS = require("../../config/superadmins");

const {
    esFundador,
    agregarAdmin
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

    nombre: "addadmin",

    categoria: "moderacion",

    descripcion: "Agrega un Administrador Global.",

    uso: "!addadmin @usuario",

    permisos: ["fundador"],

    alias: [],

    async ejecutar(sock, from, args, msg) {

        try {

            const sender =
                msg.key.participant || msg.key.remoteJid;

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
                msg.message?.extendedTextMessage
                    ?.contextInfo?.mentionedJid?.[0];

            if (!usuario) {

                return sock.sendMessage(from, {
                    text: error(
                        "Uso",
                        "Ejemplo:\n!addadmin @usuario"
                    )
                });

            }

            agregarAdmin(usuario);

            const nombre =
                obtenerNombreUsuario(usuario);

            await sock.sendMessage(from, {

                text: equipo(

                    "Administrador Global",

`🛡️ Nuevo Administrador Global

👤 ${nombre}

✅ Ahora tiene permisos para administrar la comunidad.

👑 Asignado por
@${sender.split("@")[0]}`

                ),

                mentions: [
                    sender,
                    usuario
                ]

            });

        } catch (err) {

            console.error(err);

            monitor.registrarEvento("ERROR_SISTEMA", {
                estado: "ERROR",
                componente: "ADDADMIN",
                codigo: "SYSTEM_ERROR",
                descripcion: err.message
            });

            sock.sendMessage(from, {

                text: error(
                    "Sistema",
                    "No fue posible agregar el Administrador Global."
                )

            });

        }

    }

};
