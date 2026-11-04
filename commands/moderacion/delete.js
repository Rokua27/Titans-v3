const {
    esJusticia,
    esFundador,
    esAdmin,
    esSuperMod,
    esModerador,
    esAyudante
} = require("../../utils/moderacion");

module.exports = {
    nombre: "delete",
    categoria: "moderacion",
    descripcion: "Elimina un mensaje seleccionado.",
    uso: "!delete respondiendo al mensaje",
    permisos: ["moderador", "justicia"],
    alias: ["del", "eliminar"],

    async ejecutar(sock, from, args, msg) {
        try {
            if (!from.endsWith("@g.us")) {
                return sock.sendMessage(from, {
                    text: "❌ Este comando solo funciona en grupos."
                });
            }

            const sender =
                msg.key.participant || msg.key.remoteJid;

            const justicia = esJusticia(sender);

            const contexto =
                msg.message?.extendedTextMessage?.contextInfo;

            const mensajeObjetivo = contexto?.stanzaId;

            const participanteObjetivo =
                contexto?.participant;

            if (!mensajeObjetivo) {
                return sock.sendMessage(from, {
                    text:
`⚠️ Debes responder al mensaje que deseas eliminar.

Ejemplo:
Responde al mensaje → !delete`
                });
            }

            // Justicia no puede eliminar mensajes del Staff.
            if (
                justicia &&
                participanteObjetivo &&
                (
                    esFundador(participanteObjetivo) ||
                    esAdmin(participanteObjetivo) ||
                    esSuperMod(participanteObjetivo) ||
                    esModerador(participanteObjetivo) ||
                    esAyudante(participanteObjetivo)
                )
            ) {
                return sock.sendMessage(from, {
                    text:
`╔══════════════════════════════╗
║   🚫 ACCIÓN DENEGADA        ║
╚══════════════════════════════╝

❌ Justicia no puede eliminar
mensajes pertenecientes al Staff.

🏆 LIGA TITANS TEAM
⚖️ SISTEMA DE MODERACIÓN DE JUSTICIA COMPETITIVA
🛡️ TitansB • SISTEMA DE SEGURIDAD DIGITAL`
                });
            }

            await sock.sendMessage(from, {
                delete: {
                    remoteJid: from,
                    fromMe: false,
                    id: mensajeObjetivo,
                    participant: participanteObjetivo
                }
            });

            await sock.sendMessage(from, {
                text:
`╔══════════════════════════════╗
║      🗑️ MODERACIÓN           ║
╚══════════════════════════════╝

✅ Mensaje eliminado correctamente.

⚖️ Acción ejecutada por:
@${sender.split("@")[0]}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 LIGA TITANS TEAM
⚖️ SISTEMA DE MODERACIÓN DE JUSTICIA COMPETITIVA
🛡️ TitansB • SISTEMA DE SEGURIDAD DIGITAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                mentions: [sender]
            });

        } catch (err) {
            console.error("❌ Error en delete:", err);

            await sock.sendMessage(from, {
                text:
`❌ No fue posible eliminar el mensaje.

🏆 LIGA TITANS TEAM
⚖️ SISTEMA DE MODERACIÓN DE JUSTICIA COMPETITIVA
🛡️ TitansB • SISTEMA DE SEGURIDAD DIGITAL`
            });
        }
    }
};
