const { leerJSON } = require("../utils/database");

module.exports = {
  nombre: "jornada",

  alias: [],

  categoria: "ligas",

  descripcion: "Consulta una jornada específica.",

  uso: "!jornada <número>",

  permisos: ["usuario"],

  async ejecutar(sock, from, args) {
    try {
      const numero = args[0];

      if (!numero) {
        return await sock.sendMessage(from, {
          text: "❌ Usa: !jornada 7"
        });
      }

      const jornadas = leerJSON("jornadas.json") || {};
      const jornada = jornadas[numero];

      if (!jornada) {
        return await sock.sendMessage(from, {
          text: `📭 No hay programación registrada para la Jornada ${numero}.`
        });
      }

      let lista = "";

      jornada.partidos.forEach((partido, i) => {
        lista += `🎮 *Partido ${i + 1}*\n🆚 ${partido}\n\n`;
      });

      await sock.sendMessage(from, {
        text:
`╔══════════════════════════════╗
║      ⚔️ 𝗝𝗢𝗥𝗡𝗔𝗗𝗔 ${numero} ⚔️      ║
╚══════════════════════════════╝

📅 *PROGRAMACIÓN OFICIAL*

${lista}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎮 *FORMATO*
BO3 — Mejor de 3

🌎 *HORA OFICIAL*
Colombia 🇨🇴

🏆 *LIGA TITANS TEAM*
⚔️ Competimos para jugar, jugamos para ser leyendas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      });

    } catch (error) {
      console.error("❌ Error jornada:", error);

      await sock.sendMessage(from, {
        text: "❌ No pude mostrar la jornada."
      });
    }
  }
};
