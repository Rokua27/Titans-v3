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
        text: "⛔ *TITANS TEAM · ACCESO RESTRINGIDO*\n\n🔐 Solo un SuperAdmin autorizado puede reconciliar entregas internas."
      });
    }

    if (!Array.isArray(args) || args.length !== 1) {
      return sock.sendMessage(from, {
        text:
          "⚠️ *TITANS TEAM · COMANDO INCORRECTO*\n\n" +
          "╔══ 🔐 RECONCILIACIÓN INTERNA ══╗\n" +
          "📌 Formato correcto:\n" +
          "!reconciliarentregainterna ID_PREMIO\n" +
          "╚══════════════════════════════╝\n\n" +
          "🔒 Debes indicar un único ID de premio."
      });
    }

    try {
      const resultado = await entrega.reconciliarEnvioEntregas(
        args[0],
        sender
      );

      return sock.sendMessage(from, {
        text:
          "📢 *TITANS TEAM · RECONCILIACIÓN INTERNA COMPLETADA* 👑\n\n" +
          "╔══ 🔐 VERIFICACIÓN DE ENTREGA ══╗\n" +
          `🆔 Referencia del premio: ${args[0]}\n` +
          `🛡️ SuperAdmin: ${sender}\n` +
          (resultado.duplicada
            ? "ℹ️ El ledger ya estaba pendiente de confirmación.\n"
            : "✅ El ledger quedó pendiente de confirmación.\n") +
          "📌 Se verificó el ID real del mensaje enviado.\n" +
          "🔒 No se reenviaron datos del jugador.\n" +
          "╚════════════════════════════════╝\n\n" +
          "🏆LIGA TITANS TEAM - TITANSB MIEMBRO VIRTUAL 🤖"
      });
    } catch (error) {
      console.error(
        "TitansB | Reconciliación de entrega interna:",
        error.message
      );

      return sock.sendMessage(from, {
        text:
          "⛔ *TITANS TEAM · RECONCILIACIÓN NO COMPLETADA*\n\n" +
          "╔══ 🔐 REVISIÓN DE SEGURIDAD ══╗\n" +
          "⚠️ No se pudo reconciliar la entrega interna.\n" +
          "🔒 Se requiere una operación ENVIADO con ID real de WhatsApp, premio y grupo interno coincidentes.\n" +
          "🚫 No se reenviaron datos del jugador.\n" +
          "╚══════════════════════════════╝"
      });
    }
  }
};
