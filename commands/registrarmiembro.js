const { esAdmin } = require("../utils/admin");
const { esJusticia } = require("../utils/moderacion");

const {
    registrarPerfilMiembro,
    obtenerPerfilMiembro
} = require("../utils/titansb/perfilesMiembros");

module.exports = {
    nombre: "registrarmiembro",

    alias: [
        "registroMiembro",
        "registrarperfil",
        "perfilmiembro"
    ],

    descripcion: "Registra los datos competitivos de un miembro.",
    permisos: ["usuario", "justicia"],

    async ejecutarInterno(sock, from, args, msg) {
        const sender = msg.key.participant || msg.key.remoteJid;

        const perfiles = require("../utils/titansb/perfilesMiembros");

        // ============================================================
        // 🧠 IDENTIDAD INTERNA
        // ============================================================
        // El usuarioId se utiliza únicamente internamente.
        // Nunca se muestra al usuario.
        const usuarioId = sender;

        // ============================================================
        // 🛡️ DETECTAR ADMINISTRADOR
        // ============================================================
        const administradorWhatsApp = await esAdmin(sock, from, sender);
const justicia = esJusticia(sender);

// Autorización especial:
// Administrador de WhatsApp O miembro del sistema Justicia.
const administrador = administradorWhatsApp || justicia;

        // ============================================================
        // 📋 VALIDAR ARGUMENTOS
        // ============================================================
        const entrada = args.join(" ").trim();

        if (!entrada) {
            return {
                text: administrador
                    ? `🛡️ *REGISTRO DE MIEMBRO*

Como administrador puedes registrar a otra persona:

!registrarmiembro Nombre | NombreEnJuego | País | Rol | Rango

Para registrarte tú mismo también puedes usar:

!registrarmiembro NombreEnJuego | País | Rol | Rango

🎯 Roles:
EXP · JUNGLA · MID · GOLD · ROAM

🏆 Rangos:
Guerrero · Élite · Maestro · Gran Maestro · Épico · Leyenda · Mítico · Honor Mítico · Gloria Mítica · Inmortal

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 ACTUALIZAR PERFIL COMPETITIVO

🎯 Actualizar roles:
!miembroactualizarrol EXP,ROAM,JUNGLA

🏆 Actualizar rango:
!miembroactualizarrango Mítico

🎮 Actualizar nombre en juego:
!miembroactualizarnombre TitansDavid

💡 Puedes seleccionar 1, varios o todos los roles.
Ejemplo:
EXP,ROAM,JUNGLA,MID,GOLD`
                    : `🛡️ *REGISTRO DE MIEMBRO*

Completa tu perfil competitivo:

!registrarmiembro NombreEnJuego | País | Rol | Rango

Ejemplo:

!registrarmiembro TitansDavid | Colombia | JUNGLA | Mítico

🎯 Roles:
EXP · JUNGLA · MID · GOLD · ROAM

🏆 Rangos:
Guerrero · Élite · Maestro · Gran Maestro · Épico · Leyenda · Mítico · Honor Mítico · Gloria Mítica · Inmortal

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 ACTUALIZAR PERFIL COMPETITIVO

🎯 Actualizar roles:
!miembroactualizarrol EXP,ROAM,JUNGLA

🏆 Actualizar rango:
!miembroactualizarrango Mítico

🎮 Actualizar nombre en juego:
!miembroactualizarnombre TitansDavid

💡 Puedes seleccionar 1, varios o todos los roles.
Ejemplo:
EXP,ROAM,JUNGLA,MID,GOLD`
            };
        }

        // ============================================================
        // ✂️ SEPARAR CAMPOS
        // ============================================================
        const partes = entrada
            .split("|")
            .map(x => x.trim());

        let miembroObjetivo = null;
        let miembroObjetivoId = null;
        let nombreJuego;
        let pais;
        let rolJuego;
        let rango;

        // ============================================================
        // 👤 MIEMBRO NORMAL — AUTO REGISTRO
        // ============================================================
        if (!administrador) {
            if (partes.length !== 4) {
                return {
                    text: `❌ *Formato incorrecto.*

Para registrarte debes proporcionar exactamente 4 datos:

NombreEnJuego | País | Rol | Rango

Ejemplo:

!registrarmiembro TitansDavid | Colombia | JUNGLA | Mítico

🎯 Roles:
EXP · JUNGLA · MID · GOLD · ROAM

🏆 Rangos:
Guerrero · Élite · Maestro · Gran Maestro · Épico · Leyenda · Mítico · Honor Mítico · Gloria Mítica · Inmortal

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 ACTUALIZAR PERFIL COMPETITIVO

🎯 Actualizar roles:
!miembroactualizarrol EXP,ROAM,JUNGLA

🏆 Actualizar rango:
!miembroactualizarrango Mítico

🎮 Actualizar nombre en juego:
!miembroactualizarnombre TitansDavid

💡 Puedes seleccionar 1, varios o todos los roles.
Ejemplo:
EXP,ROAM,JUNGLA,MID,GOLD`
                };
            }

            [
                nombreJuego,
                pais,
                rolJuego,
                rango
            ] = partes;

            // C6.9 — El autorregistro puede crear el perfil directamente.
            miembroObjetivo = perfiles.obtenerPerfilMiembro(usuarioId);
            miembroObjetivoId = usuarioId;

            /*
             * Si todavía no existe el perfil, el nombre visible de WhatsApp
             * se utiliza como nombre inicial del miembro.
             */
            if (!miembroObjetivo) {
                miembroObjetivo = {
                    nombre:
                        msg.pushName ||
                        msg.message?.extendedTextMessage?.contextInfo?.participant ||
                        "Miembro"
                };
            }
        }

        // ============================================================
        // 🛡️ ADMIN — REGISTRO DE TERCEROS
        // ============================================================
        else {
            if (partes.length === 4) {
                // Admin también puede registrarse a sí mismo.
                [
                    nombreJuego,
                    pais,
                    rolJuego,
                    rango
                ] = partes;

                miembroObjetivo = perfiles.obtenerPerfilMiembro(usuarioId);
                miembroObjetivoId = usuarioId;

                if (!miembroObjetivo) {
                    return {
                        text: "❌ No encontré tu perfil de miembro registrado."
                    };
                }
            } else if (partes.length === 5) {
                const [
                    nombre,
                    nombreJuegoAdmin,
                    paisAdmin,
                    rolJuegoAdmin,
                    rangoAdmin
                ] = partes;

                const todos = perfiles.obtenerTodosLosPerfiles();

                const normalizarNombre = texto =>
                    String(texto)
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .trim()
                        .toLowerCase();

                const objetivo = normalizarNombre(nombre);

                const coincidencias = todos.filter(perfil =>
                    normalizarNombre(perfil.nombre) === objetivo
                );

                if (!coincidencias.length) {
                    return {
                        text: `❌ No encontré un miembro registrado con el nombre:

*${nombre}*

El perfil debe existir previamente en usuarios.json.`
                    };
                }

                if (coincidencias.length > 1) {
                    return {
                        text: `⚠️ Encontré varios perfiles con el nombre:

*${nombre}*

No realizaré ningún cambio para evitar modificar al miembro incorrecto.`
                    };
                }

                miembroObjetivo = coincidencias[0];
                miembroObjetivoId = miembroObjetivo.usuarioId;

                nombreJuego = nombreJuegoAdmin;
                pais = paisAdmin;
                rolJuego = rolJuegoAdmin;
                rango = rangoAdmin;
            } else {
                return {
                    text: `❌ *Formato incorrecto.*

Como administrador puedes usar:

!registrarmiembro Nombre | NombreEnJuego | País | Rol | Rango

O registrarte tú mismo con:

!registrarmiembro NombreEnJuego | País | Rol | Rango`
                };
            }
        }

        // ============================================================
        // 🔎 VALIDAR CAMPOS
        // ============================================================
        if (!nombreJuego || !pais || !rolJuego || !rango) {
            return {
                text: "❌ Todos los campos son obligatorios."
            };
        }

        // ============================================================
        // 💾 REGISTRAR
        // ============================================================
        try {
            const perfil = registrarPerfilMiembro(
                miembroObjetivoId,
                {
                    nombre: miembroObjetivo.nombre,
                    nombreJuego,
                    pais,
                    rolJuego,
                    rango
                }
            );

            return {
                text: `✅ *PERFIL COMPETITIVO ACTUALIZADO*

👤 Miembro: *${perfil.nombre}*
🎮 Nombre en juego: *${perfil.nombreJuego}*
🌎 País: *${perfil.pais}*
🎯 Rol: *${perfil.rolJuego}*
🏆 Rango: *${perfil.rango}*

🏟️ Equipo: *${perfil.equipo || "SIN EQUIPO"}*

🔐 El equipo se obtiene automáticamente desde el registro oficial de equipos.`
            };
        } catch (error) {
            return {
                text: `❌ *NO SE PUDO REGISTRAR EL PERFIL*

${error.message}`
            };
        }
    },

    async ejecutar(sock, from, args, msg) {
        const resultado = await this.ejecutarInterno(sock, from, args, msg);

        if (resultado && resultado.text) {
            await sock.sendMessage(from, {
                text: resultado.text
            });
        }
    }

};
