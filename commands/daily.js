const { daily } = require("../utils/economiaCompartida");

module.exports = {
    nombre: "daily",
    categoria: "jugador",
    descripcion: "Reclama tu recompensa diaria.",
    uso: "!daily",
    permisos: ["usuario"],
    alias: [],

    async ejecutar(sock, from, args, msg) {
        try {
            const sender = msg.key.participant || msg.key.remoteJid;
            const ahora = Date.now();

            const reclamo = await daily.reclamar(sender, ahora);

            if (!reclamo.ok && reclamo.motivo === "cooldown") {
                const horas = Math.floor(
                    reclamo.restante / (1000 * 60 * 60)
                );

                const minutos = Math.floor(
                    (reclamo.restante % (1000 * 60 * 60)) / (1000 * 60)
                );

                return await sock.sendMessage(from, {
                    text:
`╔══════════════════════════════╗
║      ⏰ 𝗗𝗔𝗜𝗟𝗬 𝗖𝗢𝗢𝗟𝗗𝗢𝗪𝗡 ⏰     ║
╚══════════════════════════════╝

🎁 Ya reclamaste tu recompensa de hoy.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🕒 𝗧𝗜𝗘𝗠𝗣𝗢 𝗥𝗘𝗦𝗧𝗔𝗡𝗧𝗘
⏳ ${horas}h ${minutos}m

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 Racha actual: *${reclamo.racha} días*

🎯 Vuelve más tarde para seguir acumulando recompensas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
🎮 Economía • Progresión • Comunidad
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯 • 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗘𝘀𝗽𝗼𝗿𝘁𝘀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                });
            }

            if (!reclamo.ok || !reclamo.resultado) {
                throw new Error("No se pudo confirmar la recompensa diaria.");
            }

            const resultado = reclamo.resultado;

            await sock.sendMessage(from, {
                text:
`╔══════════════════════════════╗
║      🎁 𝗗𝗔𝗜𝗟𝗬 𝗖𝗟𝗔𝗜𝗠 🎁      ║
╚══════════════════════════════╝

👑 *RECOMPENSA RECLAMADA*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 +${resultado.recompensaCoins} monedas
⭐ +${resultado.recompensaXP} XP
${resultado.monedasNivel > 0
    ? `🏅 +${resultado.monedasNivel} monedas por subir ${resultado.nivelesGanados} nivel(es)`
    : ""}
🔥 Racha diaria: *${resultado.racha} días*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Cuanto mayor sea tu racha, mayores serán las recompensas.

📅 Vuelve mañana para seguir acumulando beneficios exclusivos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
🎮 Economía • Progresión • Comunidad
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯 • 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗘𝘀𝗽𝗼𝗿𝘁𝘀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
            });

        } catch (error) {
            console.error("❌ Error daily:", error);

            await sock.sendMessage(from, {
                text:
`╔══════════════════════════════╗
║       ❌ 𝗘𝗥𝗥𝗢𝗥 ❌        ║
╚══════════════════════════════╝

No pude entregar la recompensa diaria.

🔧 Inténtalo nuevamente en unos segundos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯`
            });
        }
    }
};
