const {
    obtenerAdvertencias
} = require("../../utils/sanciones");

const {
    esFundador,
    esAdmin,
    esSuperMod,
    esModerador,
    esAyudante,
    esJusticia
} = require("../../utils/moderacion");

const {
    equipo,
    error
} = require("../../utils/embeds");

const {
    obtenerNombreUsuario
} = require("../../utils/comunidad");

module.exports = {

    nombre: "warnings",

    categoria: "moderacion",

    descripcion: "Consulta las advertencias de un usuario.",

    uso: "!warnings @usuario",

    permisos: ["moderador", "justicia"],

    alias: [
        "advertencias",
        "warns"
    ],

    async ejecutar(sock, from, args, msg) {

        try {

            const sender =
                msg.key.participant || msg.key.remoteJid;

            const autorizado =
                esFundador(sender) ||
                esAdmin(sender) ||
                esSuperMod(sender) ||
                esModerador(sender) ||
                esAyudante(sender) ||
                esJusticia(sender);

            if (!autorizado) {

                return sock.sendMessage(from, {

                    text: error(
                        "Permisos",
                        "No tienes permisos para consultar advertencias."
                    )

                });

            }

            const usuario =
                msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

            if (!usuario) {

                return sock.sendMessage(from, {

                    text: error(
                        "Uso",
                        "Ejemplo:\n!warnings @usuario"
                    )

                });

            }

            const historial =
                obtenerAdvertencias(usuario);

            if (!historial.length) {

                return sock.sendMessage(from, {

                    text: equipo(
                        "Advertencias",
                        `✅ ${obtenerNombreUsuario(usuario)} no tiene advertencias registradas.`
                    ),

                    mentions: [usuario]

                });

            }

            let texto = "";

            historial.forEach((warn, index) => {

                texto +=
`${index + 1}. ${warn.motivo}

👮 ${obtenerNombreUsuario(warn.staff)}

📅 ${new Date(warn.fecha).toLocaleString("es-CO")}

──────────────────

`;

            });

            await sock.sendMessage(from, {

                text: equipo(

                    `Advertencias (${historial.length})`,

                    texto.trim()

                ),

                mentions: [
                    usuario,
                    ...historial.map(x => x.staff)
                ]

            });

        } catch (err) {

            console.error(err);

            sock.sendMessage(from, {

                text: error(
                    "Sistema",
                    "No fue posible consultar las advertencias."
                )

            });

        }

    }

};
