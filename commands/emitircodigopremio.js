"use strict";

const { obtenerIdentidadSuperAdmin } = require("../utils/identidadSuperAdmin");

const { esSuperAdmin } = require("../utils/admin");
const { entregaPremios: entrega } = require("../utils/economiaCompartida");

if (!entrega) {
  throw new Error("El servicio compartido de entregas no está disponible.");
}

async function marcarIncierto(id, mensajeId, idDesafio) {
  if (!idDesafio) return false;

  try {
    await entrega.marcarCodigoIncierto(id, mensajeId, idDesafio);
    return true;
  } catch (error) {
    // No registrar códigos ni datos privados.
    console.error(
      "TitansB | No se pudo marcar el desafío como INCIERTO:",
      error.message
    );
    return false;
  }
}

module.exports = {
  nombre: "emitircodigopremio",
  alias: ["emitircodigo"],
  categoria: "superadmin",
  descripcion: "Emite un código privado para verificar al ganador de un premio real.",
  permisos: ["usuario"],
  uso: "!emitircodigopremio ID_PREMIO",

  async ejecutar(sock, from, args, msg) {
    const sender = obtenerIdentidadSuperAdmin(msg);

    if (!(await esSuperAdmin(sender))) {
      return sock.sendMessage(from, {
        text: "⛔ Solo un SuperAdmin autorizado puede emitir códigos de premios."
      });
    }

    if (!Array.isArray(args) || args.length !== 1) {
      return sock.sendMessage(from, {
        text:
          "⚠️ Uso incorrecto.\n\n" +
          "Utiliza:\n" +
          "!emitircodigopremio ID_PREMIO"
      });
    }

    const id = args[0];
    const mensajeId = msg?.key?.id;

    if (
      typeof mensajeId !== "string" ||
      !mensajeId.trim() ||
      mensajeId.length > 200
    ) {
      return sock.sendMessage(from, {
        text: "❌ No se pudo identificar de forma segura la solicitud. No se emitió ningún código."
      });
    }

    let idDesafio = null;
    let codigo = null;

    try {
      const premio = entrega.obtenerPremio(id);

      if (
        !premio ||
        typeof premio.ganadorId !== "string" ||
        !/^\d{5,20}@(s\.whatsapp\.net|lid)$/.test(premio.ganadorId)
      ) {
        throw new Error("La identidad privada del ganador no es válida.");
      }

      const preparado = await entrega.prepararCodigoVerificacion(
        id,
        premio.ganadorId,
        mensajeId
      );

      if (preparado.duplicada) {
        return sock.sendMessage(from, {
          text:
            "ℹ️ Esta solicitud ya fue procesada o registrada.\n" +
            `🆔 Premio: ${id}\n` +
            "No se generó ni se reenvió otro código."
        });
      }

      if (
        preparado.ok !== true ||
        typeof preparado.codigo !== "string" ||
        !/^\d{8}$/.test(preparado.codigo) ||
        typeof preparado.idDesafio !== "string"
      ) {
        throw new Error("No se pudo preparar un desafío válido.");
      }

      codigo = preparado.codigo;
      idDesafio = preparado.idDesafio;

      let inicio;

      try {
        inicio = await entrega.marcarCodigoEnviando(
          id,
          mensajeId,
          idDesafio
        );
      } catch (error) {
        await marcarIncierto(id, mensajeId, idDesafio);
        throw new Error(
          "No se pudo confirmar el inicio del envío. El desafío quedó sujeto a revisión."
        );
      }

      // Una operación duplicada o ya iniciada nunca autoriza otro envío.
      if (
        inicio?.duplicada ||
        inicio?.resultado?.yaEnviando ||
        inicio?.resultado?.enviando !== true
      ) {
        await marcarIncierto(id, mensajeId, idDesafio);

        return sock.sendMessage(from, {
          text:
            "⚠️ No se enviará el código porque la operación ya estaba iniciada o registrada.\n" +
            `🆔 Premio: ${id}\n` +
            "🔒 Estado sujeto a revisión. No se realizará un reenvío automático."
        });
      }

      let enviado;

      try {
        enviado = await sock.sendMessage(premio.ganadorId, {
          text:
            "📢 *TITANS TEAM · VERIFICACIÓN DE PREMIO*\n\n" +
            `🏆 Tu premio: ${premio.premio.nombre}\n` +
            `🆔 Referencia: ${premio.id}\n\n` +
            "🔐 Tu código privado de verificación es:\n\n" +
            `*${codigo}*\n\n` +
            "⏳ Este código vence en 10 minutos.\n" +
            "🔒 Tienes un máximo de 5 intentos.\n\n" +
            "Envía el código en este chat privado para continuar con el registro de tus datos.\n\n" +
            "⚠️ No compartas este código con otras personas."
        });
      } catch (error) {
        await marcarIncierto(id, mensajeId, idDesafio);
        codigo = null;

        return sock.sendMessage(from, {
          text:
            "⚠️ WhatsApp no permitió confirmar el resultado del envío.\n" +
            `🆔 Premio: ${id}\n` +
            "🔒 Estado: INCIERTO.\n" +
            "No se reenviará automáticamente. Requiere revisión manual."
        });
      }

      const mensajeSalidaId = enviado?.key?.id;

      if (
        typeof mensajeSalidaId !== "string" ||
        !mensajeSalidaId.trim() ||
        mensajeSalidaId.length > 200
      ) {
        await marcarIncierto(id, mensajeId, idDesafio);
        codigo = null;

        return sock.sendMessage(from, {
          text:
            "⚠️ El envío no devolvió un identificador verificable de WhatsApp.\n" +
            `🆔 Premio: ${id}\n` +
            "🔒 Estado: INCIERTO.\n" +
            "No se reenviará automáticamente. Requiere revisión manual."
        });
      }

      try {
        const confirmado = await entrega.confirmarEnvioCodigoVerificacion(
          id,
          mensajeId,
          mensajeSalidaId,
          idDesafio
        );

        if (
          confirmado?.duplicada ||
          confirmado?.resultado?.confirmado !== true
        ) {
          throw new Error("La confirmación del envío no fue nueva y verificable.");
        }
      } catch (error) {
        await marcarIncierto(id, mensajeId, idDesafio);
        codigo = null;

        return sock.sendMessage(from, {
          text:
            "⚠️ WhatsApp devolvió un ID de mensaje, pero no se pudo confirmar el envío en el registro.\n" +
            `🆔 Premio: ${id}\n` +
            "🔒 Estado sujeto a revisión manual. No se realizará otro envío."
        });
      }

      codigo = null;

      return sock.sendMessage(from, {
        text:
          "╔══ 🔐 TITANS TEAM · CÓDIGO EMITIDO ══╗\n\n" +
          `🆔 Premio: ${id}\n` +
          `🏆 Ganador: ${premio.ganadorNombre}\n` +
          "📨 Código enviado al chat privado del ganador.\n" +
          "⏳ Vigencia: 10 minutos.\n" +
          "🔒 Estado: ENVIADO y registrado.\n\n" +
          "El código no se ha publicado en este grupo."
      });
    } catch (error) {
      codigo = null;

      console.error(
        "TitansB | Error al emitir código de premio:",
        error.message
      );

      return sock.sendMessage(from, {
        text:
          "❌ No se pudo completar la emisión del código.\n" +
          `🆔 Premio: ${id}\n` +
          "Verifica el registro y el estado del desafío antes de intentar otra operación."
      });
    }
  }
};
