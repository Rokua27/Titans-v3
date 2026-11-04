const {
    obtenerDatos
} = require("../../utils/moderacion");

const {
    equipo
} = require("../../utils/embeds");

const {
    obtenerNombreUsuario
} = require("../../utils/comunidad");

module.exports = {

    nombre: "mods",

    categoria: "moderacion",

    descripcion: "Muestra el Staff de TitansBot.",

    uso: "!mods",

    permisos: ["usuario"],

    alias: ["staff"],

    async ejecutar(sock, from) {

        try {

            const datos = obtenerDatos();

            let texto = "";

            // Fundador

            texto += "👑 *FUNDADOR*\n";

            if (datos.fundador) {

                texto +=
`• ${obtenerNombreUsuario(datos.fundador)}\n\n`;

            } else {

                texto += "• Sin asignar\n\n";

            }

            // Admins

            texto += "🛡 *ADMINISTRADORES GLOBALES*\n";

            if (datos.admins.length) {

                datos.admins.forEach(id => {

                    texto += `• ${obtenerNombreUsuario(id)}\n`;

                });

            } else {

                texto += "• Ninguno\n";

            }

            texto += "\n";

            // SuperMods

            texto += "⚔ *SUPER MODERADORES*\n";

            if (datos.supermods.length) {

                datos.supermods.forEach(id => {

                    texto += `• ${obtenerNombreUsuario(id)}\n`;

                });

            } else {

                texto += "• Ninguno\n";

            }

            texto += "\n";

            // Moderadores

            texto += "🛡 *MODERADORES*\n";

            if (datos.moderadores.length) {

                datos.moderadores.forEach(id => {

                    texto += `• ${obtenerNombreUsuario(id)}\n`;

                });

            } else {

                texto += "• Ninguno\n";

            }

            texto += "\n";

            // Ayudantes

            texto += "🎖 *AYUDANTES*\n";

            if (datos.ayudantes.length) {

                datos.ayudantes.forEach(id => {

                    texto += `• ${obtenerNombreUsuario(id)}\n`;

                });

            } else {

                texto += "• Ninguno\n";

            }

            await sock.sendMessage(from, {

                text: equipo(
                    "Staff Oficial",
                    texto.trim()
                )

            });

        } catch (err) {

            console.error(err);

            await sock.sendMessage(from, {

                text: "❌ No fue posible obtener el Staff."

            });

        }

    }

};
