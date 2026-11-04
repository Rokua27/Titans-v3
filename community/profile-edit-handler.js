"use strict";

const fs = require("fs");
const path = require("path");

const perfilesOficiales = require("../utils/titansb/perfilesMiembros");

const RUTA_PERFILES = path.join(
  __dirname,
  "..",
  "database",
  "perfiles_miembros.json"
);

const sesiones = new Map();

const CAMPOS = Object.freeze({
  "1": {
    campo: "nombre",
    etiqueta: "Nombre o nombre de jugador"
  },
  "2": {
    campo: "pais",
    etiqueta: "País"
  },
  "3": {
    campo: "nombreJuego",
    etiqueta: "Alias de Mobile Legends"
  },
  "4": {
    campo: "rolJuego",
    etiqueta: "Rol competitivo"
  },
  "5": {
    campo: "rango",
    etiqueta: "Rango competitivo"
  }
});

function identidadAdmitida(id) {
  return (
    typeof id === "string" &&
    id === id.trim() &&
    /^[^@\s]+@(?:lid|s\.whatsapp\.net)$/.test(id)
  );
}

function baseIdentidad(id) {
  return id.replace(/@(s\.whatsapp\.net|lid)$/, "");
}

function mensaje(contenido) {
  return (
    "📢 *TITANSB · EDICIÓN DE PERFIL*\n\n" +
    contenido +
    "\n\n🛡️ *Sistema de Moderación Titans Team*"
  );
}

async function responder(sock, destino, contenido) {
  await sock.sendMessage(destino, {
    text: mensaje(contenido)
  });
}

function leerPerfiles() {
  if (!fs.existsSync(RUTA_PERFILES)) {
    throw new Error("archivo_oficial_ausente");
  }

  const datos = JSON.parse(
    fs.readFileSync(RUTA_PERFILES, "utf8")
  );

  if (
    !datos ||
    typeof datos !== "object" ||
    Array.isArray(datos)
  ) {
    throw new Error("estructura_oficial_invalida");
  }

  return datos;
}

function resolverPerfilExacto(identidad, perfiles) {
  const base = baseIdentidad(identidad);

  const coincidencias = Object.keys(perfiles).filter(
    clave => baseIdentidad(clave) === base
  );

  if (
    coincidencias.length !== 1 ||
    coincidencias[0] !== identidad
  ) {
    return {
      valido: false,
      motivo: coincidencias.length
        ? "identidad_ambigua"
        : "perfil_no_encontrado"
    };
  }

  const perfil = perfiles[identidad];

  if (
    !perfil ||
    typeof perfil !== "object" ||
    Array.isArray(perfil)
  ) {
    return {
      valido: false,
      motivo: "perfil_invalido"
    };
  }

  return {
    valido: true,
    perfil
  };
}

function validarValor(campo, entrada) {
  const valor = String(entrada || "").trim();

  if (!valor) {
    return {
      valido: false,
      error: "La respuesta no puede estar vacía."
    };
  }

  if (valor.length > 80) {
    return {
      valido: false,
      error: "El máximo permitido es de 80 caracteres."
    };
  }

  if (campo === "rolJuego") {
    try {
      const validacion = perfilesOficiales.validarPerfilCompetitivo({
        rolJuego: valor
      });

      if (!validacion.valido) {
        return {
          valido: false,
          error: validacion.errores.join("\n")
        };
      }

      return {
        valido: true,
        valor: perfilesOficiales.normalizarRol(valor)
      };
    } catch {
      return {
        valido: false,
        error: "El rol indicado no es válido."
      };
    }
  }

  if (campo === "rango") {
    const rangos =
      perfilesOficiales.obtenerRangosDisponibles();

    const coincidencia = rangos.find(
      rango =>
        rango.toLocaleLowerCase("es") ===
        valor.toLocaleLowerCase("es")
    );

    if (!coincidencia) {
      return {
        valido: false,
        error: "Rangos disponibles: " + rangos.join(", ")
      };
    }

    return {
      valido: true,
      valor: coincidencia
    };
  }

  return {
    valido: true,
    valor
  };
}

function guardarCambioExacto(identidad, campo, valor) {
  if (!identidadAdmitida(identidad)) {
    throw new Error("identidad_invalida");
  }

  const rutaLock = `${RUTA_PERFILES}.registro-lock`;
  let descriptor;
  let temporal;

  try {
    descriptor = fs.openSync(rutaLock, "wx", 0o600);
  } catch (error) {
    if (error.code === "EEXIST") {
      throw new Error("guardado_ocupado");
    }
    throw error;
  }

  try {
    const perfiles = leerPerfiles();

    const resultado = resolverPerfilExacto(
      identidad,
      perfiles
    );

    if (!resultado.valido) {
      throw new Error(resultado.motivo);
    }

    const camposPermitidos = [
      "nombre",
      "pais",
      "nombreJuego",
      "rolJuego",
      "rango"
    ];

    if (!camposPermitidos.includes(campo)) {
      throw new Error("campo_no_permitido");
    }

    const perfilActual = perfiles[identidad];

    const perfilActualizado = {
      ...perfilActual,
      [campo]: valor
    };

    const actualizados = {
      ...perfiles,
      [identidad]: perfilActualizado
    };

    temporal =
      `${RUTA_PERFILES}.tmp-edicion-${process.pid}-${Date.now()}`;

    fs.writeFileSync(
      temporal,
      JSON.stringify(actualizados, null, 2),
      {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600
      }
    );

    const comprobacion = JSON.parse(
      fs.readFileSync(temporal, "utf8")
    );

    if (
      !comprobacion[identidad] ||
      comprobacion[identidad][campo] !== valor
    ) {
      throw new Error("verificacion_temporal_fallida");
    }

    fs.renameSync(temporal, RUTA_PERFILES);
    temporal = null;

    return perfilActualizado;
  } finally {
    if (temporal && fs.existsSync(temporal)) {
      fs.unlinkSync(temporal);
    }

    if (descriptor !== undefined) {
      fs.closeSync(descriptor);
    }

    try {
      fs.unlinkSync(rutaLock);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

async function iniciarEdicion(sock, identidad) {
  if (!identidadAdmitida(identidad)) {
    return {
      iniciado: false,
      motivo: "identidad_invalida"
    };
  }

  try {
    const perfiles = leerPerfiles();

    const resultado = resolverPerfilExacto(
      identidad,
      perfiles
    );

    if (!resultado.valido) {
      await responder(
        sock,
        identidad,
        resultado.motivo === "identidad_ambigua"
          ? "Detecté más de una identidad asociada. Por seguridad, no modificaré ningún perfil. Contacta con la administración."
          : "No encontré un perfil competitivo exacto para tu identidad. Primero debes completar tu registro."
      );

      return {
        iniciado: false,
        motivo: resultado.motivo
      };
    }
  } catch (error) {
    await responder(
      sock,
      identidad,
      "No pude verificar la base oficial de perfiles. No se realizó ningún cambio. Contacta con la administración."
    );

    return {
      iniciado: false,
      motivo: error.message
    };
  }

  sesiones.set(identidad, {
    estado: "seleccionar",
    campo: null,
    valor: null
  });

  try {
    await responder(
      sock,
      identidad,
      "Vamos a actualizar tu perfil competitivo.\n\n" +
      "Selecciona el campo que deseas editar:\n\n" +
      "1️⃣ Nombre o nombre de jugador\n" +
      "2️⃣ País\n" +
      "3️⃣ Alias de Mobile Legends\n" +
      "4️⃣ Rol competitivo\n" +
      "5️⃣ Rango competitivo\n\n" +
      "Escribe el número correspondiente.\n" +
      "Escribe *cancelar* para salir."
    );
  } catch (error) {
    sesiones.delete(identidad);
    throw error;
  }

  return {
    iniciado: true
  };
}

async function manejarEdicionPrivada(sock, identidad, texto) {
  if (
    !identidadAdmitida(identidad) ||
    typeof texto !== "string" ||
    !texto.trim()
  ) {
    return {
      atendido: false
    };
  }

  const sesion = sesiones.get(identidad);

  if (!sesion) {
    return {
      atendido: false
    };
  }

  const respuesta = texto.trim();

  if (respuesta.toLocaleLowerCase("es") === "cancelar") {
    sesiones.delete(identidad);

    await responder(
      sock,
      identidad,
      "Has cancelado la edición. Tu perfil oficial permanece sin cambios."
    );

    return {
      atendido: true,
      motivo: "cancelado"
    };
  }

  if (respuesta.startsWith("!")) {
    await responder(
      sock,
      identidad,
      "Tienes una edición pendiente. Responde la pregunta actual o escribe *cancelar*."
    );

    return {
      atendido: true,
      motivo: "comando_durante_edicion"
    };
  }

  if (sesion.estado === "seleccionar") {
    const seleccion = CAMPOS[respuesta];

    if (!seleccion) {
      await responder(
        sock,
        identidad,
        "Selección incorrecta. Escribe un número del 1 al 5 o *cancelar*."
      );

      return {
        atendido: true,
        motivo: "seleccion_invalida"
      };
    }

    sesion.campo = seleccion.campo;
    sesion.etiqueta = seleccion.etiqueta;
    sesion.estado = "valor";

    let instrucciones = "";

    if (seleccion.campo === "rolJuego") {
      instrucciones =
        "\nPuedes indicar varios separados por comas." +
        "\nEjemplo: EXP, MID, ROAM." +
        "\nDisponibles: EXP, ROAM, JUNGLA, MID o GOLD.";
    }

    if (seleccion.campo === "rango") {
      instrucciones =
        "\nRangos: " +
        perfilesOficiales.obtenerRangosDisponibles().join(", ") +
        ".";
    }

    await responder(
      sock,
      identidad,
      "✏️ Escribe tu nuevo valor para:\n*" +
      seleccion.etiqueta +
      "*." +
      instrucciones
    );

    return {
      atendido: true,
      motivo: "campo_seleccionado"
    };
  }

  if (sesion.estado === "valor") {
    const validacion = validarValor(
      sesion.campo,
      respuesta
    );

    if (!validacion.valido) {
      await responder(
        sock,
        identidad,
        "❌ " + validacion.error +
        "\n\nInténtalo nuevamente o escribe *cancelar*."
      );

      return {
        atendido: true,
        motivo: "valor_invalido"
      };
    }

    sesion.valor = validacion.valor;
    sesion.estado = "confirmar";

    await responder(
      sock,
      identidad,
      "Confirma el cambio:\n\n" +
      "📌 Campo: *" + sesion.etiqueta + "*\n" +
      "📝 Nuevo valor: *" + sesion.valor + "*\n\n" +
      "Escribe *SI* para guardar o *NO* para descartarlo."
    );

    return {
      atendido: true,
      motivo: "confirmacion_pendiente"
    };
  }

  if (sesion.estado === "confirmar") {
    const decision = respuesta.toLocaleLowerCase("es");

    if (decision === "no") {
      sesiones.delete(identidad);

      await responder(
        sock,
        identidad,
        "Cambio descartado. Tu perfil oficial no fue modificado."
      );

      return {
        atendido: true,
        motivo: "descartado"
      };
    }

    if (decision !== "si" && decision !== "sí") {
      await responder(
        sock,
        identidad,
        "Responde *SI* para guardar o *NO* para descartar."
      );

      return {
        atendido: true,
        motivo: "confirmacion_invalida"
      };
    }

    try {
      const actualizado = guardarCambioExacto(
        identidad,
        sesion.campo,
        sesion.valor
      );

      sesiones.delete(identidad);

      await responder(
        sock,
        identidad,
        "🟢 *CAMBIO GUARDADO CORRECTAMENTE*\n\n" +
        "📌 Campo: *" + sesion.etiqueta + "*\n" +
        "📝 Nuevo valor: *" +
        actualizado[sesion.campo] +
        "*\n\n" +
        "Tu progreso, monedas, nivel, logros y equipo se conservaron."
      );

      return {
        atendido: true,
        motivo: "actualizado"
      };
    } catch (error) {
      sesiones.delete(identidad);

      await responder(
        sock,
        identidad,
        "No pude guardar el cambio de forma segura.\n\n" +
        "Motivo: *" + error.message + "*\n\n" +
        "No intentes repetirlo si la administración está revisando la base oficial."
      );

      return {
        atendido: true,
        motivo: "error_guardado"
      };
    }
  }

  sesiones.delete(identidad);

  await responder(
    sock,
    identidad,
    "La sesión de edición tenía un estado inválido. No se modificó tu perfil."
  );

  return {
    atendido: true,
    motivo: "estado_invalido"
  };
}

module.exports = {
  identidadAdmitida,
  iniciarEdicion,
  manejarEdicionPrivada,
  validarValor,
  resolverPerfilExacto
};
