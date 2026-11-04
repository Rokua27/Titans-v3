const { leerJSON, guardarJSON } = require("../../utils/database");
const { error } = require("../../utils/embeds");
const monitor = require("../../utils/monitor");

module.exports = {

    nombre: "setfundador",

    categoria: "moderacion",

    descripcion: "Inicializa el fundador del bot.",

    uso: "!setfundador",

    permisos: ["usuario"],

    alias: [],

    async ejecutar(sock, from, args, msg) {

        try {

            const sender = msg.key.participant || msg.key.remoteJid;

            const datos = leerJSON("moderadores.json") || {
                fundador: "",
                admins: [],
                supermods: [],
                moderadores: [],
                ayudantes: [],
                baneados: []
            };

            if (datos.fundador && datos.fundador !== "") {

                return sock.sendMessage(from, {
                    text: error(
                        "Moderación",
                        "⚠️ El fundador ya fue configurado.\n\nEste comando solo puede ejecutarse una vez."
                    )
                });

            }

            datos.fundador = sender;

            guardarJSON("moderadores.json", datos);

            await sock.sendMessage(from, {
                text:
`👑 *Fundador configurado correctamente*

🎉 El sistema de moderación fue inicializado.

🛡️ A partir de este momento eres el *Fundador* de TitansBot v3.

Ahora podrás administrar todos los rangos del sistema.`
            });

        } catch (err) {
            console.error(err);

            monitor.registrarEvento("ERROR_SISTEMA", {
                estado: "ERROR",
                componente: "SETFUNDADOR",
                codigo: "SYSTEM_ERROR",
                descripcion: err.message
            });

            console.error(err);

            sock.sendMessage(from, {
                text: error(
                    "Sistema",
                    "No fue posible configurar el fundador."
                )
            });

        }

    }

};
