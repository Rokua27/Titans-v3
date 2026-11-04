const monitor = require("../utils/monitor");
const { leerJSON, guardarJSON } = require("../utils/database");
const { obtenerUsuario, guardarUsuario } = require("../utils/comunidad");
const { puedeUsarComando } = require("../utils/limiteDiario");

module.exports = {
  nombre: "caja",

alias: [],

categoria: "jugador",

descripcion: "Compra una caja misteriosa.",

permisos: ["usuario"],

uso: "!caja",

  async ejecutar(sock, from, args, msg) {
    try {
      const sender = msg.key.participant || msg.key.remoteJid;

const usuario = obtenerUsuario(sender);
      const inventarios = leerJSON("inventarios.json") || {};

// ======================================
// 🔒 LÍMITE DIARIO (3 USOS)
// ======================================

const limite = puedeUsarComando(sender, "caja", 3);

if (!limite.ok) {

    return await sock.sendMessage(from, {

        text:
`╔══════════════════════════════╗
║     🚫 LÍMITE ALCANZADO      ║
╚══════════════════════════════╝

📦 Comando:
Caja

❌ Ya utilizaste este comando
3 veces el día de hoy.

📅 Vuelve mañana para abrir más cajas.

━━━━━━━━━━━━━━━━━━━━━━

🤖 TitansBot v3`

    });

}

      const nombre = usuario.nombre || "Titán";

      const costo = 300;

      if ((usuario.coins || 0) < costo) {
        return await sock.sendMessage(from, {
          text:
`╔══════════════════════════════╗
║      💸 𝗦𝗜𝗡 𝗙𝗢𝗡𝗗𝗢𝗦 💸      ║
╚══════════════════════════════╝

📦 Una *Caja Premium* cuesta *${costo} monedas*.

💰 Tus monedas: *${usuario.coins || 0}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚔️ Juega !ruleta o participa en la comunidad para conseguir más monedas.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        });
      }

      // Descontar monedas
      usuario.coins -= costo;

      // Crear inventario si no existe
      if (!inventarios[sender]) {
        inventarios[sender] = {
          cajas: 0,
          objetos: []
        };
      }

      // Agregar caja
      inventarios[sender].cajas += 1;

      // Guardar
guardarUsuario(sender, usuario);
await guardarJSON("inventarios.json", inventarios);

      const mensaje =
`╔══════════════════════════════╗
║      📦 𝗖𝗔𝗝𝗔 𝗣𝗥𝗘𝗠𝗜𝗨𝗠 📦      ║
╚══════════════════════════════╝

👤 *${nombre}*

🎁 Has comprado una *Caja Premium Esports*.

💰 Costo: *${costo} monedas*
📦 Cajas disponibles: *${inventarios[sender].cajas}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ *Posibles recompensas*

⚪ Común → 45%
🟢 Rara → 30%
🔵 Épica → 15%
🟣 Legendaria → 8%
🟡 Mítica → 2%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📖 Usa *!abrir* para descubrir tu recompensa.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯 • 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗘𝘀𝗽𝗼𝗿𝘁𝘀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

      await sock.sendMessage(from, { text: mensaje });

    } catch (error) {
      console.error("❌ Error caja:", error);
        monitor.registrarEvento("ERROR_SISTEMA",{estado:"ERROR",componente:"CAJA",codigo:"SYSTEM_ERROR",descripcion:error.message});

      await sock.sendMessage(from, {
        text: "❌ No pude comprar la caja."
      });
    }
  }
};
