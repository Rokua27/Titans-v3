const { leerJSON, guardarJSON } = require("./database");

// ==========================================
// Cooldown de XP
// ==========================================

const cooldownXP = {};
const TIEMPO_XP = 60000; // 60 segundos

// ==========================================
// IDENTIDAD CANÓNICA
// ==========================================

function normalizarIdentidad(id) {
    if (!id) return null;

    return String(id)
        .trim()
        .replace(/@s\.whatsapp\.net$/i, "")
        .replace(/@lid$/i, "")
        .replace(/@c\.us$/i, "");
}

function obtenerCandidatosIdentidad(id) {
    const base = normalizarIdentidad(id);

    if (!base) return [];

    return [
        `${base}@lid`,
        `${base}@s.whatsapp.net`,
        `${base}@c.us`,
        base
    ];
}

function valorUsuarioUtil(valor) {
    return (
        valor !== undefined &&
        valor !== null &&
        (
            typeof valor !== "string" ||
            valor.trim() !== ""
        )
    );
}

function puntajeUsuario(usuario) {
    if (!usuario || typeof usuario !== "object") {
        return -1;
    }

    return [
        "nombre",
        "xp",
        "nivel",
        "coins",
        "mensajes",
        "daily",
        "racha"
    ].filter(campo => valorUsuarioUtil(usuario[campo])).length;
}

function resolverClaveUsuario(id, usuarios = null) {
    const datos = usuarios || leerJSON("usuarios.json") || {};
    const base = normalizarIdentidad(id);

    if (!base) {
        return null;
    }

    const candidatos = obtenerCandidatosIdentidad(id);

    const encontrados = candidatos
        .filter(clave => datos[clave])
        .map(clave => ({
            clave,
            puntaje: puntajeUsuario(datos[clave])
        }))
        .sort((a, b) => {

            if (b.puntaje !== a.puntaje) {
                return b.puntaje - a.puntaje;
            }

            // En empate, @lid es la identidad preferida.
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

    return encontrados.length
        ? encontrados[0].clave
        : `${base}@lid`;
}

// ==========================================
// Obtener usuario
// ==========================================

function obtenerUsuario(id) {

    const usuarios = leerJSON("usuarios.json") || {};

    const claveCanonica =
        resolverClaveUsuario(id, usuarios);

    if (!claveCanonica) {
        return null;
    }

    if (!usuarios[claveCanonica]) {

        usuarios[claveCanonica] = {
            xp: 0,
            nivel: 1,
            coins: 0,
            mensajes: 0,
            daily: 0,
            racha: 0,
            nombre: ""
        };

        guardarJSON("usuarios.json", usuarios);
    }

    return usuarios[claveCanonica];
}

// ==========================================
// Guardar usuario
// ==========================================

function guardarUsuario(id, data) {

    const usuarios = leerJSON("usuarios.json") || {};

    const claveCanonica =
        resolverClaveUsuario(id, usuarios);

    if (!claveCanonica) {
        return;
    }

    usuarios[claveCanonica] = data;

    return guardarJSON(
        "usuarios.json",
        usuarios
    );
}

// ==========================================
// Actualizar nombre
// ==========================================

function actualizarNombre(id, nombre) {

    if (!nombre) return;

    const usuario = obtenerUsuario(id);

    if (!usuario) return;

    // Si el nombre no cambió, no guardar.
    if (usuario.nombre === nombre) {
        return;
    }

    usuario.nombre = nombre;

    guardarUsuario(id, usuario);
}

// ==========================================
// Obtener nombre
// ==========================================

function obtenerNombre(id) {

    const usuario = obtenerUsuario(id);

    if (
        usuario &&
        usuario.nombre &&
        usuario.nombre.trim() !== ""
    ) {
        return usuario.nombre;
    }

    return normalizarIdentidad(id) || "";
}

// ==========================================
// Obtener nombre compatible
// ==========================================

function obtenerNombreUsuario(id) {

    const usuarios = leerJSON("usuarios.json") || {};

    const claveCanonica =
        resolverClaveUsuario(id, usuarios);

    const usuario =
        claveCanonica
            ? usuarios[claveCanonica]
            : null;

    if (
        usuario &&
        usuario.nombre &&
        usuario.nombre.trim() !== ""
    ) {
        return usuario.nombre;
    }

    return normalizarIdentidad(id) || "";
}

// ==========================================
// XP necesaria
// ==========================================

function xpNecesaria(nivel) {

    return nivel * 100;

}

// ==========================================
// Agregar XP
// ==========================================

async function agregarXP(id, cantidad = 5) {

    const ahora = Date.now();

    if (
        cooldownXP[id] &&
        ahora - cooldownXP[id] < TIEMPO_XP
    ) {

        return {
            usuario: obtenerUsuario(id),
            subioNivel: false
        };

    }

    cooldownXP[id] = ahora;

    const usuario = obtenerUsuario(id);

    usuario.xp += cantidad;
    usuario.mensajes += 1;

    let subioNivel = false;

    while (usuario.xp >= xpNecesaria(usuario.nivel)) {

        usuario.xp -= xpNecesaria(usuario.nivel);

        usuario.nivel++;

        usuario.coins += 100;

        subioNivel = true;

    }

await guardarUsuario(id, usuario);

    return {
        usuario,
        subioNivel
    };

}

// ==========================================
// Formatear número
// ==========================================

function formatearNumero(jid) {

    return jid
        .replace("@s.whatsapp.net", "")
        .replace("@lid", "");

}

// ==========================================

module.exports = {

    normalizarIdentidad,
    obtenerCandidatosIdentidad,
    resolverClaveUsuario,

    obtenerUsuario,
    guardarUsuario,

    actualizarNombre,

    obtenerNombre,
    obtenerNombreUsuario,

    agregarXP,
    xpNecesaria,

    formatearNumero

};
