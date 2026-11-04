const { esAdmin } = require("../utils/admin");

module.exports = {

    nombre: "torneoadmin",

    alias: ["paneltorneo"],

    categoria: "admin",

    permisos: ["admin"],

    async ejecutar(sock, from, args, msg) {

        const sender = msg.key.participant || msg.key.remoteJid;

        if (!(await esAdmin(sock, from, sender))) {

            return await sock.sendMessage(from, {
                text: "⛔ Solo los administradores pueden usar este panel."
            });

        }

        await sock.sendMessage(from, {

            text:
`🏆━━━━━━━━━━━━━━━━━━━━━━🏆
      LIGA TITANS TEAM
🏆━━━━━━━━━━━━━━━━━━━━━━🏆

⚙️ PANEL DE ADMINISTRACIÓN

🟢 Gestión

!abririnscripciones

!cerrarinscripciones

━━━━━━━━━━━━━━━━━━

⚔️ Torneo

!generarfixture

!programarpartido

!setresultado

━━━━━━━━━━━━━━━━━━

📊 Información

!tabla

!fixture

!resultado

!equiposinscritos

━━━━━━━━━━━━━━━━━━

🤖 TitansBot v3`

        });

    }

};
