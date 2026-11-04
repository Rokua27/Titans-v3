module.exports = {
    nombre: "casino",
    categoria: "economia",
    descripcion: "Muestra el sistema de juegos y economía Titans.",
    uso: "!casino",
    permisos: ["usuario"],

    async ejecutar(sock, from, args, msg) {
        await sock.sendMessage(from, {
            text:
`╔══════════════════════════════╗
║       🎰 𝗧𝗜𝗧𝗔𝗡𝗦 𝗖𝗔𝗦𝗜𝗡𝗢       ║
╚══════════════════════════════╝

💰 𝗘𝗖𝗢𝗡𝗢𝗠Í𝗔

🎁 !daily
   Recompensa diaria.

🏆 !topcoins
   Ranking de monedas.

🎰 𝗝𝗨𝗘𝗚𝗢𝗦

🎡 !ruleta
   Ruleta Titans.

🪙 !coinflip
   Cara o cruz.

🎰 !slots
   Tragamonedas Titans.

🎲 !dados
   Duelo de dados contra TitansB.

🎁 𝗣𝗥𝗘𝗠𝗜𝗢𝗦

📦 !caja
   Compra una Caja Premium.

🔓 !abrir
   Abre tus cajas.

🎒 !inventario
   Consulta tus premios.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 Una sola economía.
🎮 Todos los juegos utilizan tus monedas.
🏆 ¡Juega, gana y sube en el ranking!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
🤖 TitansB • Sistema Automático
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        });
    }
};
