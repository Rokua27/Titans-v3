const {
    obtenerRango
} = require("../../utils/moderacion");

const {
    equipo,
    error
} = require("../../utils/embeds");

const {
    obtenerNombreUsuario
} = require("../../utils/comunidad");

module.exports = {

    nombre: "rango",

    categoria: "moderacion",

    descripcion: "Consulta el rango de un usuario.",

    uso: "!rango @usuario",

    permisos: ["usuario"],

    alias: [],

    async ejecutar(sock, from, args, msg) {

        try {

            const usuario =
                msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
                msg.key.participant ||
                msg.key.remoteJid;

            const rango = obtenerRango(usuario);

            const nombre = obtenerNombreUsuario(usuario);

            await sock.sendMessage(from, {

                text: equipo(

                    "Información de Rango",

`👤 Usuario

${nombre}

🏅 Rango

${rango}`

                ),

                mentions: [usuario]

            });

        } catch (err) {

            console.error(err);

            await sock.sendMessage(from, {

                text: error(
                    "Sistema",
                    "No fue posible consultar el rango."
                )

            });

        }

    }

};
