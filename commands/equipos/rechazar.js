const {
    tieneInvitacion,
    eliminarInvitacion
} = require("../../utils/equipos");

const { equipo, error } = require("../../utils/embeds");
const monitor = require("../../utils/monitor");

module.exports = {

    nombre: "rechazar",

    categoria: "equipo",

    descripcion: "Rechaza una invitación de equipo.",

    uso: "!rechazar",

    permisos: ["usuario"],

    alias: [],

    async ejecutar(sock, from, args, msg) {

        try {

            const sender = msg.key.participant || msg.key.remoteJid;

            const invitacion = tieneInvitacion(sender);

            if (!invitacion) {

                return sock.sendMessage(from, {
                    text: error(
                        "Invitación",
                        "No tienes invitaciones pendientes."
                    )
                });

            }

            eliminarInvitacion(
                invitacion.nombre,
                sender
            );

            await sock.sendMessage(from, {

                text: equipo(
                    "Invitación Rechazada",

`❌ Has rechazado la invitación del equipo.

🏆 Equipo
${invitacion.nombre}

📌 Estado
Invitación cancelada.

Puedes recibir nuevas invitaciones cuando lo desees.`

                )

            });

        } catch (err) {

            console.error(err);

            monitor.registrarEvento("ERROR_SISTEMA", {
                estado: "ERROR",
                componente: "RECHAZAR",
                codigo: "SYSTEM_ERROR",
                descripcion: err.message
            });

            sock.sendMessage(from, {

                text: error(
                    "Sistema",
                    "No fue posible rechazar la invitación."
                )

            });

        }

    }

};
