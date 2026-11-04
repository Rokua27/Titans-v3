const top = require("./top");

module.exports = {
  nombre: "topcoins",

categoria: "jugador",

descripcion: "Top de monedas.",

uso: "!topcoins",

permisos: ["usuario"],

alias: [],

  async ejecutar(sock, from, args, msg) {
    msg.message = {
      conversation: "!topcoins"
    };

    return top.ejecutar(sock, from, args, msg);
  }
};
