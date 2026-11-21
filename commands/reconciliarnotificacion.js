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
  nombre: "reconciliarnotificacion",
  alias: [],
  categoria: "superadmin",
  descripcion: "Reconcilia una notificación ya enviada sin reenviarla.",
  permisos: ["usuario"],
  uso: "!reconciliarnotificacion ID_PREMIO ETAPA",

  async ejecutar(sock, from, args, msg) {
    const sender = obtenerIdentidadSuperAdmin(msg);

    if (!(await esSuperAdmin(sender))) {
      return sock.sendMessage(from, {
        text: "⛔ Solo un SuperAdmin autorizado puede reconciliar notificaciones."
      });
    }

    if (
      args.length !== 2 ||
      !["confirmacion-privada", "anuncio-publico"].includes(args[1])
    ) {
      return sock.sendMessage(from, {
        text:
          "⚠️ Uso incorrecto.\n\n" +
          "Utiliza:\n" +
          "!reconciliarnotificacion ID_PREMIO confirmacion-privada\n" +
          "o\n" +
          "!reconciliarnotificacion ID_PREMIO anuncio-publico"
      });
    }

    try {
      const resultado = await entrega.reconciliarNotificacion(
        args[0],
        args[1],
        sender
      );

      return sock.sendMessage(from, {
        text:
          "✅ *RECONCILIACIÓN DE NOTIFICACIÓN*\n\n" +
          `🆔 Premio: ${args[0]}\n` +
          `📨 Etapa: ${args[1]}\n` +
          `🛡️ Administrador: ${sender}\n\n` +
          (resultado.duplicada
            ? "ℹ️ La notificación ya estaba reconciliada."
            : "✅ Ledger actualizado desde la operación ENVIADO.") +
          "\n📌 No se realizó ningún reenvío."
      });
    } catch (error) {
      console.error("TitansB | Reconciliación:", error.message);
      return sock.sendMessage(from, {
        text:
          "❌ No se pudo reconciliar la notificación.\n" +
          "Debe existir una operación ENVIADO con premio, etapa y destino coincidentes."
      });
    }
  }
};
