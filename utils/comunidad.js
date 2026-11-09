const { leerJSON, guardarJSON } = require("./database");

// ==========================================
// CONFIGURACIÓN DEL SISTEMA DE XP
const TIEMPO_XP = 60000;
const XP_POR_MENSAJE = 5;
const MAX_XP_DIARIA = 100;
const ZONA_HORARIA_XP = "America/Bogota";
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

function obtenerFechaColombia(timestamp = Date.now()) {
    const partes = new Intl.DateTimeFormat('en-US', {
        timeZone: ZONA_HORARIA_XP,
        year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date(timestamp));
    const valores = Object.fromEntries(partes.map(p => [p.type, p.value]));
    return valores.year + '-' + valores.month + '-' + valores.day;
}

function xpNecesaria(nivel) {
    return nivel * 100;
}

// ==========================================
// Agregar XP
// ==========================================

async function agregarXP(id, cantidad = XP_POR_MENSAJE, opciones = {}) {
    const usuario = obtenerUsuario(id);
    if (!usuario) return { usuario: null, subioNivel: false, xpOtorgada: 0, nivelesGanados: 0, monedasNivel: 0, motivo: 'identidad_invalida' };
    const solicitada = Math.floor(Number(cantidad));
    if (!Number.isFinite(solicitada) || solicitada <= 0) return { usuario, subioNivel: false, xpOtorgada: 0, nivelesGanados: 0, monedasNivel: 0, motivo: 'cantidad_invalida' };
    const ahora = Number.isFinite(opciones.ahora) ? opciones.ahora : Date.now();
    const messageId = opciones.messageId ? String(opciones.messageId) : null;
    if (messageId && usuario.xpUltimoMensajeId === messageId) return { usuario, subioNivel: false, xpOtorgada: 0, nivelesGanados: 0, monedasNivel: 0, motivo: 'mensaje_duplicado' };
    const fechaHoy = obtenerFechaColombia(ahora);
    let xpDiariaActual = Math.max(0, Number(usuario.xpDiario) || 0);
    if (usuario.xpFechaColombia !== fechaHoy) xpDiariaActual = 0;
    const ultimaXP = Number(usuario.xpUltimoMensajeAt) || 0;
    if (ultimaXP > 0 && ahora - ultimaXP < TIEMPO_XP) return { usuario, subioNivel: false, xpOtorgada: 0, nivelesGanados: 0, monedasNivel: 0, motivo: 'cooldown' };
    const xpOtorgada = Math.min(solicitada, Math.max(0, MAX_XP_DIARIA - xpDiariaActual));
    if (xpOtorgada <= 0) return { usuario, subioNivel: false, xpOtorgada: 0, nivelesGanados: 0, monedasNivel: 0, motivo: 'limite_diario' };
    usuario.xp = Math.max(0, Number(usuario.xp) || 0) + xpOtorgada;
    usuario.nivel = Math.max(1, Number(usuario.nivel) || 1);
    usuario.coins = Math.max(0, Number(usuario.coins) || 0);
    usuario.mensajes = Math.max(0, Number(usuario.mensajes) || 0) + 1;
    usuario.xpFechaColombia = fechaHoy;
    usuario.xpDiario = xpDiariaActual + xpOtorgada;
    usuario.xpUltimoMensajeAt = ahora;
    if (messageId) usuario.xpUltimoMensajeId = messageId;
    let nivelesGanados = 0;
    while (usuario.xp >= xpNecesaria(usuario.nivel)) {
        usuario.xp -= xpNecesaria(usuario.nivel);
        usuario.nivel++;
        usuario.coins += 50;
        nivelesGanados++;
    }
    await guardarUsuario(id, usuario);
    return { usuario, subioNivel: nivelesGanados > 0, xpOtorgada, nivelesGanados, monedasNivel: nivelesGanados * 50, motivo: 'otorgada' };
}
// ==========================================
// Aplicar XP de recompensas especiales
// No consume el límite ni el cooldown de mensajes.
// No guarda el perfil: el comando que la utiliza
// debe guardar el usuario junto con sus recompensas.
// ==========================================

function aplicarXPRecompensa(usuario, cantidad) {
    if (!usuario || typeof usuario !== "object") {
        return {
            usuario: null,
            xpOtorgada: 0,
            nivelesGanados: 0,
            monedasNivel: 0,
            subioNivel: false,
            motivo: "usuario_invalido"
        };
    }

    const solicitada = Math.floor(Number(cantidad));

    if (!Number.isFinite(solicitada) || solicitada <= 0) {
        return {
            usuario,
            xpOtorgada: 0,
            nivelesGanados: 0,
            monedasNivel: 0,
            subioNivel: false,
            motivo: "cantidad_invalida"
        };
    }

    usuario.xp = Math.max(0, Number(usuario.xp) || 0);
    usuario.nivel = Math.max(1, Math.floor(Number(usuario.nivel) || 1));
    usuario.coins = Math.max(0, Number(usuario.coins) || 0);

    usuario.xp += solicitada;

    let nivelesGanados = 0;

    while (usuario.xp >= xpNecesaria(usuario.nivel)) {
        usuario.xp -= xpNecesaria(usuario.nivel);
        usuario.nivel++;
        usuario.coins += 50;
        nivelesGanados++;
    }

    return {
        usuario,
        xpOtorgada: solicitada,
        nivelesGanados,
        monedasNivel: nivelesGanados * 50,
        subioNivel: nivelesGanados > 0,
        motivo: "otorgada"
    };
}

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

    aplicarXPRecompensa,
    agregarXP,
    xpNecesaria,
    obtenerFechaColombia,

    formatearNumero

};
