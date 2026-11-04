/**
 * C-10.11.34
 * Detector de órdenes administrativas remotas.
 *
 * RESPONSABILIDADES:
 * - Detectar una orden administrativa remota.
 * - Identificar el comando permitido.
 * - Obtener el objetivo mediante mentionedJid cuando exista.
 * - Obtener el nombre textual como respaldo.
 * - Extraer únicamente los argumentos posteriores al objetivo.
 *
 * NO:
 * - Ejecuta comandos.
 * - Envía mensajes.
 * - Modifica grupos.
 * - Cambia permisos.
 * - Aplica sanciones.
 */

const COMANDOS = {
    ban: [
        "ban",
        "banea",
        "banear"
    ],

    unban: [
        "unban",
        "desbanea",
        "desbanear",
        "quita el ban",
        "quitar el ban"
    ],

    warnings: [
        "warnings",
        "advertencias",
        "warns"
    ],

    clearwarns: [
        "clearwarns",
        "clearwarnings",
        "limpiarwarns",
        "limpiar advertencias",
        "resetwarns"
    ],

    warn: [
        "warn",
        "advierte",
        "advertir",
        "advertencia"
    ],

    mute: [
        "mute",
        "muta",
        "mutea",
        "silencia",
        "silenciar"
    ],

    unmute: [
        "unmute",
        "desmutea",
        "desmutear",
        "quita el mute",
        "quitar el mute"
    ],

    kick: [
        "kick",
        "expulsa",
        "expulsar",
        "saca del grupo",
        "sacar del grupo"
    ]
};

function normalizarTexto(texto = "") {
    return String(texto || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");
}

function escaparRegex(texto = "") {
    return String(texto || "")
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Busca el indicador de comando y devuelve su posición real
 * dentro del texto original.
 */
function localizarComando(texto = "") {
    const original = String(texto || "");

    if (!original.trim()) {
        return null;
    }

    const entradas = [];

    for (const [comando, indicadores] of Object.entries(COMANDOS)) {
        for (const indicador of indicadores) {
            entradas.push({
                comando,
                indicador
            });
        }
    }

    entradas.sort(
        (a, b) =>
            normalizarTexto(b.indicador).length -
            normalizarTexto(a.indicador).length
    );

    for (const entrada of entradas) {
        const patron = new RegExp(
            `\\b${escaparRegex(entrada.indicador)}\\b`,
            "i"
        );

        const coincidencia = patron.exec(original);

        if (!coincidencia) {
            continue;
        }

        return {
            comando: entrada.comando,
            indicador: entrada.indicador,
            inicio: coincidencia.index,
            fin: coincidencia.index + coincidencia[0].length
        };
    }

    return null;
}

function detectarComando(texto = "") {
    const resultado = localizarComando(texto);

    return resultado?.comando || null;
}

function extraerMencionTexto(texto = "") {
    const contenido = String(texto || "");
    const inicio = contenido.indexOf("@");

    if (inicio < 0) {
        return null;
    }

    const despues = contenido.slice(inicio + 1);

    /*
     * El nombre termina cuando aparecen conectores o argumentos
     * claramente reconocibles.
     */
    const corte = despues.search(
        /\s+(?:\d+\s*(?:minutos?|mins?|m)\b|por\b|porque\b|debido\b|para\b|a\b|al\b|del\b|de\b|que\b)/i
    );

    const nombre =
        corte >= 0
            ? despues.slice(0, corte)
            : despues;

    const limpio = nombre
        .trim()
        .replace(/[,:;.!?]+$/g, "")
        .trim();

    if (!limpio || /^\d+(?:@[\w.-]+)?$/.test(limpio)) {
        return null;
    }

    return limpio;
}

function obtenerMentionedJid(msg) {
    const menciones =
        msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid;

    if (!Array.isArray(menciones) || menciones.length === 0) {
        return null;
    }

    return menciones[0] || null;
}

/**
 * Elimina una mención textual y devuelve lo que queda después.
 */
function eliminarMencionDeTexto(texto = "") {
    let resultado = String(texto || "").trim();

    const posicion = resultado.indexOf("@");

    if (posicion < 0) {
        return resultado;
    }

    const antes = resultado.slice(0, posicion);
    const despues = resultado.slice(posicion);

    const mencion = extraerMencionTexto(resultado);

    if (!mencion) {
        return resultado;
    }

    const patron = new RegExp(
        `^@${escaparRegex(mencion)}`
    );

    return (
        antes +
        despues.replace(patron, "")
    )
        .trim();
}

/**
 * Extrae únicamente lo que aparece después de la mención.
 *
 * Ejemplo:
 *   @Juan 10 minutos por spam
 *
 * devuelve:
 *   ["10", "minutos", "por", "spam"]
 */
function extraerArgumentosDesdeObjetivo(texto = "") {
    let resultado = String(texto || "").trim();

    if (!resultado) {
        return [];
    }

    resultado = eliminarMencionDeTexto(resultado);

    resultado = resultado
        .replace(/^\s*(?:a|al)\s+/i, "")
        .trim();

    if (!resultado) {
        return [];
    }

    return resultado
        .split(/\s+/)
        .filter(Boolean);
}

/**
 * Detecta una orden administrativa completa.
 */
function detectarOrdenRemota(texto = "", msg = null) {
    const original = String(texto || "").trim();

    if (!original) {
        return {
            ok: false,
            motivo: "texto_vacio"
        };
    }

    const localizacion = localizarComando(original);

    if (!localizacion) {
        return {
            ok: false,
            motivo: "comando_no_reconocido"
        };
    }

    /*
     * Todo lo que viene después del indicador del comando.
     *
     * Ejemplo:
     *   TitansB mutea a @Juan 10 minutos por spam
     *
     * queda:
     *   a @Juan 10 minutos por spam
     */
    let cuerpo = original
        .slice(localizacion.fin)
        .trim();

    cuerpo = cuerpo
        .replace(/^\s*(?:a|al)\s+/i, "")
        .trim();

    const jidMencionado = obtenerMentionedJid(msg);
    const nombreMencionado = extraerMencionTexto(cuerpo);

    if (!jidMencionado && !nombreMencionado) {
        return {
            ok: false,
            motivo: "objetivo_no_mencionado",
            comando: localizacion.comando
        };
    }

    return {
        ok: true,
        remoto: true,

        comando: localizacion.comando,

        objetivo: {
            jid: jidMencionado || null,
            nombre: nombreMencionado || null
        },

        argumentos:
            extraerArgumentosDesdeObjetivo(cuerpo)
    };
}

module.exports = {
    COMANDOS,
    normalizarTexto,
    localizarComando,
    detectarComando,
    extraerMencionTexto,
    obtenerMentionedJid,
    eliminarMencionDeTexto,
    extraerArgumentosDesdeObjetivo,
    detectarOrdenRemota
};
