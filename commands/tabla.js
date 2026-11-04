const generarTabla = require("../utils/generarTablaSVG");

module.exports = {
  nombre: "tabla",

  alias: [],

  categoria: "ligas",

  descripcion: "Muestra la tabla de posiciones.",

  uso: "!tabla",

  permisos: ["usuario"],

  async ejecutar(sock, from) {
    try {
      const ruta = await generarTabla();

      await sock.sendMessage(from, {
        image: { url: ruta },
        caption:
`📊 *TABLA OFICIAL - LIGA TITANS TEAM*

⚔️ Competimos para jugar, jugamos para ser leyendas.`
      });

    } catch (error) {
      console.error("❌ Error tabla:", error);

      await sock.sendMessage(from, {
        text: "❌ No pude generar la tabla gráfica."
      });
    }
  }
};
