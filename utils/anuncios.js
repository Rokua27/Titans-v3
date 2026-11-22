async function anuncioGlobal(sock, from, tipo, datos) {

  let mensaje = "";

  switch (tipo) {

    case "jackpot":
      mensaje =
`╔══════════════════════════════╗
║    🏆 𝗝𝗔𝗖𝗞𝗣𝗢𝗧 𝗚𝗟𝗢𝗕𝗔𝗟 🏆     ║
╚══════════════════════════════╝

🌌 *¡LA RUEDA SE DETUVO EN EL PREMIO MÁXIMO!*

👤 *${datos.nombre}*
💰 *${datos.coins} monedas*

⚡ Toda la comunidad ha presenciado un JACKPOT LEGENDARIO.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎰 La Ruleta Titans vuelve a comenzar desde el valor base.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏆LIGA TITANS TEAM - TITANSB MIEMBRO VIRTUAL 🤖`;
      break;

    case "logro":
      mensaje =
`╔══════════════════════════════╗
║     🎖️ 𝗟𝗢𝗚𝗥𝗢 𝗚𝗟𝗢𝗕𝗔𝗟 🎖️      ║
╚══════════════════════════════╝

👤 *${datos.nombre}*

🏆 *${datos.logro}*
👑 Nuevo título: *${datos.titulo}*

⚡ La comunidad ha presenciado un ascenso legendario.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏆LIGA TITANS TEAM - TITANSB MIEMBRO VIRTUAL 🤖`;
      break;

    case "mitica":
      mensaje =
`╔══════════════════════════════╗
║     🌌 𝗗𝗥𝗢𝗣 𝗠Í𝗧𝗜𝗖𝗢 🌌      ║
╚══════════════════════════════╝

👤 *${datos.nombre}*

🟡 *${datos.objeto}*

📦 Rareza: *MÍTICA*
⚡ Probabilidad: *2%*

¡Toda la comunidad ha presenciado un DROP MÍTICO!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏆LIGA TITANS TEAM - TITANSB MIEMBRO VIRTUAL 🤖`;
      break;
  }

  if (mensaje) {
    await sock.sendMessage(from, { text: mensaje });
  }
}

module.exports = { anuncioGlobal };
