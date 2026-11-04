"use strict";

const almacenamiento = require("./registration-storage");
const perfilesOficiales = require("../utils/titansb/perfilesMiembros");

const PREGUNTAS = Object.freeze([
  {
    campo: "nombre",
    mensaje:
      "👤 *REGISTRO TITANS · 1/5*\n\n" +
      "¿Cuál es tu nombre o nombre de jugador?"
  },
  {
    campo: "pais",
    mensaje:
      "🌎 *REGISTRO TITANS · 2/5*\n\n" +
      "¿De qué país eres?"
  },
  {
    campo: "nombreJuego",
    mensaje:
      "🎮 *REGISTRO TITANS · 3/5*\n\n" +
      "¿Cuál es tu alias competitivo en Mobile Legends?"
  },
  {
    campo: "rolJuego",
    mensaje:
      "⚔️ *REGISTRO TITANS · 4/5*\n\n" +
      "¿Cuáles son tus roles competitivos?\n\n" +
      "Puedes elegir varios: EXP, ROAM, JUNGLA, MID o GOLD.\n" +
      "Escríbelos separados por comas. Ejemplo: EXP, MID, ROAM."
  },
  {
    campo: "rango",
    mensaje:
      "🏆 *REGISTRO TITANS · 5/5*\n\n" +
      "¿Cuál es tu rango actual en el juego?\n\n" +
      "Opciones: Guerrero, Élite, Maestro, Gran Maestro, " +
      "Épico, Leyenda, Mítico, Honor Mítico, Gloria Mítica o Inmortal."
  }
]);

function validarIdentidadExacta(chatJid) {
  if (
    typeof chatJid !== "string" ||
    chatJid !== chatJid.trim() ||
    !chatJid ||
    !(
      chatJid.endsWith("@lid") ||
      chatJid.endsWith("@s.whatsapp.net")
    )
  ) {
    throw new TypeError(
      "Se requiere una identidad privada exacta admitida por WhatsApp."
    );
  }

  return chatJid;
}

function obtenerPregunta(indice) {
  if (!Number.isInteger(indice) || indice < 0) {
    return null;
  }

  return PREGUNTAS[indice] || null;
}

function iniciarRegistro(chatJid, opciones = {}) {
  const identidad = validarIdentidadExacta(chatJid);
  const existente = almacenamiento.obtener(identidad);

  if (existente) {
    return {
      iniciado: false,
      motivo: "registro_pendiente",
      registro: existente,
      pregunta: obtenerPregunta(existente.paso)
    };
  }

  const registro = {
    version: 1,
    identidadExacta: identidad,
    chatPrivado: opciones.chatPrivado || identidad,
    paso: 0,
    datos: {},
    iniciadoEn: new Date().toISOString()
  };

  almacenamiento.guardar(identidad, registro);

  return {
    iniciado: true,
    registro,
    pregunta: obtenerPregunta(0)
  };
}

function validarRespuesta(campo, respuesta) {
  if (typeof respuesta !== "string") {
    return {
      valida: false,
      error: "Envía tu respuesta como texto."
    };
  }

  const valor = respuesta.trim();

  if (!valor) {
    return {
      valida: false,
      error: "La respuesta no puede estar vacía."
    };
  }

  if (valor.length > 80) {
    return {
      valida: false,
      error: "La respuesta no puede superar los 80 caracteres."
    };
  }

  if (campo === "rolJuego") {
    try {
      const validacion = perfilesOficiales.validarPerfilCompetitivo({
        rolJuego: valor
      });

      if (!validacion.valido) {
        return {
          valida: false,
          error: validacion.errores.join("\n")
        };
      }

      return {
        valida: true,
        valor: perfilesOficiales.normalizarRol(valor)
      };
    } catch {
      return {
        valida: false,
        error: "Rol no válido. Revisa las opciones indicadas."
      };
    }
  }

  if (campo === "rango") {
    const rangos = perfilesOficiales.obtenerRangosDisponibles();
    const coincidencia = rangos.find(
      rango => rango.toLocaleLowerCase("es") ===
        valor.toLocaleLowerCase("es")
    );

    if (!coincidencia) {
      return {
        valida: false,
        error: `Rango no válido. Opciones: ${rangos.join(", ")}.`
      };
    }

    return {
      valida: true,
      valor: coincidencia
    };
  }

  return {
    valida: true,
    valor
  };
}

function guardarRespuesta(chatJid, respuesta) {
  const identidad = validarIdentidadExacta(chatJid);
  const registro = almacenamiento.obtener(identidad);

  if (!registro) {
    return {
      guardada: false,
      motivo: "sin_registro_pendiente"
    };
  }

  const pregunta = obtenerPregunta(registro.paso);

  if (!pregunta) {
    return {
      guardada: false,
      motivo: "registro_en_estado_invalido"
    };
  }

  const validacion = validarRespuesta(
    pregunta.campo,
    respuesta
  );

  if (!validacion.valida) {
    return {
      guardada: false,
      motivo: "respuesta_invalida",
      error: validacion.error,
      pregunta
    };
  }

  const actualizado = {
    ...registro,
    datos: {
      ...registro.datos,
      [pregunta.campo]: validacion.valor
    },
    paso: registro.paso + 1,
    actualizadoEn: new Date().toISOString()
  };

  almacenamiento.guardar(identidad, actualizado);

  const siguiente = obtenerPregunta(actualizado.paso);

  if (siguiente) {
    return {
      guardada: true,
      completado: false,
      registro: actualizado,
      pregunta: siguiente
    };
  }

  return {
    guardada: true,
    completado: true,
    registro: actualizado,
    datos: { ...actualizado.datos }
  };
}

function obtenerRegistroPendiente(chatJid) {
  const identidad = validarIdentidadExacta(chatJid);
  return almacenamiento.obtener(identidad);
}

function cancelarRegistro(chatJid) {
  const identidad = validarIdentidadExacta(chatJid);
  return almacenamiento.eliminar(identidad);
}

function validarDatosCompletos(datos) {
  const campos = PREGUNTAS.map(pregunta => pregunta.campo);
  const errores = [];

  for (const campo of campos) {
    const valor = datos && datos[campo];

    if (
      typeof valor !== "string" ||
      !valor.trim() ||
      valor.length > 80
    ) {
      errores.push(`Campo incompleto o inválido: ${campo}`);
    }
  }

  if (errores.length === 0) {
    const validacion = perfilesOficiales.validarPerfilCompetitivo({
      rolJuego: datos.rolJuego,
      rango: datos.rango
    });

    errores.push(...validacion.errores);
  }

  return {
    valido: errores.length === 0,
    errores
  };
}

module.exports = {
  PREGUNTAS,
  iniciarRegistro,
  obtenerPregunta,
  validarRespuesta,
  guardarRespuesta,
  obtenerRegistroPendiente,
  cancelarRegistro,
  validarDatosCompletos
};
