const monitor = require("../utils/monitor");

module.exports = {

    nombre: "monitor",

    alias: [],

    categoria: "admin",

    descripcion: "Consulta el estado operacional del sistema Monitor.",

    permisos: ["usuario"],

    uso: "!monitor",

    async ejecutar(sock, from) {

        try {

            // ==================================================
            // 🔎 CONSULTA SOLAMENTE
            // ==================================================

            const estado = monitor.obtenerEstado();

            if (!estado || typeof estado !== "object") {

                return await sock.sendMessage(from, {
                    text:
`╔════════════════════════════╗
║      🛡️ MONITOR TITANSB      ║
╚════════════════════════════╝

⚠️ Estado del Monitor no disponible.

━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 TitansB • Sistema Automático`
                });

            }

            // ==================================================
            // 📐 ESTADO DE WHATSAPP
            // ==================================================

            const whatsapp =
                estado.whatsapp === "CONECTADO" ||
                estado.whatsapp === "DESCONECTADO" ||
                estado.whatsapp === "DESCONOCIDO"
                    ? estado.whatsapp
                    : "DESCONOCIDO";

            const iconoWhatsApp = {
                CONECTADO: "🟢",
                DESCONECTADO: "🔴",
                DESCONOCIDO: "🟡"
            }[whatsapp];

            // ==================================================
            // 🟢 ESTADO GENERAL
            // ==================================================

            const estadoGeneral =
                whatsapp === "CONECTADO"
                    ? "🟢 OPERATIVO"
                    : whatsapp === "DESCONECTADO"
                        ? "🔴 DESCONECTADO"
                        : "🟡 DESCONOCIDO";

            // ==================================================
            // 📅 ÚLTIMO CAMBIO
            // ==================================================

            const ultimoCambio =
                estado.ultimoCambio
                    ? estado.ultimoCambio
                    : "Sin información";

            // ==================================================
            // 🚨 INCIDENTES
            // ==================================================

            const incidentes =
                Number.isFinite(Number(estado.incidentes))
                    ? Number(estado.incidentes)
                    : 0;

            // ==================================================
            // 📊 RESPUESTA OPERACIONAL
            // ==================================================

            const mensaje =
`╔════════════════════════════╗
║      🛡️ MONITOR TITANSB      ║
╚════════════════════════════╝

📊 ESTADO GENERAL
${estadoGeneral}

━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 ESTADO DE WHATSAPP
${iconoWhatsApp} ${whatsapp}

🕒 ÚLTIMO CAMBIO
${ultimoCambio}

🚨 INCIDENTES
${incidentes}

━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️ Este comando es únicamente
de consulta.

🔒 No modifica el Monitor
🔒 No modifica WhatsApp
🔒 No inicia reconexiones
🔒 No genera alertas

━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 TitansB • Sistema Automático`;

            await sock.sendMessage(from, {
                text: mensaje
            });

        } catch (error) {

            console.error(
                "❌ Error en comando !monitor:",
                error.message
            );

            await sock.sendMessage(from, {
                text:
`╔════════════════════════════╗
║      🛡️ MONITOR TITANSB      ║
╚════════════════════════════╝

❌ No fue posible consultar
el estado del Monitor.

━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 TitansB • Sistema Automático`
            });

        }

    }

};
