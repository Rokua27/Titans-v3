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

  return `📢 *TITANS TEAM · RAID GLOBAL*

╔══════════════════════════════╗
║       🏆 JEFE DERROTADO      ║
╚══════════════════════════════╝

🐉 *¡EL TITÁN DEL VACÍO HA CAÍDO!*

⚔️ La comunidad unió sus fuerzas y consiguió derrotar al jefe.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏆 *CLASIFICACIÓN · TOP DAÑO*

${top}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎁 *RECOMPENSAS CONFIRMADAS*

💰 +500 monedas
⭐ +300 XP
📦 +1 Caja Épica

✅ La entrega de recompensas fue completada para los participantes.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏆LIGA TITANS TEAM - TITANSB MIEMBRO VIRTUAL 🤖`;
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
          text: "📢 *TITANS TEAM · RAID GLOBAL*\n\n⏳ El Raid está procesando un ataque o la entrega de recompensas.\n\nEspera un momento antes de volver a intentarlo.\n\n🏆LIGA TITANS TEAM - TITANSB MIEMBRO VIRTUAL 🤖"
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
          text: "📢 *TITANS TEAM · RAID GLOBAL*\n\n╔══════════════════════════════╗\n║       🐉 RAID INACTIVO       ║\n╚══════════════════════════════╝\n\nNo hay ningún jefe activo en este momento.\n\n⚔️ Usa *!raid* para iniciar el combate.\n\n🏆LIGA TITANS TEAM - TITANSB MIEMBRO VIRTUAL 🤖"
        });
      }

      // Cooldown de ataque: 10 segundos.
      const ahora = Date.now();
      const ultimo = cooldowns.get(sender);

      if (ultimo && ahora - ultimo < 10000) {
        const restante = Math.ceil((10000 - (ahora - ultimo)) / 1000);

        return await sock.sendMessage(from, {
          text: `📢 *TITANS TEAM · RAID GLOBAL*

⏳ *¡RECUPERA TUS FUERZAS!*

Debes esperar *${restante} segundos* antes de lanzar otro ataque.

⚔️ El combate continuará. ¡Prepárate para tu siguiente golpe!

🏆LIGA TITANS TEAM - TITANSB MIEMBRO VIRTUAL 🤖`
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
`📢 *TITANS TEAM · RAID GLOBAL*

╔══════════════════════════════╗
║       ⚔️ RESULTADO DEL ATAQUE ║
╚══════════════════════════════╝

👤 *GUERRERO:* ${nombre}

${tipo}
💥 *DAÑO CAUSADO:* ${daño}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🐉 *JEFE:* ${raid.jefe}
❤️ *VIDA RESTANTE:* ${raid.vidaActual}/${raid.vidaMax}
📊 *SALUD DEL JEFE:* ${porcentaje}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏆 *TU CONTRIBUCIÓN*
⚔️ Daño acumulado: ${raid.participantes[sender].dañoTotal}
🥊 Ataques realizados: ${raid.participantes[sender].golpes}

¡Sigue luchando por Titans Team!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆LIGA TITANS TEAM - TITANSB MIEMBRO VIRTUAL 🤖`
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
