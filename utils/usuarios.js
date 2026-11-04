const { leerJSON } = require("./database");

function normalizar(id) {
    if (!id) return "";

    return id
        .replace("@lid", "")
        .replace("@s.whatsapp.net", "");
}

function obtenerNombre(id) {

    const usuarios = leerJSON("usuarios.json") || {};

    const numero = normalizar(id);

    const formatos = [
        numero + "@lid",
        numero + "@s.whatsapp.net",
        id
    ];

    for (const formato of formatos) {

        if (
            usuarios[formato] &&
            usuarios[formato].nombre
        ) {
            return usuarios[formato].nombre;
        }

    }

    return numero;

}

module.exports = {
    obtenerNombre,
    normalizar
};
