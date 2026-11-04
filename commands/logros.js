const { obtenerLogros, obtenerTitulo } = require("../utils/logros");

module.exports = {
  nombre: "logros",

categoria: "jugador",

descripcion: "Consulta tus logros desbloqueados.",

uso: "!logros",

permisos: ["usuario"],

alias: [],

  async ejecutar(sock, from, args, msg) {
    const sender = msg.key.participant || msg.key.remoteJid;

    const titulo = obtenerTitulo(sender);
    const logros = obtenerLogros(sender);

    let lista = "";

    if (logros.length === 0) {
      lista = "📭 Aún no has desbloqueado logros.";
    } else {
      logros.forEach(l => {
        lista += `${l.emoji} *${l.nombre}*\n`;
      });
    }

    const mensaje =
`╔══════════════════════════════╗
║      🏆 𝗟𝗢𝗚𝗥𝗢𝗦 🏆        ║
╚══════════════════════════════╝

👑 *${titulo}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${lista}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    await sock.sendMessage(from, { text: mensaje });
  }
};
