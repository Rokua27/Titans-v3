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
        text: "⛔ *TITANS TEAM · ACCESO RESTRINGIDO*\n\n🔐 Solo un SuperAdmin autorizado puede emitir códigos de premios."
      });
    }

    if (!Array.isArray(args) || args.length !== 1) {
      return sock.sendMessage(from, {
        text:
          "⚠️ *TITANS TEAM · COMANDO INCORRECTO*\n\n" +
          "╔══ 🔐 EMISIÓN DE CÓDIGO ══╗\n" +
          "📌 Formato correcto:\n" +
          "!emitircodigopremio ID_PREMIO\n" +
          "╚══════════════════════╝\n\n" +
          "🔒 Uso exclusivo de SuperAdmin."
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
        text: "⛔ *TITANS TEAM · SOLICITUD NO IDENTIFICADA*\n\n🔒 No fue posible verificar la solicitud de premio.\n🚫 No se emitió ningún código."
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
            "⚠️ *TITANS TEAM · SOLICITUD DUPLICADA*\n\n" +
            "╔══ 🔐 PROTECCIÓN DE PREMIOS ══╗\n" +
            `🆔 Referencia: ${id}\n` +
            "📋 Esta solicitud ya fue procesada o registrada.\n" +
            "🚫 No se generó ni se reenvió otro código.\n" +
            "╚══════════════════════════╝"
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
            "⛔ *TITANS TEAM · OPERACIÓN BLOQUEADA*\n\n" +
            "╔══ 🔐 SEGURIDAD DE PREMIOS ══╗\n" +
            `🆔 Referencia: ${id}\n` +
            "⚠️ La operación ya estaba iniciada o registrada.\n" +
            "🔒 Estado sujeto a revisión.\n" +
            "🚫 No se enviará ni reenviará el código automáticamente.\n" +
            "╚══════════════════════════╝"
        });
      }

      let enviado;

      try {
        enviado = await sock.sendMessage(premio.ganadorId, {
          text:
            "📢 *TITANS TEAM · VERIFICACIÓN DE PREMIO* 👑\n\n" +
            "╔══ 🔐 CÓDIGO PRIVADO ══╗\n" +
            `🏆 Premio: ${premio.premio.nombre}\n` +
            `🆔 Referencia: ${premio.id}\n` +
            "╚══════════════════════╝\n\n" +
            "🔑 Tu código de verificación es:\n\n" +
            `      *${codigo}*\n\n` +
            "⏳ Vigencia: 10 minutos.\n" +
            "🔒 Intentos permitidos: máximo 5.\n\n" +
            "📩 Envía este código en este mismo chat privado para continuar con el registro de tus datos.\n\n" +
            "⚠️ No compartas este código con nadie. Es personal y confidencial.\n\n" +
            "🏆LIGA TITANS TEAM - TITANSB MIEMBRO VIRTUAL 🤖"
        });
      } catch (error) {
        await marcarIncierto(id, mensajeId, idDesafio);
        codigo = null;

        return sock.sendMessage(from, {
          text:
            "⚠️ *TITANS TEAM · ENVÍO NO CONFIRMADO*\n\n" +
            "╔══ 🔐 REVISIÓN DE SEGURIDAD ══╗\n" +
            `🆔 Referencia: ${id}\n` +
            "⚠️ WhatsApp no permitió confirmar el resultado del envío.\n" +
            "🔒 Estado: INCIERTO.\n" +
            "🚫 No se realizará un reenvío automático.\n" +
            "🛡️ Requiere revisión manual antes de otra acción.\n" +
            "╚══════════════════════════╝"
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
            "⚠️ *TITANS TEAM · IDENTIFICADOR NO VERIFICADO*\n\n" +
            "╔══ 🔐 REVISIÓN DE SEGURIDAD ══╗\n" +
            `🆔 Referencia: ${id}\n` +
            "⚠️ WhatsApp no devolvió un identificador verificable del mensaje.\n" +
            "🔒 Estado: INCIERTO.\n" +
            "🚫 No se realizará un reenvío automático.\n" +
            "🛡️ Requiere revisión manual antes de otra acción.\n" +
            "╚══════════════════════════╝"
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
            "⛔ *TITANS TEAM · CONFIRMACIÓN PENDIENTE*\n\n" +
            "╔══ 🔐 INTEGRIDAD DEL REGISTRO ══╗\n" +
            `🆔 Referencia: ${id}\n` +
            "⚠️ WhatsApp devolvió un identificador, pero el registro interno no confirmó el envío.\n" +
            "🔒 Estado: INCIERTO.\n" +
            "🚫 No se realizará otro envío.\n" +
            "🛡️ Requiere revisión manual.\n" +
            "╚══════════════════════════╝"
        });
      }

      codigo = null;

      return sock.sendMessage(from, {
        text:
          "📢 *TITANS TEAM · CÓDIGO EMITIDO* 👑\n\n" +
          "╔══ 🔐 REGISTRO DE PREMIO ══╗\n" +
          `🆔 Referencia: ${id}\n` +
          `🏆 Ganador: ${premio.ganadorNombre}\n` +
          "📨 Código enviado al chat privado del ganador.\n" +
          "⏳ Vigencia: 10 minutos.\n" +
          "🔒 Estado: ENVIADO Y REGISTRADO.\n" +
          "╚══════════════════════════╝\n\n" +
          "🔐 El código es privado y no se ha publicado en este grupo.\n\n" +
          "🏆LIGA TITANS TEAM - TITANSB MIEMBRO VIRTUAL 🤖"
      });
    } catch (error) {
      codigo = null;

      console.error(
        "TitansB | Error al emitir código de premio:",
        error.message
      );

      return sock.sendMessage(from, {
        text:
          "⛔ *TITANS TEAM · EMISIÓN NO COMPLETADA*\n\n" +
          "╔══ 🔐 REVISIÓN DE PREMIO ══╗\n" +
          `🆔 Referencia: ${id}\n` +
          "⚠️ No se pudo completar la emisión del código.\n" +
          "🔒 Verifica el registro y el estado del desafío.\n" +
          "🚫 No repitas la operación sin revisar su estado.\n" +
          "╚══════════════════════════╝"
      });
    }
  }
};
