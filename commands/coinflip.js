const { obtenerUsuario, guardarUsuario } = require("../utils/comunidad");
const { puedeUsarComando } = require("../utils/limiteDiario");

module.exports = {
nombre: "coinflip",

alias: ["cf", "flip"],

categoria: "jugador",

descripcion: "Apuesta monedas lanzando una moneda.",

permisos: ["usuario"],

uso: "!coinflip <cara/cruz> <cantidad>",

  async ejecutar(sock, from, args, msg) {
    try {
      const sender = msg.key.participant || msg.key.remoteJid;
      const usuario = obtenerUsuario(sender);

// ======================================
// 🔒 LÍMITE DIARIO (3 USOS)
// ======================================

const limite = puedeUsarComando(sender, "coinflip", 3);

if (!limite.ok) {

    return await sock.sendMessage(from, {

        text:
`╔══════════════════════════════╗
║     🚫 LÍMITE ALCANZADO      ║
╚══════════════════════════════╝

🎰 Comando:
CoinFlip

❌ Has usado este comando
3 veces el día de hoy.

📅 Podrás volver a jugar
mañana.

━━━━━━━━━━━━━━━━━━━━━━

🤖 TitansBot v3`

    });

}

      // ======================================
      // 💰 VALIDAR APUESTA
      // ======================================

      const apuesta = parseInt(args[0]);

      if (!apuesta || apuesta <= 0) {
        return await sock.sendMessage(from, {
          text:
`╔══════════════════════════════╗
║      🎰 𝗖𝗢𝗜𝗡 𝗙𝗟𝗜𝗣 🎰       ║
╚══════════════════════════════╝

📌 *Uso correcto*

!coinflip cantidad [cara/cruz]

📝 *Ejemplos:*
!coinflip 500 cara
!coinflip 1000 cruz
!coinflip 250

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗖𝗔𝗦𝗜𝗡𝗢 𝗧𝗜𝗧𝗔𝗡𝗦
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        });
      }

      if (apuesta < 50) {
        return await sock.sendMessage(from, {
          text: "❌ La apuesta mínima es *50 monedas*."
        });
      }

      if (apuesta > usuario.coins) {
        return await sock.sendMessage(from, {
          text:
`╔══════════════════════════════╗
║      💸 𝗙𝗢𝗡𝗗𝗢𝗦 💸       ║
╚══════════════════════════════╝

No tienes suficientes monedas.

💰 Balance actual: *${usuario.coins}*
🎲 Apuesta solicitada: *${apuesta}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗖𝗔𝗦𝗜𝗡𝗢 𝗧𝗜𝗧𝗔𝗡𝗦
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        });
      }

      // ======================================
      // 🪙 ELECCIÓN DEL JUGADOR
      // ======================================

      let eleccion = "cara";

      if (args[1]) {
        const opcion = args[1].toLowerCase();

        if (opcion === "cara" || opcion === "cruz") {
          eleccion = opcion;
        }
      }

      // ======================================
      // 🎲 LANZAR MONEDA
      // ======================================

      const resultado = Math.random() < 0.5 ? "cara" : "cruz";
      const gano = eleccion === resultado;

      // ======================================
      // 💰 ACTUALIZAR ECONOMÍA
      // ======================================

      let cambio = 0;

      if (gano) {
        cambio = apuesta;
        usuario.coins += apuesta;
      } else {
        cambio = -apuesta;
        usuario.coins -= apuesta;
      }

      guardarUsuario(sender, usuario);

      // ======================================
      // 🎨 RESULTADO PREMIUM ESPORTS
      // ======================================

      const emojiResultado = resultado === "cara" ? "🟡" : "⚫";
      const estado = gano ? "🏆 ¡GANASTE!" : "💥 ¡PERDISTE!";

      await sock.sendMessage(from, {
        text:
`╔══════════════════════════════╗
║      🎰 𝗖𝗢𝗜𝗡 𝗙𝗟𝗜𝗣 🎰       ║
╚══════════════════════════════╝

🪙 *LA MONEDA GIRA EN EL AIRE...*

✨ *RESULTADO OFICIAL*

${emojiResultado} *${resultado.toUpperCase()}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Tu elección: *${eleccion.toUpperCase()}*
${estado}

${gano ? "💰 Ganancia" : "💸 Pérdida"}: *${Math.abs(cambio)} monedas*
🏦 Balance actual: *${usuario.coins} monedas*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${gano
  ? "🔥 La fortuna sonríe a los verdaderos titanes."
  : "⚔️ Todo campeón conoce la derrota antes de la gloria."}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗖𝗔𝗦𝗜𝗡𝗢 𝗧𝗜𝗧𝗔𝗡𝗦
🎮 Riesgo • Suerte • Leyendas
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯 • 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗘𝘀𝗽𝗼𝗿𝘁𝘀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      });

    } catch (error) {
      console.error("❌ Error coinflip:", error);

      await sock.sendMessage(from, {
        text:
`╔══════════════════════════════╗
║       ❌ 𝗘𝗥𝗥𝗢𝗥 ❌        ║
╚══════════════════════════════╝

No pude procesar la apuesta.

🔧 Inténtalo nuevamente en unos segundos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯`
      });
    }
  }
};
