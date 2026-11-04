const LINEA = "━━━━━━━━━━━━━━━━━━━━";
const BORDE = "════════════════════";

function panel(icono, titulo, contenido, pie = "TitansBot v3") {
    return `
╔${BORDE}╗
      ${icono} ${titulo.toUpperCase()}
╚${BORDE}╝

${contenido}

${LINEA}
${pie}
`.trim();
}

function exito(titulo, mensaje) {
    return panel(
        "✅",
        titulo,
        `✔️ ${mensaje}`
    );
}

function error(titulo, mensaje) {
    return panel(
        "❌",
        titulo,
        `⚠️ ${mensaje}`
    );
}

function anuncio(titulo, mensaje) {
    return panel(
        "📢",
        titulo,
        mensaje,
        "Anuncio Oficial • TitansBot v3"
    );
}

function equipo(titulo, mensaje) {
    return panel(
        "👑",
        titulo,
        mensaje,
        "Sistema de Equipos"
    );
}

function torneo(titulo, mensaje) {
    return panel(
        "🏆",
        titulo,
        mensaje,
        "Sistema de Torneos"
    );
}

function liga(titulo, mensaje) {
    return panel(
        "🥇",
        titulo,
        mensaje,
        "Sistema de Ligas"
    );
}

function guerra(titulo, mensaje) {
    return panel(
        "⚔️",
        titulo,
        mensaje,
        "Sistema de Guerras"
    );
}

function admin(titulo, mensaje) {
    return panel(
        "🛠️",
        titulo,
        mensaje,
        "Panel Administrativo"
    );
}

function economia(titulo, mensaje) {
    return panel(
        "💰",
        titulo,
        mensaje,
        "Economía Titans"
    );
}

module.exports = {
    panel,
    exito,
    error,
    anuncio,
    equipo,
    torneo,
    liga,
    guerra,
    admin,
    economia
};
