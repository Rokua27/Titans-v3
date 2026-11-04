const { esAdmin } = require("../utils/admin");
const { leerJSON, guardarJSON } = require("../utils/database");

module.exports = {
  nombre: "advance",

alias: [],

categoria: "admin",

descripcion: "Avanza automáticamente el torneo.",

permisos: ["admin"],

uso: "!advance",

  async ejecutar(sock, from, args, msg) {
    try {
      // ======================================
      // 🔐 SOLO ADMINISTRADORES
      // ======================================
      const sender = msg.key.participant || msg.key.remoteJid;

      if (!(await esAdmin(sock, from, sender))) {
        return await sock.sendMessage(from, {
          text: "❌ Solo los administradores pueden usar este comando."
        });
      }

      // ======================================
      // 🏆 EQUIPO GANADOR
      // ======================================
      const equipo = args.join(" ").trim();

      if (!equipo) {
        return await sock.sendMessage(from, {
          text: "❌ Usa: !advance NombreDelEquipo"
        });
      }

      const b = leerJSON("bracket.json");

      if (!b || !b.octavos) {
        return await sock.sendMessage(from, {
          text: "❌ No hay un bracket creado."
        });
      }

      // ======================================
      // 🔥 REGISTRAR GANADOR EN OCTAVOS
      // ======================================
      const match = b.octavos.find(
        m =>
          m.a.toLowerCase() === equipo.toLowerCase() ||
          m.b.toLowerCase() === equipo.toLowerCase()
      );

      if (!match) {
        return await sock.sendMessage(from, {
          text: "❌ Equipo no encontrado en OCTAVOS."
        });
      }

      // Ya tenía ganador
      if (match.ganador) {
        return await sock.sendMessage(from, {
          text: "⚠️ Ese enfrentamiento ya tiene un ganador registrado."
        });
      }

      match.ganador = equipo;

      // ======================================
      // 🧠 GENERAR CUARTOS AUTOMÁTICAMENTE
      // ======================================
      const ganadores = b.octavos
        .filter(m => m.ganador)
        .map(m => m.ganador);

      // Crear cruces solo cuando haya pares
      b.cuartos = [];

      for (let i = 0; i < ganadores.length; i += 2) {
        if (ganadores[i + 1]) {
          b.cuartos.push({
            a: ganadores[i],
            b: ganadores[i + 1],
            ganador: null
          });
        }
      }

      guardarJSON("bracket.json", b);

      // ======================================
      // 📢 MENSAJE PREMIUM
      // ======================================
      let extra = "";

      if (b.cuartos.length > 0) {
        extra = "\n\n⚔️ *CUARTOS ACTUALIZADOS AUTOMÁTICAMENTE*";
      }

      await sock.sendMessage(from, {
        text:
`╔══════════════════════════════╗
║      🏆 𝗔𝗩𝗔𝗡𝗖𝗘 𝗢𝗙𝗜𝗖𝗜𝗔𝗟 🏆     ║
╚══════════════════════════════╝

👑 *GANADOR REGISTRADO*

🏆 ${equipo}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 El equipo avanza en el bracket de playoffs.${extra}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👑 *LIGA TITANS TEAM*
⚔️ Camino al campeonato
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      });

      console.log(`🏆 Avance registrado: ${equipo}`);

    } catch (error) {
      console.error("❌ Error advance:", error);

      await sock.sendMessage(from, {
        text: "❌ No pude registrar el avance."
      });
    }
  }
};
