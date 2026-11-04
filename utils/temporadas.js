const { leerJSON, guardarJSON } = require("./database");

function cargarTemporada() {
    return leerJSON("temporadas.json") || {};
}

function guardarTemporada(datos) {
    guardarJSON("temporadas.json", datos);
}

module.exports = {
    cargarTemporada,
    guardarTemporada
};
