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
        text: "📢 *TITANS TEAM · RAID GLOBAL*\n\n╔══════════════════════════════╗\n║       🐉 RAID INACTIVO       ║\n╚══════════════════════════════╝\n\nNo hay ningún jefe activo en este momento.\n\n⚔️ Usa *!raid* para iniciar el combate.\n\n🏆LIGA TITANS TEAM - TITANSB MIEMBRO VIRTUAL 🤖"
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
`📢 *TITANS TEAM · RAID GLOBAL*

╔══════════════════════════════╗
║       🏆 CLASIFICACIÓN       ║
╚══════════════════════════════╝

🐉 *JEFE:* ${raid.jefe}
❤️ *VIDA RESTANTE:* ${raid.vidaActual}/${raid.vidaMax}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚔️ *TOP 10 · MAYOR DAÑO*

${lista || "Aún no hay participantes registrados."}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🥇 Cada posición se determina por el daño total acumulado.

🏆LIGA TITANS TEAM - TITANSB MIEMBRO VIRTUAL 🤖`
    });
  }
};
