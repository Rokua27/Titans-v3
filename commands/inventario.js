const { leerJSON } = require("../utils/database");

module.exports = {
  nombre: "inventario",

categoria: "jugador",

descripcion: "Muestra tu inventario.",

uso: "!inventario",

permisos: ["usuario"],

alias: [],

  async ejecutar(sock, from, args, msg) {
    try {
      const sender = msg.key.participant || msg.key.remoteJid;

      const usuarios = leerJSON("usuarios.json") || {};
      const inventarios = leerJSON("inventarios.json") || {};

      const usuario = usuarios[sender];
      const inv = inventarios[sender] || { cajas: 0, objetos: [] };

      // Últimos 5 objetos
      const ultimos = inv.objetos.slice(-5).reverse();

      let lista = "";

      if (ultimos.length === 0) {
        lista = "📭 No tienes objetos todavía.";
      } else {
        ultimos.forEach((obj, i) => {
          lista += `${i + 1}. ${obj.nombre}\n`;
        });
      }

      const mensaje =
`╔══════════════════════════════╗
║      🎒 𝗜𝗡𝗩𝗘𝗡𝗧𝗔𝗥𝗜𝗢 🎒       ║
╚══════════════════════════════╝

👤 *${usuario?.nombre || "Titán"}*

📦 Cajas: *${inv.cajas}*
🎁 Objetos: *${inv.objetos.length}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📜 *Últimos objetos*

${lista}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

      await sock.sendMessage(from, { text: mensaje });

    } catch (error) {
      console.error("❌ Error inventario:", error);

      await sock.sendMessage(from, {
        text: "❌ No pude mostrar el inventario."
      });
    }
  }
};
