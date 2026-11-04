const { tienePermisoEquipo } = require("../../utils/permisos");
const {
    obtenerEquipoUsuario,
    expulsarMiembro
} = require("../../utils/equipos");

const { obtenerNombreUsuario } = require("../../utils/usuarios");
const { equipo, error } = require("../../utils/embeds");
const monitor = require("../../utils/monitor");

module.exports = {

    nombre: "expulsar",

    categoria: "equipo",

    descripcion: "Expulsa un miembro del equipo.",

    uso: "!expulsar @usuario",

    permisos: ["lider"],

    alias: [],

    async ejecutar(sock, from, args, msg) {

        try {

            const sender = msg.key.participant || msg.key.remoteJid;

            const datos = obtenerEquipoUsuario(sender);

            if (!datos) {

                return sock.sendMessage(from, {
                    text: error(
                        "Equipo",
                        "No perteneces a ningún equipo."
                    )
                });

            }

            if (!tienePermisoEquipo(datos, sender, ["lider"])) {

                return sock.sendMessage(from, {
                    text: error(
                        "Permisos",
                        "Solo el Capitán puede expulsar integrantes."
                    )
                });

            }

            const usuario =
                msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

            if (!usuario) {

                return sock.sendMessage(from, {
                    text: error(
                        "Uso",
                        "Ejemplo:\n!expulsar @usuario"
                    )
                });

            }

            const resultado = expulsarMiembro(
                datos.nombre,
                usuario
            );

            if (!resultado.ok) {

                return sock.sendMessage(from, {
                    text: error(
                        "Equipo",
                        resultado.mensaje
                    )
                });

            }

            await sock.sendMessage(from, {

                text: equipo(
                    "Integrante Expulsado",

`🏆 Equipo
${datos.nombre}

👤 Jugador expulsado
${obtenerNombreUsuario(usuario)}

👑 Capitán
${obtenerNombreUsuario(sender)}

📢 El jugador fue retirado correctamente del equipo.`

                )

            });

        } catch (err) {

            console.error(err);

            monitor.registrarEvento("ERROR_SISTEMA", {
                estado: "ERROR",
                componente: "EXPULSAR",
                codigo: "SYSTEM_ERROR",
                descripcion: err.message
            });

            sock.sendMessage(from, {

                text: error(
                    "Sistema",
                    "No fue posible expulsar al jugador."
                )

            });

        }

    }

};
