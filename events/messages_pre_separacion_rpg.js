const { procesarMensaje } = require("../utils/comunidadBot/motor");
const { obtenerComando } = require("../utils/commandHandler");
const ejecutarFiltroModeracion = require("../utils/filtroModeracion");
const { obtenerRol } = require("../utils/roles");
const { tienePermiso, tienePermisoEquipo } = require("../utils/permisos");
const { obtenerEquipoUsuario } = require("../utils/equipos");
const { leerJSON } = require("../utils/database");
const {
    agregarXP,
    actualizarNombre
} = require("../utils/comunidad");
const { anuncioGlobal } = require("../utils/anuncios");
const { desbloquearLogro, obtenerTitulo } = require("../utils/logros");

async function manejarMensajes(sock, message) {
  try {
    if (!message.messages) return;

    const msg = message.messages[0];

    console.log("🧪 Entró a manejarMensajes");

    // Ignorar mensajes del propio bot
    if (msg.key.fromMe) return;

    // Ignorar eventos sin contenido
    if (!msg.message) return;

    const from = msg.key.remoteJid;

    // ======================================
  // ⭐ SISTEMA DE XP AUTOMÁTICO
  // ======================================

  // Extraer texto del mensaje
  let textoXP = "";

  if (msg.message.conversation) {
    textoXP = msg.message.conversation;
  } else if (msg.message.extendedTextMessage?.text) {
    textoXP = msg.message.extendedTextMessage.text;
  }

console.log("🧪 Texto recibido:", textoXP);

// ======================================
// ⭐ SISTEMA DE XP + PERFIL + MENSAJES
// ======================================

if (textoXP && !textoXP.startsWith("!")) {

  const sender = msg.key.participant || msg.key.remoteJid;

const nombreUsuario =
    msg.pushName ||
    msg.message?.extendedTextMessage?.contextInfo?.participant ||
    "";

actualizarNombre(sender, nombreUsuario);

  // Nombre real del perfil
  const nombrePerfil = msg.pushName || "Jugador";

  console.log("👤 Nombre detectado:", nombrePerfil);

  // ======================================
  // CARGAR USUARIOS
  // ======================================

const { usuario, subioNivel } = await agregarXP(sender, 5);

const usuarios = leerJSON("usuarios.json") || {};

actualizarNombre(sender, nombrePerfil);

const usuarioActual = usuarios[sender] || usuario;

console.log("⭐ Dando XP a:", sender);
console.log("📈 XP actual:", usuarioActual.xp);

  // ======================================
  // 🎉 ANUNCIO DE LEVEL UP
  // ======================================

  if (subioNivel) {

    await sock.sendMessage(from, {
      text:
`╔══════════════════════════════╗
║      🎉 𝗟𝗘𝗩𝗘𝗟 𝗨𝗣 🎉       ║
╚══════════════════════════════╝

👑 *¡UN TITÁN HA EVOLUCIONADO!*

🎮 Usuario: *${nombrePerfil}*
🏅 Nuevo nivel: *${usuarioActual.nivel}*
💰 Recompensa: *+100 monedas*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚔️ Sigue participando para convertirte en una leyenda de la comunidad.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
	🌟 Sistema de progresión Premium Esports
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    });
  }



  // 👑 ASCENSOS LEGENDARIOS

  // Nivel 10 → Guerrero Legendario
if (usuarioActual.nivel >= 10) {

    const resultado10 = desbloquearLogro(sender, "nivel_10");

    if (resultado10.nuevo) {

      await anuncioGlobal(sock, from, "logro", {
nombre: usuarioActual.nombre || "Titán",
        logro: resultado10.logro.nombre,
        titulo: obtenerTitulo(sender)
      });
    }
  }

  // Nivel 25 → Titán Supremo
if (usuarioActual.nivel >= 25) {

    const resultado25 = desbloquearLogro(sender, "nivel_25");

    if (resultado25.nuevo) {

      await anuncioGlobal(sock, from, "logro", {
nombre: usuarioActual.nombre || "Titán",
        logro: resultado25.logro.nombre,
        titulo: obtenerTitulo(sender)
      });
    }
  }

 } // ======================================
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

const { estaActivo } = require("../rpg/utils/rpgManager");

// ======================================
// ⚔️ GUERRA DE REINOS
// ======================================
// Los comandos rpg2 pertenecen exclusivamente
// al sistema Guerra de Reinos.
if (
    comando.categoria === "rpg2" &&
    !estaActivo(from)
) {
    return await sock.sendMessage(from, {
        text:
`⚔️ ═══ GUERRA DE REINOS ═══

El sistema Guerra de Reinos
no está activo en este grupo.

Un administrador debe activarlo
con:

!rpg on`
    });
}

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
    } catch (error) {
      console.error(`❌ Error ejecutando ${nombreComando}:`, error);

      await sock.sendMessage(from, {
        text: "❌ Ocurrió un error al ejecutar el comando."
      });
    }

  } catch (error) {
    console.error("❌ Error general en manejarMensajes:", error);
  }
}

module.exports = manejarMensajes;
