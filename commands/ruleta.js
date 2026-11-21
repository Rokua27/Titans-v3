const monitor = require("../utils/monitor");
const { anuncioGlobal } = require("../utils/anuncios");
const { jugarRuleta } = require("../utils/casinoEconomia");

module.exports = {
    nombre: "ruleta",
    alias: [],
    categoria: "jugador",
    descripcion: "Apuesta monedas en la ruleta.",
    permisos: ["usuario"],
    uso: "!ruleta <cantidad>",

    async ejecutar(sock, from, args, msg) {
        let resultado;

        try {
            const sender = msg.key.participant || msg.key.remoteJid;
            const messageId = msg.key.id;

            resultado = await jugarRuleta(
                sender,
                messageId,
                Math.random(),
                Date.now(),
                Math.random(),
                Math.random()
            );

            if (resultado.duplicada) return;

            if (!resultado.ok) {
                if (resultado.motivo === "limite") {
                    return await sock.sendMessage(from, {
                        text: `╔══════════════════════════════╗
║     🚫 LÍMITE ALCANZADO      ║
╚══════════════════════════════╝

🎰 Comando:
Ruleta

❌ Ya utilizaste este comando
3 veces el día de hoy.

⏰ Tu límite se reinicia a las 00:00, hora de Colombia.

━━━━━━━━━━━━━━━━━━━━━━
🤖 TitansBot v3`
                    });
                }

                if (resultado.motivo === "cooldown") {
                    const restante = Math.ceil(resultado.restante / 1000);

                    return await sock.sendMessage(from, {
                        text: `╔══════════════════════════════╗
║      ⏱️ 𝗖𝗢𝗢𝗟𝗗𝗢𝗪𝗡 ⏱️       ║
╚══════════════════════════════╝

🎡 La ruleta aún se está recargando.

⌛ Espera *${restante} segundos* para volver a jugar.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯`
                    });
                }

                if (resultado.motivo === "saldo_insuficiente") {
                    return await sock.sendMessage(from, {
                        text: `╔══════════════════════════════╗
║     💸 𝗦𝗜𝗡 𝗙𝗢𝗡𝗗𝗢𝗦 💸     ║
╚══════════════════════════════╝

🎡 La Ruleta Titans requiere *100 monedas*.

💰 Tus monedas: *${resultado.saldo}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚔️ Participa en la comunidad para ganar más monedas.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                    });
                }
            }

            const juego = resultado.resultado;
            const jackpotMostrado = juego.jackpotGanado
                ? juego.premioCoins
                : juego.jackpot;

            await sock.sendMessage(from, {
                text: `╔══════════════════════════════╗
║      🎡 𝗥𝗨𝗟𝗘𝗧𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 🎡      ║
╚══════════════════════════════╝

🎰 *Girando la ruleta...*

🎯 La ruleta tiene siete posibles resultados:
🏆 Jackpot legendario
💰 1.000 monedas
🎁 400 monedas
🪙 200 monedas
⭐ 100 XP
☠️ Pérdida adicional de 50 monedas
😶 Sin premio

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💵 Costo por partida: *100 monedas*
💰 Jackpot: *${jackpotMostrado} monedas*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚔️ La suerte de los titanes decidirá tu destino...`
            });

            await new Promise(resolve => setTimeout(resolve, 2000));

            if (juego.jackpotGanado) {
                try {
                    await anuncioGlobal(sock, from, "jackpot", {
                        nombre: juego.nombre,
                        coins: juego.premioCoins
                    });
                } catch (error) {
                    console.error("Error anunciando jackpot:", error);
                }
            }

            const mensajeFinal =
`╔══════════════════════════════╗
║        🎉 𝗥𝗘𝗦𝗨𝗟𝗧𝗔𝗗𝗢 🎉        ║
╚══════════════════════════════╝

👤 *${juego.nombre}*

🏅 *${juego.titulo}*
${juego.descripcion}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 Monedas actuales: *${juego.coins}*
⭐ XP actual: *${juego.xp}*
${juego.monedasNivel > 0
    ? `🏅 +${juego.monedasNivel} monedas por subir ${juego.nivelesGanados} nivel(es)`
    : ""}
🏆 Jackpot: *${juego.jackpot}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎰 *PROBABILIDADES DE LA RULETA*

🏆 Jackpot → 1%
💰 1.000 monedas → 9%
🎁 400 monedas → 20%
🪙 200 monedas → 25%
⭐ 100 XP → 20%
☠️ Pierdes 50 monedas adicionales → 15%
😶 Sin premio → 10%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💵 Costo por partida: *100 monedas*
📊 Probabilidad total: *100%*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯 • 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗘𝘀𝗽𝗼𝗿𝘁𝘀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

            await sock.sendMessage(from, { text: mensajeFinal });

        } catch (error) {
            console.error("❌ Error ruleta:", error);

            monitor.registrarEvento("ERROR_SISTEMA", {
                estado: "ERROR",
                componente: "RULETA",
                codigo: "SYSTEM_ERROR",
                descripcion: error.message
            });

            // No se informa un fallo de apuesta si la transacción ya fue confirmada.
            if (!resultado || !resultado.ok) {
                await sock.sendMessage(from, {
                    text: "❌ Ocurrió un error al procesar la ruleta."
                }).catch(() => {});
            }
        }
    }
};
