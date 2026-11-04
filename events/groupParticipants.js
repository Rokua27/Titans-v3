const { leerJSON } = require('../utils/database');
const { obtenerEquipoUsuario } = require('../utils/equipos');
const { obtenerUltimaAccionUsuario } = require('../utils/modlogs');

// ======================================
// 👥 BIENVENIDA Y DESPEDIDA PREMIUM
// ======================================

module.exports = function registrarEventosGrupo(sock) {

sock.ev.on('group-participants.update', async (update) => {

console.log("🟢 Evento group-participants.update recibido");
console.log(update);

try {

  const { id, participants, action } = update;

  // Obtener nombre del grupo
  const metadata = await sock.groupMetadata(id);
  const nombreGrupo = metadata.subject;

  // Base de usuarios
  const usuarios = leerJSON('usuarios.json') || {};

  for (const participant of participants) {

    const numero = participant.split('@')[0];

    // ======================================
    // DATOS DEL JUGADOR
    // ======================================

    let nombreJugador = `Titán ${numero.slice(-4)}`;
    let nivel = 1;
    let equipo = null;

    // Nombre real desde WhatsApp
    try {
      const nombreWA = await sock.getName(participant);

      if (nombreWA && nombreWA.trim().length > 0) {
        nombreJugador = nombreWA;
      }
    } catch {}

    // Nivel guardado
    if (usuarios[participant]) {
      nivel = usuarios[participant].nivel || 1;
    }

    // Equipo
    try {
     equipo = obtenerEquipoUsuario(participant);
    } catch {}

    // ======================================
    // 👋 BIENVENIDA
    // ======================================

    if (action === 'add') {

      const mensajeBienvenida =
`╔══════════════════════════════╗
║   ⚔️ 𝗕𝗜𝗘𝗡𝗩𝗘𝗡𝗜𝗗𝗢, 𝗧𝗜𝗧Á𝗡 ⚔️   ║
╚══════════════════════════════╝

🌟 ¡Qué alegría tenerte con nosotros,
@${numero}! 🤝

🏆 Has ingresado a:
✨ ${nombreGrupo}

🔥 Desde hoy formas parte de una comunidad
donde compartimos, competimos y hacemos
nuevas amistades.

💬 ¡Participa, conoce a la comunidad
y disfruta cada momento!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎮 𝗣𝗔𝗥𝗔 𝗖𝗢𝗠𝗘𝗡𝗭𝗔𝗥

🎁 !daily  → Recompensa diaria
🎰 !ruleta → Pon a prueba tu suerte
📖 !menu   → Descubre todo lo que tenemos

🏅 Nivel: ${nivel}
👥 Equipo: ${equipo ? equipo.nombre : 'Sin equipo'}

🔥 ¡Tu historia comienza aquí!
¡Bienvenido a la familia, Titán! ⚔️

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
⚔️ DISCIPLINA · COMPETENCIA · GLORIA
🤖 TitansB • Sistema Automático
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

      await sock.sendMessage(id, {
        text: mensajeBienvenida,
        mentions: [participant]
      });
    }

    // ======================================
    // 👋 DESPEDIDA
    // ======================================

    if (action === 'remove') {

      // 🔎 Buscar la última acción de moderación
      const ultimaAccion = obtenerUltimaAccionUsuario(
        participant,
        id
      );

      let fueExpulsado = false;
      let datosExpulsion = null;

      // ======================================
      // 🔎 DETECTAR EXPULSIÓN RECIENTE
      // ======================================

      if (
        ultimaAccion &&
        ultimaAccion.accion === "kick" &&
        ultimaAccion.fecha
      ) {

        const tiempoKick =
          new Date(ultimaAccion.fecha).getTime();

        const tiempoActual = Date.now();

        // Solo aceptar kicks de los últimos 60 segundos
        if (
          !isNaN(tiempoKick) &&
          tiempoActual - tiempoKick <= 60000 &&
          tiempoActual >= tiempoKick
        ) {
          fueExpulsado = true;
          datosExpulsion = ultimaAccion;
        }
      }

      // ======================================
      // 👋 SALIDA VOLUNTARIA
      // ======================================

      if (!fueExpulsado) {

        const mensajeSalida =
`👋 @${numero} ha salido de la comunidad.

¡Gracias por compartir parte de la aventura! 🏆`;

        await sock.sendMessage(id, {
          text: mensajeSalida,
          mentions: [participant]
        });

      }

      // ======================================
      // 🚪 EXPULSIÓN
      // ======================================

      else {

        const esAutomatica =
          datosExpulsion.moderador === "Sistema de sanciones";

        let responsable = "Administración";
        let cargo = "🛡️ Staff de Moderación";

        // ======================================
        // 🤖 EXPULSIÓN AUTOMÁTICA
        // ======================================

        if (esAutomatica) {

          responsable = "TitansB";
          cargo = "🤖 Sistema Automático";

          const motivo =
            datosExpulsion.motivo ||
            "Sanción automática por acumulación de advertencias.";

          const mensajeExpulsionAutomatica =
`╔════════════════════════════════╗
║     🤖 𝗦𝗔𝗡𝗖𝗜Ó𝗡 𝗔𝗨𝗧𝗢𝗠Á𝗧𝗜𝗖𝗔     ║
╚════════════════════════════════╝

🚫 USUARIO EXPULSADO

👤 Usuario:
@${numero}

🚪 Acción:
Expulsión automática de la comunidad

📄 Motivo:
${motivo}

⚖️ Responsable:
${responsable}

🛡️ Cargo:
${cargo}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
⚖️ SISTEMA DE MODERACIÓN DE JUSTICIA COMPETITIVA
🛡️ TitansB • SISTEMA DE SEGURIDAD DIGITAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

          await sock.sendMessage(id, {
            text: mensajeExpulsionAutomatica,
            mentions: [participant]
          });

        }

        // ======================================
        // 🚪 EXPULSIÓN MANUAL
        // ======================================

        else {

          // Obtener nombre del responsable
          try {

            const nombreResponsable =
              await sock.getName(
                datosExpulsion.moderador
              );

            if (
              nombreResponsable &&
              nombreResponsable.trim().length > 0
            ) {
              responsable = nombreResponsable;
            }

          } catch {}

          // ======================================
          // ⚖️ DETECTAR JUSTICIA
          // ======================================

          try {

            const { esJusticia } =
              require("../utils/moderacion");

            if (
              esJusticia(
                datosExpulsion.moderador
              )
            ) {
              cargo = "⚖️ Juez de Justicia";
            }

          } catch {}

          const motivo =
            datosExpulsion.motivo ||
            "Sin motivo especificado.";

          const mensajeExpulsion =
`╔════════════════════════════════╗
║      🚪 𝗗𝗘𝗦𝗣𝗘𝗗𝗜𝗗𝗔 𝗧𝗜𝗧Á𝗡      ║
╚════════════════════════════════╝

🚫 USUARIO EXPULSADO

👤 Usuario:
@${numero}

🚪 Acción:
Expulsión de la comunidad

📄 Motivo:
${motivo}

👮 Responsable:
${responsable}

🛡️ Cargo:
${cargo}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
⚖️ SISTEMA DE MODERACIÓN DE JUSTICIA COMPETITIVA
🛡️ TitansB • SISTEMA DE SEGURIDAD DIGITAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

          await sock.sendMessage(id, {
            text: mensajeExpulsion,
            mentions: [participant]
          });
        }
      }
    }
  }

} catch (error) {
  console.error('❌ Error en bienvenida/despedida:', error);
}

});
};
