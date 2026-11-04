const monitor = require("../utils/monitor");
const { leerJSON, guardarJSON } = require("../utils/database");
const { obtenerUsuario, guardarUsuario } = require("../utils/comunidad");
const { puedeUsarComando } = require("../utils/limiteDiario");
const { anuncioGlobal } = require("../utils/anuncios");

module.exports = {
  nombre: "abrir",

alias: [],

categoria: "jugador",

descripcion: "Abre una caja de tu inventario.",

permisos: ["usuario"],

uso: "!abrir",

  async ejecutar(sock, from, args, msg) {
    try {
      console.log("📦 Ejecutando comando abrir");

      const sender = msg.key.participant || msg.key.remoteJid;

     const usuario = obtenerUsuario(sender);
      const inventarios = leerJSON("inventarios.json") || {};

// ======================================
// 🔒 LÍMITE DIARIO (3 USOS)
// ======================================

const limite = puedeUsarComando(sender, "abrir", 3);

if (!limite.ok) {

    return await sock.sendMessage(from, {

        text:
`╔══════════════════════════════╗
║     🚫 LÍMITE ALCANZADO      ║
╚══════════════════════════════╝

📦 Comando:
Abrir Caja

❌ Ya abriste 3 cajas el día de hoy.

📅 Vuelve mañana para seguir obteniendo recompensas.

━━━━━━━━━━━━━━━━━━━━━━

🤖 TitansBot v3`

    });

}

      // Crear inventario si no existe
      if (!inventarios[sender]) {
        inventarios[sender] = {
          cajas: 0,
          objetos: []
        };
      }

      // Verificar cajas
      if (inventarios[sender].cajas <= 0) {
        return await sock.sendMessage(from, {
          text: "📦 No tienes cajas para abrir. Usa *!caja* primero."
        });
      }

      const nombre = usuario.nombre || "Titán";

      // Consumir caja
      inventarios[sender].cajas -= 1;

      // Recompensa aleatoria
      const random = Math.random();

      let rareza = "⚪ COMÚN";
      let xp = 50;
      let coins = 100;
      let objeto = "Fragmento de XP";

      if (random < 0.02) {
        rareza = "🟡 MÍTICA";
        xp = 2500;
        coins = 5000;
        objeto = "Reliquia Mítica";
        // 🌌 ANUNCIO GLOBAL DE DROP MÍTICO
  await anuncioGlobal(sock, from, "mitica", {
    nombre,
    objeto
  });

      } else if (random < 0.10) {
        rareza = "🟣 LEGENDARIA";
        xp = 1000;
        coins = 2000;
        objeto = "Corona Legendaria";
      } else if (random < 0.25) {
        rareza = "🔵 ÉPICA";
        xp = 400;
        coins = 800;
        objeto = "Emblema Épico";
      } else if (random < 0.55) {
        rareza = "🟢 RARA";
        xp = 150;
        coins = 300;
        objeto = "Boost de XP";
      }

      // Aplicar recompensas
      usuario.xp = (usuario.xp || 0) + xp;
      usuario.coins = (usuario.coins || 0) + coins;

      // Guardar objeto
      inventarios[sender].objetos.push({
        nombre: objeto,
        rareza,
        fecha: Date.now()
      });

      // Guardar archivos
guardarUsuario(sender, usuario);
await guardarJSON("inventarios.json", inventarios);

      const mensaje = `
╔══════════════════════════════╗
║      🎁 𝗖𝗔𝗝𝗔 𝗔𝗕𝗜𝗘𝗥𝗧𝗔 🎁      ║
╚══════════════════════════════╝

👤 *${nombre}*

🏆 *${rareza}*

🎖️ Objeto: *${objeto}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⭐ XP: *+${xp}*
💰 Monedas: *+${coins}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Cajas restantes: *${inventarios[sender].cajas}*
🎒 Objetos: *${inventarios[sender].objetos.length}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯 • 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗘𝘀𝗽𝗼𝗿𝘁𝘀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

      await sock.sendMessage(from, { text: mensaje });

      console.log("✅ Caja abierta correctamente");

    } catch (error) {
      console.error("❌ Error abrir:", error);
        monitor.registrarEvento("ERROR_SISTEMA",{estado:"ERROR",componente:"ABRIR",codigo:"SYSTEM_ERROR",descripcion:error.message});

      await sock.sendMessage(from, {
        text: "❌ Ocurrió un error al abrir la caja."
      });
    }
  }
};
