const SUPER_ADMINS = require("../../config/superadmins");

const {
    esFundador,
    esJusticia,
    eliminarJusticia
} = require("../../utils/moderacion");

const {
    obtenerNombreUsuario
} = require("../../utils/comunidad");

module.exports = {
    nombre: "deljusticia",
    categoria: "moderacion",
    descripcion: "Retira el nivel de Justicia.",
    uso: "!deljusticia @usuario",
    permisos: ["fundador"],
    alias: [],

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
puede retirar Justicia.

🏆 LIGA TITANS TEAM`
                });
            }

            const usuario =
                msg.message?.extendedTextMessage
                    ?.contextInfo?.mentionedJid?.[0];

            if (!usuario) {
                return sock.sendMessage(from, {
                    text:
`⚠️ Debes mencionar al Juez.

Ejemplo:
!deljusticia @usuario`
                });
            }

            if (!esJusticia(usuario)) {
                return sock.sendMessage(from, {
                    text:
`⚠️ Este usuario no pertenece
actualmente al Sistema de Justicia.`
                });
            }

            eliminarJusticia(usuario);

            const nombre =
                obtenerNombreUsuario(usuario);

            await sock.sendMessage(from, {
                text:
`╔════════════════════════════════╗
║       ⚖️ SISTEMA DE JUSTICIA   ║
╚════════════════════════════════╝

🔻 JUSTICIA RETIRADA

👤 Usuario:
${nombre}

El nivel de Justicia ha sido
retirado correctamente.

👮 Acción autorizada por:
@${sender.split("@")[0]}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 LIGA TITANS TEAM
⚖️ SISTEMA DE MODERACIÓN DE JUSTICIA COMPETITIVA
🛡️ TitansB • SISTEMA DE SEGURIDAD DIGITAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                mentions: [usuario, sender]
            });

        } catch (err) {
            console.error("❌ Error en deljusticia:", err);

            await sock.sendMessage(from, {
                text: "❌ No fue posible retirar el nivel Justicia."
            });
        }
    }
};
