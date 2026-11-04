const {
    obtenerEquipoUsuario,
    agregarInvitacion
} = require("../../utils/equipos");

const { obtenerNombreUsuario } = require("../../utils/usuarios");
const { equipo, error } = require("../../utils/embeds");
const monitor = require("../../utils/monitor");

module.exports = {

    nombre: "invitar",

    categoria: "equipo",

    descripcion: "Invita un jugador al equipo.",

    uso: "!invitar @usuario",

    permisos: ["lider"],

    alias: [],

    async ejecutar(sock, from, args, msg) {

        try {

            const sender = msg.key.participant || msg.key.remoteJid;

            const equipoActual = obtenerEquipoUsuario(sender);

            if (!equipoActual) {

                return sock.sendMessage(from, {
                    text: error(
                        "Equipo",
                        "Debes pertenecer a un equipo."
                    )
                });

            }

            const ids = [
                sender,
                sender.replace("@lid", "@s.whatsapp.net"),
                sender.replace("@s.whatsapp.net", "@lid")
            ];

            const esLider = ids.includes(equipoActual.lider);

            const esSubLider =
                Array.isArray(equipoActual.subLideres) &&
                equipoActual.subLideres.some(id => ids.includes(id));

            if (!esLider && !esSubLider) {

                return sock.sendMessage(from, {
                    text: error(
                        "Permisos",
                        "Solo el Capitán o un Sublíder pueden invitar jugadores."
                    )
                });

            }

            const mencionado =
                msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

            if (!mencionado) {

                return sock.sendMessage(from, {
                    text: error(
                        "Uso",
                        "Ejemplo:\n!invitar @usuario"
                    )
                });

            }

            agregarInvitacion(
                equipoActual.nombre,
                mencionado
            );

            await sock.sendMessage(from, {

                text: equipo(
                    "Invitación enviada",

`🏆 Equipo
${equipoActual.nombre}

👤 Jugador invitado
${obtenerNombreUsuario(mencionado)}

📨 La invitación fue enviada correctamente.

El jugador puede responder con:

✅ !aceptar

❌ !rechazar`

                )

            });

        } catch (err) {

            console.error(err);

            monitor.registrarEvento("ERROR_SISTEMA", {
                estado: "ERROR",
                componente: "INVITAR",
                codigo: "SYSTEM_ERROR",
                descripcion: err.message
            });

            sock.sendMessage(from, {

                text: error(
                    "Sistema",
                    "No fue posible enviar la invitación."
                )

            });

        }

    }

};
