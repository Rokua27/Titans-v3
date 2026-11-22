module.exports = {
    nombre: "casino",
    categoria: "economia",
    descripcion: "Muestra el sistema de juegos y economía Titans.",
    uso: "!casino",
    permisos: ["usuario"],

    async ejecutar(sock, from, args, msg) {
        await sock.sendMessage(from, {
            text:
`📢 *TITANS TEAM · CASINO*

🎰 *¡BIENVENIDO AL CASINO TITANS!*

Pon a prueba tu suerte, disfruta de las modalidades disponibles y demuestra tu habilidad.

╔══ 🎰 CASINO TITANS 🎰 ══╗

💰 *ECONOMÍA*

🎁 !daily
   Reclama tu recompensa diaria.

🏆 !topcoins
   Consulta el ranking de monedas.

🎮 *JUEGOS*

🎡 !ruleta
   Pon a prueba tu suerte en la Ruleta Titans.

🪙 !coinflip
   Cara o cruz.

🎰 !slots
   Tragamonedas Titans.

🎲 !dados
   Duelo de dados contra TitansB.

📦 *CAJAS E INVENTARIO*

📦 !caja
   Consulta y compra tus cajas.

🔓 !abrir
   Abre tus cajas y descubre recompensas.

🎒 !inventario
   Consulta tus objetos y recursos.

╚══════════════════════════╝

💰 Una sola economía para tus juegos.
🎮 Administra tus monedas y recursos.
🏆 ¡Juega, progresa y escala posiciones!

💎 *¡TAMBIÉN PUEDES CONSEGUIR GRANDES RECOMPENSAS!*

En las modalidades participantes podrás tener la oportunidad de obtener:
💎 Diamantes.
🎟️ Pases semanales de diamantes.
👑 Pases semanales Elite.

Los premios reales están disponibles únicamente en las modalidades habilitadas para entregarlos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆LIGA TITANS TEAM - TITANSB MIEMBRO VIRTUAL 🤖`
        });
    }
};
