const fs = require("fs");
const path = require("path");

const {
    leerJSON,
    guardarJSON
} = require("../database");

const ARCHIVO_ESTADO = "monitor_estado.json";

const ESTADO_POR_DEFECTO = {
    iniciado: false,
    whatsapp: "DESCONOCIDO",
    ultimoCambio: null,
    ultimoError: null,
    incidentes: 0
};

function cargarEstado() {
    try {
        const guardado = leerJSON(ARCHIVO_ESTADO);

        if (!guardado || typeof guardado !== "object") {
            return { ...ESTADO_POR_DEFECTO };
        }

        return {
            ...ESTADO_POR_DEFECTO,
            ...guardado
        };

    } catch (error) {

        console.error(
            "⚠️ MONITOR | Error cargando estado persistente:",
            error.message
        );

        return { ...ESTADO_POR_DEFECTO };
    }
}

const estado = cargarEstado();

function obtenerEstado() {
    return { ...estado };
}

function persistirEstado() {
    try {

        guardarJSON(
            ARCHIVO_ESTADO,
            estado
        );

        return true;

    } catch (error) {

        console.error(
            "⚠️ MONITOR | Error persistiendo estado:",
            error.message
        );

        return false;
    }
}

function actualizarEstado(cambios = {}) {

    Object.assign(
        estado,
        cambios
    );

    persistirEstado();

    return obtenerEstado();
}

module.exports = {
    obtenerEstado,
    actualizarEstado
};
