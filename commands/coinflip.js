const { jugarCoinflip } = require("../utils/casinoEconomia");

module.exports = {
    nombre: "coinflip",
    alias: ["cf", "flip"],
    categoria: "jugador",
    descripcion: "Apuesta monedas lanzando una moneda.",
    permisos: ["usuario"],
    uso: "!coinflip <cara/cruz> <cantidad>",

    async ejecutar(sock, from, args, msg) {
        let resultadoOperacion;

        try {
            const sender = msg.key.participant || msg.key.remoteJid;
            const messageId = msg.key.id;
            const usuario = Number.parseInt(args[0], 10);

            if (!Number.isSafeInteger(usuario) || usuario <= 0) {
                return await enviarMensajeTitans(sock, from, {
                    text: `╔══════════════════════════════╗
║      🎰 𝗖𝗢𝗜𝗡 𝗙𝗟𝗜𝗣 🎰       ║
╚══════════════════════════════╝

📌 *Uso correcto*

!coinflip cantidad [cara/cruz]

📝 *Ejemplos:*
!coinflip 500 cara
!coinflip 1000 cruz
!coinflip 250

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗖𝗔𝗦𝗜𝗡𝗢 𝗧𝗜𝗧𝗔𝗡𝗦
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                });
            }

            if (usuario < 50) {
                return await enviarMensajeTitans(sock, from, {
                    text: "❌ La apuesta mínima es *50 monedas*."
                });
            }

            let eleccion = "cara";

            if (args[1]) {
                const opcion = args[1].toLowerCase();

                if (opcion === "cara" || opcion === "cruz") {
                    eleccion = opcion;
                }
            }

            const resultado = Math.random() < 0.5 ? "cara" : "cruz";

            resultadoOperacion = await jugarCoinflip(
                sender,
                messageId,
                usuario,
                eleccion,
                resultado
            );

            if (resultadoOperacion.duplicada) return;

            if (!resultadoOperacion.ok) {
                if (resultadoOperacion.motivo === "limite") {
                    return await enviarMensajeTitans(sock, from, {
                        text: `╔══════════════════════════════╗
║     🚫 LÍMITE ALCANZADO      ║
╚══════════════════════════════╝

🎰 Comando:
CoinFlip

❌ Has usado este comando
3 veces el día de hoy.

📅 Podrás volver a jugar mañana.

━━━━━━━━━━━━━━━━━━━━━━

🤖 TitansBot v3`
                    });
                }

                if (resultadoOperacion.motivo === "saldo_insuficiente") {
                    return await enviarMensajeTitans(sock, from, {
                        text: `╔══════════════════════════════╗
║      💸 𝗙𝗢𝗡𝗗𝗢𝗦 💸       ║
╚══════════════════════════════╝

No tienes suficientes monedas.

💰 Balance actual: *${resultadoOperacion.saldo}*
🎲 Apuesta solicitada: *${usuario}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗖𝗔𝗦𝗜𝗡𝗢 𝗧𝗜𝗧𝗔𝗡𝗦
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                    });
                }
            }

            const juego = resultadoOperacion.resultado;
            const emojiResultado = juego.resultado === "cara" ? "🟡" : "⚫";
            const estado = juego.gano ? "🏆 ¡GANASTE!" : "💥 ¡PERDISTE!";

            await enviarMensajeTitans(sock, from, {
                text:
`╔══════════════════════════════╗
║      🎰 𝗖𝗢𝗜𝗡 𝗙𝗟𝗜𝗣 🎰       ║
╚══════════════════════════════╝

🪙 *LA MONEDA GIRA EN EL AIRE...*
✨ *RESULTADO OFICIAL*
${emojiResultado} *${juego.resultado.toUpperCase()}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Tu elección: *${juego.eleccion.toUpperCase()}*
${estado}

${juego.gano ? "💰 Ganancia" : "💸 Pérdida"}: *${Math.abs(juego.cambio)} monedas*
🏦 Balance actual: *${juego.coins} monedas*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${juego.gano
    ? "🔥 La fortuna sonríe a los verdaderos titanes."
    : "⚔️ Todo campeón conoce la derrota antes de la gloria."}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗖𝗔𝗦𝗜𝗡𝗢 𝗧𝗜𝗧𝗔𝗡𝗦
🎮 Riesgo • Suerte • Leyendas
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯 • 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗘𝘀𝗽𝗼𝗿𝘁𝘀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
            });

        } catch (error) {
            console.error("❌ Error coinflip:", error);

            // No se informa un fallo de apuesta si la transacción ya fue confirmada.
            if (!resultadoOperacion || !resultadoOperacion.ok) {
                await enviarMensajeTitans(sock, from, {
                    text: `╔══════════════════════════════╗
║       ❌ 𝗘𝗥𝗥𝗢𝗥 ❌        ║
╚══════════════════════════════╝

No pude procesar la apuesta.

🔧 Inténtalo nuevamente en unos segundos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯`
                }).catch(() => {});
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
