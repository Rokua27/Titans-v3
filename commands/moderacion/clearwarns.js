const {
    limpiarAdvertencias
} = require("../../utils/sanciones");

const {
    esFundador,
    esAdmin,
    esSuperMod,
    esModerador
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

    nombre: "clearwarns",

    categoria: "moderacion",

    descripcion: "Elimina todas las advertencias de un usuario.",

    uso: "!clearwarns @usuario",

    permisos: ["moderador"],

    alias: [
        "clearwarnings",
        "limpiarwarns",
        "resetwarns"
    ],

    async ejecutar(sock, from, args, msg) {

        try {

            const sender =
                msg.key.participant || msg.key.remoteJid;

            const autorizado =
                esFundador(sender) ||
                esAdmin(sender) ||
                esSuperMod(sender) ||
                esModerador(sender);

            if (!autorizado) {

                return sock.sendMessage(from, {

                    text: error(
                        "Permisos",
                        "No tienes permisos para limpiar advertencias."
                    )

                });

            }

            const usuario =
                msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

            if (!usuario) {

                return sock.sendMessage(from, {

                    text: error(
                        "Uso",
                        "Ejemplo:\n!clearwarns @usuario"
                    )

                });

            }

            limpiarAdvertencias(usuario);

            await sock.sendMessage(from, {

                text: equipo(

                    "Advertencias Reiniciadas",

`✅ Se eliminaron todas las advertencias.

👤 Usuario

${obtenerNombreUsuario(usuario)}

👮 Moderador

${obtenerNombreUsuario(sender)}`

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
                componente: "CLEARWARNS",
                codigo: "SYSTEM_ERROR",
                descripcion: err.message
            });

            sock.sendMessage(from, {

                text: error(
                    "Sistema",
                    "No fue posible limpiar las advertencias."
                )

            });

        }

    }

};
