const { leerJSON } = require("../utils/database");

module.exports = {
  nombre: "anuncio",

  alias: [],

  categoria: "admin",

  descripcion: "Muestra el anuncio oficial.",

  uso: "!anuncio",

  permisos: ["usuario"],

  async ejecutar(sock, from) {
    const a = leerJSON("anuncio.json");

    const mensaje = `
╔══════════════════════╗
║      📢 𝗔𝗡𝗨𝗡𝗖𝗜𝗢 𝗢𝗙𝗜𝗖𝗜𝗔𝗟 📢      ║
╚══════════════════════╝

🏆 *LIGA TITANS TEAM*

━━━━━━━━━━━━━━━━━━━━━━

📅 *Fecha:* ${a.fecha || "Sin fecha"}
👤 *Emitido por:* ${a.autor}

━━━━━━━━━━━━━━━━━━━━━━

📝 *Comunicado:*

${a.contenido || "No hay anuncios activos."}

━━━━━━━━━━━━━━━━━━━━━━

⚠️ *Mantente atento a las actualizaciones oficiales del torneo.*

💜 *Liga Titans Team*
━━━━━━━━━━━━━━━━━━━━━━
`;

    await sock.sendMessage(from, { text: mensaje });
  }
};
