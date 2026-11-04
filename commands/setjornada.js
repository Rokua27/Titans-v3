const { esAdmin } = require("../utils/admin");
const { leerJSON, guardarJSON } = require("../utils/database");

module.exports = {
  nombre: "setjornada",

  alias: [],

  categoria: "admin",

  descripcion: "Actualiza la información de una jornada.",

  uso: "!setjornada",

  permisos: ["admin"],

  async ejecutar(sock, from, args, msg) {
    try {
      // 🔐 Solo admins
      const sender = msg.key.participant || msg.key.remoteJid;

      if (!(await esAdmin(sock, from, sender))) {
        return await sock.sendMessage(from, {
          text: "❌ Solo los administradores pueden usar este comando."
        });
      }

      // Formato:
      // !setjornada 7 | Match1 | Match2 | Match3

      const texto = args.join(" ");
      const partes = texto.split("|").map(p => p.trim());

      if (partes.length < 2) {
        return await sock.sendMessage(from, {
          text:
`❌ *Formato incorrecto*

Ejemplo:
!setjornada 7 | Monster vs Grupo Niche 8:30PM | Team Alpha vs Shadow Force 9:00PM`
        });
      }

      const numero = partes[0];
      const partidos = partes.slice(1);

      const jornadas = leerJSON("jornadas.json") || {};

      jornadas[numero] = {
        partidos,
        fecha: new Date().toLocaleString("es-CO")
      };

      guardarJSON("jornadas.json", jornadas);

      await sock.sendMessage(from, {
        text:
`✅ *Jornada ${numero} guardada correctamente.*

📊 Partidos registrados: ${partidos.length}
🏆 Liga Titans Team`
      });

    } catch (error) {
      console.error("❌ Error setjornada:", error);

      await sock.sendMessage(from, {
        text: "❌ No pude guardar la jornada."
      });
    }
  }
};
