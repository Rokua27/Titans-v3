const memoria = require("./memoria");

function normalizar(texto = "") {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

// ============================================================
// 🧠 TITANSB — FILTRO DE APRENDIZAJE
// ============================================================

const CATEGORIAS = {
    torneo: [
        "torneo",
        "competencia",
        "campeonato",
        "copa",
        "premio",
        "inscripcion",
        "inscrito",
        "clasificacion",
        "tabla"
    ],

    equipos: [
        "equipo",
        "escuadra",
        "team",
        "roster",
        "jugadores",
        "lider"
    ],

    reglamento: [
        "regla",
        "reglamento",
        "bo3",
        "bo5",
        "formato",
        "prohibido",
        "permitido",
        "sancion",
        "eliminacion"
    ],

    jornadas: [
        "jornada",
        "fixture",
        "partido",
        "enfrentamiento",
        "fecha",
        "horario",
        "juega",
        "jugar"
    ],

    anuncios: [
        "anuncio",
        "oficial",
        "administracion",
        "direccion",
        "comunicado",
        "confirmado",
        "confirmamos"
    ],

    comunidad: [
        "comunidad",
        "grupo",
        "liga titans",
        "titans team"
    ]
};

// ============================================================
// 🚫 MENSAJES QUE NO DEBEN APRENDERSE
// ============================================================

const IGNORAR = [
    "hola",
    "holaa",
    "holaaa",
    "buenas",
    "buenos dias",
    "buenas tardes",
    "buenas noches",
    "hola a todos",
    "hola gente",
    "hola chicos",
    "hola equipo",
    "buenas a todos",
    "buenas gente",
    "que tal",
    "qué tal",
    "como estan",
    "cómo están",
    "jajaja",
    "jajajaja",
    "xd",
    "jeje",
    "ok",
    "okei",
    "gracias",
    "gracias bot",
    "gracias por todo",
    "muchas gracias",
    "mil gracias",
    "te agradezco",
    "se agradece",
    "👍",
    "😂",
    "🤣"
];

function esMensajeBasico(texto) {

    const normalizado = normalizar(texto);

    if (!normalizado) {
        return true;
    }

    if (IGNORAR.includes(normalizado)) {
        return true;
    }

    // Mensajes demasiado cortos:
    // se conservan como básicos SOLO si no contienen
    // conocimiento relevante.
    if (normalizado.length < 12) {
        const resultado = detectarCategoria(texto);

        if (!resultado.categoria) {
            return true;
        }
    }

    return false;
}

// ============================================================
// 🔎 DETECTAR CATEGORÍA
// ============================================================

function esPregunta(texto) {

    const normalizado = normalizar(texto);

    if (normalizado.includes("?")) {
        return true;
    }

    const inicios = [
        "quien ",
        "quienes ",
        "que ",
        "cuando ",
        "donde ",
        "como ",
        "cual ",
        "cuales ",
        "por que ",
        "cuanto ",
        "cuantos ",
        "cuanta ",
        "cuantas ",

    ];

    return inicios.some(
        inicio => normalizado.startsWith(inicio)
    );
}

function detectarCategoria(texto) {

    const normalizado = normalizar(texto);

    let mejorCategoria = null;
    let mejorPuntuacion = 0;

    for (const [categoria, palabras] of Object.entries(CATEGORIAS)) {

        let puntuacion = 0;

        for (const palabra of palabras) {

            if (normalizado.includes(palabra)) {
                puntuacion++;
            }
        }

        if (puntuacion > mejorPuntuacion) {
            mejorPuntuacion = puntuacion;
            mejorCategoria = categoria;
        }
    }

    // 🏆 Prioridad específica para información de equipos
    if (
        /\b(equipo|escuadra|team)\b/.test(normalizado) &&
        /\b(inscrito|inscripcion|registro|confirmo|confirmado|participa|participacion)\b/.test(normalizado)
    ) {
        mejorCategoria = "equipos";
    }

    return {
        categoria: mejorCategoria,
        puntuacion: mejorPuntuacion
    };
}

// ============================================================
// 🧠 DECIDIR SI APRENDER
// ============================================================

// ============================================================
// 💭 DETECTAR OPINIONES Y PREFERENCIAS
// ============================================================

function esOpinion(texto) {

    const normalizado = normalizar(texto);

    const indicadoresOpinion = [
        "creo que",
        "pienso que",
        "me parece",
        "en mi opinion",
        "en mi opinión",
        "para mi",
        "para mí",
        "yo diria",
        "yo diría",
        "considero que",
        "deberia",
        "debería",
        "seria mejor",
        "sería mejor",
        "me gusta",
        "me encanta",
        "me interesa",
        "prefiero",
        "no me gusta",
        "no me interesa",
        "odio",
        "amo"
    ];

    return indicadoresOpinion.some(indicador => {

        const palabra = normalizar(indicador);

        if (palabra.includes(" ")) {
            return normalizado.includes(palabra);
        }

        const expresion = new RegExp(
            `\\b${palabra}\\b`,
            "u"
        );

        return expresion.test(normalizado);
    });
}

// ============================================================
// 🧠 DECIDIR SI APRENDER
// ============================================================

function analizarMensaje(texto) {

    if (esMensajeBasico(texto)) {

        return {
            aprender: false,
            motivo: "mensaje_irrelevante",
            categoria: null,
            puntuacion: 0
        };
    }

    // ❓ Las preguntas se consultan, pero no se almacenan como conocimiento.
    if (esPregunta(texto)) {

        return {
            aprender: false,
            motivo: "pregunta",
            categoria: null,
            puntuacion: 0
        };
    }

    // 💭 Las opiniones y preferencias personales no se almacenan.
    if (esOpinion(texto)) {

        return {
            aprender: false,
            motivo: "opinion",
            categoria: null,
            puntuacion: 0
        };
    }

    const resultado = detectarCategoria(texto);

    if (!resultado.categoria) {

        return {
            aprender: false,
            motivo: "sin_conocimiento_relevante",
            categoria: null,
            puntuacion: 0
        };
    }

    return {
        aprender: true,
        motivo: "conocimiento_relevante",
        categoria: resultado.categoria,
        puntuacion: resultado.puntuacion
    };
}

// ============================================================
// 💾 GUARDAR APRENDIZAJE
// ============================================================

function aprender(grupo, texto, opciones = {}) {

    const analisis = analizarMensaje(texto);

    if (!analisis.aprender) {

        return {
            guardado: false,
            ...analisis
        };
    }

    const importancia =
        Number(opciones.importancia) ||
        Math.min(analisis.puntuacion + 2, 5);

    // ========================================================
    // 🔐 PROTECCIÓN DE MEMORIA OFICIAL
    // ========================================================
    //
    // El aprendizaje procedente del chat nunca puede convertirse
    // en información oficial por sí solo.
    //
    // La única combinación válida para OFICIAL es:
    //
    //     confianza = "oficial"
    //     origen    = "sistema"
    //
    // Cualquier intento de marcar como oficial desde otro origen
    // se degrada automáticamente a APRENDIDO.
    //
    const confianzaSolicitada =
        opciones.confianza || "aprendido";

    const origenSolicitado =
        opciones.origen || "comunidad";

    const confianzaSegura =
        confianzaSolicitada === "oficial" &&
        origenSolicitado === "sistema"
            ? "oficial"
            : confianzaSolicitada === "oficial"
                ? "aprendido"
                : confianzaSolicitada;

    const registro = memoria.guardarMemoria({

        grupo,

        tipo: analisis.categoria,

        contenido: texto.trim(),

        importancia,

        confianza:
            confianzaSegura,

        origen:
            origenSolicitado,

        autor:
            opciones.autor || null
    });

    console.log(
        `🧠 TitansB | aprendizaje | ` +
        `grupo=${grupo} | ` +
        `tipo=${analisis.categoria} | ` +
        `importancia=${importancia}`
    );

    return {
        guardado: true,
        ...analisis,
        memoria: registro
    };
}


// ============================================================
// 🧠 CLASIFICADOR DE CONFIANZA
// ============================================================

function clasificarConfianza(texto, opciones = {}) {

    const normalizado = normalizar(texto);

    // --------------------------------------------------------
    // 🏆 OFICIAL — solamente mediante origen confiable
    // --------------------------------------------------------

    if (
        opciones.confianza === "oficial" &&
        opciones.origen === "sistema"
    ) {
        return {
            confianza: "oficial",
            motivo: "origen_sistema"
        };
    }

    // --------------------------------------------------------
    // 🚫 MENSAJE IRRELEVANTE
    // --------------------------------------------------------

    if (esMensajeBasico(texto)) {
        return {
            confianza: null,
            motivo: "mensaje_irrelevante"
        };
    }

    // --------------------------------------------------------
    // ❓ PREGUNTA
    // --------------------------------------------------------

    if (esPregunta(texto)) {
        return {
            confianza: null,
            motivo: "pregunta"
        };
    }

    // --------------------------------------------------------
    // 🗣️ RUMORES / INFORMACIÓN NO CONFIRMADA
    // --------------------------------------------------------

    const indicadoresRumor = [
        "dicen que",
        "se dice que",
        "al parecer",
        "parece que",
        "supuestamente",
        "segun dicen",
        "segun parece",
        "escuche que",
        "escuché que",
        "me contaron que",
        "rumor",
        "rumores"
    ];

    if (
        indicadoresRumor.some(
            indicador =>
                normalizado.includes(
                    normalizar(indicador)
                )
        )
    ) {
        return {
            confianza: "no_confirmado",
            motivo: "rumor"
        };
    }

    // --------------------------------------------------------
    // 💭 OPINIONES / PREFERENCIAS
    // --------------------------------------------------------

    // --------------------------------------------------------
    // 💭 OPINIONES / PREFERENCIAS
    // --------------------------------------------------------

    if (esOpinion(texto)) {

        return {
            confianza: null,
            motivo: "opinion"
        };
    }

    // --------------------------------------------------------
    // 🧠 AFIRMACIÓN DE LA COMUNIDAD
    // --------------------------------------------------------

    return {
        confianza: "aprendido",
        motivo: "afirmacion_comunidad"
    };
}

// ============================================================
// 🛡️ APRENDIZAJE CON PROTECCIÓN DE INFORMACIÓN OFICIAL
// ============================================================

function aprenderConProteccion(grupo, texto, opciones = {}) {

    const analisis =
        analizarMensaje(texto);

    // ========================================================
    // 🧠 CLASIFICAR NIVEL DE CONFIANZA
    // ========================================================

    const clasificacion =
        clasificarConfianza(
            texto,
            opciones
        );

    // --------------------------------------------------------
    // 🚫 No aprender preguntas, opiniones o mensajes irrelevantes
    // --------------------------------------------------------

    if (
        !analisis.aprender ||
        clasificacion.confianza === null
    ) {

        return {
            guardado: false,
            ...analisis,
            confianza: clasificacion.confianza,
            motivoConfianza: clasificacion.motivo
        };
    }

    const contenido =
        texto.trim();

    const importancia =
        Number(opciones.importancia) ||
        Math.min(
            analisis.puntuacion + 2,
            5
        );

    let contradicciones = [];

    // --------------------------------------------------------
    // ⚠️ Buscar contradicciones existentes
    // --------------------------------------------------------

    try {

        contradicciones =
            memoria.detectarContradicciones(
                grupo,
                analisis.categoria,
                contenido
            ) || [];

    } catch (error) {

        console.error(
            "⚠️ TitansB | Error detectando contradicciones:",
            error.message
        );
    }

    // --------------------------------------------------------
    // 🏆 Buscar información oficial
    // --------------------------------------------------------

    const oficial =
        contradicciones.find(
            dato =>
                dato.esOficial === true ||
                dato.confianza === "oficial"
        );

    // --------------------------------------------------------
    // ⚠️ Existe conflicto con información oficial
    // --------------------------------------------------------

    if (oficial) {

        console.log(
            "⚠️ TitansB | conflicto con información oficial."
        );

        const registro =
            memoria.guardarMemoria({

                grupo,

                tipo:
                    analisis.categoria,

                contenido,

                importancia:
                    Math.max(
                        importancia - 1,
                        1
                    ),

                confianza:
                    "no_confirmado",

                origen:
                    "comunidad",

                autor:
                    opciones.autor || null
            });

        return {

            guardado:
                !!registro,

            aprender:
                true,

            motivo:
                "conflicto_con_oficial",

            categoria:
                analisis.categoria,

            puntuacion:
                analisis.puntuacion,

            conflicto:
                true,

            oficialEncontrada:
                true,

            contradicciones,

            memoria:
                registro
        };
    }

    // --------------------------------------------------------
    // 🧠 No hay conflicto → aprendizaje normal
    // --------------------------------------------------------

    const registro =
        memoria.guardarMemoria({

            grupo,

            tipo:
                analisis.categoria,

            contenido,

            importancia,

            confianza:
                clasificacion.confianza ||
                "aprendido",

            origen:
                opciones.origen ||
                "comunidad",

            autor:
                opciones.autor ||
                null
        });

    console.log(
        `🧠 TitansB | aprendizaje protegido | ` +
        `grupo=${grupo} | ` +
        `tipo=${analisis.categoria} | ` +
        `importancia=${importancia}`
    );

    return {

        guardado:
            !!registro,

        ...analisis,

        conflicto:
            false,

        oficialEncontrada:
            false,

        contradicciones: [],

        memoria:
            registro
    };
}

module.exports = {
    analizarMensaje,
    detectarCategoria,
    aprender,
    aprenderConProteccion,
    clasificarConfianza,
    esPregunta,
    esOpinion,
    esMensajeBasico
};
