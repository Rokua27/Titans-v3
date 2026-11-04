const { esAdmin } = require("../utils/admin");

module.exports = {
  nombre: "match",

  alias: [],

  categoria: "torneos",

  descripcion: "Administra un enfrentamiento del torneo.",

  uso: "!match",

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

      // ======================================
      // FORMATO:
      // !match EquipoA vs EquipoB 8:30PM
      // ======================================

      const texto = args.join(" ");

      if (!texto.includes(" vs ")) {
        return await sock.sendMessage(from, {
          text:
`❌ *Formato incorrecto*

Usa:
!match EquipoA vs EquipoB 8:30PM

Ejemplo:
!match Monster vs Grupo Niche 8:30PM`
        });
      }

      // Separar equipos y hora
      const partes = texto.split(" vs ");

      const equipoA = partes[0].trim();

      // Buscar la última palabra como hora
      const resto = partes[1].trim().split(" ");
      const hora = resto.pop();
      const equipoB = resto.join(" ").trim();

      if (!equipoA || !equipoB || !hora) {
        return await sock.sendMessage(from, {
          text: "❌ No pude interpretar los equipos o la hora."
        });
      }

      // ======================================
      // TARJETA PREMIUM
      // ======================================

      const mensaje =
`╔══════════════════════════════╗
║      ⚔️ 𝗠𝗔𝗧𝗖𝗛 𝗢𝗙𝗜𝗖𝗜𝗔𝗟 ⚔️      ║
╚══════════════════════════════╝

🆚 *ENFRENTAMIENTO*

🔵 ${equipoA}
⚡ 𝗩𝗦
🟣 ${equipoB}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 *PROGRAMACIÓN*
🕗 Hora: *${hora}*
🌎 Colombia 🇨🇴

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎮 *FORMATO*
BO3 — Mejor de 3

🏆 *LIGA TITANS TEAM*
⚔️ Competimos para jugar, jugamos para ser leyendas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

      await sock.sendMessage(from, {
        text: mensaje
      });

      console.log(`⚔️ Match anunciado: ${equipoA} vs ${equipoB} - ${hora}`);

    } catch (error) {
      console.error("❌ Error en match:", error);

      await sock.sendMessage(from, {
        text: "❌ No pude generar el anuncio del match."
      });
    }
  }
};
