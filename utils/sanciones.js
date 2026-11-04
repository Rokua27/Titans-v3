const { leerJSON, guardarJSON } = require("./database");

const ARCHIVO = "sanciones.json";

function obtenerDatos() {

    return leerJSON(ARCHIVO) || {};

}

function guardarDatos(datos) {

    guardarJSON(ARCHIVO, datos);

}

function obtenerUsuario(id) {

    const datos = obtenerDatos();

    if (!datos[id]) {

        datos[id] = {
            advertencias: [],
            mute: null,
            baneado: false
        };

        guardarDatos(datos);

    }

    return datos[id];

}

function agregarAdvertencia(id, staff, motivo) {

    const datos = obtenerDatos();

    if (!datos[id]) {

        datos[id] = {
            advertencias: [],
            mute: null,
            baneado: false
        };

    }

    datos[id].advertencias.push({

        staff,

        motivo,

        fecha: Date.now()

    });

    guardarDatos(datos);

    return datos[id];

}

function obtenerAdvertencias(id) {

    return obtenerUsuario(id).advertencias;

}

function limpiarAdvertencias(id) {

    const datos = obtenerDatos();

    if (!datos[id]) return;

    datos[id].advertencias = [];

    guardarDatos(datos);

}

// ==========================================
// Total de advertencias
// ==========================================

function totalAdvertencias(id) {

    return obtenerAdvertencias(id).length;

}

// ==========================================
// Debe aplicar Mute
// ==========================================

function debeMutear(id) {

    return totalAdvertencias(id) >= 3;

}

// ==========================================
// Debe expulsar
// ==========================================

function debeExpulsar(id) {

    return totalAdvertencias(id) >= 5;

}

// ==========================================
// Debe banear
// ==========================================

function debeBanear(id) {

    return totalAdvertencias(id) >= 7;

}

// ==========================================
// Aplicar Mute
// ==========================================

function aplicarMute(id, staff, minutos, motivo = "Sin motivo") {

    const datos = obtenerDatos();

    if (!datos[id]) {

        datos[id] = {
            advertencias: [],
            mute: null,
            baneado: false
        };

    }

    datos[id].mute = {

        staff,

        motivo,

        inicio: Date.now(),

        fin: Date.now() + (minutos * 60000)

    };

    guardarDatos(datos);

}

// ==========================================
// Quitar Mute
// ==========================================

function quitarMute(id) {

    const datos = obtenerDatos();

    if (!datos[id]) return;

    datos[id].mute = null;

    guardarDatos(datos);

}

// ==========================================
// Está muteado
// ==========================================

function estaMuteado(id) {

    const usuario = obtenerUsuario(id);

    if (!usuario.mute) return false;

    if (Date.now() >= usuario.mute.fin) {

        quitarMute(id);

        return false;

    }

    return true;

}

module.exports = {

totalAdvertencias,

debeMutear,

debeExpulsar,

debeBanear,

aplicarMute,

quitarMute,

estaMuteado,

    obtenerUsuario,

    agregarAdvertencia,

    obtenerAdvertencias,

    limpiarAdvertencias

};
