const monitor = require("../utils/monitor");
const { leerJSON, guardarJSON } = require("../utils/database");
const { obtenerUsuario, guardarUsuario, aplicarXPRecompensa } = require("../utils/comunidad");
const { puedeUsarComando } = require("../utils/limiteDiario");
const { anuncioGlobal } = require("../utils/anuncios");

// Cooldown en memoria
const cooldowns = new Map();

module.exports = {
  nombre: "ruleta",

alias: [],

categoria: "jugador",

descripcion: "Apuesta monedas en la ruleta.",

permisos: ["usuario"],

uso: "!ruleta <cantidad>",

  async ejecutar(sock, from, args, msg) {
    try {
      const sender = msg.key.participant || msg.key.remoteJid;

     const usuario = obtenerUsuario(sender);
      const dataRuleta = leerJSON("ruleta.json") || { jackpot: 5000 };

// ======================================
// 🔒 LÍMITE DIARIO (3 USOS)
// ======================================

const limite = puedeUsarComando(sender, "ruleta", 3);

if (!limite.ok) {

    return await sock.sendMessage(from, {

        text:
`╔══════════════════════════════╗
║     🚫 LÍMITE ALCANZADO      ║
╚══════════════════════════════╝

🎰 Comando:
Ruleta

❌ Ya utilizaste este comando
3 veces el día de hoy.

📅 Vuelve mañana para seguir jugando.

━━━━━━━━━━━━━━━━━━━━━━

🤖 TitansBot v3`

    });

}

      const nombre = usuario.nombre || "Titán";

      // ======================================
      // ⏱️ COOLDOWN (30 segundos)
      // ======================================

      const ahora = Date.now();
      const ultimoUso = cooldowns.get(sender);

      if (ultimoUso && ahora - ultimoUso < 30000) {
        const restante = Math.ceil((30000 - (ahora - ultimoUso)) / 1000);

        return await sock.sendMessage(from, {
          text:
`╔══════════════════════════════╗
║      ⏱️ 𝗖𝗢𝗢𝗟𝗗𝗢𝗪𝗡 ⏱️       ║
╚══════════════════════════════╝

🎡 La ruleta aún se está recargando.

⌛ Espera *${restante} segundos* para volver a jugar.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯`
        });
      }

      // ======================================
      // 💰 COSTO DE JUGAR
      // ======================================

      const costo = 100;

      if ((usuario.coins || 0) < costo) {
        return await sock.sendMessage(from, {
          text:
`╔══════════════════════════════╗
║     💸 𝗦𝗜𝗡 𝗙𝗢𝗡𝗗𝗢𝗦 💸     ║
╚══════════════════════════════╝

🎡 La Ruleta Titans requiere *${costo} monedas*.

💰 Tus monedas: *${usuario.coins || 0}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚔️ Participa en la comunidad para ganar más monedas.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        });
      }

      // Descontar costo
      usuario.coins -= costo;

      // 20% del costo va al jackpot
      dataRuleta.jackpot += 20;

      // Activar cooldown
      cooldowns.set(sender, ahora);

      // ======================================
      // 🎰 ANIMACIÓN
      // ======================================

      await sock.sendMessage(from, {
        text:
`╔══════════════════════════════╗
║      🎡 𝗥𝗨𝗟𝗘𝗧𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 🎡      ║
╚══════════════════════════════╝

🎰 *Girando la ruleta...*

🟢 💰 200
🔵 ⭐ XP x2
🟣 💎 Caja Épica
🔴 ☠️ Pierdes 50
🟡 🏆 JACKPOT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 Jackpot actual: *${dataRuleta.jackpot} monedas*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚔️ La suerte de los titanes decidirá tu destino...`
      });

      // Pequeña pausa para efecto visual
      await new Promise(resolve => setTimeout(resolve, 2000));

      // ======================================
      // 🎲 RESULTADOS
      // ======================================

      const random = Math.random();

      let titulo = "";
      let descripcion = "";
      let recompensaCoins = 0;
      let recompensaXP = 0;

      // 1% JACKPOT
      if (random < 0.01) {

        recompensaCoins = dataRuleta.jackpot;
        dataRuleta.jackpot = 5000;

        titulo = "🏆 JACKPOT LEGENDARIO";
        descripcion = `💰 Has ganado el JACKPOT de *${recompensaCoins} monedas*.`;

await anuncioGlobal(sock, from, "jackpot", {
    nombre: usuario.nombre || "Titán",
    coins: recompensaCoins
});

      // 9% GRAN PREMIO
      } else if (random < 0.10) {

        recompensaCoins = 1000;
        titulo = "💎 GRAN PREMIO";
        descripcion = "💰 Has obtenido *1000 monedas*.";

      // 20% PREMIO MEDIO
      } else if (random < 0.30) {

        recompensaCoins = 400;
        titulo = "🎁 PREMIO ÉPICO";
        descripcion = "💰 Has ganado *400 monedas*.";

      // 25% PREMIO PEQUEÑO
      } else if (random < 0.55) {

        recompensaCoins = 200;
        titulo = "💰 PREMIO";
        descripcion = "💰 Has ganado *200 monedas*.";

      // 20% XP
      } else if (random < 0.75) {

        recompensaXP = 100;
        titulo = "⭐ XP DOBLE";
        descripcion = "⭐ Has obtenido *100 XP*.";

      // 15% PÉRDIDA
      } else if (random < 0.90) {

        recompensaCoins = -50;
        titulo = "☠️ MALA SUERTE";
        descripcion = "💸 La ruleta te quitó *50 monedas adicionales*.";

      // 10% NADA
      } else {

        titulo = "😶 CASILLA VACÍA";
        descripcion = "🎡 Esta vez no obtuviste ninguna recompensa.";
      }

      // ======================================
      // 💳 APLICAR RECOMPENSAS
      // ======================================

        let resultadoXP = null;

        if (recompensaXP > 0) {
          resultadoXP = aplicarXPRecompensa(usuario, recompensaXP);

          if (!resultadoXP || resultadoXP.motivo !== "otorgada") {
            throw new Error("No se pudo aplicar la XP de la ruleta.");
          }
        }

        usuario.coins = Math.max(
          0,
          (usuario.coins || 0) + recompensaCoins
        );

        // Guardar perfil y jackpot
        guardarUsuario(sender, usuario);
        await guardarJSON("ruleta.json", dataRuleta);

      // ======================================
      // ✨ MENSAJE FINAL PREMIUM
      // ======================================

      const mensajeFinal =
`╔══════════════════════════════╗
║        🎉 𝗥𝗘𝗦𝗨𝗟𝗧𝗔𝗗𝗢 🎉        ║
╚══════════════════════════════╝

👤 *${nombre}*

🏅 *${titulo}*

${descripcion}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 Monedas actuales: *${usuario.coins}*
⭐ XP actual: *${usuario.xp}*
  ${resultadoXP && resultadoXP.monedasNivel > 0
    ? `🏅 +${resultadoXP.monedasNivel} monedas por subir ${resultadoXP.nivelesGanados} nivel(es)`
    : ""}
🏆 Jackpot: *${dataRuleta.jackpot}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎰 *Probabilidades Premium*

🟡 JACKPOT → 1%
🟣 ÉPICO → 20%
🔵 XP → 20%
🔴 PÉRDIDA → 15%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯 • 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗘𝘀𝗽𝗼𝗿𝘁𝘀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

      await sock.sendMessage(from, { text: mensajeFinal });

    } catch (error) {
      console.error("❌ Error ruleta:", error);
        monitor.registrarEvento("ERROR_SISTEMA",{estado:"ERROR",componente:"RULETA",codigo:"SYSTEM_ERROR",descripcion:error.message});

      await sock.sendMessage(from, {
        text: "❌ Ocurrió un error al girar la ruleta."
      });
    }
  }
};
