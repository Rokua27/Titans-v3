const top = require("./top");

module.exports = {
  nombre: "topxp",

categoria: "jugador",

descripcion: "Top de experiencia.",

uso: "!topxp",

permisos: ["usuario"],

alias: [],

  async ejecutar(sock, from, args, msg) {
    msg.message = {
      conversation: "!topxp"
    };

    return top.ejecutar(sock, from, args, msg);
  }
};
