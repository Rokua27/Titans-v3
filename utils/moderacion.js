const { leerJSON, guardarJSON } = require("./database");

const ARCHIVO = "moderadores.json";

function obtenerDatos() {

    return leerJSON(ARCHIVO) || {
        fundador: "",
        admins: [],
        supermods: [],
        moderadores: [],
        ayudantes: [],
        baneados: [],
        justicia: []
    };

}

function guardarDatos(datos) {

    guardarJSON(ARCHIVO, datos);

}

function normalizarID(id) {

    return id
        .replace("@s.whatsapp.net", "@lid")
        .replace("@g.us", "");

}

function esFundador(id) {

    const datos = obtenerDatos();

    return normalizarID(datos.fundador) === normalizarID(id);

}

function esAdmin(id) {

    const datos = obtenerDatos();

    return datos.admins
        .map(normalizarID)
        .includes(normalizarID(id));

}

function esSuperMod(id) {

    const datos = obtenerDatos();

    return datos.supermods
        .map(normalizarID)
        .includes(normalizarID(id));

}

function esModerador(id) {

    const datos = obtenerDatos();

    return datos.moderadores
        .map(normalizarID)
        .includes(normalizarID(id));

}

function esAyudante(id) {

    const datos = obtenerDatos();

    return datos.ayudantes
        .map(normalizarID)
        .includes(normalizarID(id));

}

function estaBaneado(id) {

    const datos = obtenerDatos();

    return datos.baneados
        .map(normalizarID)
        .includes(normalizarID(id));

}

function obtenerRango(id) {

    if (esFundador(id)) return "Fundador";

    if (esAdmin(id)) return "Administrador Global";

    if (esSuperMod(id)) return "Super Moderador";

    if (esModerador(id)) return "Moderador";

    if (esAyudante(id)) return "Ayudante";

    return "Usuario";

}


// ==========================================
// ⚖️ SISTEMA DE JUSTICIA
// ==========================================

function esJusticia(id) {
    const datos = obtenerDatos();
    datos.justicia ??= [];
    return datos.justicia
        .map(normalizarID)
        .includes(normalizarID(id));
}

function agregarJusticia(id) {
    const datos = obtenerDatos();
    datos.justicia ??= [];

    id = normalizarID(id);

    if (!datos.justicia.includes(id)) {
        datos.justicia.push(id);
        guardarDatos(datos);
    }

    return true;
}

function eliminarJusticia(id) {
    const datos = obtenerDatos();
    datos.justicia ??= [];

    id = normalizarID(id);

    datos.justicia = datos.justicia.filter(
        x => normalizarID(x) !== id
    );

    guardarDatos(datos);
    return true;
}

// ==========================================
// Asignar Fundador
// ==========================================

function asignarFundador(id) {

    const datos = obtenerDatos();

    datos.fundador = normalizarID(id);

    guardarDatos(datos);

    return true;

}

// ==========================================
// Agregar Administrador Global
// ==========================================

function agregarAdmin(id) {

    const datos = obtenerDatos();

    id = normalizarID(id);

    if (!datos.admins.includes(id)) {

        datos.admins.push(id);

        guardarDatos(datos);

    }

    return true;

}

// ==========================================
// Eliminar Administrador Global
// ==========================================

function eliminarAdmin(id) {

    const datos = obtenerDatos();

    id = normalizarID(id);

    datos.admins =
        datos.admins.filter(x => normalizarID(x) !== id);

    guardarDatos(datos);

    return true;

}

// ==========================================
// Agregar Super Moderador
// ==========================================

function agregarSuperMod(id) {

    const datos = obtenerDatos();

    id = normalizarID(id);

    if (!datos.supermods.includes(id)) {

        datos.supermods.push(id);

        guardarDatos(datos);

    }

    return true;

}

// ==========================================
// Eliminar Super Moderador
// ==========================================

function eliminarSuperMod(id) {

    const datos = obtenerDatos();

    id = normalizarID(id);

    datos.supermods =
        datos.supermods.filter(x => normalizarID(x) !== id);

    guardarDatos(datos);

    return true;

}

// ==========================================
// Agregar Moderador
// ==========================================

function agregarModerador(id) {

    const datos = obtenerDatos();

    id = normalizarID(id);

    if (!datos.moderadores.includes(id)) {

        datos.moderadores.push(id);

        guardarDatos(datos);

    }

    return true;

}

// ==========================================
// Eliminar Moderador
// ==========================================

function eliminarModerador(id) {

    const datos = obtenerDatos();

    id = normalizarID(id);

    datos.moderadores =
        datos.moderadores.filter(x => normalizarID(x) !== id);

    guardarDatos(datos);

    return true;

}

// ==========================================
// Agregar Ayudante
// ==========================================

function agregarAyudante(id) {

    const datos = obtenerDatos();

    id = normalizarID(id);

    if (!datos.ayudantes.includes(id)) {

        datos.ayudantes.push(id);

        guardarDatos(datos);

    }

    return true;

}

// ==========================================
// Eliminar Ayudante
// ==========================================

function eliminarAyudante(id) {

    const datos = obtenerDatos();

    id = normalizarID(id);

    datos.ayudantes =
        datos.ayudantes.filter(x => normalizarID(x) !== id);

    guardarDatos(datos);

    return true;

}

module.exports = {
    obtenerDatos,
    guardarDatos,
    esFundador,
    esAdmin,
    esSuperMod,
    esModerador,
    esAyudante,
    esJusticia,
    estaBaneado,
    obtenerRango,
    asignarFundador,
    agregarAdmin,
    eliminarAdmin,
    agregarSuperMod,
    eliminarSuperMod,
    agregarModerador,
    eliminarModerador,
    agregarAyudante,
    eliminarAyudante,
    agregarJusticia,
    eliminarJusticia
};
