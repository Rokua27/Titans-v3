const { obtenerAdmins } = require("./adminCache");
const { estaBaneado } = require("./moderacion");
const {
    estaMuteado,
    aplicarMute,
    obtenerUsuario,
    agregarAdvertencia,
    totalAdvertencias,
    debeMutear,
    debeExpulsar,
    debeBanear,
    quitarMute
} = require("./sanciones");

const {
    kickUsuario,
    banUsuario
} = require("./accionesModeracion");

const {
    registrarAccion
} = require("./modlogs");
const {
    esSpam
} = require("./antispam");

// Control de avisos de mute.
// Evita enviar un aviso por cada mensaje.
const avisosMute = new Map();

const INTERVALO_AVISO = 60 * 1000;

async function ejecutarFiltroModeracion(sock, msg) {
    if (!msg?.message) return false;

    const from = msg.key.remoteJid;
    const sender = msg.key.participant || from;

    // ==========================================
    // 🛡️ SOLO GRUPOS
    // ==========================================

    if (!from || !from.endsWith("@g.us")) return false;

    // ==========================================
    // 🛡️ ADMINISTRADORES
    // ==========================================

    const admins = await obtenerAdmins(sock, from);

    // ==========================================
    // 🆔 NORMALIZACIÓN DE IDs
    // ==========================================
    const normalizarID = (id) => {
        if (!id || typeof id !== "string") return id;

        return id
            .replace("@s.whatsapp.net", "@lid")
            .replace(/:\d+(?=@lid$)/, "")
            .replace("@g.us", "");
    };

    const adminsNormalizados = admins.map(normalizarID);

    const botID = sock.user?.lid
        ? normalizarID(sock.user.lid)
        : null;

    const senderNormalizado = normalizarID(sender);

    const botEsAdmin = botID
        ? adminsNormalizados.includes(botID)
        : false;

    const usuarioEsAdmin =
        adminsNormalizados.includes(senderNormalizado);

    console.log("🛡️ Bot es administrador:", botEsAdmin);
    console.log("👤 Usuario es administrador:", usuarioEsAdmin);

    // ==========================================
    // 🚫 USUARIO BANEADO
    // ==========================================
    // El ban global tiene prioridad sobre mute y antispam.
    if (estaBaneado(sender)) {

        console.log(`🚫 Usuario baneado detectado: ${sender}`);

        // Eliminar el mensaje si TitansB es administrador.
        if (botEsAdmin) {
            try {
                await sock.sendMessage(from, {
                    delete: msg.key
                });
            } catch (e) {
                console.error(
                    "❌ Error eliminando mensaje de usuario baneado:",
                    e.message
                );
            }
        }

        return true;
    }

    // ==========================================
    // 🔇 USUARIO SILENCIADO
    // ==========================================
    // El mute tiene prioridad incluso si el usuario
    // también es administrador del grupo.

    if (estaMuteado(sender)) {

        // Eliminar el mensaje del usuario.
        if (botEsAdmin) {
            try {
                await sock.sendMessage(from, {
                    delete: msg.key
                });
            } catch (e) {
                console.error(
                    "❌ Error eliminando mensaje de usuario muteado:",
                    e.message
                );
            }
        }

        // ======================================
        // 📢 AVISO CONTROLADO
        // ======================================

        const claveAviso = `${from}:${sender}`;
        const ultimoAviso = avisosMute.get(claveAviso) || 0;
        const ahora = Date.now();

        if (ahora - ultimoAviso >= INTERVALO_AVISO) {

            avisosMute.set(claveAviso, ahora);

            const usuario = obtenerUsuario(sender);

            let restante = 0;

            if (usuario?.mute?.fin) {
                restante = Math.max(
                    0,
                    Math.ceil(
                        (usuario.mute.fin - ahora) / 60000
                    )
                );
            }

            try {
                await sock.sendMessage(from, {
                    text:
`╔══════════════════════════════╗
║      🔇 USUARIO SILENCIADO   ║
╚══════════════════════════════╝

👤 @${sender.split("@")[0]}

🚫 Actualmente estás silenciado.
🗑️ Tus mensajes serán eliminados.
🚫 No puedes utilizar comandos del bot.

⏳ Tiempo restante: ${restante} minuto${restante === 1 ? "" : "s"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ DIRECCIÓN DE MODERACIÓN
🤖 TitansB • Sistema Automático
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                    mentions: [sender]
                });
            } catch (e) {
                console.error(
                    "❌ Error enviando aviso de mute:",
                    e.message
                );
            }
        }

        return true;
    }

    // ==========================================
    // 🚫 ANTISPAM
    // ==========================================

    // ==========================================
    // 🛡️ ADMINISTRADORES
    // ==========================================
    // Los administradores siguen protegidos del
    // antispam automático, pero NO del mute manual.
    if (usuarioEsAdmin) return false;

    if (esSpam(sender)) {

        // ======================================
        // ⚠️ REGISTRAR WARN AUTOMÁTICO
        // ======================================

        const datosWarn = agregarAdvertencia(
            sender,
            "Sistema Antispam",
            "Spam detectado: 8 mensajes en 5 segundos"
        );

        const totalWarns = datosWarn.advertencias.length;

        // ======================================
        // 📊 ESCALAMIENTO
        // ======================================

        // 7 WARN → BAN GLOBAL
        if (totalWarns >= 7 && debeBanear(sender)) {

            await banUsuario(sender);

            quitarMute(sender);

            registrarAccion({
                accion: "ban",
                usuario: sender,
                moderador: "Sistema de sanciones",
                motivo: "7 advertencias acumuladas por spam",
                grupo: from
            });

            if (botEsAdmin) {
                try {
                    await sock.sendMessage(from, {
                        delete: msg.key
                    });
                } catch (e) {
                    console.error(
                        "❌ Error eliminando mensaje de ban:",
                        e.message
                    );
                }
            }

            await sock.sendMessage(from, {
                text:
`╔══════════════════════════════╗
║       ⛔ BAN AUTOMÁTICO       ║
╚══════════════════════════════╝

👤 Usuario
@${sender.split("@")[0]}

⚠️ WARN ACUMULADOS: ${totalWarns}/7

🚫 Sanción
Baneo global aplicado.

📄 Motivo
7 advertencias acumuladas por spam.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ DIRECCIÓN DE SEGURIDAD DIGITAL
🤖 TitansB • Sistema Automático
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                mentions: [sender]
            });

            return true;
        }

        // 5 WARN → EXPULSIÓN
        if (totalWarns >= 5 && debeExpulsar(sender)) {

            quitarMute(sender);

            const resultado = await kickUsuario(
                sock,
                from,
                sender,
                "5 advertencias acumuladas por spam"
            );

            if (resultado.ok) {

                registrarAccion({
                    accion: "kick",
                    usuario: sender,
                    moderador: "Sistema de sanciones",
                    motivo: "5 advertencias acumuladas por spam",
                    grupo: from
                });

                await sock.sendMessage(from, {
                    text:
`╔══════════════════════════════╗
║     🚪 EXPULSIÓN AUTOMÁTICA   ║
╚══════════════════════════════╝

👤 Usuario
@${sender.split("@")[0]}

⚠️ WARN ACUMULADOS: ${totalWarns}/7

🚪 Sanción
Usuario expulsado de la comunidad.

📄 Motivo
5 advertencias acumuladas por spam.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 LIGA TITANS TEAM
⚖️ SISTEMA DE MODERACIÓN DE JUSTICIA COMPETITIVA
🛡️ TitansB • SISTEMA DE SEGURIDAD DIGITAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                    mentions: [sender]
                });

            } else {

                console.error(
                    "❌ Error en expulsión automática:",
                    resultado.error
                );

                aplicarMute(
                    sender,
                    "Sistema Antispam",
                    1,
                    "Spam detectado"
                );
            }

            return true;
        }

        // 3 WARN → MUTE DE 10 MINUTOS
        if (totalWarns >= 3 && debeMutear(sender)) {

            aplicarMute(
                sender,
                "Sistema de sanciones",
                10,
                "3 advertencias acumuladas"
            );

            if (botEsAdmin) {
                try {
                    await sock.sendMessage(from, {
                        delete: msg.key
                    });
                } catch (e) {
                    console.error(
                        "❌ Error eliminando mensaje:",
                        e.message
                    );
                }
            }

            await sock.sendMessage(from, {
                text:
`╔══════════════════════════════╗
║       🔇 MUTE AUTOMÁTICO     ║
╚══════════════════════════════╝

👤 Usuario
@${sender.split("@")[0]}

⚠️ WARN ACUMULADOS: ${totalWarns}/7

🔇 Sanción
Silenciado durante 10 minutos.

📄 Motivo
3 advertencias acumuladas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 PRÓXIMOS ESCALAMIENTOS

🚪 5 WARN → EXPULSIÓN
⛔ 7 WARN → BAN GLOBAL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ DIRECCIÓN DE SEGURIDAD DIGITAL
🤖 TitansB • Sistema Automático
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                mentions: [sender]
            });

            return true;
        }

        // ======================================
        // 🔇 MUTE ANTISPAM NORMAL
        // ======================================

        aplicarMute(
            sender,
            "Sistema Antispam",
            1,
            "Spam detectado"
        );

        // Eliminar mensaje que activó el antispam
        if (botEsAdmin) {
            try {
                await sock.sendMessage(from, {
                    delete: msg.key
                });
            } catch (e) {
                console.error(
                    "❌ Error eliminando mensaje de spam:",
                    e.message
                );
            }
        }

        // ======================================
        // 📢 AVISO
        // ======================================

        await sock.sendMessage(from, {
            text:
`╔══════════════════════════════╗
║      🚫 ANTISPAM ACTIVADO    ║
╚══════════════════════════════╝

👤 Usuario
@${sender.split("@")[0]}

⚠️ ADVERTENCIA REGISTRADA
📋 WARN: ${totalWarns}/7

🔇 Sanción actual
Silenciado durante 1 minuto.

🗑️ Tus mensajes serán eliminados
durante la sanción.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ESCALAMIENTO

⚠️ 3 WARN → 🔇 MUTE 10 MIN
🚪 5 WARN → 🚫 EXPULSIÓN
⛔ 7 WARN → 🔴 BAN GLOBAL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Cada advertencia queda registrada.

🛡️ DIRECCIÓN DE SEGURIDAD DIGITAL
🤖 TitansB • Sistema Automático
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            mentions: [sender]
        });

        return true;
    }

    return false;
}

module.exports = ejecutarFiltroModeracion;
