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
  nombre: "reconciliarcodigopremio",
  alias: [],
  categoria: "superadmin",
  descripcion: "Resuelve manualmente un código de premio cuyo envío quedó incierto.",
  permisos: ["usuario"],
  uso: "!reconciliarcodigopremio ID_PREMIO invalidar",

  async ejecutar(sock, from, args, msg) {
    const sender = obtenerIdentidadSuperAdmin(msg);

    if (!(await esSuperAdmin(sender))) {
      return sock.sendMessage(from, {
        text: "⛔ Solo un SuperAdmin autorizado puede reconciliar códigos de premios."
      });
    }

    if (
      args.length !== 2 ||
      args[1] !== "invalidar"
    ) {
      return sock.sendMessage(from, {
        text:
          "⚠️ Uso incorrecto.\n\n" +
          "Utiliza:\n" +
          "!reconciliarcodigopremio ID_PREMIO invalidar\n\n" +
          "Esta operación solo invalida un desafío INCIERTO. " +
          "No confirma envíos ni reenvía códigos."
      });
    }

    try {
      const premio = entrega.obtenerPremio(args[0]);
      const verificacion = premio?.verificacionCodigo;

      if (!verificacion || typeof verificacion.mensajeId !== "string") {
        throw new Error("El premio no tiene un desafío reconciliable.");
      }

      const uuidValido = typeof verificacion.idDesafio === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(verificacion.idDesafio);

      let resultado;

      if (
        !uuidValido &&
        ["PENDIENTE_ENVIO", "ENVIANDO"].includes(verificacion.estadoEnvio)
      ) {
        resultado = await entrega.reconciliarCodigoAntiguoSinIdentidad(
          args[0],
          verificacion.mensajeId,
          sender
        );
      } else if (uuidValido && verificacion.estadoEnvio === "INCIERTO") {
        resultado = await entrega.reconciliarCodigoIncierto(
          args[0],
          verificacion.mensajeId,
          verificacion.idDesafio,
          sender
        );
      } else {
        throw new Error("El desafío no está en un estado reconciliable.");
      }

      return sock.sendMessage(from, {
        text:
          "✅ *RECONCILIACIÓN DE CÓDIGO DE PREMIO*\n\n" +
          `🆔 Premio: ${args[0]}\n` +
          `🛡️ SuperAdmin: ${sender}\n` +
          `🕒 Fecha: ${resultado.resueltoEn}\n\n` +
          "🔒 Código anterior invalidado.\n" +
          (resultado.legacy
            ? "🧾 Registro antiguo sin UUID resuelto mediante revisión manual.\n"
            : "📌 Desafío INCIERTO invalidado mediante revisión manual.\n") +
          "📌 No se confirmó ningún envío ni se realizó un reenvío.\n" +
          "ℹ️ La emisión de un nuevo código requerirá una operación independiente."
      });
    } catch (error) {
      console.error(
        "TitansB | Reconciliación de código:",
        error.message
      );

      return sock.sendMessage(from, {
        text:
          "❌ No se pudo reconciliar el código.\n" +
          "Debe existir un desafío INCIERTO activo y coincidir con el registro del premio."
      });
    }
  }
};
