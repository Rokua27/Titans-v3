require("dotenv").config();

const express = require("express");
const iniciarBot = require("./config/baileys2");
const { cargarComandos } = require("./utils/commandHandler");
const { limpiarTemporales } = require("./utils/limpiarTemporales");
const {
  recuperarEconomia,
  recuperarCodigosPendientesEnvio
} = require("./utils/economiaCompartida");

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

  try {
    const esRender = process.env.RENDER === "true";
    let recuperacionOmitida = false;

    const recuperacion = await recuperarEconomia();

    const economiaValida =
      recuperacion?.ok === true &&
      Number.isSafeInteger(recuperacion.recuperadas) &&
      recuperacion.recuperadas >= 0;

    if (recuperacion?.omitida === true) {
      console.log("⏭️ Recuperación económica omitida:", recuperacion.motivo);

      if (esRender) {
        recuperacionOmitida = true;
        console.error("⛔ Render exige recuperar la economía antes de iniciar WhatsApp.");
      }
    } else if (esRender && !economiaValida) {
      recuperacionOmitida = true;
      console.error("⛔ Resultado económico inválido: se exige ok=true y un contador recuperadas válido.");
    } else {
      console.log(
        "✅ Recuperación económica completada:",
        recuperacion?.recuperadas,
        "operaciones"
      );
    }

    // Se comprueba independientemente de la recuperación económica.
    const codigos = await recuperarCodigosPendientesEnvio();

    const codigosValidos =
      Number.isSafeInteger(codigos?.revisados) &&
      codigos.revisados >= 0 &&
      Number.isSafeInteger(codigos?.inciertos) &&
      codigos.inciertos >= 0 &&
      Number.isSafeInteger(codigos?.revisionManual) &&
      codigos.revisionManual >= 0 &&
      codigos.inciertos + codigos.revisionManual <= codigos.revisados &&
      Array.isArray(codigos?.resultados);

    const ledgerPremiosAunNoCreado =
      codigos?.omitida === true &&
      codigos.motivo === "Todavía no existe el ledger de premios.";

    if (ledgerPremiosAunNoCreado) {
      console.log("ℹ️ No existe todavía el ledger de premios; no hay códigos previos que recuperar.");
    } else if (codigos?.omitida === true) {
      console.log("⏭️ Recuperación de códigos omitida:", codigos.motivo);

      if (esRender) {
        recuperacionOmitida = true;
        console.error("⛔ Render exige recuperar los códigos pendientes antes de iniciar WhatsApp.");
      }
    } else if (esRender && !codigosValidos) {
      recuperacionOmitida = true;
      console.error("⛔ Resultado de recuperación de códigos inválido: faltan contadores válidos.");
    } else {
      console.log(
        "🔐 Recuperación de códigos de premios:",
        codigos?.revisados,
        "revisados;",
        codigos?.inciertos,
        "marcados INCIERTOS."
      );
    }

    if (recuperacionOmitida) {
      console.error("⛔ Arranque bloqueado: falta completar una recuperación obligatoria.");
      return;
    }
  } catch (error) {
    console.error("❌ Falló la recuperación previa al arranque:", error);
    console.error("⛔ WhatsApp no se iniciará para proteger los datos.");
    return;
  }

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
