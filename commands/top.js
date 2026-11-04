const { leerJSON } = require("../utils/database");

function obtenerTop(usuarios, criterio, limite = 10) {
  return Object.entries(usuarios)
    .sort((a, b) => (b[1][criterio] || 0) - (a[1][criterio] || 0))
    .slice(0, limite);
}

// Obtener nombre del jugador
async function obtenerNombre(sock, id) {
  try {
    const usuarios = leerJSON("usuarios.json") || {};

    if (usuarios[id]?.nombre) {
      return usuarios[id].nombre;
    }

    return "Titán";

  } catch (e) {
    return "Titán";
  }
}

module.exports = {
  nombre: "top",

categoria: "jugador",

descripcion: "Muestra el Top general.",

uso: "!top",

permisos: ["usuario"],

alias: [],

  async ejecutar(sock, from, args, msg) {
    try {
      const texto =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        "";

      const comandoUsado = texto
        .split(" ")[0]
        .replace("!", "")
        .toLowerCase();

      const usuarios = leerJSON("usuarios.json") || {};

      if (Object.keys(usuarios).length === 0) {
        return await sock.sendMessage(from, {
          text: "📭 Aún no hay jugadores registrados en el sistema."
        });
      }

      // Configuración por defecto
      let criterio = "nivel";
      let titulo = "👑 𝗧𝗢𝗣 𝗧𝗜𝗧𝗔𝗡𝗦";
      let icono = "🏅";

      // Variantes
      if (comandoUsado === "topxp") {
        criterio = "xp";
        titulo = "⭐ 𝗧𝗢𝗣 𝗫𝗣";
        icono = "⭐";
      }

      if (comandoUsado === "topcoins") {
        criterio = "coins";
        titulo = "💰 𝗧𝗢𝗣 𝗙𝗢𝗥𝗧𝗨𝗡𝗔";
        icono = "💰";
      }

      if (comandoUsado === "topmensajes") {
        criterio = "mensajes";
        titulo = "💬 𝗧𝗢𝗣 𝗔𝗖𝗧𝗜𝗩𝗜𝗗𝗔𝗗";
        icono = "💬";
      }

      const top = obtenerTop(usuarios, criterio);

      let ranking = "";

      for (let i = 0; i < top.length; i++) {
        const [id, data] = top[i];

        const nombre = await obtenerNombre(sock, id);

        let medalla = "🏅";
        if (i === 0) medalla = "🥇";
        else if (i === 1) medalla = "🥈";
        else if (i === 2) medalla = "🥉";

        ranking += `${medalla} *${nombre}*\n`;
        ranking += `   ${icono} *${data[criterio] || 0}*\n\n`;
      }

      const mensaje =
`╔══════════════════════════════╗
║       ${titulo}       ║
╚══════════════════════════════╝

🏆 𝗥𝗔𝗡𝗞𝗜𝗡𝗚 𝗚𝗟𝗢𝗕𝗔𝗟

${ranking}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 Los verdaderos titanes no solo juegan...
👑 *Compiten por la gloria eterna.*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
🌟 Comunidad • Economía • Leyendas
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯 • 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗘𝘀𝗽𝗼𝗿𝘁𝘀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

      await sock.sendMessage(from, { text: mensaje });

    } catch (error) {
      console.error("❌ Error top:", error);

      await sock.sendMessage(from, {
        text: "❌ No pude mostrar el ranking global."
      });
    }
  }
};
