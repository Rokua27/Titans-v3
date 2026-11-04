function responderEstadoTorneo(estado) {
    const torneo = estado?.torneo || {};
    const proximo = estado?.proximoPartido;

    return [
        "🏆━━━━━━━━━━━━━━━━━━━━━━🏆",
        `      ${torneo.titulo || torneo.nombre || "LIGA TITANS TEAM"}`,
        "🏆━━━━━━━━━━━━━━━━━━━━━━🏆",
        `🥇 ${torneo.subtitulo || "TORNEO OFICIAL"}`,
        `📢 ${torneo.descripcion || "Sin descripción"}`,
        "━━━━━━━━━━━━━━━━━━",
        `🌎 Región: ${torneo.region || "Sin definir"}`,
        `📅 Fecha: ${torneo.proximaFecha || "Sin definir"}`,
        `🕒 Hora: ${torneo.horaInicio || torneo.hora || "Sin definir"}`,
        `📋 Estado: ${torneo.estado || "Sin definir"}`,
        `🎮 Formato: ${torneo.formato || "Sin definir"}`,
        `🏅 Clasifican: ${torneo.clasifican || "Sin definir"}`,
        "━━━━━━━━━━━━━━━━━━",
        `👥 Equipos inscritos: ${estado.inscritos || 0} / ${torneo.maxEquipos || estado.totalEquipos || 0}`,
        `⚔️ Partidos jugados: ${estado.partidosJugados || 0} / ${estado.partidosTotales || 0}`,
        `📈 Progreso: ${estado.progreso || 0}%`,
        `🎮 Próximo partido: ${
            proximo
                ? `${proximo.equipo1} 🆚 ${proximo.equipo2}`
                : "No hay partidos programados"
        }`,
        `👑 Líder actual: ${estado.lider || "Sin datos"}`,
        `🏆 Campeón vigente: ${estado.campeonActual || "Sin campeón"}`,
        "━━━━━━━━━━━━━━━━━━"
    ].join("\n");
}

function responderEquipos(data) {
    const equipos = Array.isArray(data?.equipos) ? data.equipos : [];

    if (equipos.length === 0) {
        return "🏆 No hay equipos inscritos actualmente en el torneo.";
    }

    const lista = equipos.map(
        (equipo, indice) =>
            `${indice + 1}. ${equipo.nombre || "Equipo sin nombre"}`
    );

    return [
        "🏆 EQUIPOS INSCRITOS",
        "━━━━━━━━━━━━━━━━━━",
        ...lista,
        "━━━━━━━━━━━━━━━━━━",
        `👥 Total: ${equipos.length}`
    ].join("\n");
}

function responderTabla(data) {
    const equipos = Array.isArray(data?.equipos) ? data.equipos : [];

    if (equipos.length === 0) {
        return "📊 La tabla todavía no tiene posiciones registradas.";
    }

    const lista = equipos.map((equipo, indice) => {
        const puntos = equipo.puntos ?? 0;
        const victorias = equipo.victorias ?? 0;
        const pj = equipo.pj ?? 0;

        return `${indice + 1}. ${equipo.nombre || "Equipo"} — ${puntos} pts | PJ ${pj} | V ${victorias}`;
    });

    return [
        "📊 TABLA OFICIAL",
        "━━━━━━━━━━━━━━━━━━",
        ...lista,
        "━━━━━━━━━━━━━━━━━━"
    ].join("\n");
}

function responderFixture(data) {
    const partidos = Array.isArray(data?.partidos) ? data.partidos : [];

    if (partidos.length === 0) {
        return "⚔️ No hay partidos programados actualmente.";
    }

    const lista = partidos.map(partido => {
        const estado = partido.ganador
            ? `🏆 Ganador: ${partido.ganador}`
            : "⏳ Pendiente";

        return [
            `#${partido.numero || "?"} ${partido.equipo1 || "Equipo 1"} 🆚 ${partido.equipo2 || "Equipo 2"}`,
            estado
        ].join("\n");
    });

    return [
        "⚔️ FIXTURE ACTUAL",
        "━━━━━━━━━━━━━━━━━━",
        ...lista,
        "━━━━━━━━━━━━━━━━━━",
        `📋 Total: ${data.total || partidos.length}`,
        `✅ Jugados: ${data.jugados || 0}`,
        `⏳ Pendientes: ${data.pendientes || 0}`
    ].join("\n");
}

function responderResultados(data) {
    const resultados = Array.isArray(data?.resultados)
        ? data.resultados
        : [];

    if (resultados.length === 0) {
        return "📋 No hay resultados registrados actualmente.";
    }

    const lista = resultados.map((resultado, indice) =>
        `${indice + 1}. ${JSON.stringify(resultado)}`
    );

    return [
        "📋 RESULTADOS REGISTRADOS",
        "━━━━━━━━━━━━━━━━━━",
        ...lista,
        "━━━━━━━━━━━━━━━━━━",
        `📊 Total: ${resultados.length}`
    ].join("\n");
}

function responderJornada(data, numero = null) {
    const jornadas = Array.isArray(data?.jornadas) ? data.jornadas : [];

    if (jornadas.length === 0) {
        return "📅 No hay jornadas registradas actualmente.";
    }

    const jornada = numero !== null
        ? jornadas.find(j => String(j.numero) === String(numero))
        : jornadas[jornadas.length - 1];

    if (!jornada) {
        return `❌ No encontré la jornada ${numero}.`;
    }

    const partidos = Array.isArray(jornada.partidos)
        ? jornada.partidos
        : [];

    return [
        `📅 JORNADA ${jornada.numero}`,
        "━━━━━━━━━━━━━━━━━━",
        `🕒 Registrada: ${jornada.fecha || "Sin fecha"}`,
        ...(
            partidos.length > 0
                ? partidos.map((partido, indice) =>
                    `${indice + 1}. ${partido}`
                )
                : ["⚠️ No hay partidos registrados en esta jornada."]
        ),
        "━━━━━━━━━━━━━━━━━━"
    ].join("\n");
}


function responderProgramacion(data, fecha = null) {
    const partidos = Array.isArray(data?.partidos)
        ? data.partidos
        : [];

    if (partidos.length === 0) {
        return "⚔️ No hay partidos programados actualmente.";
    }

    const temporada = data?.temporada || {};

    function obtenerAnoTemporada() {
        const texto = String(
            temporada?.fechaInicio || ""
        );

        const coincidencia = texto.match(/(\d{4})/);

        return coincidencia
            ? Number(coincidencia[1])
            : new Date().getFullYear();
    }

    function normalizarTexto(texto = "") {
        return String(texto)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function convertirFechaTexto(texto, ano) {
        const valor = normalizarTexto(texto);

        let match = valor.match(
            /^(\d{1,2})\s+de\s+([a-z]+)$/
        );

        if (!match) {
            match = valor.match(
                /^(\d{1,2})\s+([a-z]+)$/
            );
        }

        if (match) {
            const meses = {
                enero: 0,
                febrero: 1,
                marzo: 2,
                abril: 3,
                mayo: 4,
                junio: 5,
                julio: 6,
                agosto: 7,
                septiembre: 8,
                octubre: 9,
                noviembre: 10,
                diciembre: 11
            };

            const mes = meses[match[2]];

            if (mes === undefined) {
                return null;
            }

            return new Date(
                ano,
                mes,
                Number(match[1])
            );
        }

        match = valor.match(
            /^(\d{1,2})[\/\-](\d{1,2})$/
        );

        if (match) {
            return new Date(
                ano,
                Number(match[2]) - 1,
                Number(match[1])
            );
        }

        return null;
    }

    function fechaClave(fecha) {
        if (!fecha) {
            return null;
        }

        return [
            fecha.getFullYear(),
            String(fecha.getMonth() + 1).padStart(2, "0"),
            String(fecha.getDate()).padStart(2, "0")
        ].join("-");
    }

    function obtenerFechaPartido(partido) {
        return convertirFechaTexto(
            partido?.fecha,
            obtenerAnoTemporada()
        );
    }

    function resolverFechaSolicitada(valor) {
        if (!valor) {
            return null;
        }

        const solicitado = normalizarTexto(valor);
        const ano = obtenerAnoTemporada();

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        if (solicitado === "hoy") {
            return hoy;
        }

        if (solicitado === "manana") {
            const fecha = new Date(hoy);
            fecha.setDate(fecha.getDate() + 1);
            return fecha;
        }

        if (solicitado === "pasado manana") {
            const fecha = new Date(hoy);
            fecha.setDate(fecha.getDate() + 2);
            return fecha;
        }

        const dias = [
            "domingo",
            "lunes",
            "martes",
            "miercoles",
            "jueves",
            "viernes",
            "sabado"
        ];

        const indiceDia = dias.indexOf(solicitado);

        if (indiceDia !== -1) {
            for (const partido of partidos) {
                const fechaPartido =
                    obtenerFechaPartido(partido);

                if (
                    fechaPartido &&
                    fechaPartido.getDay() === indiceDia
                ) {
                    return fechaPartido;
                }
            }

            return null;
        }

        return convertirFechaTexto(
            solicitado,
            ano
        );
    }

    const fechaSolicitada =
        resolverFechaSolicitada(fecha);

    const partidosFiltrados = fecha
        ? partidos.filter(partido => {
            const fechaPartido =
                obtenerFechaPartido(partido);

            if (!fechaPartido || !fechaSolicitada) {
                return false;
            }

            return (
                fechaClave(fechaPartido) ===
                fechaClave(fechaSolicitada)
            );
        })
        : partidos;

    if (partidosFiltrados.length === 0) {
        return fecha
            ? `📅 No hay enfrentamientos programados para ${fecha}.`
            : "⚔️ No hay partidos programados actualmente.";
    }

    const lista = partidosFiltrados.map(partido => [
        `⚔️ ${partido.jornada || "Partido oficial"}`,
        `🕒 ${partido.hora || "Hora por definir"}`,
        `${partido.equipo1 || "Equipo 1"} 🆚 ${partido.equipo2 || "Equipo 2"}`
    ].join("\n"));

    const tituloFecha = fecha
        ? String(fecha).toUpperCase()
        : "PROGRAMACIÓN ACTUAL";

    const torneo = (() => {
        try {
            return require("../../database/torneo.json") || {};
        } catch (error) {
            return {};
        }
    })();

    return [
        `🏆 ${torneo.nombre || torneo.titulo || "LIGA TITANS TEAM"}`,
        `📅 ${tituloFecha}`,
        "━━━━━━━━━━━━━━━━━━",
        ...lista,
        "━━━━━━━━━━━━━━━━━━",
        `🎮 Formato: ${torneo.formato || "Sin definir"}`,
        `📊 Enfrentamientos: ${partidosFiltrados.length}`
    ].join("\n");
}

module.exports = {
    responderEstadoTorneo,
    responderEquipos,
    responderTabla,
    responderFixture,
    responderProgramacion,
    responderResultados,
    responderJornada
};
