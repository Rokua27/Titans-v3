const { obtenerUsuario, guardarUsuario, aplicarXPRecompensa } = require("../utils/comunidad");

module.exports = {
  nombre: "daily",

categoria: "jugador",

descripcion: "Reclama tu recompensa diaria.",

uso: "!daily",

permisos: ["usuario"],

alias: [],

  async ejecutar(sock, from, args, msg) {
    try {
      const sender = msg.key.participant || msg.key.remoteJid;
      const usuario = obtenerUsuario(sender);

      const ahora = Date.now();
      const cooldown = 24 * 60 * 60 * 1000; // 24 horas
      const restante = cooldown - (ahora - usuario.daily);

      // ======================================
      // ⏰ COOLDOWN
      // ======================================

      if (usuario.daily && restante > 0) {
        const horas = Math.floor(restante / (1000 * 60 * 60));
        const minutos = Math.floor(
          (restante % (1000 * 60 * 60)) / (1000 * 60)
        );

        return await sock.sendMessage(from, {
          text:
`╔══════════════════════════════╗
║      ⏰ 𝗗𝗔𝗜𝗟𝗬 𝗖𝗢𝗢𝗟𝗗𝗢𝗪𝗡 ⏰     ║
╚══════════════════════════════╝

🎁 Ya reclamaste tu recompensa de hoy.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🕒 𝗧𝗜𝗘𝗠𝗣𝗢 𝗥𝗘𝗦𝗧𝗔𝗡𝗧𝗘
⏳ ${horas}h ${minutos}m

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 Racha actual: *${usuario.racha} días*

🎯 Vuelve más tarde para seguir acumulando recompensas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
🎮 Economía • Progresión • Comunidad
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯 • 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗘𝘀𝗽𝗼𝗿𝘁𝘀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        });
      }

      // ======================================
      // 🔥 CALCULAR RACHA
      // ======================================

      const unDia = 24 * 60 * 60 * 1000;

      if (usuario.daily && ahora - usuario.daily <= unDia + (2 * 60 * 60 * 1000)) {
        usuario.racha += 1;
      } else {
        usuario.racha = 1;
      }

      // ======================================
      // 🎁 RECOMPENSAS APROBADAS
      // ======================================

      const bonusRacha =
        usuario.racha >= 14 ? 75 :
        usuario.racha >= 7 ? 50 :
        usuario.racha >= 4 ? 25 : 0;

      const recompensaCoins = 300 + bonusRacha;
      const recompensaXP = 25;

      const resultadoXP = aplicarXPRecompensa(usuario, recompensaXP);

      if (!resultadoXP || resultadoXP.motivo !== "otorgada") {
        throw new Error("No se pudo aplicar la XP de la recompensa diaria.");
      }

      usuario.coins += recompensaCoins;
      usuario.daily = ahora;

      guardarUsuario(sender, usuario);

      // ======================================
      // 📢 ANUNCIO PREMIUM ESPORTS
      // ======================================

      await sock.sendMessage(from, {
        text:
`╔══════════════════════════════╗
║      🎁 𝗗𝗔𝗜𝗟𝗬 𝗖𝗟𝗔𝗜𝗠 🎁      ║
╚══════════════════════════════╝

👑 *RECOMPENSA RECLAMADA*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 +${recompensaCoins} monedas
⭐ +${recompensaXP} XP
${resultadoXP.monedasNivel > 0
  ? `🏅 +${resultadoXP.monedasNivel} monedas por subir ${resultadoXP.nivelesGanados} nivel(es)`
  : ""}
🔥 Racha diaria: *${usuario.racha} días*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Cuanto mayor sea tu racha, mayores serán las recompensas.

📅 Vuelve mañana para seguir acumulando beneficios exclusivos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
🎮 Economía • Progresión • Comunidad
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯 • 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗘𝘀𝗽𝗼𝗿𝘁𝘀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      });

    } catch (error) {
      console.error("❌ Error daily:", error);

      await sock.sendMessage(from, {
        text:
`╔══════════════════════════════╗
║       ❌ 𝗘𝗥𝗥𝗢𝗥 ❌        ║
╚══════════════════════════════╝

No pude entregar la recompensa diaria.

🔧 Inténtalo nuevamente en unos segundos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯`
      });
    }
  }
};
