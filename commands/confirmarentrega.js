"use strict";

const { obtenerIdentidadSuperAdmin } = require("../utils/identidadSuperAdmin");

const { esSuperAdmin } = require("../utils/admin");
const {
  entregaPremios: entrega,
  procesarColaEntregasPremios
} = require("../utils/economiaCompartida");

if (!entrega) {
  throw new Error("El servicio compartido de entregas no está disponible.");
}

module.exports = {
  nombre: "confirmarentrega",
  alias: ["confirmarpremio"],
  categoria: "superadmin",
  descripcion: "Confirma la entrega de un premio real.",
  permisos: ["usuario"],
  uso: "!confirmarentrega ID_PREMIO",

  async ejecutar(sock, from, args, msg) {
    const sender = obtenerIdentidadSuperAdmin(msg);

    // Protección obligatoria: solo SuperAdmins de la lista secreta.
    if (!(await esSuperAdmin(sender))) {
      return sock.sendMessage(from, {
        text: "⛔ *TITANS TEAM · ACCESO RESTRINGIDO*\n\n🔐 Solo un SuperAdmin autorizado puede confirmar entregas."
      });
    }

    if (args.length !== 1) {
      return sock.sendMessage(from, {
        text:
          "⚠️ *TITANS TEAM · COMANDO INCORRECTO*\n\n" +
          "📌 Formato correcto:\n" +
          "!confirmarentrega ID_PREMIO"
      });
    }

    const id = args[0];

    try {
      const resultado = await entrega.confirmarEntrega(id, sender);

      if (resultado.duplicada) {
        return sock.sendMessage(from, {
          text:
            "📢 *TITANS TEAM · ENTREGA YA REGISTRADA*\n\n" +
            `🆔 Referencia: ${id}\n` +
            "🔒 No se generó una segunda entrega."
        });
      }

      const premio = resultado.resultado;

      // La confirmación ya fue persistida. El procesamiento de la cola
      // es independiente y no debe convertir una confirmación válida en fallo.
      try {
        procesarColaEntregasPremios();
      } catch (error) {
        console.error(
          "TitansB | No se pudo despertar la cola tras confirmar entrega:",
          error.message
        );
      }

      return sock.sendMessage(from, {
        text:
          "📢 *TITANS TEAM · ENTREGA CONFIRMADA* 👑\n\n" +
          `🆔 *Referencia:* ${premio.id}\n` +
          `🏆 *Ganador:* ${premio.ganadorNombre}\n` +
          `🎁 *Recompensa:* ${premio.premio.nombre}\n` +
          `🛡️ *Autorizó:* ${sender}\n` +
          "╚══════════════════════════╝\n\n" +
          "✅ *Estado:* ENTREGADO\n" +
          "🔒 Confirmación guardada correctamente.\n" +
          "📨 Notificaciones privada y pública en cola persistente.\n\n" +
          "🏆LIGA TITANS TEAM - TITANSB MIEMBRO VIRTUAL 🤖"
      });
    } catch (error) {
      console.error(
        "TitansB | Error confirmando entrega:",
        error.message
      );

      return sock.sendMessage(from, {
        text:
          "❌ *TITANS TEAM · NO SE PUDO CONFIRMAR*\n\n" +
          "🔎 Verifica la referencia y que el premio esté pendiente de confirmación.\n" +
          "🔒 No se debe asumir que la entrega quedó confirmada."
      });
    }
  }
};
