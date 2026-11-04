require("dotenv").config();

const express = require("express");
const iniciarBot = require("./config/baileys2");
const { cargarComandos } = require("./utils/commandHandler");
const { limpiarTemporales } = require("./utils/limpiarTemporales");

const app = express();
const PORT = process.env.PORT || 3000;

// Variable global para el QR
global.qrCode = null;

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

  // 🧹 Limpieza automática de archivos temporales multimedia
  try {
    await limpiarTemporales();
  } catch (error) {
    console.error("❌ Error en limpieza de temporales:", error.message);
  }

  cargarComandos();

  try {
    await iniciarBot({ origen: "MANUAL" });
  } catch (error) {
    console.error("❌ Error al iniciar WhatsApp:", error);
    iniciarBot.programarReconexion();
  }
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("====================================");
    console.error("🚨 UNHANDLED REJECTION DETECTADA");
    console.error("Razón:", reason);
    console.error("Promise:", promise);
    console.error("Stack:");
    console.error(reason?.stack || reason);
    console.error("====================================");
});

process.on("uncaughtException", (err) => {
    console.error("====================================");
    console.error("💥 UNCAUGHT EXCEPTION");
    console.error(err.stack || err);
    console.error("====================================");
});
