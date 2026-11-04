const { leerJSON, guardarJSON } = require("./database");
const { cargarEquipos } = require("./equipos");
const { obtenerTemporada } = require("./torneoManager");

const ARCHIVO = "bracket.json";

/**
 * Mezcla Fisher-Yates.
 */
function mezclar(array) {
    const resultado = [...array];

    for (let i = resultado.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [resultado[i], resultado[j]] = [
            resultado[j],
            resultado[i]
        ];
    }

    return resultado;
}

/**
 * Normaliza nombres para comparaciones.
 */
function normalizar(nombre) {
    return String(nombre || "")
        .trim()
        .toLowerCase();
}

/**
 * Obtiene el bracket actual.
 */
function obtenerBracket() {
    return leerJSON(ARCHIVO) || null;
}

/**
 * Guarda el bracket.
 */
function guardarBracket(bracket) {
    guardarJSON(ARCHIVO, bracket);
}

/**
 * Genera los playoffs para 9 equipos.
 *
 * 2 equipos → Play-In
 * 7 equipos → BYE
 */
function iniciarPlayoffs() {

    const temporada = obtenerTemporada();

    const equipos = Object.values(cargarEquipos())
        .filter(e =>
            e &&
            e.inscrito === true
        )
        .map(e => e.nombre)
        .filter(Boolean);

    if (equipos.length !== 9) {
        return {
            ok: false,
            mensaje:
                `Se requieren exactamente 9 equipos inscritos. Actualmente hay ${equipos.length}.`
        };
    }

    const bracketActual = obtenerBracket();

    if (
        bracketActual &&
        bracketActual.temporada === temporada.nombre &&
        bracketActual.estado !== "FINALIZADO"
    ) {
        return {
            ok: false,
            mensaje:
                "Ya existe una llave de playoffs activa para esta temporada."
        };
    }

    const sorteo = mezclar(equipos);

    const playin = sorteo.slice(0, 2);
    const bye = sorteo.slice(2);

    const bracket = {
        temporada: temporada.nombre,

        estado: "PLAY_IN",

        creado: new Date().toISOString(),

        sorteo: sorteo,

        playin: [
            {
                a: playin[0],
                b: playin[1],
                ganador: null
            }
        ],

        bye,

        cuartos: [],

        semifinales: [],

        final: [],

        campeon: null
    };

    guardarBracket(bracket);

    return {
        ok: true,
        bracket
    };
}

/**
 * Busca una serie dentro de una ronda.
 */
function buscarSerieEnRonda(ronda, equipoA, equipoB) {

    if (!Array.isArray(ronda)) {
        return null;
    }

    const a = normalizar(equipoA);
    const b = normalizar(equipoB);

    return ronda.find(serie => {

        const x = normalizar(serie.a);
        const y = normalizar(serie.b);

        return (
            (x === a && y === b) ||
            (x === b && y === a)
        );
    }) || null;
}

/**
 * Devuelve la ronda donde están jugando dos equipos.
 */
function obtenerSerie(equipoA, equipoB) {

    const bracket = obtenerBracket();

    if (!bracket) {
        return null;
    }

    const rondas = [
        ["PLAY_IN", bracket.playin],
        ["CUARTOS", bracket.cuartos],
        ["SEMIFINALES", bracket.semifinales],
        ["FINAL", bracket.final]
    ];

    for (const [nombre, ronda] of rondas) {

        const serie = buscarSerieEnRonda(
            ronda,
            equipoA,
            equipoB
        );

        if (serie) {
            return {
                ronda: nombre,
                serie,
                bracket
            };
        }
    }

    return null;
}

module.exports = {
    mezclar,
    normalizar,

    obtenerBracket,
    guardarBracket,

    iniciarPlayoffs,

    buscarSerieEnRonda,
    obtenerSerie
};
