const {
    obtenerPerfilMiembro,
    actualizarPerfilMiembro,
    validarPerfilCompetitivo,
    normalizarRol,
    obtenerRolesDisponibles
} = require("../utils/titansb/perfilesMiembros");

module.exports = {
    nombre: "miembroactualizarrol",

    alias: [
        "actualizarrol",
        "miembrorol"
    ],

    categoria: "jugador",

    descripcion: "Actualiza uno o varios roles competitivos del miembro.",

    uso: "!miembroactualizarrol EXP,MID,JUNGLA",

    permisos: ["usuario"],

    async ejecutar(sock, from, args, msg) {
        try {
            // ============================================================
            // 🧠 IDENTIDAD INTERNA
            // ============================================================
            const usuarioId =
                msg.key.participant ||
                msg.key.remoteJid;

            // ============================================================
            // 📋 ARGUMENTOS
            // ============================================================
            const entrada = args.join(" ").trim();

            if (!entrada) {
                return await sock.sendMessage(from, {
                    text:
`🎯 *ACTUALIZAR ROL COMPETITIVO*

Usa:
!miembroactualizarrol EXP

También puedes colocar varios roles:
!miembroactualizarrol EXP,MID,JUNGLA

🎯 Roles disponibles:
EXP · ROAM · JUNGLA · MID · GOLD

💡 Ejemplos:
!miembroactualizarrol EXP,ROAM
!miembroactualizarrol MID,EXP,JUNGLA
!miembroactualizarrol EXP,ROAM,JUNGLA,MID,GOLD`
                });
            }

            // ============================================================
            // 👤 BUSCAR PERFIL
            // ============================================================
            const perfilActual =
                obtenerPerfilMiembro(usuarioId);

            if (!perfilActual) {
                return await sock.sendMessage(from, {
                    text:
`❌ *PERFIL NO ENCONTRADO*

No tienes un perfil competitivo registrado todavía.

Primero utiliza:
!registrarmiembro`
                });
            }

            // ============================================================
            // 🎯 NORMALIZAR ROLES
            // ============================================================
            const rolesNormalizados =
                normalizarRol(entrada)
                    .split(",")
                    .map(rol => rol.trim())
                    .filter(Boolean);

            const rolesDisponibles =
                obtenerRolesDisponibles();

            const rolesInvalidos =
                rolesNormalizados.filter(
                    rol => !rolesDisponibles.includes(rol)
                );

            if (rolesInvalidos.length > 0) {
                return await sock.sendMessage(from, {
                    text:
`❌ *ROL NO VÁLIDO*

Rol(es) incorrecto(s):
*${rolesInvalidos.join(", ")}*

🎯 Roles disponibles:
${rolesDisponibles.join(" · ")}

💡 Ejemplo:
!miembroactualizarrol EXP,MID,JUNGLA`
                });
            }

            // ============================================================
            // 🛡️ VALIDACIÓN FINAL
            // ============================================================
            const validacion =
                validarPerfilCompetitivo({
                    rolJuego: rolesNormalizados.join(",")
                });

            if (!validacion.valido) {
                return await sock.sendMessage(from, {
                    text:
`❌ *NO SE PUDO ACTUALIZAR EL ROL*

${validacion.errores.join("\n")}`
                });
            }

            // ============================================================
            // 💾 ACTUALIZAR
            // ============================================================
            const perfil =
                actualizarPerfilMiembro(
                    usuarioId,
                    {
                        rolJuego: rolesNormalizados.join(",")
                    }
                );

            // ============================================================
            // 🎯 REPRESENTACIÓN VISUAL
            // ============================================================
            const rolesVisuales =
                String(perfil.rolJuego || "")
                    .split(",")
                    .map(rol => rol.trim())
                    .filter(Boolean)
                    .join(" · ");

            // ============================================================
            // 🏟️ EQUIPO
            // ============================================================
            const equipo =
                perfil.equipo || "Sin equipo";

            // ============================================================
            // 🏆 RESPUESTA
            // ============================================================
            return await sock.sendMessage(from, {
                text:
`╔════════════════════════════════╗
║    🎯 𝗥𝗢𝗟 𝗖𝗢𝗠𝗣𝗘𝗧𝗜𝗧𝗜𝗩𝗢     ║
║          𝗔𝗖𝗧𝗨𝗔𝗟𝗜𝗭𝗔𝗗𝗢       ║
╚════════════════════════════════╝

👤 Miembro: *${perfil.nombre}*
🎮 Nombre en juego: *${perfil.nombreJuego || "No registrado"}*

🎯 Nuevos roles:
*${rolesVisuales}*

🏆 Rango: *${perfil.rango || "No registrado"}*
🏟️ Equipo: *${equipo}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 *Perfil competitivo actualizado correctamente.*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 Liga Titans Team
🤖 TitansB • Miembro Virtual
👾 Sistema de Asistencia Virtual
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
            });

        } catch (error) {
            console.error(
                "❌ Error miembroactualizarrol:",
                error
            );

            return await sock.sendMessage(from, {
                text:
`❌ *NO SE PUDO ACTUALIZAR EL ROL*

Ocurrió un error interno al actualizar tu perfil.`
            });
        }
    }
};
