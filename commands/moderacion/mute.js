const {
    aplicarMute
} = require("../../utils/sanciones");

const {
    esFundador,
    esAdmin,
    esSuperMod,
    esModerador,
    esJusticia
} = require("../../utils/moderacion");

const {
    equipo,
    error
} = require("../../utils/embeds");

const {
    obtenerNombreUsuario
} = require("../../utils/comunidad");

const monitor = require("../../utils/monitor");

const {
    puedeSancionar,
    puedeSancionarJusticia
} = require("../../utils/jerarquia");

module.exports = {

    nombre: "mute",

    categoria: "moderacion",

    descripcion: "Silencia temporalmente a un usuario.",

    uso: "!mute @usuario minutos motivo",

    permisos: ["moderador", "justicia"],

    alias: [],

    async ejecutar(sock, from, args, msg) {

        try {

            const sender =
                msg.key.participant || msg.key.remoteJid;

            const autorizado =
                esFundador(sender) ||
                esAdmin(sender) ||
                esSuperMod(sender) ||
                esModerador(sender) ||
                esJusticia(sender);

            if (!autorizado) {

                return sock.sendMessage(from, {

                    text: error(
                        "Permisos",
                        "No tienes permisos para usar este comando."
                    )

                });

            }

            // ==========================================
            // 👤 USUARIO OBJETIVO
            // ==========================================

            const usuario =
                msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

            if (!usuario) {
                return sock.sendMessage(from, {
                    text: error(
                        "Uso",
                        "Debes mencionar un usuario real de WhatsApp.\nEjemplo:\n!mute @usuario 30 Spam"
                    )
                });
            }

            // ==========================================
            // 🛡️ JERARQUÍA
            // ==========================================

            const moderador =
                msg.key.participant || msg.key.remoteJid;

            const autorizadoSancion =
                esJusticia(moderador)
                    ? puedeSancionarJusticia(moderador, usuario)
                    : puedeSancionar(moderador, usuario);

            if (!autorizadoSancion) {
                return sock.sendMessage(from, {
                    text:
`╔══════════════════════╗
║   🚫 ACCESO DENEGADO ║
╚══════════════════════╝

❌ No puedes silenciar un miembro con tu mismo rango o superior.

🛡️ DIRECCIÓN DE MODERACIÓN
🤖 TitansB • Sistema Automático`
                });
            }

            const minutos = parseInt(args[1]);

            if (isNaN(minutos) || minutos <= 0) {

                return sock.sendMessage(from, {

                    text: error(
                        "Tiempo",
                        "Debes indicar una duración válida en minutos."
                    )

                });

            }

            const motivo =
                args.slice(2).join(" ") || "Sin motivo";

            aplicarMute(
                usuario,
                sender,
                minutos,
                motivo
            );

            const fin =
                new Date(Date.now() + minutos * 60000);

            await sock.sendMessage(from, {

                text: equipo(

                    "Usuario Silenciado",

`🔇 Usuario

${obtenerNombreUsuario(usuario)}

⏳ Duración

${minutos} minutos

📝 Motivo

${motivo}

🕒 Finaliza

${fin.toLocaleString("es-CO")}

👮 Moderador

${obtenerNombreUsuario(sender)}`

                ),

                mentions: [
                    sender,
                    usuario
                ]

            });

        } catch (err) {
            console.error(err);

            monitor.registrarEvento("ERROR_SISTEMA", {
                estado: "ERROR",
                componente: "MUTE",
                codigo: "SYSTEM_ERROR",
                descripcion: err.message
            });

            console.error(err);

            sock.sendMessage(from, {

                text: error(
                    "Sistema",
                    "No fue posible aplicar el mute."
                )

            });

        }

    }

};
