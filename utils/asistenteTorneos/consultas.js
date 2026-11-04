const { leerJSON } = require("../database");
const { cargarEquipos } = require("../equipos");
const {
    obtenerTemporada,
    obtenerFixture,
    obtenerTabla,
    obtenerHistorial
} = require("../torneoManager");

function obtenerEstadoTorneo() {
    const torneo = leerJSON("torneo.json") || {};
    const temporada = obtenerTemporada();
    const fixture = obtenerFixture();
    const tabla = obtenerTabla();
    const historial = obtenerHistorial();
    const equipos = cargarEquipos();

    const listaEquipos = Object.values(equipos);
    const inscritos = listaEquipos.filter(e => e.inscrito);

    const partidos = Array.isArray(fixture.enfrentamientos)
        ? fixture.enfrentamientos
        : [];

    const jugados = partidos.filter(p => p.ganador).length;
    const proximo = partidos.find(p => !p.ganador);

    const progreso = partidos.length > 0
        ? Math.round((jugados / partidos.length) * 100)
        : 0;

    const lider = Array.isArray(tabla.equipos) && tabla.equipos.length > 0
        ? tabla.equipos[0].nombre
        : null;

    const campeonActual =
        Array.isArray(historial.temporadas) &&
        historial.temporadas.length > 0
            ? historial.temporadas[0].campeon
            : null;

    return {
        torneo,
        temporada,
        inscritos: inscritos.length,
        totalEquipos: listaEquipos.length,
        partidosJugados: jugados,
        partidosTotales: partidos.length,
        progreso,
        proximoPartido: proximo || null,
        lider,
        campeonActual
    };
}

function obtenerEquiposInscritos() {
    const torneo = leerJSON("torneo.json") || {};
    const equipos = cargarEquipos();

    const inscritos = Object.values(equipos)
        .filter(e => e.inscrito)
        .sort((a, b) =>
            String(a.nombre || "").localeCompare(
                String(b.nombre || "")
            )
        );

    return {
        torneo,
        equipos: inscritos,
        total: inscritos.length
    };
}

function obtenerTablaPosiciones() {
    const tabla = obtenerTabla();

    const equipos = Array.isArray(tabla.equipos)
        ? tabla.equipos
        : [];

    return {
        equipos
    };
}

function obtenerFixtureActual() {
    const temporada = obtenerTemporada();
    const fixture = obtenerFixture();

    const partidos = Array.isArray(fixture.enfrentamientos)
        ? fixture.enfrentamientos
        : [];

    return {
        temporada,
        partidos,
        total: partidos.length,
        jugados: partidos.filter(p => p.ganador).length,
        pendientes: partidos.filter(p => !p.ganador).length
    };
}

function obtenerResultadosRegistrados() {
    const data = leerJSON("resultados.json") || {
        resultados: []
    };

    const resultados = Array.isArray(data.resultados)
        ? data.resultados
        : [];

    return {
        resultados,
        total: resultados.length
    };
}

function obtenerJornadas() {
    const data = leerJSON("jornadas.json") || {};

    const jornadas = Object.entries(data).map(
        ([numero, jornada]) => ({
            numero,
            ...jornada
        })
    );

    return {
        jornadas,
        total: jornadas.length
    };
}

module.exports = {
    obtenerEstadoTorneo,
    obtenerEquiposInscritos,
    obtenerTablaPosiciones,
    obtenerFixtureActual,
    obtenerResultadosRegistrados,
    obtenerJornadas
};
