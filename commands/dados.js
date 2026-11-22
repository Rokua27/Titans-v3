const { obtenerNombreUsuario } = require("../utils/comunidad");
const { jugarDados } = require("../utils/juegosEconomia");

const APUESTA_MINIMA = 50;

module.exports = {
    nombre: "dados",
    categoria: "economia",
    descripcion: "Duelo de dados contra TitansB.",
    uso: "!dados cantidad",
    permisos: ["usuario"],

    async ejecutar(sock, from, args, msg) {
        let transaccionConfirmada = false;

        try {
            const sender = msg.key.participant || msg.key.remoteJid;
            const messageId = msg.key.id;
            const nombreJugador = obtenerNombreUsuario(sender) || "Jugador";
            const apuesta = Number(args[0]);

            if (!Number.isSafeInteger(apuesta) || apuesta < APUESTA_MINIMA) {
                return await enviarMensajeTitans(sock, from, {
                    text:
`🎲 𝗧𝗜𝗧𝗔𝗡𝗦 𝗗𝗔𝗗𝗢𝗦

💰 Apuesta mínima: ${APUESTA_MINIMA} monedas

Ejemplo:
!dados 100`
                });
            }

            const dadoJugador = Math.floor(Math.random() * 6) + 1;
            const dadoTitans = Math.floor(Math.random() * 6) + 1;

            const operacion = await jugarDados(
                sender,
                messageId,
                apuesta,
                dadoJugador,
                dadoTitans
            );

            if (operacion.duplicada) return;

            if (!operacion.ok) {
                if (operacion.motivo === "limite") {
                    return await enviarMensajeTitans(sock, from, {
                        text:
`🎲 𝗟𝗜́𝗠𝗜𝗧𝗘 𝗗𝗜𝗔𝗥𝗜𝗢

Ya utilizaste tus 3 partidas de Dados de hoy.

⏰ El contador se reinicia a las 00:00, hora de Colombia.
🎮 Puedes seguir jugando los otros juegos del casino.`
                    });
                }

                return await enviarMensajeTitans(sock, from, {
                    text:
`❌ 𝗠𝗢𝗡𝗘𝗗𝗔𝗦 𝗜𝗡𝗦𝗨𝗙𝗜𝗖𝗜𝗘𝗡𝗧𝗘𝗦

💰 Apuesta: ${apuesta}
💰 Tu saldo: ${operacion.saldo}

🎁 Usa !daily para conseguir monedas.`
                });
            }

            transaccionConfirmada = true;

            const resultado = operacion.resultado;

            let textoResultado;

            if (resultado.gano) {
                textoResultado =
`🔥 𝗩𝗜𝗖𝗧𝗢𝗥𝗜𝗔
¡${nombreJugador} ganó el duelo! ⚔️
💰 Premio: +${resultado.premio} monedas
📈 Ganancia: +${resultado.cambio} monedas`;
            } else if (resultado.perdio) {
                textoResultado =
`💀 𝗗𝗘𝗥𝗥𝗢𝗧𝗔
TitansB ganó esta ronda. 🤖
💸 Pérdida: -${resultado.apuesta} monedas`;
            } else {
                textoResultado =
`⚖️ 𝗘𝗠𝗣𝗔𝗧𝗘
Los dos sacaron el mismo número.
💰 Tu apuesta ha sido devuelta.`;
            }

            await enviarMensajeTitans(sock, from, {
                text:
`╔══════════════════════════════╗
║       🎲 𝗧𝗜𝗧𝗔𝗡𝗦 𝗗𝗔𝗗𝗢𝗦       ║
╚══════════════════════════════╝

👤 ${nombreJugador}
🎲 Resultado: ${resultado.dadoJugador}

🤖 𝗧𝗜𝗧𝗔𝗡𝗦𝗕
🎲 Resultado: ${resultado.dadoTitans}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${textoResultado}

💰 Saldo actual: ${resultado.coins} monedas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎁 !daily    • Recompensa diaria
🎡 !ruleta   • Ruleta Titans
🎰 !slots    • Tragamonedas
🪙 !coinflip • Cara o cruz
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
🤖 TitansB • Sistema Automático
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
            });

        } catch (error) {
            console.error("❌ Error en dados:", error);

            if (!transaccionConfirmada) {
                await enviarMensajeTitans(sock, from, {
                    text: "❌ No fue posible ejecutar Titans Dados."
                });
            }
        }
    }
};

const PIE_TITANS = "🏆LIGA TITANS TEAM - TITANSB MIEMBRO VIRTUAL 🤖";

async function enviarMensajeTitans(sock, from, contenido) {
    if (contenido && typeof contenido.text === "string") {
        contenido.text = contenido.text.includes(PIE_TITANS)
            ? contenido.text
            : `${contenido.text.trimEnd()}\n\n${PIE_TITANS}`;
    }
    return sock.sendMessage(from, contenido);
}
