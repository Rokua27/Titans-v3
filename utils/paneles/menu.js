const { panel } = require("./estilos");
const { obtenerTodosLosComandos } = require("../commandHandler");

function obtenerComandosPorCategoria(permiso = "usuario") {

    const categorias = {};

    const comandos = obtenerTodosLosComandos().filter(cmd =>
        cmd.permisos.includes("usuario") ||
        cmd.permisos.includes(permiso)
    );

    for (const cmd of comandos) {

        if (!categorias[cmd.categoria]) {
            categorias[cmd.categoria] = [];
        }

        categorias[cmd.categoria].push(cmd);

    }

    return categorias;

}

function generarMenu(permiso = "usuario") {

    const categorias = obtenerComandosPorCategoria(permiso);

    let contenido = "";

    for (const categoria in categorias) {

        contenido += `📂 ${categoria.toUpperCase()}\n`;
        contenido += "━━━━━━━━━━━━━━━━━━\n";

        for (const cmd of categorias[categoria]) {

            contenido += `• ${cmd.uso}\n`;
            contenido += `  ${cmd.descripcion}\n\n`;

        }

    }

    return panel(
        "🎮",
        "MENÚ TITANSBOT",
        contenido,
        "Sistema Inteligente"
    );

}

module.exports = {

    generarMenu,
    obtenerComandosPorCategoria

};
