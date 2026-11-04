const monitor = require("../utils/monitor");
const { leerJSON, guardarJSON } = require("../utils/database");

module.exports = {
  nombre: "raid",

alias: [],

categoria: "eventos",

descripcion: "Muestra el estado del Raid Global.",

permisos: ["usuario"],

uso: "!raid",

  async ejecutar(sock, from, args, msg) {
    try {
      const sender = msg.key.participant || msg.key.remoteJid;
      const usuarios = leerJSON("usuarios.json") || {};
      const raid = leerJSON("raid.json");

      if (raid.activo) {
        return await sock.sendMessage(from, {
          text:
`⚠️ Ya hay un Raid Global activo.

🐉 *${raid.jefe}*
❤️ Vida: *${raid.vidaActual}/${raid.vidaMax}*

Usa *!golpear* para atacar.`
        });
      }

      // Iniciar raid
      raid.activo = true;
      raid.jefe = "Titán del Vacío";
      raid.vidaMax = 25000;
      raid.vidaActual = 25000;
      raid.participantes = {};
      raid.iniciadoPor = sender;
      raid.fechaInicio = Date.now();

      guardarJSON("raid.json", raid);

      const nombre = usuarios[sender]?.nombre || "Titán";

      const mensaje =
`╔══════════════════════════════╗
║      🐉 𝗥𝗔𝗜𝗗 𝗚𝗟𝗢𝗕𝗔𝗟 🐉       ║
╚══════════════════════════════╝

🚨 *¡EL TITÁN DEL VACÍO HA APARECIDO!*

👤 Invocado por: *${nombre}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🐲 *Jefe:* Titán del Vacío
❤️ *Vida:* 25,000 / 25,000
⚔️ *Participantes:* 0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💥 Usa *!golpear* para atacar.

🎯 Daño posible:
• Normal → 50-500
• Crítico → x3
• Fallo → 0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎁 *Recompensas al derrotarlo*

💰 500 monedas
⭐ 300 XP
📦 1 Caja Épica

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯 • 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗘𝘀𝗽𝗼𝗿𝘁𝘀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

      await sock.sendMessage(from, { text: mensaje });

    } catch (error) {
      console.error("❌ Error raid:", error);
        monitor.registrarEvento("ERROR_SISTEMA",{estado:"ERROR",componente:"RAID",codigo:"SYSTEM_ERROR",descripcion:error.message});
    }
  }
};

