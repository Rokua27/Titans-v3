const { tienePermisoEquipo } = require("../../utils/permisos");
const {
    obtenerEquipoUsuario,
    ascenderSubLider
} = require("../../utils/equipos");

const { obtenerNombreUsuario } = require("../../utils/usuarios");
const { equipo, error } = require("../../utils/embeds");
const monitor = require("../../utils/monitor");

module.exports = {

    nombre: "ascender",

    categoria: "equipo",

    descripcion: "Asciende un miembro a Sublíder.",

    uso: "!ascender @usuario",

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
                        "Solo el Líder puede ascender jugadores."
                    )
                });
            }

            const usuario =
                msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

            if (!usuario) {
                return sock.sendMessage(from, {
                    text: error(
                        "Uso",
                        "Ejemplo:\n!ascender @usuario"
                    )
                });
            }

            const resultado = ascenderSubLider(
                datos.nombre,
                usuario
            );

            if (!resultado.ok) {
                return sock.sendMessage(from, {
                    text: error(
                        "Ascenso",
                        resultado.mensaje
                    )
                });
            }

            await sock.sendMessage(from, {

                text: equipo(
                    "Nuevo Sublíder",

`🏆 Equipo
${datos.nombre}

👑 Líder
${obtenerNombreUsuario(sender)}

⭐ Nuevo Sublíder
${obtenerNombreUsuario(usuario)}

🎉 El jugador ahora puede invitar nuevos miembros al equipo.`

                )

            });

        } catch (err) {

            console.error(err);

            monitor.registrarEvento("ERROR_SISTEMA", {
                estado: "ERROR",
                componente: "ASCENDER",
                codigo: "SYSTEM_ERROR",
                descripcion: err.message
            });

            sock.sendMessage(from, {
                text: error(
                    "Sistema",
                    "No fue posible ascender al jugador."
                )
            });

        }

    }

};
