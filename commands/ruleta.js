const monitor = require("../utils/monitor");
const { anuncioGlobal } = require("../utils/anuncios");
const { jugarRuleta } = require("../utils/casinoEconomia");

const PIE_TITANS = "🏆LIGA TITANS TEAM - TITANSB MIEMBRO VIRTUAL 🤖";

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
                        text: `📢 *TITANS TEAM · RULETA*

╔══ 🚫 LÍMITE ALCANZADO ══╗

🎡 Ya utilizaste tus 3 partidas de Ruleta disponibles para hoy.

⏰ Tu límite se reinicia a las 00:00, hora de Colombia.

╚══════════════════════════╝

${PIE_TITANS}`
                    });
                }

                if (resultado.motivo === "cooldown") {
                    const restante = Math.ceil(resultado.restante / 1000);

                    return await sock.sendMessage(from, {
                        text: `📢 *TITANS TEAM · RULETA*

╔══ ⏳ RULETA EN RECARGA ══╗

🎡 La Ruleta Titans todavía se está recargando.

⌛ Espera *${restante} segundos* para volver a jugar.

╚══════════════════════════╝

${PIE_TITANS}`
                    });
                }

                if (resultado.motivo === "saldo_insuficiente") {
                    return await sock.sendMessage(from, {
                        text: `📢 *TITANS TEAM · RULETA*

╔══ 💸 SALDO INSUFICIENTE ══╗

🎡 La Ruleta Titans requiere *100 monedas*.

💰 Tus monedas: *${resultado.saldo}*

Participa en la comunidad y consigue más monedas para volver a intentarlo.

╚══════════════════════════╝

${PIE_TITANS}`
                    });
                }
            }

            const juego = resultado.resultado;
            const jackpotMostrado = juego.jackpotGanado
                ? juego.premioCoins
                : juego.jackpot;

            await sock.sendMessage(from, {
                text: `📢 *TITANS TEAM · RULETA*

🎡 *¡BIENVENIDO A LA RULETA TITANS!*

Pon a prueba tu suerte. Cada giro puede cambiar tu fortuna. 🍀

╔══ 🎡 RULETA TITANS 🎡 ══╗

║ 🪙 *COSTO POR GIRO:* 100 monedas

║ 🏆 *JACKPOT:* ${jackpotMostrado} monedas

║ 🎰 *RESULTADOS DISPONIBLES:*
   👑 Jackpot legendario
   🪙 1.000 monedas
   🪙 400 monedas
   🪙 200 monedas
   ✨ 100 XP
   📉 Pérdida adicional de 50 monedas
   🎲 Sin premio

╚══════════════════════════╝

💎 *¡TAMBIÉN PUEDES GANAR GRANDES RECOMPENSAS!*

En esta modalidad tienes la oportunidad de conseguir:

💎 50 diamantes.
💎 86 diamantes.
🎟️ Pase semanal de diamantes.
👑 Pase semanal Elite.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${PIE_TITANS}`
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

            const premioRealValido =
                juego.premioReal &&
                juego.premioReal.premio &&
                typeof juego.premioReal.premio.nombre === "string" &&
                juego.premioReal.premio.nombre.trim().length > 0;

            const bloquePremioReal = premioRealValido
                ? `\n\n💎 *¡PREMIO REAL ADJUDICADO!*\n🎁 ${juego.premioReal.premio.nombre}\n📋 Estado: pendiente de datos para continuar con la entrega.`
                : "";

            const mensajeFinal =
`📢 *TITANS TEAM · RULETA*

╔══ 🎉 RESULTADO DE RULETA ══╗

👤 *JUGADOR:* ${juego.nombre}

🏅 *RESULTADO:* ${juego.titulo}
${juego.descripcion}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 *MONEDAS ACTUALES:* ${juego.coins}
✨ *EXPERIENCIA ACTUAL:* ${juego.xp}
${juego.monedasNivel > 0
    ? `🏅 *BONIFICACIÓN DE NIVEL:* +${juego.monedasNivel} monedas por subir ${juego.nivelesGanados} nivel(es)`
    : ""}
🏆 *JACKPOT:* ${juego.jackpot} monedas${bloquePremioReal}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💵 Costo por giro: 100 monedas.

${PIE_TITANS}`;

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
                    text: `📢 *TITANS TEAM · RULETA*

╔══ ❌ ERROR DE SISTEMA ══╗

No fue posible procesar la Ruleta en este momento.

╚══════════════════════════╝

${PIE_TITANS}`
                }).catch(() => {});
            }
        }
    }
};
