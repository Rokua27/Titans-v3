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
      const raid = leerJSON("raid.json") || {};

      if (raid.estadoRecompensas === "pendiente") {
        return await sock.sendMessage(from, {
          text:
`📢 *TITANS TEAM · RAID GLOBAL*

╔══════════════════════════════╗
║     ⚠️ RECOMPENSAS PENDIENTES ║
╚══════════════════════════════╝

🛡️ Hay recompensas de un Raid anterior pendientes de confirmar.

No se iniciará otro jefe hasta resolver la entrega y proteger los premios de los participantes.

⚔️ Usa *!golpear* para reintentar la entrega pendiente.

🏆LIGA TITANS TEAM - TITANSB MIEMBRO VIRTUAL 🤖`
        });
      }

      if (raid.activo) {
        return await sock.sendMessage(from, {
          text:
`📢 *TITANS TEAM · RAID GLOBAL*

╔══════════════════════════════╗
║       🐉 RAID EN CURSO       ║
╚══════════════════════════════╝

⚠️ Ya existe un jefe activo. ¡La batalla continúa!

🐲 *JEFE:* ${raid.jefe}
❤️ *VIDA:* ${raid.vidaActual}/${raid.vidaMax}

⚔️ Usa *!golpear* para unirte al combate y contribuir al daño del equipo.

🏆LIGA TITANS TEAM - TITANSB MIEMBRO VIRTUAL 🤖`
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
      raid.estadoRecompensas = null;

      guardarJSON("raid.json", raid);

      const nombre = usuarios[sender]?.nombre || "Titán";

      const mensaje =
`📢 *TITANS TEAM · RAID GLOBAL*

╔══════════════════════════════╗
║    🐉 ¡UN TITÁN HA APARECIDO! ║
╚══════════════════════════════╝

🚨 *¡EL TITÁN DEL VACÍO HA DESPERTADO!*

👤 *Invocado por:* ${nombre}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🐲 *JEFE:* Titán del Vacío
❤️ *VIDA:* 25,000 / 25,000
⚔️ *PARTICIPANTES:* 0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💥 *¡LA BATALLA COMIENZA!*

Usa *!golpear* para atacar y ayudar a la comunidad a derrotarlo.

🎯 *SISTEMA DE DAÑO*
⚔️ Normal: 50–500
💥 Crítico: daño ×3
☠️ Fallo: 0 de daño

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎁 *RECOMPENSAS POR DERROTA*

💰 500 monedas
⭐ 300 XP
📦 1 Caja Épica

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏆LIGA TITANS TEAM - TITANSB MIEMBRO VIRTUAL 🤖`;

      await sock.sendMessage(from, { text: mensaje });

    } catch (error) {
      console.error("❌ Error raid:", error);
        monitor.registrarEvento("ERROR_SISTEMA",{estado:"ERROR",componente:"RAID",codigo:"SYSTEM_ERROR",descripcion:error.message});
    }
  }
};

