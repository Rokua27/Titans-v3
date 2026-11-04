const { leerJSON } = require("../utils/database");

module.exports = {
  nombre: "bracket",

  alias: [],

  categoria: "torneos",

  descripcion: "Visualiza el bracket del torneo.",

  uso: "!bracket",

  permisos: ["usuario"],

  async ejecutar(sock, from) {
    try {
      const b = leerJSON("bracket.json");

      if (!b || !b.octavos) {
        return await sock.sendMessage(from, {
          text: "📭 No hay un bracket creado. Usa !setbracket"
        });
      }

      // ======================================
      // 🏆 OCTAVOS
      // ======================================
      let octavos = "";

      b.octavos.forEach((m, i) => {
        octavos += `(${i + 1}) ${m.a} 🆚 ${m.b}\n`;

        if (m.ganador) {
          octavos += `   👑 Ganador: ${m.ganador}\n`;
        }
      });

      // ======================================
      // ⚔️ CUARTOS (RECONSTRUIDOS EN TIEMPO REAL)
      // ======================================

      const g1 = b.octavos[0]?.ganador || "Pendiente";
      const g2 = b.octavos[1]?.ganador || "Pendiente";
      const g3 = b.octavos[2]?.ganador || "Pendiente";
      const g4 = b.octavos[3]?.ganador || "Pendiente";

      const cuartos =
`(1) ${g1} 🆚 ${g2}
(2) ${g3} 🆚 ${g4}`;

      // ======================================
      // 🥈 SEMIFINALES
      // ======================================
      let semifinales = "Pendiente...";

      if (b.semifinales && b.semifinales.length > 0) {
        semifinales = "";

        b.semifinales.forEach((m, i) => {
          semifinales += `(${i + 1}) ${m.a} 🆚 ${m.b}\n`;
        });
      }

      // ======================================
      // 👑 FINAL
      // ======================================
      let final = "Pendiente...";

      if (b.final && b.final.length > 0) {
        final = "";

        b.final.forEach((m, i) => {
          final += `(${i + 1}) ${m.a} 🆚 ${m.b}\n`;
        });
      }

      // ======================================
      // 🎨 MENSAJE PREMIUM ESPORTS
      // ======================================

      const mensaje =
`╔══════════════════════════════╗
║       🏆 𝗣𝗟𝗔𝗬𝗢𝗙𝗙𝗦 🏆        ║
╚══════════════════════════════╝

⚔️ 𝗢𝗖𝗧𝗔𝗩𝗢𝗦
${octavos}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚔️ 𝗖𝗨𝗔𝗥𝗧𝗢𝗦 𝗗𝗘 𝗙𝗜𝗡𝗔𝗟
${cuartos}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚔️ 𝗦𝗘𝗠𝗜𝗙𝗜𝗡𝗔𝗟𝗘𝗦
${semifinales}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚔️ 𝗙𝗜𝗡𝗔𝗟
${final}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👑 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
⚔️ Camino al campeonato
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯 • 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗘𝘀𝗽𝗼𝗿𝘁𝘀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

      await sock.sendMessage(from, { text: mensaje });

    } catch (error) {
      console.error("❌ Error bracket:", error);

      await sock.sendMessage(from, {
        text: "❌ No pude mostrar el bracket."
      });
    }
  }
};
