const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const P = require("pino");

const manejarMensajes = require("../events/messages");
const manejarParticipantes = require("../events/groupParticipants");
const registrarEventosGrupo = require("../events/groupParticipants");
const { iniciarComunidadBot } = require("../utils/comunidadBot/motor");


async function iniciarBot() {

    const { state, saveCreds } = await useMultiFileAuthState("sessions");

    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: P({ level: "silent" }),

        // Puedes cambiar el nombre del navegador si deseas
        browser: ["Ubuntu", "Chrome", "22.04"],

        printQRInTerminal: false,

        syncFullHistory: false,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: true
    });

    // Registrar eventos propios
    registrarEventosGrupo(sock);

    // Guardar sesión
    sock.ev.on("creds.update", saveCreds);

    // Mensajes
    sock.ev.on("messages.upsert", async (m) => {
        try {
            await manejarMensajes(sock, m);
        } catch (err) {
            console.error("❌ Error en messages.upsert");
            console.error(err);
        }
    });

    // Entradas y salidas de grupos
    sock.ev.on("group-participants.update", async (update) => {
        try {
            await manejarParticipantes(sock, update);
        } catch (err) {
            console.error("❌ Error group-participants.update");
            console.error(err);
        }
    });

    // Estado de conexión
    sock.ev.on("connection.update", async (update) => {

        const {
            connection,
            lastDisconnect,
            qr
        } = update;

        // QR
        if (qr) {
            global.qrCode = qr;
            console.log("📱 Nuevo QR generado.");
        }

        // Conectado
        if (connection === "open") {
            console.clear();
            console.log("✅ TitansBot v3 conectado correctamente.");

            // 🤖 Iniciar miembro virtual de la comunidad
            iniciarComunidadBot(sock);

            return;
        }

        // Desconectado
        if (connection === "close") {

            const codigo = lastDisconnect?.error?.output?.statusCode;

            console.log("❌ WhatsApp desconectado.");
            console.log("📌 Código:", codigo);

            if (lastDisconnect) {
                console.dir(lastDisconnect, { depth: null });
            }

            // Sesión cerrada
            if (
                codigo === DisconnectReason.loggedOut ||
                codigo === 401
            ) {

                console.log("");
                console.log("⚠️ La sesión fue cerrada.");
                console.log("📱 Debes escanear un nuevo código QR.");
                return;
            }

            console.log("🔄 Intentando reconectar en 5 segundos...");

            setTimeout(async () => {

                try {
                    await iniciarBot();
                } catch (err) {
                    console.error("❌ Error al reconectar:");
                    console.error(err);
                }

            }, 5000);
        }

    });

    return sock;
}

module.exports = iniciarBot;
