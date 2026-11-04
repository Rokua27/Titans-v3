const { leerJSON } = require("../utils/database");

module.exports = {
  nombre: "resultado",

  alias: ["resultados"],

  categoria: "ligas",

  descripcion: "Consulta los resultados registrados.",

  uso: "!resultado",

  permisos: ["usuario"],

  async ejecutar(sock, from) {
    const data = leerJSON("resultados.json") || { resultados: [] };

    if (data.resultados.length === 0) {
      return await sock.sendMessage(from, {
        text: "🏅 Aún no hay resultados registrados."
      });
    }

    let lista = "";

    data.resultados.forEach((r, i) => {
      lista += `${i + 1}. ${r.texto}\n📅 ${r.fecha}\n\n`;
    });

    const mensaje = `
╔══════════════════════╗
║    🏅 𝗨𝗟𝗧𝗜𝗠𝗢𝗦 𝗥𝗘𝗦𝗨𝗟𝗧𝗔𝗗𝗢𝗦    ║
╚══════════════════════╝

🏆 *LIGA TITANS TEAM*

━━━━━━━━━━━━━━━━━━━━━━

${lista}━━━━━━━━━━━━━━━━━━━━━━

📊 Actualización oficial del torneo
💜 *TitansBot v3*
━━━━━━━━━━━━━━━━━━━━━━
`;

    await sock.sendMessage(from, { text: mensaje });
  }
};
