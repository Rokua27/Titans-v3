const fs = require("fs");
const path = require("path");

const PERFILES_PATH = path.join(
    __dirname,
    "../../database/perfiles_miembros.json"
);

const EQUIPOS_PATH = path.join(
    __dirname,
    "../../database/equipos.json"
);

function cargarJSON(ruta, defecto = {}) {
    try {
        if (!fs.existsSync(ruta)) {
            return defecto;
        }

        return JSON.parse(
            fs.readFileSync(ruta, "utf8")
        );
    } catch (error) {
        console.error(
            `❌ TitansB | Error leyendo ${ruta}:`,
            error.message
        );

        return defecto;
    }
}

function guardarJSON(ruta, datos) {
    fs.writeFileSync(
        ruta,
        JSON.stringify(datos, null, 2),
        "utf8"
    );
}

function normalizarId(id) {
    if (!id) return null;

    return String(id)
        .trim()
        .replace(/@s\.whatsapp\.net$/i, "")
        .replace(/@lid$/i, "")
        .replace(/@c\.us$/i, "");
}

function obtenerEquipoDeMiembro(usuarioId) {
    const equiposData = cargarJSON(EQUIPOS_PATH, {});
    const equipos = Array.isArray(equiposData)
        ? equiposData
        : Object.values(equiposData);

    const idNormalizado = normalizarId(usuarioId);

    if (!idNormalizado) {
        return null;
    }

    for (const equipo of equipos) {
        if (!equipo || !Array.isArray(equipo.miembros)) {
            continue;
        }

        const pertenece = equipo.miembros.some(
            miembroId =>
                normalizarId(miembroId) === idNormalizado
        );

        if (pertenece) {
            return equipo;
        }
    }

    return null;
}

function puntajePerfilMiembro(perfil) {
    if (!perfil || typeof perfil !== "object") {
        return -1;
    }

    const camposPerfil = [
        "nombre",
        "nombreJuego",
        "pais",
        "rolJuego",
        "rango"
    ];

    return camposPerfil.filter(campo =>
        typeof perfil[campo] === "string" &&
        perfil[campo].trim() !== ""
    ).length;
}

function obtenerCandidatosPerfil(usuarioId) {
    const baseId = normalizarId(usuarioId);

    if (!baseId) {
        return [];
    }

    return [
        usuarioId,
        `${baseId}@lid`,
        `${baseId}@s.whatsapp.net`,
        `${baseId}@c.us`,
        baseId
    ].filter(Boolean);
}

function resolverClavePerfil(usuarioId, perfiles = null) {

    const datos =
        perfiles || cargarJSON(PERFILES_PATH, {});

    const candidatos =
        obtenerCandidatosPerfil(usuarioId);

    if (!candidatos.length) {
        return null;
    }

    const encontrados = [];

    for (const candidato of candidatos) {

        const perfil = datos[candidato];

        if (!perfil || typeof perfil !== "object") {
            continue;
        }

        encontrados.push({
            clave: candidato,
            perfil,
            puntuacion: puntajePerfilMiembro(perfil)
        });
    }

    if (!encontrados.length) {
        const baseId = normalizarId(usuarioId);

        return baseId
            ? `${baseId}@lid`
            : null;
    }

    encontrados.sort((a, b) => {

        if (b.puntuacion !== a.puntuacion) {
            return b.puntuacion - a.puntuacion;
        }

        // Regla canónica de identidad:
        // en empate, @lid tiene prioridad.
        if (
            a.clave.endsWith("@lid") &&
            !b.clave.endsWith("@lid")
        ) {
            return -1;
        }

        if (
            b.clave.endsWith("@lid") &&
            !a.clave.endsWith("@lid")
        ) {
            return 1;
        }

        return 0;
    });

    return encontrados[0].clave;
}

function obtenerPerfilMiembro(usuarioId) {

    const perfiles =
        cargarJSON(PERFILES_PATH, {});

    const claveCanonica =
        resolverClavePerfil(usuarioId, perfiles);

    if (!claveCanonica) {
        return null;
    }

    const perfil = perfiles[claveCanonica];

    if (!perfil || typeof perfil !== "object") {
        return null;
    }

    const equipo =
        obtenerEquipoDeMiembro(usuarioId);

    return {
        ...perfil,
        equipo: equipo?.nombre || null,
        equipoEntidad: equipo || null,
        tieneEquipo: Boolean(equipo)
    };
}

function obtenerTodosLosPerfiles() {
    const perfiles = cargarJSON(PERFILES_PATH, {});

    return Object.entries(perfiles).map(
        ([usuarioId, perfil]) => {

            const equipo = obtenerEquipoDeMiembro(usuarioId);

            return {
                usuarioId,

                ...perfil,

                equipo: equipo?.nombre || null,

                equipoEntidad: equipo || null,

                tieneEquipo: Boolean(equipo)
            };
        }
    );
}

function normalizarRol(rol) {
    if (!rol) return "";

    // ============================================================
    // 🎯 SOPORTE PARA UNO O VARIOS ROLES
    // ============================================================

    const valores = Array.isArray(rol)
        ? rol
        : String(rol).split(",");

    const equivalencias = {
        "exp": "EXP",
        "exp lane": "EXP",
        "experiencia": "EXP",

        "jungla": "JUNGLA",
        "jungla/jg": "JUNGLA",
        "jg": "JUNGLA",
        "jungle": "JUNGLA",

        "mid": "MID",
        "mid lane": "MID",
        "medio": "MID",

        "gold": "GOLD",
        "gold lane": "GOLD",
        "oro": "GOLD",

        "roam": "ROAM",
        "roamer": "ROAM",
        "roaming": "ROAM",
        "soporte": "ROAM"
    };

    const rolesValidos = [
        "EXP",
        "ROAM",
        "JUNGLA",
        "MID",
        "GOLD"
    ];

    const resultado = [];

    for (const valor of valores) {
        const limpio = String(valor || "")
            .trim()
            .toLowerCase();

        if (!limpio) continue;

        const normalizado =
            equivalencias[limpio] ||
            limpio.toUpperCase();

        if (!rolesValidos.includes(normalizado)) {
            throw new Error(
                `Rol no válido: ${valor}. Roles disponibles: EXP, ROAM, JUNGLA, MID, GOLD`
            );
        }

        if (!resultado.includes(normalizado)) {
            resultado.push(normalizado);
        }
    }

    return resultado.join(",");
}
function obtenerRolesDisponibles() {
    return [
        "EXP",
        "JUNGLA",
        "MID",
        "GOLD",
        "ROAM"
    ];
}

function obtenerRangosDisponibles() {
    return [
        "Guerrero",
        "Élite",
        "Maestro",
        "Gran Maestro",
        "Épico",
        "Leyenda",
        "Mítico",
        "Honor Mítico",
        "Gloria Mítica",
        "Inmortal"
    ];
}

function actualizarPerfilMiembro(usuarioId, cambios = {}) {
    if (!usuarioId) {
        throw new Error(
            "usuarioId es obligatorio"
        );
    }

    const perfiles = cargarJSON(PERFILES_PATH, {});

    let claveCanonica =
        resolverClavePerfil(usuarioId, perfiles);

    /*
     * C6.7 — CREACIÓN DEL REGISTRO OFICIAL
     *
     * Si todavía no existe un perfil para esta identidad,
     * la identidad normalizada se convierte en la nueva
     * clave canónica del registro.
     */
    if (!claveCanonica) {
        claveCanonica = normalizarId(usuarioId);

        if (!claveCanonica) {
            throw new Error(
                "No se pudo normalizar la identidad del miembro"
            );
        }
    }

    let perfilCanonico =
        perfiles[claveCanonica];

    if (
        !perfilCanonico ||
        typeof perfilCanonico !== "object"
    ) {
        perfilCanonico = {
            nombre: "",
            nombreJuego: "",
            pais: "",
            rolJuego: "",
            rango: "",
            equipo: null
        };
    }

    const camposPermitidos = [
        "nombre",
        "nombreJuego",
        "pais",
        "rolJuego",
        "rango"
    ];

    for (const campo of camposPermitidos) {
        if (
            Object.prototype.hasOwnProperty.call(
                cambios,
                campo
            )
        ) {
            perfilCanonico[campo] =
                campo === "rolJuego"
                    ? normalizarRol(cambios[campo])
                    : String(cambios[campo] ?? "").trim();
        }
    }

    /*
     * IMPORTANTE:
     * El equipo NO se escribe aquí.
     * Se resuelve siempre desde equipos.json.
     */

    perfiles[claveCanonica] = perfilCanonico;

    guardarJSON(PERFILES_PATH, perfiles);

    return obtenerPerfilMiembro(usuarioId);
}

function validarPerfilCompetitivo(cambios = {}) {
    const errores = [];

    if (
        Object.prototype.hasOwnProperty.call(cambios, "rolJuego") &&
        cambios.rolJuego
    ) {
        try {
            const rolesNormalizados = normalizarRol(cambios.rolJuego)
                .split(",")
                .filter(Boolean);

            const rolesDisponibles = obtenerRolesDisponibles();

            const rolesInvalidos = rolesNormalizados.filter(
                rol => !rolesDisponibles.includes(rol)
            );

            if (rolesInvalidos.length > 0) {
                errores.push(
                    `Rol(es) no válido(s): ${rolesInvalidos.join(", ")}. ` +
                    `Usa: ${rolesDisponibles.join(", ")}`
                );
            }
        } catch (error) {
            errores.push(error.message);
        }
    }

    if (
        Object.prototype.hasOwnProperty.call(cambios, "rango") &&
        cambios.rango
    ) {
        const rango = String(cambios.rango).trim().toLowerCase();

        const rangos = obtenerRangosDisponibles().map(
            x => String(x).toLowerCase()
        );

        if (!rangos.includes(rango)) {
            errores.push(
                `Rango no válido. Usa: ${obtenerRangosDisponibles().join(", ")}`
            );
        }
    }

    return {
        valido: errores.length === 0,
        errores
    };
}

function registrarPerfilMiembro(usuarioId, datos = {}) {
    if (!usuarioId) {
        throw new Error("usuarioId es obligatorio");
    }

    const validacion = validarPerfilCompetitivo(datos);

    if (!validacion.valido) {
        throw new Error(validacion.errores.join(" | "));
    }

    return actualizarPerfilMiembro(usuarioId, {
        nombre: datos.nombre,
        nombreJuego: datos.nombreJuego,
        pais: datos.pais,
        rolJuego: datos.rolJuego,
        rango: datos.rango
    });
}

function buscarMiembrosPorRol(rol) {
    if (!rol) return [];

    const objetivo = String(rol)
        .trim()
        .toLowerCase();

    return obtenerTodosLosPerfiles().filter(perfil =>
        String(perfil.rolJuego || "")
            .toLowerCase()
            .includes(objetivo)
    );
}

function obtenerMiembrosSinEquipo() {
    return obtenerTodosLosPerfiles()
        .filter(perfil => !perfil.tieneEquipo);
}

function buscarMiembrosDisponiblesPorRol(rol) {
    return buscarMiembrosPorRol(rol)
        .filter(perfil => !perfil.tieneEquipo);
}

function buscarMiembrosPorPais(pais) {
    if (!pais) return [];

    const objetivo = String(pais)
        .trim()
        .toLowerCase();

    return obtenerTodosLosPerfiles().filter(perfil =>
        String(perfil.pais || "")
            .toLowerCase()
            .includes(objetivo)
    );
}

module.exports = {
    cargarJSON,

    puntajePerfilMiembro,
    obtenerCandidatosPerfil,
    resolverClavePerfil,
    guardarJSON,
    normalizarId,
    obtenerEquipoDeMiembro,
    obtenerPerfilMiembro,
    obtenerTodosLosPerfiles,
    actualizarPerfilMiembro,
    registrarPerfilMiembro,
    validarPerfilCompetitivo,
    normalizarRol,
    obtenerRolesDisponibles,
    obtenerRangosDisponibles,
    buscarMiembrosPorRol,
    obtenerMiembrosSinEquipo,
    buscarMiembrosDisponiblesPorRol,
    buscarMiembrosPorPais
};
