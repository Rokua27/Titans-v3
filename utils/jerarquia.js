const {
    esFundador,
    esAdmin,
    esSuperMod,
    esModerador,
    esAyudante,
    esJusticia
} = require("./moderacion");

const { esSuperAdmin } = require("./permisos");

// ==========================================
// 🛡️ JERARQUÍA OFICIAL DE MODERACIÓN
// ==========================================
//
// 6 = SuperAdmin
// 5 = Fundador
// 4 = Administrador Global
// 3 = Super Moderador
// 2 = Moderador
// 1 = Ayudante
// 0 = Usuario
//
// Un rango superior puede sancionar solamente
// a rangos inferiores.
//
// ==========================================

function obtenerNivel(id) {

    if (!id) return 0;

    // 👑 SuperAdmin
    if (esSuperAdmin(id)) {
        return 6;
    }

    // 👑 Fundador
    if (esFundador(id)) {
        return 5;
    }

    // 🛡️ Administrador Global
    if (esAdmin(id)) {
        return 4;
    }

    // ⚔️ Super Moderador
    if (esSuperMod(id)) {
        return 3;
    }

    // ⚖️ Justicia
    if (esJusticia(id)) {
        return 2;
    }

    // 🛡️ Moderador
    if (esModerador(id)) {
        return 2;
    }

    // 🎖️ Ayudante
    if (esAyudante(id)) {
        return 1;
    }

    // 🙋 Usuario
    return 0;
}


// ==========================================
// ⚖️ JUSTICIA — AUTORIZACIÓN ESPECIAL
// ==========================================
// Justicia puede sancionar únicamente usuarios
// que no pertenezcan al Staff administrativo.
//
// NO puede sancionar:
// Fundador
// Administrador Global
// Super Moderador
// Moderador
// Ayudante
// SuperAdmin

function puedeSancionarJusticia(moderador, objetivo) {
    if (!esJusticia(moderador)) return false;

    if (
        esSuperAdmin(objetivo) ||
        esFundador(objetivo) ||
        esAdmin(objetivo) ||
        esSuperMod(objetivo) ||
        esModerador(objetivo) ||
        esAyudante(objetivo)
    ) {
        return false;
    }

    return true;
}

// ==========================================
// ⚔️ PUEDE SANCIONAR
// ==========================================

function puedeSancionar(moderador, objetivo) {

    const nivelModerador = obtenerNivel(moderador);
    const nivelObjetivo = obtenerNivel(objetivo);

    // Debe tener realmente un rango de Staff
    if (nivelModerador <= 0) {
        return false;
    }

    // Nunca puede sancionar a alguien
    // de igual o mayor jerarquía.
    return nivelModerador > nivelObjetivo;
}

module.exports = {
    obtenerNivel,
    puedeSancionar,
    puedeSancionarJusticia
};
