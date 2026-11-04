"use strict";

const fs = require("fs");
const path = require("path");

const registroPredeterminado = require("./registration");
const { crearFinalizador } = require("./registration-finalizer");

const RUTA_PERFILES = path.join(
  __dirname,
  "..",
  "database",
  "perfiles_miembros.json"
);

function esIdentidadAdmitida(identidad) {
  return (
    typeof identidad === "string" &&
    identidad === identidad.trim() &&
    /^[^@\s]+@(?:lid|s\.whatsapp\.net)$/.test(identidad)
  );
}

function mensajeTitansB(contenido) {
  return (
    "📢 *TITANSB · REGISTRO COMPETITIVO*\n\n" +
    contenido +
    "\n\n🛡️ *Sistema de Moderación Titans Team*"
  );
}

function crearManejadorRegistroPrivado(opciones = {}) {
  const registro = opciones.registro || registroPredeterminado;
  const rutaPerfiles = path.resolve(
    opciones.rutaPerfiles || RUTA_PERFILES
  );

  const finalizador = opciones.finalizador ||
    crearFinalizador({ rutaPerfiles });

  async function responder(sock, destino, contenido) {
    await sock.sendMessage(destino, {
      text: mensajeTitansB(contenido)
    });
  }

  async function manejar(sock, from, texto) {
    if (
      typeof from !== "string" ||
      from.endsWith("@g.us") ||
      !esIdentidadAdmitida(from) ||
      typeof texto !== "string" ||
      !texto.trim()
    ) {
      return { atendido: false };
    }

    let pendiente;

    try {
      pendiente = registro.obtenerRegistroPendiente(from);
    } catch {
      await responder(
        sock,
        from,
        "No pude consultar tu registro de forma segura. No envíes más respuestas por ahora; contacta con la administración."
      );

      return { atendido: true, motivo: "error_lectura" };
    }

    if (!pendiente) {
      return { atendido: false };
    }

    // No aceptar equivalencias entre identificadores ni
    // responder desde una identidad distinta a la registrada.
    if (
      pendiente.identidadExacta !== from ||
      pendiente.chatPrivado !== from
    ) {
      await responder(
        sock,
        from,
        "No puedo verificar que este chat corresponda exactamente al registro pendiente. La administración deberá verificar tu identidad."
      );

      return { atendido: true, motivo: "identidad_no_coincidente" };
    }

    const respuesta = texto.trim();

    if (respuesta.toLocaleLowerCase("es") === "cancelar") {
      try {
        registro.cancelarRegistro(from);

        await responder(
          sock,
          from,
          "Has cancelado el proceso de registro. Tu perfil competitivo oficial no fue modificado."
        );

        return { atendido: true, motivo: "cancelado" };
      } catch {
        await responder(
          sock,
          from,
          "No pude cancelar el proceso de forma segura. Contacta con la administración."
        );

        return { atendido: true, motivo: "error_cancelacion" };
      }
    }

    if (respuesta.startsWith("!")) {
      await responder(
        sock,
        from,
        "Tienes un registro pendiente. Responde la pregunta actual o escribe *cancelar* para detener el proceso."
      );

      return { atendido: true, motivo: "comando_durante_registro" };
    }

    const totalPreguntas = Array.isArray(registro.PREGUNTAS)
      ? registro.PREGUNTAS.length
      : 0;

    if (
      totalPreguntas < 1 ||
      !Number.isInteger(pendiente.paso) ||
      pendiente.paso < 0 ||
      pendiente.paso > totalPreguntas
    ) {
      await responder(
        sock,
        from,
        "El registro pendiente tiene un estado inválido. No guardaré más respuestas; la administración deberá revisarlo."
      );

      return { atendido: true, motivo: "estado_invalido" };
    }

    let resultado;

    if (pendiente.paso === totalPreguntas) {
      // Las respuestas ya están guardadas. No tratar el mensaje
      // actual como una sexta respuesta: reintentar la finalización.
      resultado = {
        guardada: true,
        completado: true,
        datos: pendiente.datos
      };
    } else {
      try {
        resultado = registro.guardarRespuesta(from, respuesta);
      } catch {
        await responder(
          sock,
          from,
          "No pude guardar tu respuesta de forma segura. Inténtalo de nuevo o contacta con la administración."
        );

        return { atendido: true, motivo: "error_respuesta" };
      }
    }

    if (!resultado || !resultado.guardada) {
      const detalle = resultado?.error ||
        "No pude aceptar esa respuesta.";

      let preguntaActual;

      try {
        preguntaActual = registro.obtenerPregunta(
          registro.obtenerRegistroPendiente(from)?.paso
        );
      } catch {
        preguntaActual = null;
      }

      await responder(
        sock,
        from,
        detalle +
          (preguntaActual
            ? "\n\n" + preguntaActual.mensaje
            : "\n\nEscribe *cancelar* o contacta con la administración.")
      );

      return { atendido: true, motivo: "respuesta_rechazada" };
    }

    if (!resultado.completado) {
      if (!resultado.pregunta) {
        await responder(
          sock,
          from,
          "El registro quedó en un estado que requiere revisión administrativa. No continuaré automáticamente."
        );

        return { atendido: true, motivo: "estado_invalido" };
      }

      await responder(
        sock,
        from,
        "✅ Respuesta guardada.\n\n" +
          resultado.pregunta.mensaje +
          "\n\nEscribe *cancelar* si deseas detener el proceso."
      );

      return { atendido: true, motivo: "siguiente_pregunta" };
    }

    // No permitir que el finalizador cree un archivo oficial
    // nuevo si el almacenamiento de perfiles no existe o falla.
    let perfiles;

    try {
      if (!fs.existsSync(rutaPerfiles)) {
        throw new Error("Almacenamiento oficial ausente.");
      }

      perfiles = JSON.parse(fs.readFileSync(rutaPerfiles, "utf8"));

      if (
        !perfiles ||
        typeof perfiles !== "object" ||
        Array.isArray(perfiles)
      ) {
        throw new Error("Almacenamiento oficial inválido.");
      }
    } catch {
      await responder(
        sock,
        from,
        "Tus respuestas fueron recibidas, pero no pude verificar el almacenamiento oficial. No se intentó crear el perfil. Conservaremos el registro pendiente para revisión administrativa."
      );

      return { atendido: true, motivo: "almacenamiento_no_disponible" };
    }

    let validacion;

    try {
      validacion = registro.validarDatosCompletos(resultado.datos);
    } catch {
      validacion = { valido: false };
    }

    if (!validacion?.valido) {
      await responder(
        sock,
        from,
        "No fue posible validar todos los datos del registro. El proceso requiere revisión administrativa; no se creará el perfil."
      );

      return { atendido: true, motivo: "datos_no_validos" };
    }

    let guardado;

    try {
      guardado = finalizador.finalizarRegistro(from, resultado.datos);
    } catch {
      guardado = {
        guardado: false,
        motivo: "error_interno"
      };
    }

    if (!guardado?.guardado) {
      const mensajes = {
        perfil_ya_existente:
          "Ya existe un perfil asociado a esta identidad. Contacta con la administración para revisarlo.",
        identidad_ambigua:
          "No es posible asociar tu identidad a un perfil sin una verificación administrativa.",
        guardado_ocupado:
          "El almacenamiento está ocupado por otra operación. Tus respuestas siguen pendientes; inténtalo más tarde.",
        archivo_oficial_ausente:
          "No se encuentra el archivo oficial de perfiles. Tus respuestas siguen pendientes y no se creará una base alternativa. La administración debe revisar el almacenamiento.",
        error_interno:
          "Ocurrió un error al guardar el perfil. El registro queda pendiente de revisión."
      };

      await responder(
        sock,
        from,
        mensajes[guardado?.motivo] ||
          "No se pudo completar el registro. Tus respuestas quedan pendientes para revisión administrativa."
      );

      return {
        atendido: true,
        motivo: guardado?.motivo || "guardado_fallido"
      };
    }

    try {
      registro.cancelarRegistro(from);
    } catch {
      await responder(
        sock,
        from,
        "Tu perfil competitivo se guardó correctamente, pero no pude limpiar el registro pendiente. La administración deberá revisar ese estado antes de iniciar otro registro."
      );

      return {
        atendido: true,
        motivo: "guardado_pendiente_de_limpieza"
      };
    }

    await responder(
      sock,
      from,
      "╔══════════════════════════════╗\n" +
        "║   ✅ REGISTRO COMPLETADO     ║\n" +
        "╚══════════════════════════════╝\n\n" +
        "Tu perfil competitivo fue registrado correctamente.\n\n" +
        "🎮 Alias: *" + resultado.datos.nombreJuego + "*\n" +
        "🌎 País: *" + resultado.datos.pais + "*\n" +
        "⚔️ Rol: *" + resultado.datos.rolJuego + "*\n" +
        "🏆 Rango: *" + resultado.datos.rango + "*\n\n" +
        "Tu registro ha finalizado."
    );

    return { atendido: true, motivo: "completado" };
  }

  return manejar;
}

const manejarRegistroPrivado = crearManejadorRegistroPrivado();

module.exports = {
  crearManejadorRegistroPrivado,
  manejarRegistroPrivado,
  esIdentidadAdmitida
};
