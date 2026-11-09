const monitor = require("../utils/monitor");
const { procesarMensaje } = require("../utils/comunidadBot/motor");
const { obtenerComando } = require("../utils/commandHandler");
const ejecutarFiltroModeracion = require("../utils/filtroModeracion");
const { obtenerRol } = require("../utils/roles");
const { tienePermiso, tienePermisoEquipo } = require("../utils/permisos");
const { obtenerEquipoUsuario } = require("../utils/equipos");
const {
    agregarXP,
    actualizarNombre
} = require("../utils/comunidad");
const { anuncioGlobal } = require("../utils/anuncios");
const { desbloquearLogro, obtenerTitulo } = require("../utils/logros");
const filtroAprendizaje = require("../utils/titansb/filtroAprendizaje");
const { manejarRegistroPrivado, esIdentidadAdmitida } = require("../community/registration-private-handler");
const { manejarEdicionPrivada } = require("../community/profile-edit-handler");

async function manejarMensajes(sock, message) {
  try {
    if (!message.messages) return;

    const msg = message.messages[0];

    console.log("🔎 C6.5.24 msg.key:", {
      remoteJid: msg.key?.remoteJid || null,
      participant: msg.key?.participant || null,
      senderPn: msg.key?.senderPn || null,
      senderLid: msg.key?.senderLid || null,
      participantPn: msg.key?.participantPn || null,
      participantLid: msg.key?.participantLid || null,
      fromMe: msg.key?.fromMe || false
    });

    console.log("🧪 Entró a manejarMensajes");

    // Ignorar mensajes del propio bot
    if (msg.key.fromMe) return;

    // Ignorar eventos sin contenido
    if (!msg.message) return;

    const from = msg.key.remoteJid;

    if (from && from.endsWith("@g.us")) {
      console.log(`📌 GRUPO TITANS | ID: ${from}`);
    }

    // 🔇 SISTEMA DE MUTE AUTOMÁTICO
  // ======================================

    // ======================================
    // 📝 EXTRAER TEXTO DEL MENSAJE
    // ======================================

    let texto = "";
    const mensaje = msg.message;

    if (mensaje?.conversation) {
      texto = mensaje.conversation;
    } else if (mensaje?.extendedTextMessage?.text) {
      texto = mensaje.extendedTextMessage.text;
    } else if (mensaje?.imageMessage?.caption) {
      texto = mensaje.imageMessage.caption;
    } else if (mensaje?.videoMessage?.caption) {
      texto = mensaje.videoMessage.caption;
    } else if (mensaje?.buttonsResponseMessage?.selectedButtonId) {
      texto = mensaje.buttonsResponseMessage.selectedButtonId;
    } else if (mensaje?.listResponseMessage?.singleSelectReply?.selectedRowId) {
      texto = mensaje.listResponseMessage.singleSelectReply.selectedRowId;
    }

    // Limpiar texto
    texto = (texto || "").trim();

    console.log("🧪 Texto recibido:", texto);

    const sender = msg.key.participant || msg.key.remoteJid;

// ======================================
// 🛡️ FILTRO GLOBAL DE MODERACIÓN
// ======================================
// Se ejecuta antes de ignorar mensajes sin texto.
// Esto permite moderar stickers, imágenes, videos,
// audios, documentos y demás mensajes multimedia.

const mensajeBloqueado = await ejecutarFiltroModeracion(sock, msg);

if (mensajeBloqueado) return;

  // ======================================
  const identidadParticipanteXP = [
    msg.key?.participant,
    msg.key?.participantLid,
    msg.key?.participantPn
].find(id =>
    typeof id === 'string' &&
    id === id.trim() &&
    /^[^@\s]+@(?:lid|s\.whatsapp\.net|c\.us)$/i.test(id)
);

// ⭐ SISTEMA DE XP AUTOMÁTICO TITANSB
  // ======================================
  if (from && from.endsWith('@g.us') && identidadParticipanteXP) {
    let textoXP = '';

    if (msg.message.conversation) {
      textoXP = msg.message.conversation;
    } else if (msg.message.extendedTextMessage?.text) {
      textoXP = msg.message.extendedTextMessage.text;
    }

    textoXP = textoXP.trim();

    if (textoXP && !textoXP.startsWith('!')) {
      const nombrePerfil = msg.pushName || 'Jugador';
      actualizarNombre(identidadParticipanteXP, nombrePerfil);

      const resultadoXP = await agregarXP(identidadParticipanteXP, 5, {
        messageId: msg.key.id
      });

      const usuarioActual = resultadoXP.usuario;

      if (resultadoXP.motivo === 'otorgada' && usuarioActual) {
        console.log('⭐ XP otorgada a:', identidadParticipanteXP);
        console.log('📈 XP actual:', usuarioActual.xp);

        if (resultadoXP.subioNivel) {
          await sock.sendMessage(from, {
            text:
              `╔══════════════════════════════╗
║      🎉 𝗟𝗘𝗩𝗘𝗟 𝗨𝗣 🎉       ║
╚══════════════════════════════╝

👑 *¡UN TITÁN HA EVOLUCIONADO!*

🎮 Usuario: *${nombrePerfil}*
🏅 Nuevo nivel: *${usuarioActual.nivel}*
💰 Recompensa: *+${resultadoXP.monedasNivel} monedas*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚔️ Sigue participando para convertirte en una leyenda de la comunidad.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
🌟 Sistema de progresión Premium Esports
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
          });
        }

        // Nivel 10 → Guerrero Legendario
        if (usuarioActual.nivel >= 10) {
          const resultado10 = desbloquearLogro(identidadParticipanteXP, 'nivel_10');
          if (resultado10.nuevo) {
            await anuncioGlobal(sock, from, 'logro', {
              nombre: usuarioActual.nombre || 'Titán',
              logro: resultado10.logro.nombre,
              titulo: obtenerTitulo(identidadParticipanteXP)
            });
          }
        }

        // Nivel 25 → Titán Supremo
        if (usuarioActual.nivel >= 25) {
          const resultado25 = desbloquearLogro(identidadParticipanteXP, 'nivel_25');
          if (resultado25.nuevo) {
            await anuncioGlobal(sock, from, 'logro', {
              nombre: usuarioActual.nombre || 'Titán',
              logro: resultado25.logro.nombre,
              titulo: obtenerTitulo(identidadParticipanteXP)
            });
          }
        }
      }
    }
  }

// ======================================
// 🔐 RESPUESTAS DE REGISTRO EN CHAT PRIVADO
// ======================================

if (
    from &&
    !from.endsWith("@g.us") &&
    texto &&
    esIdentidadAdmitida(from)
) {
    try {
        const resultadoRegistro =
            await manejarRegistroPrivado(sock, from, texto);

        if (resultadoRegistro?.atendido) return;
    } catch (error) {
        console.error(
            "⚠️ TitansB | No se pudo procesar el registro privado:",
            error.message
        );

        // Evita que una respuesta del registro se procese
        // accidentalmente como mensaje ordinario.
        return;
    }
}

// ======================================
// ✏️ RESPUESTAS DE EDICIÓN EN CHAT PRIVADO
// ======================================

if (
    from &&
    !from.endsWith("@g.us") &&
    texto &&
    esIdentidadAdmitida(from)
) {
    try {
        const resultadoEdicion =
            await manejarEdicionPrivada(sock, from, texto);

        if (resultadoEdicion?.atendido) return;
    } catch (error) {
        console.error(
            "⚠️ TitansB | No se pudo procesar la edición privada:",
            error.message
        );
        return;
    }
}

// ======================================
// 🧠 APRENDIZAJE SILENCIOSO DE TITANSB
// ======================================

if (
    from &&
    from.endsWith("@g.us") &&
    texto &&
    !texto.startsWith("!")
) {
    try {

        const resultado =
            filtroAprendizaje.aprenderConProteccion(
                from,
                texto
            );

        if (resultado?.guardado) {

            console.log(
                `🧠 TitansB | aprendizaje guardado | ` +
                `grupo=${from} | ` +
                `tipo=${resultado.memoria?.tipo || "general"}`
            );

        }

    } catch (error) {

        console.error(
            "⚠️ TitansB | Error en aprendizaje:",
            error.message
        );

    }
}

// ======================================
// 🤖 MIEMBRO VIRTUAL DE LA COMUNIDAD
// ======================================
await procesarMensaje(sock, msg, texto);

// ======================================
// 📝 IGNORAR MENSAJES SIN TEXTO
// ======================================

if (!texto) return;

    // Mostrar mensajes en consola
    console.log(`[MENSAJE] ${from}: ${texto}`);

    // ======================================
    // ⚙️ SISTEMA DE COMANDOS
    // ======================================

    if (!texto.startsWith("!")) return;

    const args = texto.slice(1).trim().split(/\s+/);
    const nombreComando = args.shift().toLowerCase();

    const comando = obtenerComando(nombreComando);

    console.log("🧪 Comando detectado:", nombreComando);

    if (!comando) return;

const rol = await obtenerRol(sock, from, sender);


// ==========================================

// 🛡️ VERIFICACIÓN DE PERMISOS

// ==========================================


// Permiso mediante jerarquía de Staff

const permisoStaff = tienePermiso(

    rol.nombre,

    comando.permisos

);


// Permiso mediante rango dentro del equipo

const equipoUsuario = obtenerEquipoUsuario(sender);


const permisoEquipo = tienePermisoEquipo(

    equipoUsuario,

    sender,

    comando.permisos

);


// El usuario puede acceder si tiene cualquiera

// de los dos tipos de permiso.

const autorizado = permisoStaff || permisoEquipo;


if (!autorizado) {

    return await sock.sendMessage(from, {

        text:
`╔══════════════════════╗
║   🚫 ACCESO DENEGADO ║
╚══════════════════════╝

❌ No tienes permisos para usar este comando.

👤 Tu rol: ${rol.titulo}

🔒 Permiso requerido:
${comando.permisos.join(", ")}

⚔️ TitansBot v3`

    });

}

    try {
      await comando.ejecutar(sock, from, args, msg);


      monitor.registrarEvento("COMANDO_EJECUTADO", {
        estado: "OK",
        componente: "COMMAND_HANDLER",
        codigo: "COMMAND_EXECUTION_OK",
        descripcion: "Comando ejecutado correctamente.",
        comando: nombreComando,
        grupo: from,
        autorId: msg.key?.participant || msg.key?.remoteJid || null,
        autorNombre:
          msg.pushName ||
          msg.message?.extendedTextMessage?.contextInfo?.participant ||
          null,
        argumentos: args
      });
    } catch (error) {
      console.error(`❌ Error ejecutando ${nombreComando}:`, error);
        monitor.registrarEvento("ERROR_COMANDO", {
          estado: "ERROR",
          componente: "COMMAND_HANDLER",
          codigo: "COMMAND_EXECUTION_ERROR",
          descripcion: error.message,
          comando: nombreComando,
          grupo: from,
          autorId: msg.key?.participant || msg.key?.remoteJid || null,
          autorNombre:
            msg.pushName ||
            msg.message?.extendedTextMessage?.contextInfo?.participant ||
            null,
          argumentos: args
        });

      await sock.sendMessage(from, {
        text: "❌ Ocurrió un error al ejecutar el comando."
      });
    }

  } catch (error) {
    console.error("❌ Error general en manejarMensajes:", error);
  }
}

module.exports = manejarMensajes;
