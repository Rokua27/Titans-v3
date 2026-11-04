const perfiles = require("../utils/titansb/perfilesMiembros");

const {
    obtenerPerfilMiembro
} = perfiles;

module.exports = {
    nombre: "miembroactualizarnombre",
    alias: ["actualizarnombre", "miembronombre"],
    categoria: "jugador",
    descripcion: "Actualiza el nombre en juego del miembro.",
    uso: "!miembroactualizarnombre NombreEnJuego",
    permisos: ["usuario"],

    async ejecutar(sock, from, args, msg) {
        const sender = msg.key.participant || msg.key.remoteJid;
        const nombreJuego = args.join(" ").trim();

        if (!nombreJuego) {
            return await sock.sendMessage(from, {
                text:
`╔════════════════════════════════╗
║   🎮 𝗔𝗖𝗧𝗨𝗔𝗟𝗜𝗭𝗔𝗥 𝗡𝗢𝗠𝗕𝗥𝗘   ║
╚════════════════════════════════╝

Uso:
!miembroactualizarnombre NombreEnJuego

Ejemplo:
!miembroactualizarnombre TitansDavid

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 Liga Titans Team
🤖 TitansB • Miembro Virtual
👾 Sistema de Asistencia Virtual
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
            });
        }

        const perfil = obtenerPerfilMiembro(sender);

        if (!perfil) {
            return await sock.sendMessage(from, {
                text: "❌ No tienes un perfil competitivo registrado."
            });
        }

        const actualizado = perfiles.actualizarPerfilMiembro(sender, {
            nombreJuego
        });

        const rolesVisuales = actualizado.rolJuego
            ? String(actualizado.rolJuego)
                .split(",")
                .filter(Boolean)
                .join(" · ")
            : "No registrado";

        await sock.sendMessage(from, {
            text:
`╔════════════════════════════════╗
║    🎮 𝗡𝗢𝗠𝗕𝗥𝗘 𝗘𝗡 𝗝𝗨𝗘𝗚𝗢     ║
║          𝗔𝗖𝗧𝗨𝗔𝗟𝗜𝗭𝗔𝗗𝗢       ║
╚════════════════════════════════╝

👤 Miembro: *${actualizado.nombre}*

🎮 Nuevo nombre:
*${actualizado.nombreJuego}*

🎯 Roles: *${rolesVisuales}*
🏆 Rango: *${actualizado.rango || "No registrado"}*
🏟️ Equipo: *${actualizado.equipo || "Sin equipo"}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 *Perfil competitivo actualizado correctamente.*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 Liga Titans Team
🤖 TitansB • Miembro Virtual
👾 Sistema de Asistencia Virtual
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        });
    }
};
