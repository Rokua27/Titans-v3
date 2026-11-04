const {
    tieneInvitacion,
    agregarMiembro,
    obtenerEquipoUsuario
} = require("../../utils/equipos");

const { obtenerNombreUsuario } = require("../../utils/usuarios");
const { equipo, error } = require("../../utils/embeds");
const monitor = require("../../utils/monitor");

module.exports = {

    nombre: "aceptar",

    categoria: "equipo",

    descripcion: "Acepta una invitación de equipo.",

    uso: "!aceptar",

    permisos: ["usuario"],

    alias: [],

    async ejecutar(sock, from, args, msg) {

        try {

            const sender = msg.key.participant || msg.key.remoteJid;

            if (obtenerEquipoUsuario(sender)) {

                return sock.sendMessage(from, {
                    text: error(
                        "Equipo",
                        "Ya perteneces a un equipo."
                    )
                });

            }

            const invitacion = tieneInvitacion(sender);

            if (!invitacion) {

                return sock.sendMessage(from, {
                    text: error(
                        "Invitación",
                        "No tienes invitaciones pendientes."
                    )
                });

            }

            agregarMiembro(
                invitacion.nombre,
                sender
            );

            await sock.sendMessage(from, {

                text: equipo(
                    "Nuevo Integrante",

`🎉 ¡Bienvenido al equipo!

🏆 Equipo
${invitacion.nombre}

👤 Jugador
${obtenerNombreUsuario(sender)}

👥 Integrantes
${invitacion.miembros.length + 1}/${invitacion.maxMiembros}

⚔️ Ahora haces parte oficialmente del equipo.
¡Muchos éxitos en la Liga Titans Team!`

                )

            });

        } catch (err) {

            console.error(err);

            monitor.registrarEvento("ERROR_SISTEMA", {
                estado: "ERROR",
                componente: "ACEPTAR",
                codigo: "SYSTEM_ERROR",
                descripcion: err.message
            });

            sock.sendMessage(from, {

                text: error(
                    "Sistema",
                    "No fue posible aceptar la invitación."
                )

            });

        }

    }

};
