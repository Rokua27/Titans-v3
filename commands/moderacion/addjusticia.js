const SUPER_ADMINS = require("../../config/superadmins");

const {
    esFundador,
    agregarJusticia,
    esJusticia
} = require("../../utils/moderacion");

const {
    obtenerNombreUsuario
} = require("../../utils/comunidad");
const monitor = require("../../utils/monitor");

module.exports = {
    nombre: "addjusticia",
    categoria: "moderacion",
    descripcion: "Asigna el nivel de Justicia a un usuario.",
    uso: "!addjusticia @usuario",
    permisos: ["fundador"],
    alias: ["justicia"],

    async ejecutar(sock, from, args, msg) {
        try {
            const sender =
                msg.key.participant || msg.key.remoteJid;

            const autorizado =
                SUPER_ADMINS.includes(sender) ||
                esFundador(sender);

            if (!autorizado) {
                return sock.sendMessage(from, {
                    text:
`╔══════════════════════════════╗
║   🚫 ACCESO DENEGADO         ║
╚══════════════════════════════╝

❌ Solo el Fundador o SuperAdmin
puede asignar el nivel Justicia.

⚖️ SISTEMA DE JUSTICIA`
                });
            }

            const usuario =
                msg.message?.extendedTextMessage
                    ?.contextInfo?.mentionedJid?.[0];

            if (!usuario) {
                return sock.sendMessage(from, {
                    text:
`⚠️ Debes mencionar al usuario.

Ejemplo:
!addjusticia @usuario`
                });
            }

            if (esJusticia(usuario)) {
                return sock.sendMessage(from, {
                    text:
`⚠️ Este usuario ya pertenece al
Sistema de Justicia.`
                });
            }

            agregarJusticia(usuario);

            const nombre =
                obtenerNombreUsuario(usuario);

            await sock.sendMessage(from, {
                text:
`╔════════════════════════════════╗
║      ⚖️ SISTEMA DE JUSTICIA    ║
╚════════════════════════════════╝

🎖️ ¡BIENVENIDO AL SISTEMA DE JUSTICIA!

👤 Juez:
${nombre}

Has sido designado oficialmente como
Juez de Liga Titans Team.

Tu misión será garantizar el orden,
la disciplina y el cumplimiento del
reglamento durante las competencias.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ COMANDOS AUTORIZADOS

🔇 !mute
🔊 !unmute
⚠️ !warn
🗑️ !delete
🚪 !kick

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 RESTRICCIONES

❌ !ban
❌ !unban
❌ No puedes sancionar al Staff.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 LIGA TITANS TEAM
⚖️ SISTEMA DE MODERACIÓN DE JUSTICIA COMPETITIVA
🛡️ TitansB • SISTEMA DE SEGURIDAD DIGITAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                mentions: [usuario]
            });

        } catch (err) {
            console.error("❌ Error en addjusticia:", err);

            monitor.registrarEvento("ERROR_SISTEMA", {
                estado: "ERROR",
                componente: "ADDJUSTICIA",
                codigo: "SYSTEM_ERROR",
                descripcion: err.message
            });

            await sock.sendMessage(from, {
                text: "❌ No fue posible asignar el nivel Justicia."
            });
        }
    }
};
