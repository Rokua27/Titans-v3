const { desbanearUsuario } = require("../../utils/accionesModeracion");
const { registrarAccion } = require("../../utils/modlogs");
const { puedeSancionar } = require("../../utils/jerarquia");
const monitor = require("../../utils/monitor");

module.exports = {
    nombre: "unban",
    categoria: "moderacion",
    alias: [],
    permisos: ["supermoderador"],
    descripcion: "Quita el ban de un usuario.",

    async ejecutar(sock, from, args, msg) {
        try {
            const moderador =
                msg.key.participant || msg.key.remoteJid;

            const usuario =
                msg.message?.extendedTextMessage
                    ?.contextInfo?.mentionedJid?.[0];

            // ==========================================
            // 👤 USUARIO OBJETIVO
            // ==========================================

            if (!usuario) {
                return await sock.sendMessage(from, {
                    text: "⚠️ Debes mencionar un usuario."
                });
            }

            // ==========================================
            // 🛡️ JERARQUÍA
            // ==========================================

            if (!puedeSancionar(moderador, usuario)) {
                return await sock.sendMessage(from, {
                    text:
`╔══════════════════════╗
║   🚫 ACCESO DENEGADO ║
╚══════════════════════╝

❌ No puedes modificar el estado de un miembro con tu mismo rango o superior.

⚔️ TitansBot v3`
                });
            }

            // ==========================================
            // 🚫 DESBANEAR
            // ==========================================

            await desbanearUsuario(usuario);

            // ==========================================
            // 📝 REGISTRO
            // ==========================================

            registrarAccion({
                accion: "unban",
                usuario,
                moderador,
                motivo: "Ban removido",
                grupo: from
            });

            // ==========================================
            // ✅ CONFIRMACIÓN
            // ==========================================

            await sock.sendMessage(from, {
                text:
`╔══════════════════════╗
║      ✅ UNBAN        ║
╚══════════════════════╝

👤 Usuario:
@${usuario.split("@")[0]}

🎉 Estado:
Ban eliminado.

👮 Moderador:
@${moderador.split("@")[0]}

🤖 TitansBot v3`,
                mentions: [
                    usuario,
                    moderador
                ]
            });

        } catch (err) {
            console.error("❌ Error en unban:", err);

            monitor.registrarEvento("ERROR_SISTEMA", {
                estado: "ERROR",
                componente: "UNBAN",
                codigo: "SYSTEM_ERROR",
                descripcion: err.message
            });
            console.error("❌ Error en unban:", err);

            await sock.sendMessage(from, {
                text:
`╔══════════════════════╗
║    ⚠️ ERROR UNBAN    ║
╚══════════════════════╝

❌ No fue posible eliminar el ban.

⚔️ TitansBot v3`
            });
        }
    }
};
