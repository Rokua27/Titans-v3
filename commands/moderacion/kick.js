const { kickUsuario } = require("../../utils/accionesModeracion");
const { registrarAccion } = require("../../utils/modlogs");
const {
    esFundador,
    esAdmin,
    esSuperMod,
    esModerador,
    esAyudante,
    esJusticia
} = require("../../utils/moderacion");
const {
    puedeSancionar,
    puedeSancionarJusticia
} = require("../../utils/jerarquia");

module.exports = {

    nombre: "kick",
    categoria: "moderacion",

    alias: [],

    permisos: ["moderador", "justicia"],

    descripcion: "Expulsa un usuario del grupo.",

    async ejecutar(sock, from, args, msg) {

        if (!from.endsWith("@g.us")) {

            return sock.sendMessage(from, {
                text: "❌ Este comando solo funciona en grupos."
            });

        }

const usuario =
    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

if (!usuario) {
    return sock.sendMessage(from, {
        text: "⚠️ Debes mencionar un usuario."
    });
}

const moderador = msg.key.participant || msg.key.remoteJid;

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

❌ No puedes expulsar a este miembro.

⚖️ SISTEMA DE MODERACIÓN DE JUSTICIA COMPETITIVA
🛡️ TitansB • SISTEMA DE SEGURIDAD DIGITAL`
                });
            }

            if (!usuario) {

            return sock.sendMessage(from, {
                text: "⚠️ Debes mencionar un usuario."
            });

        }

        if (esFundador(usuario)) {

            return sock.sendMessage(from, {
                text: "❌ No puedes expulsar al Fundador."
            });

        }

        if (esAdmin(usuario)) {

            return sock.sendMessage(from, {
                text: "❌ No puedes expulsar un Administrador Global."
            });

        }

    
    if (esModerador(usuario)) {
        return sock.sendMessage(from, {
            text: "❌ Justicia no puede expulsar a un Moderador."
        });
    }

    if (esAyudante(usuario)) {
        return sock.sendMessage(from, {
            text: "❌ Justicia no puede expulsar a un Ayudante."
        });
    }

    if (esSuperMod(usuario)) {

            return sock.sendMessage(from, {
                text: "❌ No puedes expulsar un Super Moderador."
            });

        }

        const motivo =
            args.slice(1).join(" ") || "Sin motivo";

        const resultado =
            await kickUsuario(
                sock,
                from,
                usuario,
                motivo
            );

        if (!resultado.ok) {

            return sock.sendMessage(from, {
                text: "❌ No pude expulsar al usuario."
            });

        }


registrarAccion({

    accion: "kick",

    usuario,

    moderador,

    motivo,

    grupo: from

});

        await sock.sendMessage(from, {

            text:
`╔══════════════════════╗
║      ⚖️ MODERACIÓN      ║
╚══════════════════════╝

👤 Usuario:
@${usuario.split("@")[0]}

🚪 Acción:
Expulsado

📄 Motivo:
${motivo}

⚔️ TitansBot v3`,

            mentions: [usuario]

        });

    }

};
