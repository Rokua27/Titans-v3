const { esAdmin } = require("../utils/admin");
const { guardarJSON } = require("../utils/database");
const monitor = require("../utils/monitor");

module.exports = {
  nombre: "setbracket",

  alias: [],

  categoria: "admin",

  descripcion: "Actualiza el bracket del torneo.",

  uso: "!setbracket",

  permisos: ["admin"],

  async ejecutar(sock, from, args, msg) {
    try {
      const sender = msg.key.participant || msg.key.remoteJid;

      if (!(await esAdmin(sock, from, sender))) {
        return await sock.sendMessage(from, {
          text: "❌ Solo administradores."
        });
      }

      const bracket = {
        octavos: [
          { a: "Monster", b: "Eclipse", ganador: null },
          { a: "Grupo Niche", b: "Shadow Force", ganador: null },
          { a: "Titan Wolves", b: "Team Alpha", ganador: null },
          { a: "Night Raiders", b: "Phantom", ganador: null }
        ],
        cuartos: [],
        semifinales: [],
        final: []
      };

      guardarJSON("bracket.json", bracket);

      await sock.sendMessage(from, {
        text:
`🏆 *PLAYOFFS INICIALIZADOS*

🔥 Octavos cargados correctamente.
⚔️ Liga Titans Team`
      });

    } catch (e) {
      console.error(e);

      monitor.registrarEvento("ERROR_SISTEMA", {
        estado: "ERROR",
        componente: "SETBRACKET",
        codigo: "SYSTEM_ERROR",
        descripcion: e.message
      });
      await sock.sendMessage(from, {
        text: "❌ No pude crear el bracket."
      });
    }
  }
}
