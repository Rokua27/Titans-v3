const { esAdmin } = require("../utils/admin");
const { leerJSON, guardarJSON } = require("../utils/database");
const { obtenerFixture } = require("../utils/torneoManager");

module.exports = {
  nombre: "matchlive",

  alias: [],

  categoria: "torneos",

  descripcion: "Gestiona una partida en vivo.",

  uso: "!matchlive",

  permisos: ["admin"],

  async ejecutar(sock, from, args, msg) {
    try {
      const sender = msg.key.participant || msg.key.remoteJid;

      if (!(await esAdmin(sock, from, sender))) {
        return await sock.sendMessage(from, {
          text: "❌ Solo los administradores pueden usar este comando."
        });
      }

      const texto = args.join(" ");

      if (!texto.includes(" vs ")) {
        return await sock.sendMessage(from, {
          text: "❌ Usa: !matchlive EquipoA vs EquipoB"
        });
      }

      const [equipoA, equipoB] = texto.split(" vs ").map(t => t.trim());

        const fixture = obtenerFixture();
        const normalizar = texto =>
          String(texto || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();

        const partido = fixture.enfrentamientos.find(p => {
          const a = normalizar(p.equipo1);
          const b = normalizar(p.equipo2);
          const x = normalizar(equipoA);
          const y = normalizar(equipoB);

          return (
            p.estado !== "finalizado" &&
            ((a === x && b === y) || (a === y && b === x))
          );
        });

        if (!partido) {
          return await sock.sendMessage(from, {
            text: "❌ Ese enfrentamiento no existe como partido pendiente en el fixture oficial."
          });
        }

      const live = leerJSON("liveMatches.json") || {};

      live[from] = {
        equipoA,
        equipoB,
        partidoNumero: partido.numero,
        fechaProgramada: partido.fecha || null,
        horaProgramada: partido.hora || null,
        scoreA: 0,
        scoreB: 0,
        estado: "LIVE",
        iniciado: new Date().toLocaleString("es-CO")
      };

      guardarJSON("liveMatches.json", live);

      await sock.sendMessage(from, {
        text:
`╔══════════════════════════════╗
║        🔴 𝗘𝗡 𝗩𝗜𝗩𝗢 🔴        ║
╚══════════════════════════════╝

⚔️ *SERIE OFICIAL BO3*

🔵 ${equipoA}
🟣 ${equipoB}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 Fecha programada: ${partido.fecha || "No especificada"}
🕒 Hora programada: ${partido.hora || "No especificada"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 *MARCADOR*
${equipoA} 0 - 0 ${equipoB}

🎮 Formato: BO3
🏆 Liga Titans Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📢 Usa:
• !game ${equipoA}
• !game ${equipoB}`
      });

    } catch (error) {
      console.error("❌ Error matchlive:", error);

      await sock.sendMessage(from, {
        text: "❌ No pude iniciar el match en vivo."
      });
    }
  }
};
