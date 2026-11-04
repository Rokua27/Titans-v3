function generarAnuncioTorneo(torneo = {}, opciones = {}) {
    const {
        tipo = "torneo",
        partidos = [],
        incluirEquipos = false,
        incluirPremio = true
    } = opciones;

    const nombre =
        torneo.nombre ||
        torneo.titulo ||
        "Liga Titans Team";

    const premio =
        torneo.premio ||
        "Por anunciar";

    const formato =
        torneo.formato ||
        "Por definir";

    const region =
        torneo.region ||
        "Por definir";

    const partidosValidos =
        Array.isArray(partidos)
            ? partidos
            : [];

    const tituloTipo = {
        torneo: "TORNEO OFICIAL",
        cuartos: "CUARTOS DE FINAL",
        programacion: "PROGRAMACIÓN OFICIAL",
        resultado: "RESULTADO OFICIAL"
    }[tipo] || "ANUNCIO OFICIAL";

    const contenido = [
        `╔══════════════════════════════╗`,
        `║     🏆 ${String(nombre).toUpperCase()}     ║`,
        `╚══════════════════════════════╝`,
        ``,
        `⚔️ ${tituloTipo}`,
        ``,
        incluirPremio
            ? `💎 PREMIO OFICIAL: ${premio}`
            : null,
        `🎮 FORMATO: ${formato}`,
        `🌎 SERVIDOR: ${region}`,
        ``,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    ].filter(linea => linea !== null);

    if (incluirEquipos) {
        const equipos = [
            ...new Set(
                partidosValidos.flatMap(partido => [
                    partido.equipo1,
                    partido.equipo2
                ]).filter(Boolean)
            )
        ];

        if (equipos.length > 0) {
            contenido.push(
                `👥 EQUIPOS CLASIFICADOS`,
                ``,
                ...equipos.map(
                    (equipo, indice) =>
                        `${indice + 1}. ${equipo}`
                ),
                ``,
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
            );
        }
    }

    if (partidosValidos.length > 0) {
        contenido.push(
            `🔥 ENFRENTAMIENTOS`,
            ``
        );

        partidosValidos.forEach(partido => {
            contenido.push(
                `⚔️ ${partido.jornada || "Partido oficial"}`,
                `📅 ${partido.fecha || "Fecha por definir"}`,
                `🕒 ${partido.hora || "Hora por definir"}`,
                `${partido.equipo1 || "Equipo 1"} 🆚 ${partido.equipo2 || "Equipo 2"}`,
                ``
            );
        });

        contenido.push(
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        );
    }

    contenido.push(
        `🤖 TITANSB • SISTEMA OFICIAL DE TORNEOS`,
        `🏆 Liga Titans Team`
    );

    return contenido.join("\n");
}


function generarAnuncioOficial(titulo = "COMUNICADO OFICIAL", contenido = "") {
    return [
        `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮`,
        `┃     ⚔️ COMUNICADO OFICIAL ⚔️   ┃`,
        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
        ``,
        `🔥 ${String(titulo).toUpperCase()}`,
        ``,
        String(contenido).trim(),
        ``,
        `╭──────────────────────────────╮`,
        `│        🛡️ T I T A N S B       │`,
        `│   🤖 MIEMBRO VIRTUAL OFICIAL │`,
        `│      ⚔️ LIGA TITANS TEAM     │`,
        `╰──────────────────────────────╯`
    ].join("\n");
}

module.exports = {
    generarAnuncioTorneo,
    generarAnuncioOficial
};
