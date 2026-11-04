const {
    quitarMute,
    estaMuteado
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
    nombre: "unmute",
    categoria: "moderacion",
    descripcion: "Quita el mute de un usuario.",
    uso: "!unmute @usuario",
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

            const usuario =
                msg.message?.extendedTextMessage
                    ?.contextInfo?.mentionedJid?.[0];

            if (!usuario) {
                return sock.sendMessage(from, {
                    text: error(
                        "Uso",
                        "Ejemplo:\n!unmute @usuario"
                    )
                });
            }

            const moderador =
                msg.key.participant || msg.key.remoteJid;

            const autorizadoSancion =
                esJusticia(moderador)
                    ? puedeSancionarJusticia(moderador, usuario)
                    : puedeSancionar(moderador, usuario);

            if (!autorizadoSancion) {
                return sock.sendMessage(from, {
                    text: error(
                        "Permisos",
                        "No puedes quitar el silencio a un miembro con tu mismo rango o superior."
                    )
                });
            }

            // Verificar si realmente existe un mute activo
            if (!estaMuteado(usuario)) {
                return sock.sendMessage(from, {
                    text: error(
                        "Mute",
                        "El usuario no está actualmente muteado."
                    )
                });
            }

            quitarMute(usuario);

            await sock.sendMessage(from, {
                text: equipo(
                    "Mute Eliminado",
                    `🔊 El usuario ha sido desmuteado.

👤 Usuario
${obtenerNombreUsuario(usuario)}

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
                componente: "UNMUTE",
                codigo: "SYSTEM_ERROR",
                descripcion: err.message
            });
            console.error(err);

            await sock.sendMessage(from, {
                text: error(
                    "Sistema",
                    "No fue posible quitar el mute."
                )
            });
        }
    }
};
