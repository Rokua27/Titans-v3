const perfiles = require("../utils/titansb/perfilesMiembros");

const {
    obtenerPerfilMiembro,
    validarPerfilCompetitivo,
    obtenerRangosDisponibles
} = perfiles;

module.exports = {
    nombre: "miembroactualizarrango",
    alias: ["actualizarrango", "miembrorango"],
    categoria: "jugador",
    descripcion: "Actualiza el rango competitivo del miembro.",
    uso: "!miembroactualizarrango Rango",
    permisos: ["usuario"],

    async ejecutar(sock, from, args, msg) {
        const sender = msg.key.participant || msg.key.remoteJid;
        const rango = args.join(" ").trim();

        if (!rango) {
            return await sock.sendMessage(from, {
                text:
`╔════════════════════════════════╗
║     🏆 𝗔𝗖𝗧𝗨𝗔𝗟𝗜𝗭𝗔𝗥 𝗥𝗔𝗡𝗚𝗢     ║
╚════════════════════════════════╝

Uso:
!miembroactualizarrango Rango

🏆 Rangos disponibles:
${obtenerRangosDisponibles().join(" · ")}

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

        const validacion = validarPerfilCompetitivo({
            rango
        });

        if (!validacion.valido) {
            return await sock.sendMessage(from, {
                text:
`❌ *RANGO NO VÁLIDO*

${validacion.errores.join("\n")}

🏆 Rangos disponibles:
${obtenerRangosDisponibles().join(" · ")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 Liga Titans Team
🤖 TitansB • Miembro Virtual
👾 Sistema de Asistencia Virtual
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
            });
        }

        const actualizado = perfiles.actualizarPerfilMiembro(sender, {
            rango
        });

        await sock.sendMessage(from, {
            text:
`╔════════════════════════════════╗
║     🏆 𝗥𝗔𝗡𝗚𝗢 𝗖𝗢𝗠𝗣𝗘𝗧𝗜𝗧𝗜𝗩𝗢    ║
║          𝗔𝗖𝗧𝗨𝗔𝗟𝗜𝗭𝗔𝗗𝗢        ║
╚════════════════════════════════╝

👤 Miembro: *${actualizado.nombre}*
🎮 Nombre en juego: *${actualizado.nombreJuego}*

🏆 Nuevo rango:
*${actualizado.rango}*

🎯 Rol: *${String(actualizado.rolJuego || "No registrado")
    .split(",")
    .filter(Boolean)
    .join(" · ")}*

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
