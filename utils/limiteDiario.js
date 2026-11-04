const { leerJSON, guardarJSON } = require("./database");

function puedeUsarComando(usuario, comando, limite = 3) {

    const hoy = new Date().toISOString().slice(0, 10);

    const datos = leerJSON("limites.json") || {};

    if (!datos[usuario]) {
        datos[usuario] = {};
    }

    if (!datos[usuario][comando]) {
        datos[usuario][comando] = {
            fecha: hoy,
            usos: 0
        };
    }

    if (datos[usuario][comando].fecha !== hoy) {
        datos[usuario][comando].fecha = hoy;
        datos[usuario][comando].usos = 0;
    }

    if (datos[usuario][comando].usos >= limite) {

        guardarJSON("limites.json", datos);

        return {
            ok: false,
            usados: datos[usuario][comando].usos,
            limite
        };
    }

    datos[usuario][comando].usos++;

    guardarJSON("limites.json", datos);

    return {
        ok: true,
        usados: datos[usuario][comando].usos,
        restante: limite - datos[usuario][comando].usos,
        limite
    };
}

module.exports = {
    puedeUsarComando
};
