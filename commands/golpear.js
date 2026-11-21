const monitor = require("../utils/monitor");
const { leerJSON, guardarJSON } = require("../utils/database");
const {
  obtenerUsuario,
  resolverClaveUsuario,
  normalizarIdentidad,
  aplicarXPRecompensa
} = require("../utils/comunidad");
const {
  crearGestorRecompensasRaid,
  raidDerrotado,
  marcarRaidPendiente,
  cerrarRaid
} = require("../utils/raidRecompensas");
const { gestor } = require("../utils/economiaCompartida");
const { resolverInventario } = require("../utils/inventarioTitansB");

const cooldowns = new Map();
const raidsEnProceso = new Set();

const gestorRaidRecompensas = crearGestorRecompensasRaid({
  gestor,
  resolverClaveUsuario,
  normalizarIdentidad,
  aplicarXPRecompensa,
  resolverInventario
});

function construirMensajeFinal(raid) {
  const ranking = Object.values(raid.participantes || {})
    .sort((a, b) => b.dañoTotal - a.dañoTotal)
    .slice(0, 5);

  let top = "";
  ranking.forEach((p, i) => {
    const medalla = ["🥇", "🥈", "🥉", "🏅", "🏅"][i];
    top += `${medalla} *${p.nombre}* — ${p.dañoTotal}\n`;
  });

  return `╔══════════════════════════════╗
║     🏆 𝗥𝗔𝗜𝗗 𝗖𝗢𝗠𝗣𝗟𝗘𝗧𝗔𝗗𝗢 🏆     ║
╚══════════════════════════════╝

🐉 *¡EL TITÁN DEL VACÍO HA SIDO DERROTADO!*

⚔️ La comunidad unió sus fuerzas y logró destruir al jefe legendario.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 *TOP DAÑO*

${top}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎁 *RECOMPENSAS ENTREGADAS*

💰 +500 monedas
⭐ +300 XP
📦 +1 Caja Épica

⚡ Todos los participantes recibieron automáticamente las recompensas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯 • 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗘𝘀𝗽𝗼𝗿𝘁𝘀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

async function finalizarRaidPendiente(sock, from, raid) {
  if (!raidDerrotado(raid)) {
    throw new Error("El Raid todavía no está derrotado.");
  }

  if (raid.estadoRecompensas !== "pendiente") {
    marcarRaidPendiente(raid);
    guardarJSON("raid.json", raid);
  }

  // Cada perfil e inventario tiene su propia marca antiduplicados.
  const entrega = await gestorRaidRecompensas.entregar(raid);

  if (!entrega.completo) {
    throw new Error("La entrega de recompensas quedó incompleta.");
  }

  console.log("✅ Recompensas del Raid verificadas:", entrega);

  // Si el envío falla, el Raid sigue pendiente y se puede reintentar.
  await sock.sendMessage(from, {
    text: construirMensajeFinal(raid)
  });

  cerrarRaid(raid);
  guardarJSON("raid.json", raid);
}

module.exports = {
  nombre: "golpear",
  alias: [],
  categoria: "eventos",
  descripcion: "Ataca al jefe del Raid Global.",
  permisos: ["usuario"],
  uso: "!golpear",

  async ejecutar(sock, from, args, msg) {
    let raidEnProceso = null;

    try {
      const sender = msg.key.participant || msg.key.remoteJid;
      const raid = leerJSON("raid.json");

      if (!raid || typeof raid !== "object") {
        throw new Error("No se pudo leer el estado del Raid.");
      }

      // Evitar que dos comandos procesen simultáneamente el mismo Raid.
      const claveRaid = String(raid.fechaInicio || "sin-fecha");

      if (raidsEnProceso.has(claveRaid)) {
        return await sock.sendMessage(from, {
          text: "⏳ El Raid está procesando un ataque o sus recompensas. Espera un momento."
        });
      }

      raidsEnProceso.add(claveRaid);
      raidEnProceso = claveRaid;

      // Recuperación: se ejecuta antes de permitir cualquier ataque.
      if (raidDerrotado(raid)) {
        await finalizarRaidPendiente(sock, from, raid);
        return;
      }

      if (!raid.activo) {
        return await sock.sendMessage(from, {
          text: "🐉 No hay un Raid Global activo. Usa *!raid* para iniciarlo."
        });
      }

      // Cooldown de ataque: 10 segundos.
      const ahora = Date.now();
      const ultimo = cooldowns.get(sender);

      if (ultimo && ahora - ultimo < 10000) {
        const restante = Math.ceil((10000 - (ahora - ultimo)) / 1000);

        return await sock.sendMessage(from, {
          text: `⏱️ Espera *${restante}s* antes de volver a atacar.`
        });
      }

      cooldowns.set(sender, ahora);

      const usuario = obtenerUsuario(sender);
      const nombre = usuario?.nombre || "Titán";

      // Generar daño: se conservan las probabilidades originales.
      const random = Math.random();
      let daño = 0;
      let tipo = "⚔️ GOLPE";

      if (random < 0.10) {
        daño = 0;
        tipo = "☠️ FALLO";
      } else if (random < 0.25) {
        daño = Math.floor((Math.random() * 450) + 150) * 3;
        tipo = "💥 CRÍTICO";
      } else {
        daño = Math.floor((Math.random() * 450) + 50);
      }

      raid.vidaActual = Math.max(0, raid.vidaActual - daño);

      if (!raid.participantes || typeof raid.participantes !== "object") {
        raid.participantes = {};
      }

      if (!raid.participantes[sender]) {
        raid.participantes[sender] = {
          nombre,
          dañoTotal: 0,
          golpes: 0
        };
      }

      raid.participantes[sender].dañoTotal += daño;
      raid.participantes[sender].golpes += 1;
      raid.participantes[sender].nombre = nombre;

      // Si este ataque derrota al jefe, se persiste la derrota
      // y el estado pendiente en la misma escritura.
      if (raid.vidaActual <= 0) {
        marcarRaidPendiente(raid);
      }

      guardarJSON("raid.json", raid);

      const porcentaje = Math.floor(
        (raid.vidaActual / raid.vidaMax) * 100
      );

      await sock.sendMessage(from, {
        text:
`╔══════════════════════════════╗
║        ⚔️ 𝗔𝗧𝗔𝗤𝗨𝗘 ⚔️         ║
╚══════════════════════════════╝

👤 *${nombre}*

${tipo}
💥 Daño: *${daño}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🐉 *${raid.jefe}*
❤️ *${raid.vidaActual}/${raid.vidaMax}*
📊 *${porcentaje}% restante*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏆 Tu daño total: *${raid.participantes[sender].dañoTotal}*
⚔️ Golpes: *${raid.participantes[sender].golpes}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      });

      if (raidDerrotado(raid)) {
        await finalizarRaidPendiente(sock, from, raid);
      }

    } catch (error) {
      console.error("❌ Error golpear:", error);

      try {
        monitor.registrarEvento("ERROR_SISTEMA", {
          estado: "ERROR",
          componente: "GOLPEAR",
          codigo: "SYSTEM_ERROR",
          descripcion: error.message
        });
      } catch (errorMonitor) {
        console.error("❌ Error registrando evento:", errorMonitor);
      }
    } finally {
      if (raidEnProceso !== null) {
        raidsEnProceso.delete(raidEnProceso);
      }
    }
  }
};
