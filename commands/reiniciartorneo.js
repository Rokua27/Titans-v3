const { esSuperAdmin } = require("../utils/admin");
const { reiniciarTorneo } = require("../utils/torneoManager");

module.exports = {

    nombre: "reiniciartorneo",

    alias: ["rtorneo"],

    categoria: "superadmin",

    descripcion: "Reinicia completamente el torneo.",

    permisos: ["superadmin"],

    uso: "!reiniciartorneo",

    async ejecutar(sock, from, args, msg) {

        const sender = msg.key.participant || msg.key.remoteJid;

        if (!(await esSuperAdmin(sender))) {
            return await sock.sendMessage(from, {
                text: "⛔ Solo un Super Admin puede reiniciar el torneo."
            });
        }

        reiniciarTorneo();

        await sock.sendMessage(from, {
            text:
`🏆 LIGA TITANS TEAM

━━━━━━━━━━━━━━━━━━

♻️ TORNEO REINICIADO

✅ Fixture eliminado.
✅ Tabla eliminada.
✅ Resultados eliminados.
✅ Equipos desinscritos.

La próxima temporada ya puede comenzar.

🤖 TitansBot v3`
        });

    }

};
