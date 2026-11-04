const { leerJSON, guardarJSON } = require("../utils/database");
const { esAdmin } = require("../utils/admin");

module.exports = {
  nombre: "settorneo",

  alias: [],

  categoria: "admin",

  descripcion: "Configura la información del torneo.",

  uso: "!settorneo",

  permisos: ["admin"],

  async ejecutar(sock, from, args, msg) {
    const texto = args.join(" ");

       const sender = msg.key.participant || msg.key.remoteJid;

    if (!(await esAdmin(sock, from, sender))) {
      return await sock.sendMessage(from, {
        text: "⛔ Solo los administradores pueden usar este comando."
      });
    }

    if (!texto) {
      return await sock.sendMessage(from, {
        text:
`❌ *Uso correcto:*

!settorneo estado <texto>
!settorneo formato <texto>
!settorneo clasifican <texto>
!settorneo fecha <texto>
!settorneo descripcion <texto>`
      });
    }

    const [campo, ...contenido] = texto.split(" ");
    const valor = contenido.join(" ");

    const torneo = leerJSON("torneo.json");

    const camposValidos = {
      estado: "estado",
      formato: "formato",
      clasifican: "clasifican",
      fecha: "proximaFecha",
      descripcion: "descripcion"
    };

    if (!camposValidos[campo]) {
      return await sock.sendMessage(from, {
        text:
`❌ *Campo inválido.*

Campos disponibles:
• estado
• formato
• clasifican
• fecha
• descripcion`
      });
    }

    torneo[camposValidos[campo]] = valor;

    guardarJSON("torneo.json", torneo);

    await sock.sendMessage(from, {
      text: `✅ *${campo}* actualizado correctamente.`
    });
  }
};
