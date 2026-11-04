const { leerJSON } = require("../utils/database");

module.exports = {
  nombre: "topraid",

alias: [],

categoria: "eventos",

descripcion: "Ranking de daño del Raid Global.",

permisos: ["usuario"],

uso: "!topraid",

  async ejecutar(sock, from) {
    const raid = leerJSON("raid.json");

    if (!raid.activo) {
      return await sock.sendMessage(from, {
        text: "🐉 No hay un Raid Global activo."
      });
    }

    const ranking = Object.values(raid.participantes)
      .sort((a, b) => b.dañoTotal - a.dañoTotal)
      .slice(0, 10);

    let lista = "";

    ranking.forEach((p, i) => {
      const medalla = ["🥇", "🥈", "🥉"][i] || "🏅";
      lista += `${medalla} *${p.nombre}* — ${p.dañoTotal}\n`;
    });

    await sock.sendMessage(from, {
      text:
`╔══════════════════════════════╗
║      📊 𝗧𝗢𝗣 𝗥𝗔𝗜𝗗 📊        ║
╚══════════════════════════════╝

🐉 *${raid.jefe}*
❤️ *${raid.vidaActual}/${raid.vidaMax}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${lista || "Aún no hay participantes."}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    });
  }
};
