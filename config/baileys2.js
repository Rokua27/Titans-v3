const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const P = require("pino");

const manejarMensajes = require("../events/messages");
const { iniciarComunidadBot } = require("../utils/comunidadBot/motor");
const manejarParticipantes = require("../events/groupParticipants");
const monitor = require("../utils/monitor");

let reconexionProgramada = null;
let creandoSocket = false;
let reconexionSolicitadaDuranteInicio = false;
let sockActual = null;

let intentosReconexion = 0;

function programarReconexion() {
    if (reconexionProgramada) {
        console.log("⏳ Ya existe una reconexión programada.");
        return;
    }

    // Si el socket todavía se está creando, aplazamos el siguiente
    // intento hasta conocer el resultado de esa inicialización.
    if (creandoSocket) {
        reconexionSolicitadaDuranteInicio = true;
        console.log("⏳ Reconexión solicitada durante la creación del socket; queda en cola.");
        return;
    }

    intentosReconexion++;

    const espera =
        Math.min(intentosReconexion * 5000, 30000);

    console.log(
        `🔄 Reconectando en ${espera / 1000} segundos...`
    );

    reconexionProgramada = setTimeout(async () => {
        reconexionProgramada = null;
        creandoSocket = true;

        try {
            console.log("🔄 Creando nuevo socket...");
            await iniciarBot({ origen: "RECONEXION" });
        } catch (error) {
            console.error(
                "❌ Error al reconectar:",
                error
            );

            console.log(
                "🔁 La recuperación continuará automáticamente."
            );

            reconexionSolicitadaDuranteInicio = true;
        } finally {
            creandoSocket = false;

            // Si el socket falló mientras se inicializaba, se programa
            // un único nuevo intento después de liberar el bloqueo.
            if (reconexionSolicitadaDuranteInicio) {
                reconexionSolicitadaDuranteInicio = false;
                programarReconexion();
            }
        }
    }, espera);
}

function cancelarReconexionProgramada() {
    if (reconexionProgramada) {
        clearTimeout(reconexionProgramada);
        reconexionProgramada = null;
    }

    reconexionSolicitadaDuranteInicio = false;
}

async function iniciarBot({ origen = "MANUAL" } = {}) {

    // 🛡️ Iniciar núcleo TitansB Monitor
    monitor.iniciarMonitor();

    const { state, saveCreds } = await useMultiFileAuthState("./sessions");

    const { version } = await fetchLatestBaileysVersion();

    console.log("📦 Versión WhatsApp:", version.join("."));

// Cerrar conexión anterior si existe
if (sockActual) {
    try {
        sockActual.end?.();
    } catch (e) {
        console.log("⚠️ No fue posible cerrar el socket anterior.");
    }
}

    const sock = makeWASocket({
        auth: state,
        version,
        logger: P({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "22.04"]
    });

sockActual = sock;

// 🛡️ Conectar socket con TitansB Monitor
monitor.setSocket(sock);

// Guardar sesión (protegido)
sock.ev.on("creds.update", async () => {

    try {

        await saveCreds();

    } catch (error) {

        console.error("❌ Error guardando credenciales:", error);

    }

});

    // QR
    sock.ev.on("connection.update", async (update) => {

        const { connection, qr, lastDisconnect } = update;

const QRCode = require("qrcode");

if (qr) {
    console.log("✅ QR recibido");

    global.qrCode = await QRCode.toDataURL(qr);

    console.log("🌐 QR convertido para la web");
}

if (connection === "open") {

    // Ignorar eventos de conexión de sockets antiguos.
    if (sock !== sockActual) {
        console.log("⏭️ Open ignorado: socket antiguo.");
        return;
    }

    // Limpiar QR al conectar
    global.qrCode = null;

    // Reiniciar y cancelar cualquier reintento que ya no sea necesario.
    intentosReconexion = 0;
    cancelarReconexionProgramada();

    console.log("🟢 WhatsApp conectado");

    // 🛡️ MONITOR — registrar recuperación real de WhatsApp
    monitor.registrarRecuperacion();


    // 🛡️ MONITOR — registrar conexión real de WhatsApp
    const eventoConexion = monitor.registrarEvento("WHATSAPP_CONECTADO", {
        estado: "CONECTADO",
        componente: "BAILEYS"
    });

    // 📨 MONITOR — comportamiento según origen del arranque
    if (origen === "MANUAL") {
        monitor.enviarAlerta(
            "WHATSAPP_CONECTADO",
            {
                estado: "CONECTADO",
                componente: "BAILEYS",
                descripcion: "TitansB se encuentra conectado y en funcionamiento"
            },
            eventoConexion
        ).catch((error) => {
            console.error(
                "❌ MONITOR | Error alerta de conexión manual:",
                error.message
            );
        });
    } else {
        console.log(
            "🔄 MONITOR | Recuperación automática: conexión acumulada para reporte."
        );
    }

    // 🤖 Iniciar sistema social de TitansB
    iniciarComunidadBot(sock);


}

if (connection === "close") {

    // ==========================================
    // 🛡️ VALIDAR SOCKET ACTIVO
    // ==========================================
    if (sock !== sockActual) {
        console.log("⏭️ Close ignorado: socket antiguo.");
        return;
    }

    const codigo =
        lastDisconnect?.error?.output?.statusCode;

    // 🔎 DIAGNÓSTICO — conservar causa real del cierre
    console.log("🔎 Detalle cierre WhatsApp:", {
        codigo,
        error: lastDisconnect?.error?.message,
        nombre: lastDisconnect?.error?.name,
        stack: lastDisconnect?.error?.stack
    });

    // 🛡️ MONITOR — registrar desconexión real y activar
    // acumulador de conectividad M03.2
    monitor.registrarDesconexion(
        codigo ?? "DESCONOCIDO"
    );

console.log("🔴 Desconectado:", codigo);

// 🛡️ MONITOR — alertas de incidentes críticos
if (codigo === 440) {
    monitor.enviarAlerta("CONFLICTO_WHATSAPP_440", {
        estado: "INCIDENTE",
        componente: "BAILEYS",
        codigo: 440,
        descripcion: "Conflicto de sesión detectado"
    }).catch((error) => {
        console.error(
            "❌ MONITOR | Error alerta 440:",
            error.message
        );
    });
}

// ==========================================
// 🛡️ INVALIDAR SOCKET CERRADO
// ==========================================
if (sock === sockActual) {
    console.log("🧹 Invalidando socket cerrado.");
    sockActual = null;

    // 🛡️ MONITOR — sincronizar desconexión real
    monitor.setSocket(null);
}



    // ==========================================
    // 🔐 SESIÓN CERRADA
    // ==========================================
    if (codigo === DisconnectReason.loggedOut) {
                  // 🛡️ MONITOR — alerta de sesión cerrada
          monitor.enviarAlerta("SESION_WHATSAPP_CERRADA", {
              estado: "INCIDENTE",
              componente: "BAILEYS",
              codigo: codigo,
              descripcion: "La sesión de WhatsApp fue cerrada"
          }).catch((error) => {
              console.error(
                  "❌ MONITOR | Error alerta loggedOut:",
                  error.message
              );
          });

console.log(
            "⚠️ Sesión cerrada. Debes escanear un nuevo QR."
        );

        cancelarReconexionProgramada();
        return;
    }

    // ==========================================
    // 🛡️ EVITAR RECONEXIONES DUPLICADAS
    // ==========================================

    programarReconexion();
}

    });

// Mensajes
sock.ev.on("messages.upsert", async (m) => {

    // Ignorar eventos de sockets antiguos
    if (sock !== sockActual) return;

    try {

        await manejarMensajes(sock, m);

    } catch (e) {

        console.error("❌ Error en messages.upsert:", e);

    }

});

// ======================================
// 🛡️ Monitoreo interno de Baileys
// ======================================

if (sock.ws) {

    sock.ws.on("CB:failure", (data) => {
        console.log("⚠️ Baileys Failure:", data);
    });

    sock.ws.on("CB:stream:error", (data) => {
        console.log("⚠️ Stream Error:", data);
    });

    sock.ws.on("error", (error) => {
        console.error("❌ Error del WebSocket:", error);
    });

}

// Registrar eventos de grupos
manejarParticipantes(sock);

    return sock;
}

function obtenerSocketActual() {
    return sockActual;
}

module.exports = iniciarBot;
module.exports.programarReconexion = programarReconexion;
module.exports.obtenerSocketActual = obtenerSocketActual;
