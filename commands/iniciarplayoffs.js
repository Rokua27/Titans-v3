const { esAdmin } = require("../utils/admin");
const {
    iniciarPlayoffs
} = require("../utils/playoffManager");

module.exports = {

    nombre: "iniciarplayoffs",

    alias: ["playoffs", "iniciarllave"],

    categoria: "torneos",

    descripcion: "Inicia oficialmente la llave de eliminación directa.",

    permisos: ["admin"],

    uso: "!iniciarplayoffs",

    async ejecutar(sock, from, args, msg) {

        try {

            const sender =
                msg.key.participant ||
                msg.key.remoteJid;

            if (!(await esAdmin(sock, from, sender))) {

                return await sock.sendMessage(from, {
                    text:
                        "⛔ Solo los administradores pueden iniciar los playoffs."
                });

            }

            const resultado = iniciarPlayoffs();

            if (!resultado.ok) {

                return await sock.sendMessage(from, {
                    text:
                        `❌ ${resultado.mensaje}`
                });

            }

            const bracket = resultado.bracket;

            const playin = bracket.playin[0];

            let byeTexto = "";

            bracket.bye.forEach((equipo, index) => {

                byeTexto +=
                    `${index + 1}. ${equipo}\n`;

            });

            const mensaje =
`╔════════════════════════════════╗
║     🏆 PLAYOFFS OFICIALES      ║
╚════════════════════════════════╝

🏆 ${bracket.temporada}

⚔️ FORMATO
ELIMINACIÓN DIRECTA
BO3

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎲 SORTEO OFICIAL

Los 9 equipos fueron sorteados
aleatoriamente para definir la llave.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 PLAY-IN

🥊 ${playin.a}
🆚
🥊 ${playin.b}

⚔️ Serie BO3

El ganador avanzará a CUARTOS
DE FINAL.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛡️ EQUIPOS CON BYE

${byeTexto}
Estos equipos avanzan directamente
a CUARTOS DE FINAL.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 ESTADO
🔴 PLAY-IN PENDIENTE

🎯 Próximo objetivo:
Completar los 8 equipos de CUARTOS.

🏆 LIGA TITANS TEAM
🤖 TitansBot v3`;

            await sock.sendMessage(from, {
                text: mensaje
            });

        } catch (error) {

            console.error(
                "❌ Error iniciarplayoffs:",
                error
            );

            await sock.sendMessage(from, {
                text:
                    "❌ No pude iniciar los playoffs."
            });
        }
    }
};
