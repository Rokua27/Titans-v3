"use strict";

const fs = require("fs");
const path = require("path");

const RUTA_POR_DEFECTO = path.join(
  __dirname,
  "..",
  "database",
  "registros_pendientes.json"
);

function crearAlmacenamiento(opciones = {}) {
  const rutaArchivo = path.resolve(
    opciones.rutaArchivo || RUTA_POR_DEFECTO
  );

  function leerTodos() {
    if (!fs.existsSync(rutaArchivo)) {
      return {};
    }

    let contenido;

    try {
      contenido = JSON.parse(
        fs.readFileSync(rutaArchivo, "utf8")
      );
    } catch {
      throw new Error(
        "El archivo de registros pendientes no es JSON válido."
      );
    }

    if (
      contenido === null ||
      typeof contenido !== "object" ||
      Array.isArray(contenido)
    ) {
      throw new Error(
        "La estructura de registros pendientes no es válida."
      );
    }

    return contenido;
  }

  function guardarTodos(registros) {
    if (
      registros === null ||
      typeof registros !== "object" ||
      Array.isArray(registros)
    ) {
      throw new TypeError(
        "Los registros deben ser un objeto."
      );
    }

    const directorio = path.dirname(rutaArchivo);
    fs.mkdirSync(directorio, { recursive: true });

    const temporal =
      `${rutaArchivo}.tmp-${process.pid}-${Date.now()}`;

    try {
      fs.writeFileSync(
        temporal,
        JSON.stringify(registros, null, 2),
        { encoding: "utf8", flag: "wx", mode: 0o600 }
      );

      fs.renameSync(temporal, rutaArchivo);
    } finally {
      if (fs.existsSync(temporal)) {
        fs.unlinkSync(temporal);
      }
    }
  }

  function validarClave(chatJid) {
    if (
      typeof chatJid !== "string" ||
      !chatJid.trim() ||
      chatJid !== chatJid.trim()
    ) {
      throw new TypeError(
        "Se requiere una clave de chat exacta y no vacía."
      );
    }

    return chatJid;
  }

  function obtener(chatJid) {
    const clave = validarClave(chatJid);
    const registros = leerTodos();

    if (!Object.prototype.hasOwnProperty.call(registros, clave)) {
      return null;
    }

    return registros[clave];
  }

  function guardar(chatJid, registro) {
    const clave = validarClave(chatJid);

    if (
      registro === null ||
      typeof registro !== "object" ||
      Array.isArray(registro)
    ) {
      throw new TypeError(
        "El registro pendiente debe ser un objeto."
      );
    }

    const registros = leerTodos();

    registros[clave] = registro;
    guardarTodos(registros);

    return registros[clave];
  }

  function eliminar(chatJid) {
    const clave = validarClave(chatJid);
    const registros = leerTodos();

    if (!Object.prototype.hasOwnProperty.call(registros, clave)) {
      return false;
    }

    delete registros[clave];
    guardarTodos(registros);

    return true;
  }

  return {
    leerTodos,
    guardarTodos,
    obtener,
    guardar,
    eliminar
  };
}

const almacenamiento = crearAlmacenamiento();

module.exports = {
  crearAlmacenamiento,
  leerTodos: almacenamiento.leerTodos,
  guardarTodos: almacenamiento.guardarTodos,
  obtener: almacenamiento.obtener,
  guardar: almacenamiento.guardar,
  eliminar: almacenamiento.eliminar
};
