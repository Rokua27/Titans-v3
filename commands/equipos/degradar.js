const { tienePermisoEquipo } = require("../../utils/permisos");
const {
    obtenerEquipoUsuario,
    degradarSubLider
} = require("../../utils/equipos");

const { obtenerNombreUsuario } = require("../../utils/usuarios");
const { equipo, error } = require("../../utils/embeds");
const monitor = require("../../utils/monitor");

module.exports = {

    nombre: "degradar",

    categoria: "equipo",

    descripcion: "Quita el cargo de Sublíder.",

    uso: "!degradar @usuario",

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
                        "Solo el Líder puede degradar jugadores."
                    )
                });
            }

            const usuario =
                msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

            if (!usuario) {
                return sock.sendMessage(from, {
                    text: error(
                        "Uso",
                        "Ejemplo:\n!degradar @usuario"
                    )
                });
            }

            const resultado = degradarSubLider(
                datos.nombre,
                usuario
            );

            if (!resultado.ok) {
                return sock.sendMessage(from, {
                    text: error(
                        "Degradar",
                        resultado.mensaje
                    )
                });
            }

            await sock.sendMessage(from, {

                text: equipo(
                    "Sublíder Degradado",

`🏆 Equipo
${datos.nombre}

👑 Líder
${obtenerNombreUsuario(sender)}

👤 Jugador
${obtenerNombreUsuario(usuario)}

📉 El jugador vuelve a ocupar el rango de Miembro.`

                )

            });

        } catch (err) {

            console.error(err);

            monitor.registrarEvento("ERROR_SISTEMA", {
                estado: "ERROR",
                componente: "DEGRADAR",
                codigo: "SYSTEM_ERROR",
                descripcion: err.message
            });

            sock.sendMessage(from, {
                text: error(
                    "Sistema",
                    "No fue posible degradar al jugador."
                )
            });

        }

    }

};
