const { banUsuario } = require("../../utils/accionesModeracion");
const { registrarAccion } = require("../../utils/modlogs");
const {
    esFundador,
    esAdmin,
    esSuperMod
} = require("../../utils/moderacion");
const { puedeSancionar } = require("../../utils/jerarquia");

module.exports = {

    nombre: "ban",
    categoria: "moderacion",

    alias: [],

    permisos: ["supermoderador"],

    descripcion: "Banea un usuario.",

    async ejecutar(sock, from, args, msg) {

        const usuario =
            msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

        // ==========================================
        // 👤 USUARIO OBJETIVO
        // ==========================================

        if (!usuario) {
            return sock.sendMessage(from, {
                text: "⚠️ Debes mencionar un usuario."
            });
        }

        // ==========================================
        // 🛡️ JERARQUÍA
        // ==========================================

        const moderador = msg.key.participant || msg.key.remoteJid;

        if (!puedeSancionar(moderador, usuario)) {
            return sock.sendMessage(from, {
                text:
`╔══════════════════════╗
║   🚫 ACCESO DENEGADO ║
╚══════════════════════╝

❌ No puedes sancionar a un miembro con tu mismo rango o superior.

⚔️ TitansBot v3`
            });
        }

        if (esFundador(usuario))
            return sock.sendMessage(from, { text: "❌ No puedes banear al Fundador." });

        if (esAdmin(usuario))
            return sock.sendMessage(from, { text: "❌ No puedes banear un Administrador Global." });

        if (esSuperMod(usuario))
            return sock.sendMessage(from, { text: "❌ No puedes banear un Super Moderador." });

        const motivo =
            args.slice(1).join(" ") || "Sin motivo";

        await banUsuario(usuario);

registrarAccion({

    accion: "ban",

    usuario,

    moderador,
            motivo,

            grupo: from

        });

        await sock.sendMessage(from, {

            text:
`╔══════════════════════╗
║      ⛔ BAN GLOBAL     ║
╚══════════════════════╝

👤 Usuario:
@${usuario.split("@")[0]}

🚫 Estado:
Baneado

📄 Motivo:
${motivo}

🤖 TitansBot v3`,

            mentions: [usuario]

        });

    }

};
