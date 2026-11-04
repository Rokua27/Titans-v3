const { leerJSON } = require("../../utils/database");
const { obtenerNombreUsuario } = require("../../utils/comunidad");

module.exports = {

    nombre: "staffstats",

    alias: ["statsstaff"],

    permisos: ["moderador"],

    descripcion: "Muestra las estadísticas de un miembro del staff.",

    async ejecutar(sock, from, args, msg) {

        const usuario =
            msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
            || msg.key.participant
            || msg.key.remoteJid;

        const stats = leerJSON("staffstats.json") || {};

        const datos = stats[usuario] || {

            warns: 0,
            mutes: 0,
            kicks: 0,
            bans: 0

        };

        await sock.sendMessage(from, {

            text:
`╔════════════════════════════╗
║      📊 STAFF STATS        ║
╚════════════════════════════╝

👤 Usuario:
${obtenerNombreUsuario(usuario)}

━━━━━━━━━━━━━━━━━━━━

⚠️ Warns:
${datos.warns}

🔇 Mutes:
${datos.mutes}

👢 Kicks:
${datos.kicks}

⛔ Bans:
${datos.bans}

━━━━━━━━━━━━━━━━━━━━
🤖 TitansBot v3`,


        });

    }

};
