"use strict";

const { obtenerIdentidadSuperAdmin } = require("../utils/identidadSuperAdmin");

const { esSuperAdmin } = require("../utils/admin");
const {
  entregaPremios: entrega
} = require("../utils/economiaCompartida");

if (!entrega) {
  throw new Error("El servicio compartido de entregas no está disponible.");
}

module.exports = {
  nombre: "reconciliarentregainterna",
  alias: [],
  categoria: "superadmin",
  descripcion: "Reconcilia un envío interno ya confirmado sin reenviarlo.",
  permisos: ["usuario"],
  uso: "!reconciliarentregainterna ID_PREMIO",

  async ejecutar(sock, from, args, msg) {
    const sender = obtenerIdentidadSuperAdmin(msg);

    if (!(await esSuperAdmin(sender))) {
      return sock.sendMessage(from, {
        text: "⛔ Solo un SuperAdmin autorizado puede reconciliar entregas internas."
      });
    }

    if (!Array.isArray(args) || args.length !== 1) {
      return sock.sendMessage(from, {
        text:
          "⚠️ Uso incorrecto.\n\n" +
          "Utiliza:\n" +
          "!reconciliarentregainterna ID_PREMIO"
      });
    }

    try {
      const resultado = await entrega.reconciliarEnvioEntregas(
        args[0],
        sender
      );

      return sock.sendMessage(from, {
        text:
          "✅ *RECONCILIACIÓN DE ENTREGA INTERNA*\n\n" +
          `🆔 Premio: ${args[0]}\n` +
          `🛡️ Administrador: ${sender}\n\n` +
          (resultado.duplicada
            ? "ℹ️ El ledger ya estaba en pendiente de confirmación."
            : "✅ El ledger quedó en pendiente de confirmación.") +
          "\n📌 Se verificó el ID real del mensaje enviado." +
          "\n🔒 No se reenviaron datos del jugador."
      });
    } catch (error) {
      console.error(
        "TitansB | Reconciliación de entrega interna:",
        error.message
      );

      return sock.sendMessage(from, {
        text:
          "❌ No se pudo reconciliar la entrega interna.\n" +
          "Se requiere una operación ENVIADO con ID real de WhatsApp, premio y grupo interno coincidentes."
      });
    }
  }
};
