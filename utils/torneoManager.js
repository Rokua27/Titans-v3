const { leerJSON, guardarJSON } = require("./database");

function obtenerTemporada() {

    return leerJSON("temporada.json") || {
        nombre: "Sin temporada",
        estado: "cerrada",
        inscripciones: false,
        fechaInicio: "",
        fechaFin: ""
    };

}

function guardarTemporada(data) {

    guardarJSON("temporada.json", data);

}

function abrirInscripciones() {

    const temporada = obtenerTemporada();

    temporada.inscripciones = true;

    guardarTemporada(temporada);

    return temporada;

}

function cerrarInscripciones() {

    const temporada = obtenerTemporada();

    temporada.inscripciones = false;

    guardarTemporada(temporada);

    return temporada;

}

function obtenerTabla() {

    return leerJSON("tabla.json") || {
        equipos: []
    };

}

function guardarTabla(tabla) {

    guardarJSON("tabla.json", tabla);

}

function obtenerResultados() {

    return leerJSON("resultados.json") || {
        partidos: []
    };

}

function guardarResultados(data) {

    guardarJSON("resultados.json", data);

}

function obtenerFixture() {

    return leerJSON("fixture.json") || {
        enfrentamientos: []
    };

}

function guardarFixture(fixture) {

    guardarJSON("fixture.json", fixture);

}

function obtenerHistorial() {

    return leerJSON("historial.json") || {
        temporadas: []
    };

}

function guardarHistorial(historial) {

    guardarJSON("historial.json", historial);

}

async function cerrarTorneo(sock, from) {

    const tabla = obtenerTabla();

    if (!tabla.equipos.length) {

        return await sock.sendMessage(from, {
            text: "❌ No hay clasificación para cerrar el torneo."
        });

    }

    tabla.equipos.sort((a, b) => {

        if (b.puntos !== a.puntos) {
            return b.puntos - a.puntos;
        }

        return b.victorias - a.victorias;

    });

const campeon = tabla.equipos[0];
const subcampeon = tabla.equipos[1];
const tercero = tabla.equipos[2];

const historial = obtenerHistorial();

const temporada = obtenerTemporada();

historial.temporadas.unshift({

    temporada: temporada.nombre,

    campeon: campeon?.nombre || "-",

    subcampeon: subcampeon?.nombre || "-",

    tercerLugar: tercero?.nombre || "-",

    fecha: new Date().toLocaleString("es-CO")

});

guardarHistorial(historial);

const { cargarEquipos, guardarEquipos } = require("./equipos");

const equipos = cargarEquipos();

tabla.equipos.forEach((registro, index) => {

    const equipo = equipos[registro.nombre];

    if (!equipo) return;

    // Acumular estadísticas históricas
    equipo.victorias += registro.victorias;
    equipo.derrotas += registro.derrotas;
    equipo.empates += registro.empates;

    // Prestigio según la posición final
    if (index === 0) {
        equipo.campeonatos++;
        equipo.prestigio += 100;
    } else if (index === 1) {
        equipo.prestigio += 60;
    } else if (index === 2) {
        equipo.prestigio += 40;
    } else {
        equipo.prestigio += 10;
    }

    // Subir de nivel por experiencia de temporada
    equipo.xp += registro.puntos * 10;

    while (equipo.xp >= 100) {
        equipo.xp -= 100;
        equipo.nivel++;
    }

});

guardarEquipos(equipos);

let clasificacion = "";

tabla.equipos.forEach((equipo, index) => {

    let icono = "🔹";

    if (index === 0) icono = "🥇";
    else if (index === 1) icono = "🥈";
    else if (index === 2) icono = "🥉";

    clasificacion +=
`${icono} ${index + 1}. ${equipo.nombre} — ${equipo.puntos} pts\n`;

});

await sock.sendMessage(from, {
    text:
`🏆 LIGA TITANS TEAM

━━━━━━━━━━━━━━━━━━

🏁 TORNEO FINALIZADO

🥇 Campeón
${campeon?.nombre || "-"}

🥈 Subcampeón
${subcampeon?.nombre || "-"}

🥉 Tercer Lugar
${tercero?.nombre || "-"}

━━━━━━━━━━━━━━━━━━

📊 CLASIFICACIÓN FINAL

${clasificacion}

━━━━━━━━━━━━━━━━━━

✅ El torneo ha finalizado.

⚠️ El fixture y la clasificación permanecerán disponibles hasta que un Super Admin ejecute:

!reiniciartorneo

🤖 TitansBot v3`
});

// Ya NO reinicia automáticamente.

}

const {
    cargarEquipos,
    guardarEquipos
} = require("./equipos");

function reiniciarTorneo() {

    guardarFixture({
        enfrentamientos: []
    });

    guardarTabla({
        equipos: []
    });

    guardarResultados({
        resultados: []
    });

    const equipos = cargarEquipos();

    for (const nombre in equipos) {

        equipos[nombre].inscrito = false;
        equipos[nombre].grupo = null;
        equipos[nombre].temporada = null;

    }

    guardarEquipos(equipos);

}

module.exports = {

    obtenerTemporada,
    guardarTemporada,

    abrirInscripciones,
    cerrarInscripciones,

    obtenerTabla,
    guardarTabla,

    obtenerResultados,
    guardarResultados,

    obtenerFixture,
    guardarFixture,

    obtenerHistorial,
    guardarHistorial,

    cerrarTorneo,
    reiniciarTorneo

};
