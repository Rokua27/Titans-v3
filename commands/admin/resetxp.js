const { esFundador } = require("../../utils/moderacion");

module.exports = {

    nombre: "resetxp",

    alias: ["resetniveles"],

    categoria: "admin",

    descripcion: "Protege la progresión permanente de TitansB.",

    permisos: ["fundador"],

    async ejecutar(sock, from, args, msg) {

        const sender = msg.key.participant || msg.key.remoteJid;

        if (!esFundador(sender)) {

            return sock.sendMessage(from, {

                text: "❌ Solo el Fundador puede ejecutar este comando."

            });

        }

        await sock.sendMessage(from, {

            text:
`╔════════════════════════════╗
║   🛡️ PROGRESIÓN PROTEGIDA  ║
╚════════════════════════════╝

⚠️ El reinicio de XP y niveles permanentes está deshabilitado.

🔒 Se conservan:
⭐ Nivel y XP permanente
💰 Monedas
🎒 Inventario
🏅 Logros
🔥 Rachas
📊 Estadísticas de usuario

✅ No se modificó ningún perfil.

🛡️ Sistema de progresión TitansB
🤖 TitansBot`

        });

    }

};
