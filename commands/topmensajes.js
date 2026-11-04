const top = require("./top");

module.exports = {
  nombre: "topmensajes",

categoria: "jugador",

descripcion: "Top de mensajes enviados.",

uso: "!topmensajes",

permisos: ["usuario"],

alias: [],

  async ejecutar(sock, from, args, msg) {
    msg.message = {
      conversation: "!topmensajes"
    };

    return top.ejecutar(sock, from, args, msg);
  }
};
