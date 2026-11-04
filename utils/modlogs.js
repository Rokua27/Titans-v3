const { leerJSON, guardarJSON } = require("./database");

const ARCHIVO = "modlogs.json";

function obtenerLogs() {

    return leerJSON(ARCHIVO) || [];

}

function guardarLogs(logs) {

    guardarJSON(ARCHIVO, logs);

}

function registrarAccion({

    accion,
    usuario,
    moderador,
    motivo,
    grupo

}) {

const datos = {
    accion,
    usuario,
    moderador,
    motivo,
    grupo
};

    const logs = obtenerLogs();

    logs.push({

        id: Date.now(),

        accion,

        usuario,

        moderador,

        motivo,

        grupo,

        fecha: new Date().toISOString()

    });

    guardarLogs(logs);

// ======================================
// 📊 ESTADÍSTICAS DEL STAFF
// ======================================

const estadisticas = leerJSON("staffstats.json") || {};

if (!estadisticas[datos.moderador]) {

    estadisticas[datos.moderador] = {

        warns: 0,
        mutes: 0,
        kicks: 0,
        bans: 0

    };

}

switch (datos.accion) {

    case "warn":
        estadisticas[datos.moderador].warns++;
        break;

    case "mute":
        estadisticas[datos.moderador].mutes++;
        break;

    case "kick":
        estadisticas[datos.moderador].kicks++;
        break;

    case "ban":
        estadisticas[datos.moderador].bans++;
        break;

}

guardarJSON("staffstats.json", estadisticas);

}

function obtenerHistorialUsuario(usuario) {

    return obtenerLogs().filter(log => log.usuario === usuario);

}

// ======================================
// 🔎 ÚLTIMA ACCIÓN DE MODERACIÓN
// ======================================

function obtenerUltimaAccionUsuario(usuario, grupo) {

    const logs = obtenerLogs();

    const filtrados = logs.filter(log =>
        log.usuario === usuario &&
        (!grupo || log.grupo === grupo)
    );

    if (filtrados.length === 0) {
        return null;
    }

    return filtrados[filtrados.length - 1];

}

module.exports = {
    registrarAccion,
    obtenerHistorialUsuario,
    obtenerUltimaAccionUsuario,
    obtenerLogs
};
