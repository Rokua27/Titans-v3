const crypto = require("crypto");
const { leerJSON } = require("./database");

function obtenerGestorEconomia() {
    return require("./economiaCompartida").gestor;
}


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
        return {
            xp: 0,
            nivel: 1,
            coins: 0,
            mensajes: 0,
            daily: 0,
            racha: 0,
            nombre: ""
        };
    }

    return usuarios[claveCanonica];
}

// ==========================================
// Guardar usuario
// ==========================================

async function guardarUsuario(id, data) {
    if (!normalizarIdentidad(id) || !data || typeof data !== "object") {
        return null;
    }

    const transaccion = await obtenerGestorEconomia().ejecutar(
        "perfil-" + crypto.randomUUID(),
        async leer => {
            const usuarios = leer("usuarios.json") || {};
            const clave = resolverClaveUsuario(id, usuarios);
            if (!clave) {
                return { cambios: { "usuarios.json": usuarios }, resultado: null };
            }

            usuarios[clave] = data;
            return {
                cambios: { "usuarios.json": usuarios },
                resultado: usuarios[clave]
            };
        }
    );

    return transaccion.resultado;
}

// ==========================================
// Actualizar nombre
// ==========================================

async function actualizarNombre(id, nombre) {
    if (!normalizarIdentidad(id) || typeof nombre !== "string" || !nombre.trim()) {
        return null;
    }

    const transaccion = await obtenerGestorEconomia().ejecutar(
        "nombre-" + crypto.randomUUID(),
        async leer => {
            const usuarios = leer("usuarios.json") || {};
            const clave = resolverClaveUsuario(id, usuarios);
            if (!clave) {
                return { cambios: { "usuarios.json": usuarios }, resultado: null };
            }

            const usuario = usuarios[clave] || {
                xp: 0, nivel: 1, coins: 0, mensajes: 0,
                daily: 0, racha: 0, nombre: ""
            };

            if (usuario.nombre !== nombre) {
                usuario.nombre = nombre;
                usuarios[clave] = usuario;
            }

            return {
                cambios: { "usuarios.json": usuarios },
                resultado: usuario
            };
        }
    );

    return transaccion.resultado;
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
    if (!normalizarIdentidad(id)) {
        return {
            usuario: null, subioNivel: false, xpOtorgada: 0,
            nivelesGanados: 0, monedasNivel: 0, motivo: "identidad_invalida"
        };
    }

    const solicitada = Math.floor(Number(cantidad));
    if (!Number.isFinite(solicitada) || solicitada <= 0) {
        return {
            usuario: obtenerUsuario(id), subioNivel: false, xpOtorgada: 0,
            nivelesGanados: 0, monedasNivel: 0, motivo: "cantidad_invalida"
        };
    }

    const ahora = Number.isFinite(opciones.ahora) ? opciones.ahora : Date.now();
    const messageId = opciones.messageId ? String(opciones.messageId) : null;

    const transaccion = await obtenerGestorEconomia().ejecutar(
        "xp-" + crypto.randomUUID(),
        async leer => {
            const usuarios = leer("usuarios.json") || {};
            const clave = resolverClaveUsuario(id, usuarios);

            if (!clave) {
                return {
                    cambios: { "usuarios.json": usuarios },
                    resultado: {
                        usuario: null, subioNivel: false, xpOtorgada: 0,
                        nivelesGanados: 0, monedasNivel: 0,
                        motivo: "identidad_invalida"
                    }
                };
            }

            const usuario = usuarios[clave] || {
                xp: 0, nivel: 1, coins: 0, mensajes: 0,
                daily: 0, racha: 0, nombre: ""
            };

            const resultado = motivo => ({
                usuario, subioNivel: false, xpOtorgada: 0,
                nivelesGanados: 0, monedasNivel: 0, motivo
            });

            const procesados = Array.isArray(usuario.xpMensajesProcesados)
                ? usuario.xpMensajesProcesados.map(String)
                : (usuario.xpUltimoMensajeId ? [String(usuario.xpUltimoMensajeId)] : []);

            if (messageId && procesados.includes(messageId)) {
                return {
                    cambios: { "usuarios.json": usuarios },
                    resultado: resultado("mensaje_duplicado")
                };
            }

            const fecha = obtenerFechaColombia(ahora);
            let xpDiaria = Math.max(0, Number(usuario.xpDiario) || 0);
            if (usuario.xpFechaColombia !== fecha) xpDiaria = 0;

            const ultima = Number(usuario.xpUltimoMensajeAt) || 0;
            if (ultima > 0 && ahora - ultima < TIEMPO_XP) {
                return {
                    cambios: { "usuarios.json": usuarios },
                    resultado: resultado("cooldown")
                };
            }

            const otorgada = Math.min(solicitada, Math.max(0, MAX_XP_DIARIA - xpDiaria));
            if (otorgada <= 0) {
                return {
                    cambios: { "usuarios.json": usuarios },
                    resultado: resultado("limite_diario")
                };
            }

            usuario.xp = Math.max(0, Number(usuario.xp) || 0) + otorgada;
            usuario.nivel = Math.max(1, Number(usuario.nivel) || 1);
            usuario.coins = Math.max(0, Number(usuario.coins) || 0);
            usuario.mensajes = Math.max(0, Number(usuario.mensajes) || 0) + 1;
            usuario.xpFechaColombia = fecha;
            usuario.xpDiario = xpDiaria + otorgada;
            usuario.xpUltimoMensajeAt = ahora;

            if (messageId) {
                procesados.push(messageId);
                usuario.xpMensajesProcesados = procesados.slice(-100);
                usuario.xpUltimoMensajeId = messageId;
            }

            let niveles = 0;
            while (usuario.xp >= xpNecesaria(usuario.nivel)) {
                usuario.xp -= xpNecesaria(usuario.nivel);
                usuario.nivel++;
                usuario.coins += 50;
                niveles++;
            }

            usuarios[clave] = usuario;
            return {
                cambios: { "usuarios.json": usuarios },
                resultado: {
                    usuario,
                    subioNivel: niveles > 0,
                    xpOtorgada: otorgada,
                    nivelesGanados: niveles,
                    monedasNivel: niveles * 50,
                    motivo: "otorgada"
                }
            };
        }
    );

    return transaccion.resultado;
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
