const { obtenerHistorialUsuario } = require("../../utils/modlogs");
const { obtenerNombreUsuario } = require("../../utils/comunidad");

module.exports = {

    nombre: "historial",

    alias: ["expediente"],

    permisos: ["moderador"],

    descripcion: "Muestra el historial de moderación de un usuario.",

    async ejecutar(sock, from, args, msg) {

        const usuario =
            msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

        if (!usuario) {

            return sock.sendMessage(from, {

                text: "⚠️ Debes mencionar un usuario."

            });

        }

        const historial = obtenerHistorialUsuario(usuario);

        if (!historial.length) {

            return sock.sendMessage(from, {

                text:
`╔══════════════════════╗
║   📋 HISTORIAL MOD   ║
╚══════════════════════╝

👤 ${obtenerNombreUsuario(usuario)}

✅ Este usuario no tiene registros de moderación.`,

            });

        }

        let texto =
`╔══════════════════════╗
║   📋 HISTORIAL MOD   ║
╚══════════════════════╝

👤 ${obtenerNombreUsuario(usuario)}
`;

        historial.slice(-10).reverse().forEach((log, i) => {

            texto +=
`━━━━━━━━━━━━━━━━━━
${i + 1}. ${log.accion.toUpperCase()}

📄 Motivo:
${log.motivo}

📅 Fecha:
${new Date(log.fecha).toLocaleString("es-CO")}

`;

        });

        texto +=
`━━━━━━━━━━━━━━━━━━
🤖 TitansBot v3`;

        await sock.sendMessage(from, {

            text: texto,

        });

    }

};
