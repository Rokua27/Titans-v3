"use strict";

const fs = require("fs");
const path = require("path");
const perfilesOficiales = require("../utils/titansb/perfilesMiembros");

const RUTA_OFICIAL = path.join(
  __dirname,
  "..",
  "database",
  "perfiles_miembros.json"
);

function validarIdentidadExacta(identidad) {
  if (
    typeof identidad !== "string" ||
    !identidad ||
    identidad !== identidad.trim() ||
    !/^[^@\s]+@(?:lid|s\.whatsapp\.net)$/.test(identidad)
  ) {
    throw new TypeError("La identidad exacta no es válida.");
  }

  return identidad;
}

function normalizarBaseParaDetectarConflicto(identidad) {
  return identidad.replace(/@(s\.whatsapp\.net|lid|c\.us)$/, "");
}

function leerPerfiles(ruta) {
  if (!fs.existsSync(ruta)) {
    return {};
  }

  const contenido = JSON.parse(fs.readFileSync(ruta, "utf8"));

  if (
    contenido === null ||
    typeof contenido !== "object" ||
    Array.isArray(contenido)
  ) {
    throw new Error("La estructura del archivo oficial no es válida.");
  }

  return contenido;
}

function validarDatos(datos) {
  const campos = ["nombre", "pais", "nombreJuego", "rolJuego", "rango"];

  for (const campo of campos) {
    if (
      typeof datos?.[campo] !== "string" ||
      !datos[campo].trim() ||
      datos[campo].length > 80
    ) {
      return {
        valido: false,
        motivo: "datos_incompletos_o_invalidos"
      };
    }
  }

  const validacion = perfilesOficiales.validarPerfilCompetitivo({
    rolJuego: datos.rolJuego,
    rango: datos.rango
  });

  if (!validacion.valido) {
    return {
      valido: false,
      motivo: "rol_o_rango_invalido"
    };
  }

  let rolNormalizado;

  try {
    rolNormalizado = perfilesOficiales.normalizarRol(datos.rolJuego);
  } catch {
    return {
      valido: false,
      motivo: "rol_o_rango_invalido"
    };
  }

  return {
    valido: true,
    datos: {
      nombre: datos.nombre.trim(),
      pais: datos.pais.trim(),
      nombreJuego: datos.nombreJuego.trim(),
      rolJuego: rolNormalizado,
      rango: perfilesOficiales.obtenerRangosDisponibles().find(
        rango => rango.toLocaleLowerCase("es") ===
          datos.rango.trim().toLocaleLowerCase("es")
      )
    }
  };
}

function crearFinalizador(opciones = {}) {
  const ruta = path.resolve(opciones.rutaPerfiles || RUTA_OFICIAL);

  function finalizarRegistro(identidad, datos) {
    validarIdentidadExacta(identidad);

    const validacion = validarDatos(datos);

    if (!validacion.valido) {
      return {
        guardado: false,
        motivo: validacion.motivo
      };
    }

    // No crear ni reconstruir automáticamente la base oficial si falta.
    if (!fs.existsSync(ruta)) {
      return {
        guardado: false,
        motivo: "archivo_oficial_ausente"
      };
    }

    const directorio = path.dirname(ruta);
    fs.mkdirSync(directorio, { recursive: true });

    const rutaBloqueo = `${ruta}.registro-lock`;
    let descriptorBloqueo;

    try {
      descriptorBloqueo = fs.openSync(rutaBloqueo, "wx", 0o600);
    } catch (error) {
      if (error.code === "EEXIST") {
        return {
          guardado: false,
          motivo: "guardado_ocupado"
        };
      }
      throw error;
    }

    let temporal;

    try {
      const perfiles = leerPerfiles(ruta);
      const baseSolicitada =
        normalizarBaseParaDetectarConflicto(identidad);

      const clavesCoincidentes = Object.keys(perfiles).filter(
        clave =>
          normalizarBaseParaDetectarConflicto(clave) === baseSolicitada
      );

      if (clavesCoincidentes.length > 0) {
        return {
          guardado: false,
          motivo: clavesCoincidentes.includes(identidad)
            ? "perfil_ya_existente"
            : "identidad_ambigua"
        };
      }

      const perfil = {
        nombre: validacion.datos.nombre,
        nombreJuego: validacion.datos.nombreJuego,
        pais: validacion.datos.pais,
        rolJuego: validacion.datos.rolJuego,
        rango: validacion.datos.rango,
        equipo: null
      };

      const actualizados = {
        ...perfiles,
        [identidad]: perfil
      };

      temporal = `${ruta}.tmp-${process.pid}-${Date.now()}`;

      fs.writeFileSync(
        temporal,
        JSON.stringify(actualizados, null, 2),
        { encoding: "utf8", flag: "wx", mode: 0o600 }
      );

      // Comprobar que el temporal se puede leer antes de sustituir.
      const comprobacion = JSON.parse(
        fs.readFileSync(temporal, "utf8")
      );

      if (
        !comprobacion[identidad] ||
        comprobacion[identidad].nombreJuego !== perfil.nombreJuego
      ) {
        throw new Error("La comprobación del archivo temporal falló.");
      }

      fs.renameSync(temporal, ruta);
      temporal = null;

      return {
        guardado: true,
        motivo: "perfil_creado"
      };
    } finally {
      if (temporal && fs.existsSync(temporal)) {
        fs.unlinkSync(temporal);
      }

      if (descriptorBloqueo !== undefined) {
        fs.closeSync(descriptorBloqueo);
      }

      try {
        fs.unlinkSync(rutaBloqueo);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
  }

  return { finalizarRegistro };
}

module.exports = {
  crearFinalizador,
  validarIdentidadExacta
};
