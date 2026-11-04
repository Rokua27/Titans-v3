const { leerJSON } = require("../utils/database");

module.exports = {
  nombre: "ranking",

categoria: "jugador",

descripcion: "Muestra el ranking general.",

uso: "!ranking",

permisos: ["usuario"],

alias: [],

  async ejecutar(sock, from) {
    try {
      const stats = leerJSON("stats.json") || {};

      const equipos = Object.entries(stats);

      if (equipos.length === 0) {
        return await sock.sendMessage(from, {
          text: "📭 Aún no hay estadísticas registradas."
        });
      }

      // Ordenar por series ganadas
      equipos.sort((a, b) => b[1].ganadas - a[1].ganadas);

      let tabla = "";

      equipos.forEach(([nombre, data], index) => {
        const total = data.ganadas + data.perdidas;
        const winrate = total > 0
          ? ((data.ganadas / total) * 100).toFixed(0)
          : 0;

        const pos = ["🥇", "🥈", "🥉"][index] || `#${index + 1}`;

        tabla +=
`${pos} *${nombre}*
🏆 ${data.ganadas}G • 💀 ${data.perdidas}P • 📈 ${winrate}%

`;
      });

      await sock.sendMessage(from, {
        text:
`╔══════════════════════════════╗
║      📈 𝗥𝗔𝗡𝗞𝗜𝗡𝗚 𝗢𝗙𝗜𝗖𝗜𝗔𝗟      ║
╚══════════════════════════════╝

${tabla}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 *LIGA TITANS TEAM*
⚔️ Competimos para jugar, jugamos para ser leyendas.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      });

    } catch (error) {
      console.error("❌ Error ranking:", error);

      await sock.sendMessage(from, {
        text: "❌ No pude generar el ranking."
      });
    }
  }
};
