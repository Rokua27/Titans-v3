require("dotenv").config();

const express = require("express");
const iniciarBot = require("./config/baileys2");
const { cargarComandos } = require("./utils/commandHandler");
const { limpiarTemporales } = require("./utils/limpiarTemporales");

const app = express();
const PORT = process.env.PORT || 3000;

global.qrCode = null;

// Comprobación de salud para Render
app.get("/healthz", (req, res) => {
  res.status(200).json({
    status: "ok",
    servicio: "Titans-v3"
  });
});

// Página principal
app.get("/", (req, res) => {
  if (global.qrCode) {
    res.send(`
      <html>
        <body style="background:#0f172a;color:white;text-align:center;font-family:Arial;padding:20px;">
          <h1>📱 TitansBot v3</h1>
          <h2>Escanea este QR con WhatsApp</h2>
          <img src="${global.qrCode}" width="300"/>
        </body>
      </html>
    `);
  } else {
    res.send("✅ TitansBot v3 está en línea. QR no disponible.");
  }
});

app.listen(PORT, async () => {
  console.log(`🌐 Servidor iniciado en el puerto ${PORT}`);

  try {
    await limpiarTemporales();
  } catch (error) {
    console.error("❌ Error en limpieza:", error.message);
  }

  cargarComandos();

  if (process.env.WHATSAPP_ENABLED === "true") {
    console.log("📱 Iniciando conexión de WhatsApp...");

    try {
      await iniciarBot({ origen: "MANUAL" });
    } catch (error) {
      console.error("❌ Error al iniciar WhatsApp:", error);
      iniciarBot.programarReconexion();
    }
  } else {
    console.log("⏸️ WhatsApp desactivado temporalmente.");
  }
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 UNHANDLED REJECTION:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("💥 UNCAUGHT EXCEPTION:", err.stack || err);
});
