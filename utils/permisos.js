const SUPER_ADMINS = [
    "239526316363896@lid"
];

// ==========================================
// 🛡️ JERARQUÍA DE STAFF
// ==========================================

const JERARQUIA = {
    usuario: 1,
    ayudante: 2,
    justicia: 2,
    moderador: 3,
    supermoderador: 4,
    adminglobal: 5,
    fundador: 6,
    superadmin: 7
};

// ==========================================
// 🏆 JERARQUÍA DE EQUIPOS
// ==========================================

const JERARQUIA_EQUIPO = {
    miembro: 1,
    sublider: 2,
    lider: 3
};

// ==========================================
// 👑 SUPER ADMIN
// ==========================================

function esSuperAdmin(id) {
    return SUPER_ADMINS.includes(id);
}

// ==========================================
// 🏆 ROLES DE EQUIPO
// ==========================================

// Normaliza IDs de WhatsApp para comparar
// @lid y @s.whatsapp.net como el mismo usuario.
function normalizarID(id) {
    if (!id || typeof id !== "string") return id;

    return id
        .replace("@s.whatsapp.net", "@lid")
        .replace("@g.us", "");
}

function mismosIDs(a, b) {
    return normalizarID(a) === normalizarID(b);
}

function esLider(equipo, id) {
    return !!(
        equipo &&
        equipo.lider &&
        mismosIDs(equipo.lider, id)
    );
}

function esSubLider(equipo, id) {
    return !!(
        equipo &&
        Array.isArray(equipo.subLideres) &&
        equipo.subLideres.some(
            miembro => mismosIDs(miembro, id)
        )
    );
}

function esMiembro(equipo, id) {
    return !!(
        equipo &&
        Array.isArray(equipo.miembros) &&
        equipo.miembros.some(
            miembro => mismosIDs(miembro, id)
        )
    );
}

// ==========================================
// 🛡️ PERMISOS DE STAFF
// ==========================================

function tienePermiso(rolUsuario, permisosComando = ["usuario"]) {

    if (!Array.isArray(permisosComando)) {
        permisosComando = [permisosComando];
    }

    // 👤 Todo rol de staff conserva acceso a los comandos base.
    // ⚖️ Justicia obtiene "usuario", pero NO hereda automáticamente
    // permisos de Moderador.
    if (permisosComando.includes("usuario")) {
        if (
            rolUsuario === "usuario" ||
            rolUsuario === "ayudante" ||
            rolUsuario === "justicia" ||
            rolUsuario === "moderador" ||
            rolUsuario === "supermoderador" ||
            rolUsuario === "adminglobal" ||
            rolUsuario === "fundador" ||
            rolUsuario === "superadmin" ||
            rolUsuario === "admin"
        ) {
            return true;
        }
    }

    // ⚖️ Justicia conserva permisos específicos propios.
    if (
        rolUsuario === "justicia" &&
        permisosComando.includes("justicia")
    ) {
        return true;
    }

    // 🛡️ Administración operativa.
    // Admin de WhatsApp, Admin Global, Fundador y SuperAdmin
    // pueden utilizar comandos marcados como "admin".
    if (
        permisosComando.includes("admin") &&
        (
            rolUsuario === "admin" ||
            rolUsuario === "adminglobal" ||
            rolUsuario === "fundador" ||
            rolUsuario === "superadmin"
        )
    ) {
        return true;
    }

    const nivelUsuario = JERARQUIA[rolUsuario] || 0;

    for (const permiso of permisosComando) {

        // Los permisos de equipo NO se comparan
        // contra la jerarquía de Staff.
        if (JERARQUIA_EQUIPO[permiso]) {
            continue;
        }

        const nivelNecesario = JERARQUIA[permiso] || 0;

        if (
            nivelNecesario > 0 &&
            nivelUsuario >= nivelNecesario
        ) {
            return true;
        }
    }

    return false;
}

// ==========================================
// 🏆 PERMISOS DE EQUIPO
// ==========================================

function tienePermisoEquipo(equipo, id, permisosComando = []) {

    if (!equipo) return false;

    if (!Array.isArray(permisosComando)) {
        permisosComando = [permisosComando];
    }

    let rolEquipo = null;

    if (esLider(equipo, id)) {
        rolEquipo = "lider";
    } else if (esSubLider(equipo, id)) {
        rolEquipo = "sublider";
    } else if (esMiembro(equipo, id)) {
        rolEquipo = "miembro";
    }

    if (!rolEquipo) return false;

    const nivelUsuario = JERARQUIA_EQUIPO[rolEquipo] || 0;

    for (const permiso of permisosComando) {

        const nivelNecesario =
            JERARQUIA_EQUIPO[permiso] || 0;

        if (
            nivelNecesario > 0 &&
            nivelUsuario >= nivelNecesario
        ) {
            return true;
        }
    }

    return false;
}

module.exports = {
    SUPER_ADMINS,

    JERARQUIA,
    JERARQUIA_EQUIPO,

    esSuperAdmin,

    esLider,
    esSubLider,
    esMiembro,

    tienePermiso,
    tienePermisoEquipo
};
