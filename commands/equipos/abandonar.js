const { abandonarEquipo } = require("../../utils/equipos");
const { equipo, error } = require("../../utils/embeds");
const monitor = require("../../utils/monitor");

module.exports = {
    nombre: "abandonar",

categoria: "equipo",

descripcion: "Abandona tu equipo.",

uso: "!abandonar",

permisos: ["miembro"],

alias: [],

    async ejecutar(sock, from, args, msg) {

        try {

            const sender = msg.key.participant || msg.key.remoteJid;

            const resultado = abandonarEquipo(sender);

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
                    "Has abandonado el Equipo",
`🚪 Has salido correctamente.

🛡️ Equipo
${resultado.equipo}

Te esperamos nuevamente en la Liga Titans.`
                )
            });

        } catch (err) {

            console.error(err);

            monitor.registrarEvento("ERROR_SISTEMA", {
                estado: "ERROR",
                componente: "ABANDONAR",
                codigo: "SYSTEM_ERROR",
                descripcion: err.message
            });

            sock.sendMessage(from, {
                text: error(
                    "Sistema",
                    "No fue posible abandonar el equipo."
                )
            });

        }

    }
};
