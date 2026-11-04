const { leerJSON } = require("../database");

const CONFIG_COMUNICACION = "comunicacion.json";

function cargarConfiguracion() {
    const config = leerJSON(CONFIG_COMUNICACION) || {};

    return {
        origen: config.origen || {},
        destinos: config.destinos || {}
    };
}

function esGrupoWhatsApp(id) {
    return typeof id === "string" && id.endsWith("@g.us");
}

function obtenerDestino(nombre) {
    const config = cargarConfiguracion();
    const id = config.destinos?.[nombre];

    if (!esGrupoWhatsApp(id)) {
        return null;
    }

    return id;
}

function obtenerDestinos(nombres = []) {
    if (!Array.isArray(nombres)) {
        return [];
    }

    return [...new Set(
        nombres
            .map(nombre => obtenerDestino(nombre))
            .filter(Boolean)
    )];
}

function obtenerOrigen(nombre = "gestiones") {
    const config = cargarConfiguracion();
    const id = config.origen?.[nombre];

    return esGrupoWhatsApp(id) ? id : null;
}

module.exports = {
    cargarConfiguracion,
    esGrupoWhatsApp,
    obtenerDestino,
    obtenerDestinos,
    obtenerOrigen
};
