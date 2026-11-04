const TEMA = {
    ancho: 30,
    linea: "━━━━━━━━━━━━━━━━━━━━━━━━━━",
    cabecera: "╔════════════════════════════╗",
    pieCabecera: "╚════════════════════════════╝",
    firma: "🔥 TitansBot v3 • Esports Edition"
};

function centrar(texto) {
    const espacio = Math.max(0, Math.floor((28 - texto.length) / 2));
    return " ".repeat(espacio) + texto;
}

function crear(icono, titulo, contenido, footer = TEMA.firma) {
    return `
${TEMA.cabecera}
${centrar(`${icono} ${titulo.toUpperCase()}`)}
${TEMA.pieCabecera}

${contenido}

${TEMA.linea}
${footer}
${TEMA.linea}`.trim();
}

module.exports = {

    exito: (titulo, contenido) =>
        crear("✅", titulo, contenido, "🏆 Liga Titans"),

    error: (titulo, contenido) =>
        crear("❌", titulo, contenido, "⚠️ Operación cancelada"),

    aviso: (titulo, contenido) =>
        crear("📢", titulo, contenido, "📣 Comunidad Titans"),

    equipo: (titulo, contenido) =>
        crear("🛡️", titulo, contenido, "⚔️ Sistema de Equipos"),

    ranking: (titulo, contenido) =>
        crear("📈", titulo, contenido, "🏅 Ranking Oficial"),

    torneo: (titulo, contenido) =>
        crear("🏆", titulo, contenido, "🎮 Titans League"),

    raid: (titulo, contenido) =>
        crear("👹", titulo, contenido, "⚔️ Raid Mundial"),

    economia: (titulo, contenido) =>
        crear("💰", titulo, contenido, "💎 Economía Titans"),

    perfil: (titulo, contenido) =>
        crear("👤", titulo, contenido, "⭐ Perfil del Jugador")
};
