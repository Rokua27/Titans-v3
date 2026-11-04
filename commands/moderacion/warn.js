const {
    agregarAdvertencia,
    debeMutear,
    debeExpulsar,
    debeBanear,
    aplicarMute,
    quitarMute
} = require("../../utils/sanciones");

const {
    kickUsuario,
    banUsuario
} = require("../../utils/accionesModeracion");

const {
    registrarAccion
} = require("../../utils/modlogs");

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

const {
    puedeSancionar,
    puedeSancionarJusticia
} = require("../../utils/jerarquia");

module.exports = {
    nombre: "warn",
    categoria: "moderacion",
    descripcion: "Agrega una advertencia a un usuario.",
    uso: "!warn @usuario motivo",
    permisos: ["moderador", "justicia"],
    alias: ["advertir"],

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
                        "No tienes permisos para advertir usuarios."
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
                        "Ejemplo:\n!warn @usuario Spam"
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
                    text:
`╔══════════════════════╗
║   🚫 ACCESO DENEGADO ║
╚══════════════════════╝

❌ No puedes advertir a un miembro con tu mismo rango o superior.

⚔️ TitansBot v3`
                });
            }

            const motivo =
                args.slice(1).join(" ") || "Sin motivo";

            // ==========================================
            // REGISTRAR ADVERTENCIA
            // ==========================================

            const datos =
                agregarAdvertencia(
                    usuario,
                    sender,
                    motivo
                );

            const total =
                datos.advertencias.length;

            // ==========================================
            // MENSAJE DE ADVERTENCIA
            // ==========================================

            await sock.sendMessage(from, {
                text: equipo(
                    "Advertencia Registrada",
`⚠️ Usuario
${obtenerNombreUsuario(usuario)}

📝 Motivo
${motivo}

📋 Total de advertencias
${total}

👮 Moderador
${obtenerNombreUsuario(sender)}`
                ),
                mentions: [
                    sender,
                    usuario
                ]
            });

            // ==========================================
            // ESCALAMIENTO AUTOMÁTICO
            // ==========================================

            // 3 ADVERTENCIAS → MUTE
            if (total === 3 && debeMutear(usuario)) {

                aplicarMute(
                    usuario,
                    "Sistema de sanciones",
                    10,
                    "3 advertencias acumuladas"
                );

                await sock.sendMessage(from, {
                    text:
`╔════════════════════════════╗
🔇 MUTE AUTOMÁTICO
╚════════════════════════════╝

👤 Usuario
@${usuario.split("@")[0]}

⚠️ Ha alcanzado 3 advertencias.

🔇 Sanción
Silenciado durante 10 minutos.

📄 Motivo
3 advertencias acumuladas

🤖 TitansBot v3`,
                    mentions: [usuario]
                });
            }

            // 5 ADVERTENCIAS → EXPULSIÓN
            if (total === 5 && debeExpulsar(usuario)) {

                const resultado =
                    await kickUsuario(
                        sock,
                        from,
                        usuario,
                        "5 advertencias acumuladas"
                    );

                if (resultado.ok) {

                    // Limpiar cualquier mute anterior al escalar
                    quitarMute(usuario);

                    // Registrar expulsión automática
                    registrarAccion({
                        accion: "kick",
                        usuario,
                        moderador: "Sistema de sanciones",
                        motivo: "5 advertencias acumuladas",
                        grupo: from
                    });

                    await sock.sendMessage(from, {
                        text:
`╔════════════════════════════╗
🚪 EXPULSIÓN AUTOMÁTICA
╚════════════════════════════╝

👤 Usuario
@${usuario.split("@")[0]}

⚠️ Ha alcanzado 5 advertencias.

🚪 Sanción
Usuario expulsado del grupo.

📄 Motivo
5 advertencias acumuladas

🤖 TitansBot v3`,
                        mentions: [usuario]
                    });

                } else {

                    console.error(
                        "Error en expulsión automática:",
                        resultado.error
                    );

                    await sock.sendMessage(from, {
                        text:
`⚠️ *SANCIÓN AUTOMÁTICA*

@${usuario.split("@")[0]} alcanzó 5 advertencias.

❌ No fue posible expulsarlo automáticamente.

⚔️ TitansBot v3`,
                        mentions: [usuario]
                    });
                }
            }

            // 7 ADVERTENCIAS → BAN GLOBAL
            if (total === 7 && debeBanear(usuario)) {

                await banUsuario(usuario);

                // Limpiar cualquier mute anterior al escalar
                quitarMute(usuario);

                // Registrar ban automático
                registrarAccion({
                    accion: "ban",
                    usuario,
                    moderador: "Sistema de sanciones",
                    motivo: "7 advertencias acumuladas",
                    grupo: from
                });

                await sock.sendMessage(from, {
                    text:
`╔════════════════════════════╗
⛔ BAN AUTOMÁTICO
╚════════════════════════════╝

👤 Usuario
@${usuario.split("@")[0]}

⚠️ Ha alcanzado 7 advertencias.

🚫 Sanción
Baneo global aplicado.

📄 Motivo
7 advertencias acumuladas

🤖 TitansBot v3`,
                    mentions: [usuario]
                });
            }

        } catch (err) {

            console.error(
                "Error en comando warn:",
                err
            );

            monitor.registrarEvento("ERROR_SISTEMA", {
                estado: "ERROR",
                componente: "WARN",
                codigo: "SYSTEM_ERROR",
                descripcion: err.message
            });

            await sock.sendMessage(from, {
                text: error(
                    "Sistema",
                    "No fue posible registrar la advertencia."
                )
            });
        }
    }
};
