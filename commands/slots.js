const { leerJSON, guardarJSON } = require("../utils/database");

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

function calcularPremio(resultado, apuesta) {
    const [a, b, c] = resultado;

    // Tres iguales
    if (a === b && b === c) {
        if (a === "7️⃣") return apuesta * 10;
        if (a === "💎") return apuesta * 8;
        if (a === "🔔") return apuesta * 6;
        return apuesta * 5;
    }

    // Dos iguales
    if (a === b || a === c || b === c) {
        return apuesta * 2;
    }

    return 0;
}

module.exports = {
    nombre: "slots",
    categoria: "economia",
    descripcion: "Juega al tragamonedas Titans.",
    uso: "!slots cantidad",
    permisos: ["usuario"],
    alias: ["tragamonedas"],

    async ejecutar(sock, from, args, msg) {
        try {
            const sender = msg.key.participant || msg.key.remoteJid;

            const apuesta = Number(args[0]);

            if (!Number.isFinite(apuesta) || apuesta < COSTO_MINIMO) {
                return sock.sendMessage(from, {
                    text:
`🎰 𝗧𝗜𝗧𝗔𝗡𝗦 𝗦𝗟𝗢𝗧𝗦

💰 Apuesta mínima: ${COSTO_MINIMO} monedas

Ejemplo:
!slots 100`
                });
            }

            if (!Number.isInteger(apuesta)) {
                return sock.sendMessage(from, {
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
                return sock.sendMessage(from, {
                    text:
`❌ 𝗠𝗢𝗡𝗘𝗗𝗔𝗦 𝗜𝗡𝗦𝗨𝗙𝗜𝗖𝗜𝗘𝗡𝗧𝗘𝗦

💰 Apuesta: ${apuesta}
💰 Tu saldo: ${usuario.coins}

🎁 Usa !daily para conseguir tu recompensa diaria.`
                });
            }

            // Cobrar apuesta
            usuario.coins -= apuesta;

            const resultado = girar();
            const premio = calcularPremio(resultado, apuesta);

            usuario.coins += premio;

            guardarJSON("usuarios.json", usuarios);

            const cambio = premio - apuesta;

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

        ${resultado[0]}  │  ${resultado[1]}  │  ${resultado[2]}

💰 Apuesta: ${apuesta} monedas

${resultadoTexto}

📊 Cambio: ${cambio >= 0 ? "+" : ""}${cambio} monedas
💰 Saldo: ${usuario.coins} monedas

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

            await sock.sendMessage(from, {
                text: "❌ No fue posible ejecutar Titans Slots."
            });
        }
    }
};
