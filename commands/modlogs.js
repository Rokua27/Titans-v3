const { esAdmin } = require("../utils/admin");
const { leerJSON } = require("../utils/database");
const { obtenerNombre } = require("../utils/usuarios");

module.exports = {
  nombre: "modlogs",

  alias: [],

  categoria: "admin",

  descripcion: "Muestra el historial de moderación.",

  uso: "!modlogs",

  permisos: ["admin"],

  async ejecutar(sock, from, args, msg) {
    try {
      // 🔐 SOLO ADMINS
      const sender = msg.key.participant || msg.key.remoteJid;

      if (!(await esAdmin(sock, from, sender))) {
        return await sock.sendMessage(from, {
          text: "❌ Solo los administradores pueden usar este comando."
        });
      }

      // Leer registros
      const logs = leerJSON("modlogs.json") || [];

      if (logs.length === 0) {
        return await sock.sendMessage(from, {
          text: "📭 No hay registros de moderación."
        });
      }

      // Últimos 10 registros
      const recientes = logs.slice(-10).reverse();

      let lista = "";

      recientes.forEach((log, i) => {
        lista +=
`━━━━━━━━━━━━━━━━━━━━━━
#${i + 1} • ${log.accion}

👤 ${obtenerNombre(log.usuario)}
📝 ${log.razon}
📅 ${log.fecha}

`;
      });

      await sock.sendMessage(from, {
        text:
`╔══════════════════════════════╗
║      🛡️ 𝗣𝗔𝗡𝗘𝗟 𝗔́𝗥𝗕𝗜𝗧𝗥𝗢𝗦      ║
╚══════════════════════════════╝

📊 *Últimas acciones de moderación*

${lista}━━━━━━━━━━━━━━━━━━━━━━
👑 *LIGA TITANS TEAM*
🤖 *TitansBot v3 • Sistema Disciplinario*
━━━━━━━━━━━━━━━━━━━━━━`
      });

    } catch (error) {
      console.error("❌ Error en modlogs:", error);

      await sock.sendMessage(from, {
        text: "❌ No pude obtener los registros."
      });
    }
  }
};
