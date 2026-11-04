const { obtenerRol } = require("../utils/roles");
const { generarMenu } = require("../utils/paneles/menu");

module.exports = {

    nombre: "menu",

    alias: ["help"],

    categoria: "jugador",

    descripcion: "Muestra el menú principal.",

    permisos: ["usuario"],

    uso: "!menu",

    async ejecutar(sock, from, args, msg) {

        try {

            const sender = msg.key.participant || msg.key.remoteJid;

            const rol = await obtenerRol(sock, from, sender);

            const menu = generarMenu(rol.nombre);

            await sock.sendMessage(from, {
                text: menu
            });

        } catch (error) {

            console.error("❌ Error menú:", error);

            await sock.sendMessage(from, {
                text: "❌ No pude generar el menú."
            });

        }

    }

};
