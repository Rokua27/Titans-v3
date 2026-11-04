const { leerJSON, guardarJSON } = require("../utils/database");
const { obtenerNombreUsuario } = require("../utils/comunidad");

const APUESTA_MINIMA = 50;

module.exports = {
    nombre: "dados",
    categoria: "economia",
    descripcion: "Duelo de dados contra TitansB.",
    uso: "!dados cantidad",
    permisos: ["usuario"],

    async ejecutar(sock, from, args, msg) {
        try {
            const sender = msg.key.participant || msg.key.remoteJid;
            const nombreJugador = obtenerNombreUsuario(sender) || "Jugador";
            const apuesta = Number(args[0]);

            if (!Number.isFinite(apuesta) || apuesta < APUESTA_MINIMA) {
                return await sock.sendMessage(from, {
                    text:
`🎲 𝗧𝗜𝗧𝗔𝗡𝗦 𝗗𝗔𝗗𝗢𝗦

💰 Apuesta mínima: ${APUESTA_MINIMA} monedas

Ejemplo:
!dados 100`
                });
            }

            if (!Number.isInteger(apuesta)) {
                return await sock.sendMessage(from, {
                    text: "❌ La apuesta debe ser un número entero."
                });
            }

            const usuarios = leerJSON("usuarios.json") || {};

            if (!usuarios[sender]) {
                usuarios[sender] = {
                    coins: 0
                };
            }

            const usuario = usuarios[sender];
            usuario.coins = Number(usuario.coins) || 0;

            if (usuario.coins < apuesta) {
                return await sock.sendMessage(from, {
                    text:
`❌ 𝗠𝗢𝗡𝗘𝗗𝗔𝗦 𝗜𝗡𝗦𝗨𝗙𝗜𝗖𝗜𝗘𝗡𝗧𝗘𝗦

💰 Apuesta: ${apuesta}
💰 Tu saldo: ${usuario.coins}

🎁 Usa !daily para conseguir monedas.`
                });
            }

            // Cobrar la apuesta
            usuario.coins -= apuesta;

            // Lanzamientos
            const dadoJugador = Math.floor(Math.random() * 6) + 1;
            const dadoTitans = Math.floor(Math.random() * 6) + 1;

            let premio = 0;
            let resultado;
            let cambio;

            if (dadoJugador > dadoTitans) {
                // Victoria: devuelve 2x la apuesta
                premio = apuesta * 2;
                usuario.coins += premio;
                cambio = apuesta;

                resultado =
`🔥 𝗩𝗜𝗖𝗧𝗢𝗥𝗜𝗔

¡${nombreJugador} ganó el duelo! ⚔️
💰 Premio: +${premio} monedas
📈 Ganancia: +${cambio} monedas`;
            } else if (dadoJugador < dadoTitans) {
                // Derrota: pierde la apuesta
                premio = 0;
                cambio = -apuesta;

                resultado =
`💀 𝗗𝗘𝗥𝗥𝗢𝗧𝗔

TitansB ganó esta ronda. 🤖
💸 Pérdida: -${apuesta} monedas`;
            } else {
                // Empate: devuelve la apuesta
                premio = apuesta;
                usuario.coins += premio;
                cambio = 0;

                resultado =
`⚖️ 𝗘𝗠𝗣𝗔𝗧𝗘

Los dos sacaron el mismo número.
💰 Tu apuesta ha sido devuelta.`;
            }

            guardarJSON("usuarios.json", usuarios);

            await sock.sendMessage(from, {
                text:
`╔══════════════════════════════╗
║       🎲 𝗧𝗜𝗧𝗔𝗡𝗦 𝗗𝗔𝗗𝗢𝗦       ║
╚══════════════════════════════╝

👤 ${nombreJugador}
🎲 Resultado: ${dadoJugador}

🤖 𝗧𝗜𝗧𝗔𝗡𝗦𝗕
🎲 Resultado: ${dadoTitans}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${resultado}

💰 Saldo actual: ${usuario.coins} monedas

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

            await sock.sendMessage(from, {
                text: "❌ No fue posible ejecutar Titans Dados."
            });
        }
    }
};
