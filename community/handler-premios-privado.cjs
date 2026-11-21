"use strict";

function crearManejadorPremiosPrivado(opciones = {}) {
  const entrega = opciones.entrega;
  const esIdentidadAdmitida = opciones.esIdentidadAdmitida;
  const procesarCola = opciones.procesarCola;

  if (!entrega || typeof esIdentidadAdmitida !== "function") {
    throw new Error("Faltan dependencias del manejador privado de premios.");
  }

  const metodos = [
    "obtenerPremiosPendientesDatos",
    "obtenerCapturaCompletadaPorMensaje",
    "obtenerPremio",
    "validarCodigoPendiente",
    "registrarPlayerId",
    "registrarServidor"
  ];

  for (const metodo of metodos) {
    if (typeof entrega[metodo] !== "function") {
      throw new Error("Falta el método del servicio: " + metodo);
    }
  }

  async function responder(sock, identidad, contenido) {
    await sock.sendMessage(identidad, {
      text:
        "📢 *TITANS TEAM · VERIFICACIÓN DE PREMIOS*\n\n" +
        contenido +
        "\n\n🛡️ *Sistema de Entregas Titans Team*"
    });
  }

  function validarMensaje(sock, from, texto, msg) {
    return Boolean(
      sock &&
      typeof sock.sendMessage === "function" &&
      typeof from === "string" &&
      msg &&
      msg.key &&
      msg.key.remoteJid === from &&
      msg.key.fromMe !== true &&
      typeof msg.key.id === "string" &&
      msg.key.id.trim() &&
      msg.key.id.length <= 200 &&
      !from.endsWith("@g.us") &&
      esIdentidadAdmitida(from) &&
      typeof texto === "string" &&
      texto.trim()
    );
  }

  async function buscarCapturaActiva(identidad) {
    const pendientes = await entrega.obtenerPremiosPendientesDatos(identidad);

    if (!Array.isArray(pendientes)) {
      throw new Error("La consulta de premios pendientes devolvió un formato inválido.");
    }

    const capturas = [];

    for (const pendiente of pendientes) {
      if (!pendiente || pendiente.capturaActiva !== true) continue;

      const premio = await entrega.obtenerPremio(pendiente.id);

      if (
        premio.ganadorId !== identidad ||
        premio.chatPrivado !== identidad ||
        premio.estado !== "PENDIENTE_DATOS" ||
        !premio.capturaDatos ||
        !["PLAYER_ID", "SERVIDOR"].includes(premio.capturaDatos.paso)
      ) {
        continue;
      }

      capturas.push({
        id: premio.id,
        paso: premio.capturaDatos.paso,
        ultimoMensajeId: premio.capturaDatos.ultimoMensajeId || null
      });
    }

    if (capturas.length > 1) {
      throw new Error("Hay varias capturas activas para esta identidad. Se requiere revisión administrativa.");
    }

    return capturas[0] || null;
  }

  async function manejar(sock, from, texto, msg) {
    if (!validarMensaje(sock, from, texto, msg)) {
      return { atendido: false };
    }

    const respuesta = texto.trim();

    // Los comandos continúan hacia el sistema normal de comandos.
    if (respuesta.startsWith("!")) {
      return { atendido: false };
    }

    // Reconoce el mismo mensaje de servidor aunque el premio ya
    // haya salido de PENDIENTE_DATOS y esté DATOS_RECIBIDOS.
    try {
      const completada = await entrega.obtenerCapturaCompletadaPorMensaje(
        from,
        msg.key.id
      );

      if (completada) {
        return {
          atendido: true,
          motivo: "mensaje_duplicado",
          premioId: completada.id
        };
      }
    } catch (error) {
      await responder(
        sock,
        from,
        "No pude verificar de forma segura si tu mensaje ya fue procesado. No lo envíes nuevamente; la administración deberá revisar el estado."
      );

      return {
        atendido: true,
        motivo: "error_consulta_duplicado"
      };
    }

    let captura;

    try {
      captura = await buscarCapturaActiva(from);
    } catch (error) {
      await responder(
        sock,
        from,
        "No pude consultar tu proceso de entrega de forma segura. No envíes más datos por ahora; la administración deberá revisar el estado."
      );

      return {
        atendido: true,
        motivo: "error_consulta_captura"
      };
    }

    // Si ya existe una captura verificada, el mensaje pertenece
    // exclusivamente al paso que indique el registro persistido.
    if (captura) {
      // Un mensaje ya procesado no puede avanzar al siguiente paso.
      if (captura.ultimoMensajeId === msg.key.id) {
        return {
          atendido: true,
          motivo: "mensaje_duplicado",
          premioId: captura.id
        };
      }

      if (captura.paso === "PLAYER_ID") {
        if (!/^\d{5,20}$/.test(respuesta)) {
          await responder(
            sock,
            from,
            "El Player ID debe contener entre 5 y 20 dígitos. Envíalo nuevamente."
          );

          return { atendido: true, motivo: "player_id_invalido" };
        }

        try {
          const resultado = await entrega.registrarPlayerId(
            captura.id,
            from,
            respuesta,
            msg.key.id
          );

          if (resultado?.duplicada === true) {
            return {
              atendido: true,
              motivo: "mensaje_duplicado",
              premioId: captura.id
            };
          }

          await responder(
            sock,
            from,
            "✅ Player ID recibido.\n\nAhora envía únicamente tu número de servidor (entre 1 y 10 dígitos)."
          );

          return {
            atendido: true,
            motivo: "player_id_recibido",
            premioId: captura.id
          };
        } catch (error) {
          await responder(
            sock,
            from,
            "No pude registrar el Player ID de forma segura. La administración deberá revisar el proceso."
          );

          return { atendido: true, motivo: "error_player_id" };
        }
      }

      if (captura.paso === "SERVIDOR") {
        if (!/^\d{1,10}$/.test(respuesta)) {
          await responder(
            sock,
            from,
            "El servidor debe contener entre 1 y 10 dígitos. Envíalo nuevamente."
          );

          return { atendido: true, motivo: "servidor_invalido" };
        }

        try {
          const resultado = await entrega.registrarServidor(
            captura.id,
            from,
            respuesta,
            msg.key.id
          );

          if (resultado?.duplicada === true) {
            return {
              atendido: true,
              motivo: "mensaje_duplicado",
              premioId: captura.id
            };
          }

          const premio = await entrega.obtenerPremio(captura.id);

          if (
            premio.ganadorId !== from ||
            premio.chatPrivado !== from ||
            premio.estado !== "DATOS_RECIBIDOS" ||
            premio.capturaDatos?.paso !== "COMPLETADO"
          ) {
            throw new Error("No se pudo confirmar la captura completa.");
          }

          // La captura ya quedó confirmada en la transacción.
          // Un fallo al despertar la cola no revierte ni invalida esos datos.
          if (typeof procesarCola === "function") {
            try {
              await procesarCola();
            } catch (error) {
              console.error(
                "TitansB | No se pudo despertar la cola de entregas:",
                error.message
              );
            }
          }

          await responder(
            sock,
            from,
            "✅ Tus datos fueron recibidos y asociados a tu premio.\n\nLa administración verificará la entrega. Te avisaremos cuando esté confirmada."
          );

          return {
            atendido: true,
            motivo: "datos_completos",
            premioId: captura.id,
            datosCompletos: true,
            duplicada: resultado?.duplicada === true
          };
        } catch (error) {
          await responder(
            sock,
            from,
            "No pude registrar el servidor de forma segura. La administración deberá revisar el proceso."
          );

          return { atendido: true, motivo: "error_servidor" };
        }
      }
    }

    // Sin captura activa, solo los mensajes de ocho dígitos
    // pueden intentar validar un código pendiente.
    if (!/^\d{8}$/.test(respuesta)) {
      return { atendido: false };
    }

    try {
      const validacion = await entrega.validarCodigoPendiente(
        from,
        respuesta,
        msg.key.id
      );

      if (validacion?.duplicada === true) {
        return {
          atendido: true,
          motivo: "mensaje_duplicado"
        };
      }

      const resultado = validacion?.resultado;

      if (resultado?.valido === true) {
        if (resultado.premioId) {
          const premio = await entrega.obtenerPremio(resultado.premioId);

          if (
            premio.ganadorId !== from ||
            premio.chatPrivado !== from ||
            premio.capturaDatos?.paso !== "PLAYER_ID"
          ) {
            throw new Error("La identidad o el estado de captura no coincide.");
          }
        }

        await responder(
          sock,
          from,
          "🔐 Código verificado correctamente.\n\nAhora envía tu *Player ID* de Mobile Legends (entre 5 y 20 dígitos)."
        );

        return {
          atendido: true,
          motivo: "codigo_verificado",
          premioId: resultado.premioId
        };
      }

      if (resultado?.valido === false) {
        const motivo = resultado.motivo;

        if (motivo === "incorrecto") {
          await responder(
            sock,
            from,
            "❌ Código incorrecto.\n\nIntentos restantes: *" +
            resultado.intentosRestantes +
            "*."
          );
        } else if (motivo === "bloqueado") {
          await responder(
            sock,
            from,
            "🔒 Se agotaron los intentos permitidos. La verificación quedó bloqueada y la administración deberá revisarla."
          );
        } else {
          await responder(
            sock,
            from,
            "⏱️ El código expiró. La administración deberá emitir uno nuevo."
          );
        }

        return {
          atendido: true,
          motivo: "codigo_" + (motivo || "rechazado")
        };
      }

      throw new Error("La respuesta del servicio de verificación no es válida.");
    } catch (error) {
      if (error.message === "No tienes un código de verificación activo.") {
        return { atendido: false, motivo: "sin_codigo_activo" };
      }

      if (error.message === "El código de verificación ha expirado.") {
        await responder(
          sock,
          from,
          "⏱️ Tu código expiró. La administración deberá emitir uno nuevo."
        );

        return { atendido: true, motivo: "codigo_expirado" };
      }

      await responder(
        sock,
        from,
        "No pude verificar el código de forma segura. No envíes más datos; la administración deberá revisar el proceso."
      );

      return { atendido: true, motivo: "error_verificacion" };
    }
  }

  return manejar;
}

module.exports = {
  crearManejadorPremiosPrivado
};
