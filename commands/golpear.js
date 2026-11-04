const monitor = require("../utils/monitor");
const { leerJSON, guardarJSON } = require("../utils/database");
const { obtenerUsuario, guardarUsuario } = require("../utils/comunidad");

const cooldowns = new Map();

module.exports = {
  nombre: "golpear",

alias: [],

categoria: "eventos",

descripcion: "Ataca al jefe del Raid Global.",

permisos: ["usuario"],

uso: "!golpear",

  async ejecutar(sock, from, args, msg) {
    try {
      const sender = msg.key.participant || msg.key.remoteJid;

      const raid = leerJSON("raid.json");
      const usuarios = {};
      const inventarios = leerJSON("inventarios.json") || {};

      if (!raid.activo) {
        return await sock.sendMessage(from, {
          text: "🐉 No hay un Raid Global activo. Usa *!raid* para iniciarlo."
        });
      }

      // Cooldown 10s
      const ahora = Date.now();
      const ultimo = cooldowns.get(sender);

      if (ultimo && ahora - ultimo < 10000) {
        const restante = Math.ceil((10000 - (ahora - ultimo)) / 1000);

        return await sock.sendMessage(from, {
          text: `⏱️ Espera *${restante}s* antes de volver a atacar.`
        });
      }

      cooldowns.set(sender, ahora);

     const usuario = obtenerUsuario(sender);
      const nombre = usuario?.nombre || "Titán";

      // Generar daño
      const random = Math.random();

      let daño = 0;
      let tipo = "⚔️ GOLPE";

      // 10% fallo
      if (random < 0.10) {
        daño = 0;
        tipo = "☠️ FALLO";
      }
      // 15% crítico
      else if (random < 0.25) {
        daño = Math.floor((Math.random() * 450) + 150) * 3;
        tipo = "💥 CRÍTICO";
      }
      // Normal
      else {
        daño = Math.floor((Math.random() * 450) + 50);
      }

      // Aplicar daño
      raid.vidaActual = Math.max(0, raid.vidaActual - daño);

      // Registrar participante
      if (!raid.participantes[sender]) {
        raid.participantes[sender] = {
          nombre,
          dañoTotal: 0,
          golpes: 0
        };
      }

      raid.participantes[sender].dañoTotal += daño;
      raid.participantes[sender].golpes += 1;
      raid.participantes[sender].nombre = nombre;

      guardarJSON("raid.json", raid);

      // Mensaje de ataque
      const porcentaje = Math.floor((raid.vidaActual / raid.vidaMax) * 100);

      await sock.sendMessage(from, {
        text:
`╔══════════════════════════════╗
║        ⚔️ 𝗔𝗧𝗔𝗤𝗨𝗘 ⚔️         ║
╚══════════════════════════════╝

👤 *${nombre}*

${tipo}
💥 Daño: *${daño}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🐉 *${raid.jefe}*
❤️ *${raid.vidaActual}/${raid.vidaMax}*
📊 *${porcentaje}% restante*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏆 Tu daño total: *${raid.participantes[sender].dañoTotal}*
⚔️ Golpes: *${raid.participantes[sender].golpes}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      });

      // ¿Murió el jefe?
      if (raid.vidaActual <= 0) {

        // Ordenar leaderboard
        const ranking = Object.values(raid.participantes)
          .sort((a, b) => b.dañoTotal - a.dañoTotal)
          .slice(0, 5);

        let top = "";
        ranking.forEach((p, i) => {
          const medalla = ["🥇", "🥈", "🥉", "🏅", "🏅"][i];
          top += `${medalla} *${p.nombre}* — ${p.dañoTotal}\n`;
        });

        // Recompensas automáticas
        for (const id of Object.keys(raid.participantes)) {

       const jugador = obtenerUsuario(id);

jugador.coins = (jugador.coins || 0) + 500;
jugador.xp = (jugador.xp || 0) + 300;

guardarUsuario(id, jugador);

          // Dar caja épica
          if (!inventarios[id]) {
            inventarios[id] = { cajas: 0, objetos: [] };
          }

          inventarios[id].cajas += 1;
        }

        // Mensaje final épico
        const mensajeFinal =
`╔══════════════════════════════╗
║     🏆 𝗥𝗔𝗜𝗗 𝗖𝗢𝗠𝗣𝗟𝗘𝗧𝗔𝗗𝗢 🏆     ║
╚══════════════════════════════╝

🐉 *¡EL TITÁN DEL VACÍO HA SIDO DERROTADO!*

⚔️ La comunidad unió sus fuerzas y logró destruir al jefe legendario.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 *TOP DAÑO*

${top}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎁 *RECOMPENSAS ENTREGADAS*

💰 +500 monedas
⭐ +300 XP
📦 +1 Caja Épica

⚡ Todos los participantes recibieron automáticamente las recompensas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯 • 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗘𝘀𝗽𝗼𝗿𝘁𝘀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

        await sock.sendMessage(from, { text: mensajeFinal });

        // Resetear raid
        raid.activo = false;
        raid.vidaActual = raid.vidaMax;
        raid.participantes = {};
        raid.iniciadoPor = null;
        raid.fechaInicio = 0;

        guardarJSON("raid.json", raid);
        guardarJSON("inventarios.json", inventarios);
      }

    } catch (error) {
      console.error("❌ Error golpear:", error);
        monitor.registrarEvento("ERROR_SISTEMA",{estado:"ERROR",componente:"GOLPEAR",codigo:"SYSTEM_ERROR",descripcion:error.message});
    }
  }
};
