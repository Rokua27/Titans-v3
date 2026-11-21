const { jugarSlots } = require("../utils/juegosEconomia");

const COSTO_MINIMO = 50;

const SIMBOLOS = [
    "🍒",
    "🍋",
    "🍊",
    "🔔",
    "💎",
    "7️⃣"
];

function girar() {
    return [
        SIMBOLOS[Math.floor(Math.random() * SIMBOLOS.length)],
        SIMBOLOS[Math.floor(Math.random() * SIMBOLOS.length)],
        SIMBOLOS[Math.floor(Math.random() * SIMBOLOS.length)]
    ];
}

module.exports = {
    nombre: "slots",
    categoria: "economia",
    descripcion: "Juega al tragamonedas Titans.",
    uso: "!slots cantidad",
    permisos: ["usuario"],
    alias: ["tragamonedas"],

    async ejecutar(sock, from, args, msg) {
        let transaccionConfirmada = false;

        try {
            const sender = msg.key.participant || msg.key.remoteJid;
            const messageId = msg.key.id;
            const apuesta = Number(args[0]);

            if (!Number.isSafeInteger(apuesta) || apuesta < COSTO_MINIMO) {
                return sock.sendMessage(from, {
                    text:
`🎰 𝗧𝗜𝗧𝗔𝗡𝗦 𝗦𝗟𝗢𝗧𝗦

💰 Apuesta mínima: ${COSTO_MINIMO} monedas

Ejemplo:
!slots 100`
                });
            }

            const simbolos = girar();

            const operacion = await jugarSlots(
                sender,
                messageId,
                apuesta,
                simbolos,
                Date.now(),
                Math.random(),
                Math.random()
            );

            if (operacion.duplicada) return;

            if (!operacion.ok) {
                if (operacion.motivo === "limite") {
                    return await sock.sendMessage(from, {
                        text:
`🎰 𝗟𝗜́𝗠𝗜𝗧𝗘 𝗗𝗜𝗔𝗥𝗜𝗢

Ya utilizaste tus 3 partidas de Slots de hoy.

⏰ El contador se reinicia a las 00:00, hora de Colombia.
🎮 Puedes seguir jugando los otros juegos del casino.`
                    });
                }

                return sock.sendMessage(from, {
                    text:
`❌ 𝗠𝗢𝗡𝗘𝗗𝗔𝗦 𝗜𝗡𝗦𝗨𝗙𝗜𝗖𝗜𝗘𝗡𝗧𝗘𝗦

💰 Apuesta: ${apuesta}
💰 Tu saldo: ${operacion.saldo}

🎁 Usa !daily para conseguir tu recompensa diaria.`
                });
            }

            transaccionConfirmada = true;

            const resultado = operacion.resultado;
            const premio = resultado.premio;
            const cambio = resultado.cambio;

            let resultadoTexto;

            if (premio > apuesta) {
                resultadoTexto =
`🔥 𝗚𝗥𝗔𝗡 𝗣𝗥𝗘𝗠𝗜𝗢 🔥

💰 Ganancia: +${premio} monedas`;
            } else if (premio === apuesta) {
                resultadoTexto =
`⚖️ 𝗘𝗠𝗣𝗔𝗧𝗘

Recuperaste tu apuesta.
💰 Premio: ${premio} monedas`;
            } else if (premio > 0) {
                resultadoTexto =
`✨ 𝗣𝗥𝗘𝗠𝗜𝗢

💰 Premio: +${premio} monedas`;
            } else {
                resultadoTexto =
`💸 𝗦𝗜𝗡 𝗣𝗥𝗘𝗠𝗜𝗢

La máquina se quedó con tu apuesta.`;
            }

            await sock.sendMessage(from, {
                text:
`╔══════════════════════════════╗
║       🎰 𝗧𝗜𝗧𝗔𝗡𝗦 𝗦𝗟𝗢𝗧𝗦       ║
╚══════════════════════════════╝

🎰 𝗥𝗘𝗦𝗨𝗟𝗧𝗔𝗗𝗢
        ${resultado.simbolos[0]}  │  ${resultado.simbolos[1]}  │  ${resultado.simbolos[2]}

💰 Apuesta: ${resultado.apuesta} monedas

${resultadoTexto}

📊 Cambio: ${cambio >= 0 ? "+" : ""}${cambio} monedas
💰 Saldo: ${resultado.coins} monedas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎁 !daily  •  Recompensa diaria
🎡 !ruleta •  Ruleta Titans
🪙 !coinflip • Cara o cruz
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
🤖 TitansB • Sistema Automático
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
            });

        } catch (error) {
            console.error("❌ Error en slots:", error);

            if (!transaccionConfirmada) {
                await sock.sendMessage(from, {
                    text: "❌ No fue posible ejecutar Titans Slots."
                });
            }
        }
    }
};
