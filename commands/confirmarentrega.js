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
        text: "⛔ Solo un SuperAdmin autorizado puede confirmar entregas."
      });
    }

    if (args.length !== 1) {
      return sock.sendMessage(from, {
        text:
          "⚠️ Uso incorrecto.\n\n" +
          "Utiliza:\n" +
          "!confirmarentrega ID_PREMIO"
      });
    }

    const id = args[0];

    try {
      const resultado = await entrega.confirmarEntrega(id, sender);

      if (resultado.duplicada) {
        return sock.sendMessage(from, {
          text:
            "ℹ️ Esta confirmación ya estaba registrada.\n" +
            `🆔 Premio: ${id}\n` +
            "No se ha creado una segunda entrega."
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
          "╔══ 👑 TITANS TEAM · ENTREGA CONFIRMADA 👑 ══╗\n\n" +
          `🆔 Premio: ${premio.id}\n` +
          `🏆 Ganador: ${premio.ganadorNombre}\n` +
          `🎁 Recompensa: ${premio.premio.nombre}\n` +
          `🛡️ Confirmado por: ${sender}\n\n` +
          "✅ Estado: ENTREGADO\n" +
          "📌 La confirmación quedó registrada.\n" +
          "📨 Las notificaciones privada y pública quedaron en la cola persistente para su procesamiento."
      });
    } catch (error) {
      console.error(
        "TitansB | Error confirmando entrega:",
        error.message
      );

      return sock.sendMessage(from, {
        text:
          "❌ No se pudo confirmar la entrega.\n" +
          "Verifica el ID y que el premio esté pendiente de confirmación."
      });
    }
  }
};
