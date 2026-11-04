const { leerJSON, guardarJSON } = require("../utils/database");
const { esAdmin } = require("../utils/admin");

module.exports = {
  nombre: "setanuncio",

  alias: [],

  categoria: "admin",

  descripcion: "Actualiza el anuncio oficial.",

  uso: "!setanuncio <texto>",

  permisos: ["admin"],

  async ejecutar(sock, from, args) {
    const contenido = args.join(" ");

    const sender = msg.key.participant || msg.key.remoteJid;

    if (!(await esAdmin(sock, from, sender))) {
      return await sock.sendMessage(from, {
        text: "⛔ Solo los administradores pueden usar este comando."
      });
    }

    if (!contenido) {
      return await sock.sendMessage(from, {
        text: "❌ Uso: !setanuncio <mensaje>"
      });
    }

    const anuncio = leerJSON("anuncio.json");

    anuncio.contenido = contenido;
    anuncio.fecha = new Date().toLocaleString("es-CO");
    anuncio.autor = "Dirección de Torneos";

    guardarJSON("anuncio.json", anuncio);

    await sock.sendMessage(from, {
      text: "✅ Anuncio oficial actualizado correctamente."
    });
  }
};
