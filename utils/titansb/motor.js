require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");
const { buscarWeb } = require("./buscador");
const { buscarMemorias } = require("./memoria");
const contexto = require("./contexto");
const {
    obtenerTitulo,
    obtenerLogros
} = require("../logros");

const {
    normalizarId,
    obtenerPerfilMiembro
} = require("./perfilesMiembros");

const {
    construirContextoLiga,
    detectarPreguntaLiga,
    detectarEntidadLiga,
    buscarProximoPartidoEquipo,
    obtenerFixture,
    obtenerEquipos,
    obtenerEquiposInscritos,
    obtenerTabla,
    obtenerResultados,
    obtenerConocimientoTorneo
} = require("./conocimiento");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const MODELO = "gemini-3.6-flash";

function construirContextoEntidad(entidad) {

    if (!entidad || typeof entidad !== "object") {
        return "";
    }

    const lineas = [];

    // ========================================================
    // 🏷️ IDENTIDAD
    // ========================================================

    if (entidad.nombre) {
        lineas.push(`Nombre: ${entidad.nombre}`);
    }

    // ========================================================
    // 👤 PERSONA
    // ========================================================

    if (entidad.tipo === "persona") {

        if (entidad.rol) {
            lineas.push(`Rol: ${entidad.rol}`);
        }

        if (entidad.equipo) {
            lineas.push(`Equipo: ${entidad.equipo}`);
        }
        if (entidad.nombreJuego) {
            lineas.push(`Nombre de juego: ${entidad.nombreJuego}`);
        }

        if (entidad.pais) {
            lineas.push(`País: ${entidad.pais}`);
        }

        if (entidad.rolJuego) {
            lineas.push(`Rol(es) competitivo(s): ${entidad.rolJuego}`);
        }

        if (entidad.rango) {
            lineas.push(`Rango competitivo: ${entidad.rango}`);
        }

        return lineas.join("\n");
    }

    // ========================================================
    // 👥 EQUIPO
    // ========================================================

    const esEquipo =
        entidad.nombreLider !== undefined ||
        Array.isArray(entidad.miembros) ||
        entidad.victorias !== undefined ||
        entidad.derrotas !== undefined ||
        entidad.inscrito !== undefined;

    if (esEquipo) {

        if (entidad.nombreLider) {
            lineas.push(
                `Líder: ${entidad.nombreLider}`
            );
        }

        if (
            Array.isArray(entidad.subLideres) &&
            entidad.subLideres.length
        ) {
            lineas.push(
                `Sublíderes: ${entidad.subLideres.length}`
            );
        }

        if (Array.isArray(entidad.miembros)) {
            lineas.push(
                `Miembros registrados: ${entidad.miembros.length}`
            );
        }

        if (entidad.nivel !== undefined) {
            lineas.push(
                `Nivel: ${entidad.nivel}`
            );
        }

        if (entidad.victorias !== undefined) {
            lineas.push(
                `Victorias: ${entidad.victorias}`
            );
        }

        if (entidad.derrotas !== undefined) {
            lineas.push(
                `Derrotas: ${entidad.derrotas}`
            );
        }

        if (entidad.empates !== undefined) {
            lineas.push(
                `Empates: ${entidad.empates}`
            );
        }

        if (entidad.campeonatos !== undefined) {
            lineas.push(
                `Campeonatos: ${entidad.campeonatos}`
            );
        }

        if (entidad.inscrito !== undefined) {
            lineas.push(
                `Inscrito en torneo: ${
                    entidad.inscrito ? "Sí" : "No"
                }`
            );
        }

        if (entidad.temporada) {
            lineas.push(
                `Temporada: ${entidad.temporada}`
            );
        }

        if (entidad.region) {
            lineas.push(
                `Región: ${entidad.region}`
            );
        }

        if (entidad.descripcion) {
            lineas.push(
                `Descripción: ${entidad.descripcion}`
            );
        }
    }

    // ========================================================
    // 🏆 TORNEO
    // ========================================================

    if (
        entidad.premio !== undefined ||
        entidad.formato !== undefined ||
        entidad.maxEquipos !== undefined
    ) {

        if (entidad.titulo) {
            lineas.push(
                `Título: ${entidad.titulo}`
            );
        }

        if (entidad.descripcion) {
            lineas.push(
                `Descripción: ${entidad.descripcion}`
            );
        }

        if (entidad.creador) {
            lineas.push(
                `Creador: ${entidad.creador}`
            );
        }

        if (entidad.premio) {
            lineas.push(
                `Premio: ${entidad.premio}`
            );
        }

        if (entidad.estado) {
            lineas.push(
                `Estado: ${entidad.estado}`
            );
        }

        if (entidad.formato) {
            lineas.push(
                `Formato: ${entidad.formato}`
            );
        }

        if (entidad.clasifican) {
            lineas.push(
                `Clasificación: ${entidad.clasifican}`
            );
        }

        if (entidad.region) {
            lineas.push(
                `Región: ${entidad.region}`
            );
        }

        if (entidad.hora) {
            lineas.push(
                `Horario: ${entidad.hora}`
            );
        }

        if (entidad.horaInicio) {
            lineas.push(
                `Hora de inicio: ${entidad.horaInicio}`
            );
        }

        if (entidad.proximaFecha) {
            lineas.push(
                `Próxima fecha: ${entidad.proximaFecha}`
            );
        }

        if (entidad.maxEquipos !== undefined) {
            lineas.push(
                `Máximo de equipos: ${entidad.maxEquipos}`
            );
        }
    }

    // ========================================================
    // 📅 TEMPORADA
    // ========================================================

    if (
        entidad.fechaInicio !== undefined ||
        entidad.inscripciones !== undefined
    ) {

        if (entidad.estado) {
            lineas.push(
                `Estado: ${entidad.estado}`
            );
        }

        if (entidad.fechaInicio) {
            lineas.push(
                `Fecha de inicio: ${entidad.fechaInicio}`
            );
        }

        if (entidad.fechaFin) {
            lineas.push(
                `Fecha de fin: ${entidad.fechaFin}`
            );
        }

        if (entidad.inscripciones !== undefined) {
            lineas.push(
                `Inscripciones: ${
                    entidad.inscripciones ? "Abiertas" : "Cerradas"
                }`
            );
        }
    }

    // ========================================================
    // ⚔️ JORNADA
    // ========================================================

    if (
        entidad.numero !== undefined &&
        Array.isArray(entidad.partidos)
    ) {

        lineas.push(
            `Número de jornada: ${entidad.numero}`
        );

        if (entidad.fecha) {
            lineas.push(
                `Fecha: ${entidad.fecha}`
            );
        }

        if (entidad.partidos.length) {

            lineas.push(
                `Partidos registrados: ${entidad.partidos.length}`
            );

            entidad.partidos.forEach(
                (partido, indice) => {

                    lineas.push(
                        `Partido ${indice + 1}: ${partido}`
                    );

                }
            );

        } else {

            lineas.push(
                "Partidos registrados: 0"
            );

        }
    }

    return lineas.join("\n");
}

function necesitaBusqueda(pregunta, entidad = null) {

    const texto =
        String(pregunta || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

    // ============================================================
    // 🛡️ PRIORIDAD — ENTIDAD OFICIAL
    // ============================================================
    //
    // Si existe una entidad oficial y la pregunta solicita
    // información que normalmente pertenece a sus datos internos,
    // NO se debe consultar la web.
    //
    // La web queda reservada para:
    // - actualidad
    // - noticias
    // - resultados recientes
    // - próximos partidos
    // - información externa
    //
    // Esto evita que datos oficiales como:
    // líder, campeonatos, nivel, miembros, victorias, derrotas
    // o estado sean reemplazados accidentalmente por información web.

    if (
        entidad &&
        typeof entidad === "object"
    ) {

        // ========================================================
        // 🌐 ACTUALIDAD EXPLÍCITA
        // ========================================================

        const indicadoresActualidad = [
            "hoy",
            "ahora",
            "actualmente",
            "actualidad",
            "recientemente",
            "reciente",
            "recientes",
            "ultimamente",
            "ultima hora",
            "ultimas horas",
            "esta semana",
            "este mes",
            "este ano",
            "este año",
            "que ha pasado",
            "que paso",
            "que esta pasando",
            "que esta ocurriendo",
            "que ocurre",
            "ultimo partido",
            "ultima partida",
            "ultimos partidos",
            "proximo partido",
            "proxima partida",
            "proximos partidos",
            "proximas partidas",
            "cuando juega",
            "cuando vuelve a jugar"
        ];

        const esActualidad =
            indicadoresActualidad.some(
                frase => texto.includes(frase)
            );

        if (esActualidad) {
            return true;
        }

        // ========================================================
        // 👤 PERSONA
        // ========================================================

        if (entidad.tipo === "persona") {

            const preguntasPersona = [
                "donde juega",
                "en que equipo juega",
                "en que equipo esta",
                "su equipo",
                "que equipo tiene",
                "cual es su equipo",
                "cual es el equipo",
                "que equipo es",
                "su rol",
                "que rol tiene",
                "cual es su rol",
                "que cargo tiene",
                "trayectoria",
                "historial",
                "experiencia",
                "logros personales",
                "logros personal",
                "logro personal",
                "premios personales",
                "premios personal",
                "premio personal",
                "sus logros",
                "sus premios"
            ];

            if (
                preguntasPersona.some(
                    frase => texto.includes(frase)
                )
            ) {
                return false;
            }
        }

        // ========================================================
        // 👥 EQUIPO / ENTIDAD OFICIAL
        // ========================================================

        const preguntasEntidad = [
            // Identidad / estructura
            "quien es su lider",
            "quien es el lider",
            "quien es su capitan",
            "quien es el capitan",
            "lider",
            "capitan",

            // Estadísticas
            "cuantos campeonatos",
            "cuantos titulos",
            "cuantos partidos",
            "cuantas victorias",
            "cuantas derrotas",
            "cuantos empates",
            "cuantos miembros",
            "cuantos jugadores",
            "que nivel",
            "cual es su nivel",
            "nivel",

            // Datos competitivos internos
            "esta inscrito",
            "esta inscrita",
            "esta eliminado",
            "esta eliminada",
            "estado",
            "historial",
            "victorias",
            "derrotas",
            "empates",
            "campeonatos",
            "titulos",
            "miembros",
            "jugadores",
            "equipo",
            "roster",

            // Identidad / información básica
            "hablame de",
            "informacion sobre",
            "informacion de",
            "datos de",
            "quien es",
            "cual es"
        ];

        if (
            preguntasEntidad.some(
                frase => texto.includes(frase)
            )
        ) {
            return false;
        }
    }

    // ============================================================
    // 🌐 INDICADORES DIRECTOS DE ACTUALIDAD
    // ============================================================

    const indicadores = [
        "hoy",
        "ahora",
        "actualmente",
        "actual",
        "actualidad",

        "recientemente",
        "reciente",
        "recientes",
        "ultimamente",
        "ultima hora",
        "ultimas horas",

        "ultimo",
        "ultima",
        "ultimos",
        "ultimas",

        "noticia",
        "noticias",
        "novedad",
        "novedades",

        "que ha pasado",
        "que paso",
        "que esta pasando",
        "que esta ocurriendo",

        "paso",
        "pasando",
        "ocurrio",
        "ocurriendo",

        "ganador",
        "mundial",

        "resultado",
        "resultados",

        "juego hoy",

        "precio",

        "farandula",
        "famoso",
        "famosa"
    ];

    return indicadores.some(
        palabra => texto.includes(palabra)
    );
}

// ============================================================
// 🛡️ FALLBACK LOCAL — DATOS OFICIALES
// ============================================================


// ============================================================
// 🤖 PERSONALIDAD LOCAL DE TITANSB
// ============================================================
//
// Esta capa representa el comportamiento conversacional básico
// del miembro virtual cuando no hace falta utilizar Gemini.
//
// IMPORTANTE:
// • No sustituye los datos oficiales.
// • No inventa estadísticas.
// • No modifica contexto.
// • No modifica memoria.
// • Devuelve NULL cuando la pregunta debe continuar hacia
//   otras capas del motor.
// ============================================================

function generarRespuestaPersonalidadLocal(pregunta, entidad = null) {

    const texto =
        String(pregunta || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[¿?¡!.,;:]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();

    if (!texto) {
        return null;
    }

    // ========================================================
    // 👋 SALUDOS
    // ========================================================

    if (
        /^(hola|holi|hello|buenas|buenos dias|buenas tardes|buenas noches)( titansb)?[!. ]*$/.test(texto)
    ) {
        return (
            "🤖 ¡Todo bien por aquí! 😎 " +
            "Listo para seguir con la Liga Titans Team. ⚔️"
        );
    }

    // ========================================================
    // 🧠 IDENTIDAD
    // ========================================================

    if (
        texto.includes("quien eres") ||
        texto.includes("quien es titansb") ||
        texto.includes("que eres") ||
        texto.includes("que es titansb")
    ) {
        return (
            "🤖 Soy **TitansB**, el miembro virtual de la " +
            "Liga Titans Team. ⚔️\n\n" +
            "Estoy aquí para acompañar la conversación y ayudar " +
            "con la información de la comunidad."
        );
    }

    // ========================================================
    // 🙂 ESTADO / CONVERSACIÓN
    // ========================================================

    if (
        texto === "como estas" ||
        texto === "como te va" ||
        texto === "que tal estas"
    ) {
        return (
            "🤖 Todo bien por aquí 😎. " +
            "Activo y listo para la siguiente partida. 🎮⚔️"
        );
    }

    // ========================================================
    // 🙏 AGRADECIMIENTO
    // ========================================================

    if (
        texto === "gracias" ||
        texto === "muchas gracias" ||
        texto === "gracias titansb" ||
        texto === "te agradezco"
    ) {
        return (
            "🤖 ¡De nada! 😎 " +
            "Para eso estamos en la Liga Titans Team. ⚔️"
        );
    }

    // ========================================================
    // 😂 HUMOR / REACCIÓN
    // ========================================================

    if (
        texto === "jajaja" ||
        texto === "jajajaja" ||
        texto === "xd" ||
        texto === "jaja"
    ) {
        return "🤖 😂 Esa estuvo buena.";
    }

    // ========================================================
    // 🎮 ACTITUD COMPETITIVA
    // ========================================================

    if (
        texto.includes("vamos titans") ||
        texto.includes("vamos equipo") ||
        texto.includes("estamos listos")
    ) {
        return (
            "🤖 ¡Eso es! 🔥 " +
            "Actitud competitiva y a demostrarlo en la partida. ⚔️🎮"
        );
    }

    // ========================================================
    // 💬 OPINIÓN GENERAL
    // ========================================================

    if (
        texto.includes("que opinas de la coordinacion") ||
        texto.includes("que opinas sobre la coordinacion") ||
        texto.includes("por que es importante la coordinacion")
    ) {
        return (
            "🤖 Para mí, la coordinación es clave en un equipo. " +
            "Puedes tener buenos jugadores, pero sin comunicación " +
            "y sincronización se pierde mucha fuerza. 🎮⚔️"
        );
    }

    // ========================================================
    // 👤 OPINIÓN SOBRE PERSONA
    // ========================================================
    //
    // Si existe una entidad oficial, solo utilizamos los datos
    // confirmados. La personalidad NO inventa características.
    // ========================================================

    if (
        entidad &&
        entidad.tipo === "persona" &&
        (
            texto.includes("que opinas de") ||
            texto.includes("que opinas sobre") ||
            texto.includes("que piensas de") ||
            texto.includes("que piensas sobre") ||
            texto.includes("como ves a") ||
            texto.includes("como ves el") ||
            texto.includes("como ves la") ||
            texto.includes("como es")
        )
    ) {

        const nombre =
            entidad.nombre || "esta persona";

        const equipo =
            entidad.equipo || null;

        const rol =
            entidad.rol || null;

        let respuesta =
            `🤖 Sobre **${nombre}**, solo puedo basarme en ` +
            `la información oficial que tengo registrada.`;

        if (rol || equipo) {
            respuesta += "\n\n";

            if (rol) {
                respuesta += `• Rol registrado: **${rol}**\n`;
            }

            if (equipo) {
                respuesta += `• Equipo registrado: **${equipo}**`;
            }
        }

        respuesta +=
            "\n\nNo voy a inventar características o desempeño " +
            "que no estén registrados oficialmente.";

        return respuesta;
    }

    // ========================================================
    // 👥 OPINIÓN SOBRE EQUIPO
    // ========================================================
    //
    // Esta capa permite una respuesta conversacional local
    // cuando el usuario pide una opinión general sobre un equipo.
    //
    // IMPORTANTE:
    // • No inventa estadísticas.
    // • No inventa logros.
    // • No inventa rendimiento.
    // • No atribuye personalidad al equipo.
    // • No sustituye los datos oficiales.
    // ========================================================

    if (
        entidad &&
        entidad.tipo === "equipo" &&
        (
            texto.includes("que opinas de") ||
            texto.includes("que opinas sobre") ||
            texto.includes("que piensas de") ||
            texto.includes("que piensas sobre") ||
            texto.includes("como ves a") ||
            texto.includes("como ves el") ||
            texto.includes("como ves la")
        )
    ) {

        const nombre =
            entidad.nombre || "este equipo";

        return (
            `🤖 Sobre **${nombre}**, lo veo como parte de la ` +
            `competencia de la Liga Titans Team. ⚔️\\n\\n` +
            `Prefiero basarme en los datos oficiales registrados ` +
            `antes que inventar una valoración sobre su rendimiento, ` +
            `estilo o trayectoria.`
        );
    }

    // ========================================================
    // ❓ NO ES PERSONALIDAD LOCAL
    // ========================================================

    return null;
}

function generarFallbackOficial(pregunta, entidad) {

    if (!entidad || typeof entidad !== "object") {
        return null;
    }

    const texto =
        String(pregunta || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

    // ========================================================
    // 👤 PERSONA
    // ========================================================

    if (entidad.tipo === "persona") {

        const nombre =
            entidad.nombre || "La persona";

        const rol =
            entidad.rol || null;

        const equipo =
            entidad.equipo || null;

        // ====================================================
        // 🪪 IDENTIDAD BÁSICA
        // ====================================================
        // Responde preguntas de identidad sobre una persona
        // usando únicamente los datos oficiales disponibles.
        //
        // IMPORTANTE:
        // • No captura opiniones.
        // • No captura personalidad.
        // • No captura trayectoria/logros.
        // • No modifica el referente.
        // ====================================================

        if (
            texto.includes("quien es") ||
            texto.includes("quien es en la liga") ||
            texto.includes("dime quien es") ||
            texto.includes("dime quién es") ||
            texto.includes("hablame de") ||
            texto.includes("háblame de")
        ) {
            const referenciaIdentidad =
                Boolean(entidad) &&
                entidad.tipo === "persona";

            if (referenciaIdentidad) {
                let respuesta =
                    `**${nombre}** está registrado oficialmente`;

                if (rol) {
                    respuesta += ` como **${rol}**`;
                }

                if (equipo) {
                    respuesta += ` en **${equipo}**`;
                }

                respuesta += ".";

                return respuesta;
            }
        }

        // ====================================================
        // 🏠 EQUIPO / DÓNDE JUEGA
        // ====================================================

        if (
            (
              texto.includes("su equipo") ||
              texto.includes("qué equipo") ||
              texto.includes("que equipo") ||
              texto.includes("cual es el equipo") ||
              texto.includes("que equipo es") ||
              texto.includes("en qué equipo") ||
              texto.includes("en que equipo") ||
              texto.includes("a qué equipo") ||
              texto.includes("a que equipo") ||
              texto.includes("dónde juega") ||
              texto.includes("donde juega") ||
              texto.includes("en qué equipo juega") ||
              texto.includes("en que equipo juega") ||
              texto.includes("en qué equipo está") ||
              texto.includes("en que equipo esta") ||
texto.includes("tiene equipo")
          ) &&
          !texto.includes("victorias") &&
          !texto.includes("victoria") &&
          !texto.includes("derrotas") &&
          !texto.includes("derrota") &&
          !texto.includes("empates") &&
          !texto.includes("empate") &&
          !texto.includes("campeonatos") &&
          !texto.includes("campeonato") &&
          !texto.includes("prestigio") &&
          !texto.includes("prestigios") &&
          !texto.includes("cómo va") &&
          !texto.includes("como va")
        ) {

            if (equipo) {
                return (
                    `El equipo registrado de **${nombre}** es **${equipo}**.`
                );
            }

            return (
                `No tengo registrado el equipo de **${nombre}**.`
            );
        }

        // ====================================================
        // 🎮 ROL COMPETITIVO
        // ====================================================
        // IMPORTANTE:
        // • "rol competitivo" corresponde a rolJuego.
        // • No debe confundirse con entidad.rol
        //   (miembro, líder, etc.).
        // ====================================================

        if (
            texto.includes("rol competitivo") ||
            texto.includes("roles competitivos") ||
            texto.includes("rol(es) competitivo") ||
            texto.includes("que rol competitivo") ||
            texto.includes("qué rol competitivo") ||
            texto.includes("cual es su rol competitivo") ||
            texto.includes("cuál es su rol competitivo") ||
            texto.includes("cual es el rol competitivo") ||
            texto.includes("cuál es el rol competitivo")
        ) {

            const rolCompetitivo =
                entidad.rolJuego || null;

            if (rolCompetitivo) {
                return (
                    `El rol competitivo registrado de **${nombre}** es **${rolCompetitivo}**.`
                );
            }

            return (
                `No tengo registrado el rol competitivo de **${nombre}**.`
            );
        }

        // ====================================================
        // 🏆 RANGO COMPETITIVO
        // ====================================================
        // Responde el rango competitivo registrado de la
        // persona sin depender de Gemini.
        // ====================================================

        if (
            texto.includes("rango competitivo") ||
            texto.includes("cual es su rango") ||
            texto.includes("cuál es su rango") ||
            texto.includes("cual es el rango") ||
            texto.includes("cuál es el rango") ||
            texto.includes("que rango tiene") ||
            texto.includes("qué rango tiene") ||
            texto.includes("rango tiene")
        ) {

            const rangoCompetitivo =
                entidad.rango || null;

            if (rangoCompetitivo) {
                return (
                    `El rango competitivo registrado de **${nombre}** es **${rangoCompetitivo}**.`
                );
            }

            return (
                `No tengo registrado el rango competitivo de **${nombre}**.`
            );
        }

        // ====================================================
        // 👑 ROL
        // ====================================================

        if (
            texto.includes("su rol") ||
            texto.includes("qué rol") ||
            texto.includes("que rol") ||
            texto.includes("cual es el rol") ||
            texto.includes("cual es su rol") ||
            texto.includes("qué cargo") ||
            texto.includes("que cargo") ||
            texto.includes("qué función") ||
            texto.includes("que funcion")
        ) {

            if (rol) {
                return (
                    `El rol registrado de **${nombre}** es **${rol}**` +
                    `${equipo ? ` en **${equipo}**.` : "."}`
                );
            }

            return (
                `No tengo registrado el rol de **${nombre}**.`
            );
        }

        // ====================================================
        // 🧭 PERSONALIDAD / LIDERAZGO
        // ====================================================

        const referenciaPersonalidad =
            texto.includes(nombre.toLowerCase());

        if (
            referenciaPersonalidad &&
            (
                texto.includes("personalidad") ||
                texto.includes("estilo") ||
                texto.includes("carácter") ||
                texto.includes("caracter") ||
                texto.includes("cómo lidera") ||
                texto.includes("como lidera") ||
                texto.includes("estilo de liderazgo") ||
                texto.includes("forma de liderar")
            )
        ) {

            let respuesta =
                `**${nombre}**`;

            if (rol) {
                respuesta += ` es ${rol}`;
            }

            if (equipo) {
                respuesta += ` de **${equipo}**`;
            }

            respuesta +=
                ". No tengo datos oficiales disponibles sobre su personalidad o estilo de liderazgo.";

            return respuesta;
        }

        // ====================================================
        // 📜 TRAYECTORIA
        // ====================================================

        if (
            texto.includes("trayectoria") ||
            texto.includes("historial") ||
            texto.includes("experiencia")
        ) {

            return (
                `No tengo datos oficiales disponibles sobre la trayectoria de **${nombre}**. ` +
                `Solo puedo confirmar que su rol registrado es **${rol || "no especificado"}**` +
                `${equipo ? ` en **${equipo}**.` : "."}`
            );
        }

        // ====================================================
        // 🏆 LOGROS PERSONALES
        // ====================================================

        if (
            texto.includes("logros personales") ||
            texto.includes("logros personal") ||
            texto.includes("logro personal") ||
            texto.includes("premios personales") ||
            texto.includes("premios personal") ||
            texto.includes("premio personal")
        ) {

            return (
                `No tengo datos oficiales disponibles sobre los logros personales de **${nombre}**. ` +
                `Solo puedo confirmar su rol registrado como **${rol || "no especificado"}**` +
                `${equipo ? ` en **${equipo}**.` : "."}`
            );
        }

        // ====================================================
        // 🏆 LOGROS GENERALES
        // ====================================================

        if (
            texto.includes("logros") ||
            texto.includes("logro") ||
            texto.includes("premios") ||
            texto.includes("premio")
        ) {

            return (
                `No tengo datos oficiales disponibles sobre los logros de **${nombre}**. ` +
                `Solo puedo confirmar su rol registrado como **${rol || "no especificado"}**` +
                `${equipo ? ` en **${equipo}**.` : "."}`
            );
        }

        
          // ====================================================
          // ====================================================
          // 🔗 EQUIPO ASOCIADO A LA PERSONA
          // ====================================================
          // Entidad oficial del equipo asociado a la persona.
          // Se mantiene disponible para todas las ramas
          // competitivas de esta sección.
          // ====================================================

          const equipoPersona =
              entidad &&
              entidad.equipoEntidad &&
              typeof entidad.equipoEntidad === "object"
                  ? entidad.equipoEntidad
                  : null;

          // ====================================================
          // 🏷️ NOMBRE DEL EQUIPO ASOCIADO A LA PERSONA
          // ====================================================
          // Disponible para todas las ramas estadísticas
          // de Persona → Equipo.
          // ====================================================

          const nombreEquipoPersona =
              equipoPersona?.nombre ||
              entidad?.equipo ||
              equipo ||
              "su equipo";

          // 📊 PERSONA → EQUIPO — ¿CÓMO VA?
          // ====================================================

          if (
              texto.includes("como va su equipo") ||
              texto.includes("cómo va su equipo") ||
              texto.includes("como esta su equipo") ||
              texto.includes("cómo está su equipo") ||
              texto.includes("como se encuentra su equipo") ||
              texto.includes("cómo se encuentra su equipo") ||
              texto.includes("como sigue su equipo") ||
              texto.includes("cómo sigue su equipo") ||
              texto.includes("como le va a su equipo") ||
              texto.includes("cómo le va a su equipo") ||
              texto.includes("como le va el equipo") ||
              texto.includes("cómo le va el equipo") ||
              texto.includes("que tal va su equipo") ||
              texto.includes("qué tal va su equipo") ||

                // 👤 PERSONA → EQUIPO EXPLÍCITO
                // Ejemplo: "cómo va el equipo de David Rivera"
                texto.includes("como va el equipo de ") ||
                texto.includes("cómo va el equipo de ") ||
                texto.includes("como esta el equipo de ") ||
                texto.includes("cómo está el equipo de ") ||
                texto.includes("como se encuentra el equipo de ") ||
                texto.includes("cómo se encuentra el equipo de ") ||
                texto.includes("como sigue el equipo de ") ||
                texto.includes("cómo sigue el equipo de ") ||
                texto.includes("como le va al equipo de ") ||
                texto.includes("cómo le va al equipo de ") ||
                texto.includes("que tal va el equipo de ") ||
                texto.includes("qué tal va el equipo de ")
          ) {


              if (equipoPersona) {

                    const nombreEquipo =
                        equipoPersona.nombre ||
                        equipo ||
                        "su equipo";

                    const victorias =
                        equipoPersona.victorias !== undefined
                            ? equipoPersona.victorias
                            : "N/D";

                    const derrotas =
                        equipoPersona.derrotas !== undefined
                            ? equipoPersona.derrotas
                            : "N/D";

                    const empates =
                        equipoPersona.empates !== undefined
                            ? equipoPersona.empates
                            : "N/D";

                    const campeonatos =
                        equipoPersona.campeonatos !== undefined
                            ? equipoPersona.campeonatos
                            : "N/D";

                    return (
                        `📊 **${nombreEquipo}** — resumen competitivo oficial\n\n` +
                        `👤 Miembro consultado: **${nombre}**\n` +
                        `⚔️ Victorias: **${victorias}**\n` +
                        `❌ Derrotas: **${derrotas}**\n` +
                        `🤝 Empates: **${empates}**\n` +
                        `🏆 Campeonatos: **${campeonatos}**`
                    );
                }

                if (equipo) {
                    return (
                        `**${nombre}** pertenece a **${equipo}**, ` +
                        `pero no tengo disponibles sus estadísticas competitivas oficiales.`
                    );
                }

                return (
                    `No tengo registrado un equipo asociado a **${nombre}**.`
                );
            }

            // ⚔️ VICTORIAS DEL EQUIPO
              // ====================================================

              if (
                  texto.includes("victorias") ||
                  texto.includes("victoria") ||
                  texto.includes("ganadas") ||
                  texto.includes("ganados") ||
                  texto.includes("cuántas ha ganado") ||
                  texto.includes("cuantas ha ganado") ||
                  texto.includes("cuántos partidos ha ganado") ||
                  texto.includes("cuantos partidos ha ganado") ||
                  texto.includes("cuántos partidos ganó") ||
                  texto.includes("cuantos partidos gano") ||
                  texto.includes("cuántos encuentros ha ganado") ||
                  texto.includes("cuantos encuentros ha ganado") ||
                  texto.includes("cuántos encuentros ganó") ||
                  texto.includes("cuantos encuentros gano")
              ) {

                  if (equipoPersona.victorias !== undefined) {
                      return (
                          `**${nombre}** pertenece a **${nombreEquipoPersona}**. ` +
                          `El equipo registra oficialmente ` +
                          `**${equipoPersona.victorias} victorias**.`
                      );
                  }

                  return (
                      `No tengo registradas oficialmente las victorias ` +
                      `de **${nombreEquipoPersona}**.`
                  );
              }

              // ====================================================
              // ❌ DERROTAS DEL EQUIPO
              // ====================================================

              if (
                  texto.includes("derrotas") ||
                  texto.includes("derrota") ||
                  texto.includes("perdidas") ||
                  texto.includes("pérdidas") ||
                  texto.includes("perdidos")
              ) {

                  if (equipoPersona.derrotas !== undefined) {
                      return (
                          `**${nombre}** pertenece a **${nombreEquipoPersona}**. ` +
                          `El equipo registra oficialmente ` +
                          `**${equipoPersona.derrotas} derrotas**.`
                      );
                  }

                  return (
                      `No tengo registradas oficialmente las derrotas ` +
                      `de **${nombreEquipoPersona}**.`
                  );
              }

              // ====================================================
              // 🤝 EMPATES DEL EQUIPO
              // ====================================================

              if (
                  texto.includes("empates") ||
                  texto.includes("empate")
              ) {

                  if (equipoPersona.empates !== undefined) {
                      return (
                          `**${nombre}** pertenece a **${nombreEquipoPersona}**. ` +
                          `El equipo registra oficialmente ` +
                          `**${equipoPersona.empates} empates**.`
                      );
                  }

                  return (
                      `No tengo registrados oficialmente los empates ` +
                      `de **${nombreEquipoPersona}**.`
                  );
              }

              // ====================================================
              // 💎 PRESTIGIO DEL EQUIPO
              // ====================================================

              if (
                  texto.includes("prestigio") ||
                  texto.includes("prestigios")
              ) {

                  if (equipoPersona.prestigio !== undefined) {
                      return (
                          `**${nombre}** pertenece a **${nombreEquipoPersona}**. ` +
                          `El equipo registra oficialmente ` +
                          `**${equipoPersona.prestigio} puntos de prestigio**.`
                      );
                  }

                  return (
                      `No tengo registrado oficialmente el prestigio ` +
                      `de **${nombreEquipoPersona}**.`
                  );
              }

              // ====================================================
              // 📊 ¿CÓMO VA? — EQUIPO
              // ====================================================

              if (
                  texto.includes("como va") ||
                  texto.includes("cómo va") ||
                  texto.includes("como esta") ||
                  texto.includes("cómo está") ||
                  texto.includes("como se encuentra") ||
                  texto.includes("como sigue") ||
                  texto.includes("cómo sigue")
              ) {

                  const victorias =
                      equipoPersona.victorias !== undefined
                          ? equipoPersona.victorias
                          : "N/D";

                  const derrotas =
                      equipoPersona.derrotas !== undefined
                          ? equipoPersona.derrotas
                          : "N/D";

                  const empates =
                      equipoPersona.empates !== undefined
                          ? equipoPersona.empates
                          : "N/D";

                  const campeonatos =
                      equipoPersona.campeonatos !== undefined
                          ? equipoPersona.campeonatos
                          : "N/D";

                  return (
                      `📊 **${nombreEquipo}** — resumen competitivo oficial\n\n` +
                      `👤 Miembro consultado: **${nombre}**\n` +
                      `⚔️ Victorias: **${victorias}**\n` +
                      `❌ Derrotas: **${derrotas}**\n` +
                      `🤝 Empates: **${empates}**\n` +
                      `🏆 Campeonatos: **${campeonatos}**`
                  );
              }
          }


    // ========================================================
    // 👥 EQUIPO — DATOS OFICIALES
    // ========================================================

    // ========================================================
    // 👥 DETECCIÓN ROBUSTA DE ENTIDAD EQUIPO
    // ========================================================

    const esEquipo =
        entidad.tipo === "equipo" ||
        (
            entidad.nombreLider !== undefined &&
            Array.isArray(entidad.miembros)
        );

    if (esEquipo) {

        const nombre =
            entidad.nombre || "El equipo";

        // ====================================================

          // ====================================================
          // 🔗 REFERENCIA IMPLÍCITA — EQUIPO YA RESUELTO
          // ====================================================
          // La entidad recibida ya es el equipo secundario.
          // Una consulta como "¿Y su equipo?" permanece sobre
          // esta entidad y NO vuelve al referente raíz.
          //
          // Shadow → referente raíz
          // Vortex Esports → entidadReferenciaActiva
          // ====================================================

          if (
              (
                        texto.includes("su equipo") ||
                        texto.includes("sus equipo")
                    ) &&
                    !(
                        texto.includes("lider") ||
                        texto.includes("líder") ||
                        texto.includes("quien manda") ||
                        texto.includes("quién manda") ||
                        texto.includes("jefe") ||
                        texto.includes("cuantos") ||
                        texto.includes("cuántos") ||
                        texto.includes("cuantas") ||
                        texto.includes("cuántas") ||
                        texto.includes("victorias") ||
                        texto.includes("derrotas") ||
                        texto.includes("empates") ||
                        texto.includes("campeonatos") ||
                        texto.includes("titulos") ||
                        texto.includes("títulos") ||
                        texto.includes("nivel") ||
                        texto.includes("estadisticas") ||
                        texto.includes("estadísticas") ||
                        texto.includes("miembros") ||
                        texto.includes("jugadores") ||
                        texto.includes("fondos") ||
                        texto.includes("liga") ||
                        texto.includes("division") ||
                        texto.includes("posición") ||
                        texto.includes("posicion") ||
                        texto.includes("como va") ||
                        texto.includes("cómo va") ||
                        texto.includes("como esta") ||
                        texto.includes("cómo está") ||
                        texto.includes("como se encuentra") ||
                        texto.includes("como sigue") ||
                        texto.includes("cómo sigue")
                    )
          ) {
              return (
                  `El equipo registrado es **${nombre}**.`
              );
          }

                  // ====================================================
          // 📊 POSICIÓN EN LA CLASIFICACIÓN OFICIAL
          // ====================================================
          //
          // La posición se obtiene exclusivamente desde tabla.json.
          // No se calcula desde equipos.json.
          //
          // La consulta debe expresar explícitamente una intención
          // relacionada con posición, tabla o clasificación.
          // ====================================================

          if (
              texto.includes("posición") ||
              texto.includes("posicion") ||
              texto.includes("clasificación") ||
              texto.includes("clasificacion") ||
              texto.includes("en qué posición") ||
              texto.includes("en que posicion") ||
              texto.includes("cuál es su posición") ||
              texto.includes("cual es su posicion") ||
                (
                    (
                        texto.includes("como va") ||
                        texto.includes("como esta")
                    ) &&
                    (
                        texto.includes("en la tabla") ||
                        texto.includes("en la clasificacion")
                    )
                )
          ) {

              const tablaOficial = obtenerTabla();

              const nombreNormalizado = String(nombre)
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .trim();

              const indice = tablaOficial.findIndex(equipoTabla => {

                  if (
                      !equipoTabla ||
                      !equipoTabla.nombre
                  ) {
                      return false;
                  }

                  const nombreTablaNormalizado = String(
                      equipoTabla.nombre
                  )
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .trim();

                  return nombreTablaNormalizado === nombreNormalizado;
              });

              if (indice !== -1) {

                  const equipoTabla =
                      tablaOficial[indice];

                  return (
                      `📊 **${nombre}** ocupa actualmente la ` +
                      `**posición ${indice + 1}** de la clasificación oficial.\n\n` +
                      `⭐ Puntos: **${equipoTabla.puntos ?? 0}**\n` +
                      `🎮 PJ: **${equipoTabla.pj ?? equipoTabla.PJ ?? 0}**\n` +
                      `🏆 Victorias: **${equipoTabla.victorias ?? equipoTabla.v ?? 0}**\n` +
                      `❌ Derrotas: **${equipoTabla.derrotas ?? equipoTabla.d ?? 0}**`
                  );
              }

              return (
                  `No encuentro a **${nombre}** en la ` +
                  `clasificación oficial registrada actualmente.`
              );
          }

// 📊 RESUMEN COMPETITIVO
        // ====================================================
        //
        // "¿Cómo va Atlas?"
        // "¿Cómo está Vortex?"
        // "¿Cómo va Shadow Phoenix?"
        //
        // Esta intención debe resolverse localmente con datos
        // oficiales. No depende de Gemini ni de conocimiento web.
        // ====================================================

        if (
            texto.includes("como va") ||
            texto.includes("cómo va") ||
            texto.includes("como esta") ||
            texto.includes("cómo está") ||
            texto.includes("como se encuentra") ||
            texto.includes("como sigue") ||
            texto.includes("cómo sigue")
        ) {              // FASE 2.4.545-Z13-D
              // Los datos oficiales pueden encontrarse
              // directamente en la entidad o dentro de
              // entidad.entidad.
              const datosCompetitivos =
                  entidad &&
                  entidad.entidad &&
                  typeof entidad.entidad === "object"
                      ? entidad.entidad
                      : entidad;

              const victorias =
                  datosCompetitivos.victorias !== undefined
                      ? datosCompetitivos.victorias
                      : "N/D";

              const derrotas =
                  datosCompetitivos.derrotas !== undefined
                      ? datosCompetitivos.derrotas
                      : "N/D";

              const empates =
                  datosCompetitivos.empates !== undefined
                      ? datosCompetitivos.empates
                      : "N/D";

              const campeonatos =
                  datosCompetitivos.campeonatos !== undefined
                      ? datosCompetitivos.campeonatos
                      : "N/D";

              const jugadores =
                  Array.isArray(datosCompetitivos.miembros)
                      ? datosCompetitivos.miembros.length
                      : "N/D";

              const inscrito =
                  datosCompetitivos.inscrito !== undefined
                      ? (datosCompetitivos.inscrito ? "Sí" : "No")
                      : "N/D";

            return (
                `📊 **${nombre}** — resumen competitivo oficial\n\n` +
                `⚔️ Victorias: **${victorias}**\n` +
                `❌ Derrotas: **${derrotas}**\n` +
                `🤝 Empates: **${empates}**\n` +
                `🏆 Campeonatos: **${campeonatos}**\n` +
                `👥 Jugadores: **${jugadores}**\n` +
                `📝 Inscrito: **${inscrito}**`
            );
        }

        // ====================================================
        // 👑 LÍDER
        // ====================================================

        if (
            texto.includes("líder") ||
            texto.includes("lider") ||
            texto.includes("quién manda") ||
            texto.includes("quien manda") ||
            texto.includes("jefe")
        ) {              const datosCompetitivos =
                  entidad &&
                  entidad.entidad &&
                  typeof entidad.entidad === "object"
                      ? entidad.entidad
                      : entidad;

              const nombreLider =
                  datosCompetitivos.nombreLider ||
                  datosCompetitivos.liderNombre ||
                  null;

              if (nombreLider) {
                  return (
                      `El líder de **${nombre}** es **${nombreLider}**.`
                  );
              }

            return (
                `No tengo disponible el nombre del líder de **${nombre}**.`
            );
        }

        // ====================================================
        // 🏆 CAMPEONATOS
        // ====================================================

        if (
            texto.includes("campeonato") ||
            texto.includes("campeonatos") ||
            texto.includes("títulos") ||
            texto.includes("titulos") ||
            texto.includes("qué ha ganado") ||
            texto.includes("que ha ganado")
        ) {              const datosCompetitivos =
                  entidad &&
                  entidad.entidad &&
                  typeof entidad.entidad === "object"
                      ? entidad.entidad
                      : entidad;

              if (datosCompetitivos.campeonatos !== undefined) {
                  return (
                      `**${nombre}** tiene **${datosCompetitivos.campeonatos} campeonatos** registrados oficialmente.`
                  );
              }

            return (
                `No tengo información oficial disponible sobre los campeonatos de **${nombre}**.`
            );
        }

        // ====================================================
        // ⚔️ VICTORIAS
        // ====================================================

        if (
            texto.includes("victorias") ||
            texto.includes("victoria") ||
            texto.includes("ganadas") ||
            texto.includes("ganados") ||
            texto.includes("cuántas ha ganado") ||
            texto.includes("cuantas ha ganado") ||
texto.includes("cuántos partidos ha ganado") ||
texto.includes("cuantos partidos ha ganado") ||
texto.includes("cuántos partidos ganó") ||
texto.includes("cuantos partidos gano") ||
texto.includes("cuántos encuentros ha ganado") ||
texto.includes("cuantos encuentros ha ganado") ||
texto.includes("cuántos encuentros ganó") ||
texto.includes("cuantos encuentros gano")
        ) {

            const datosCompetitivos =
                  entidad &&
                  entidad.entidad &&
                  typeof entidad.entidad === "object"
                      ? entidad.entidad
                      : entidad;

              if (datosCompetitivos.victorias !== undefined) {
                return (
                    `**${nombre}** tiene **${datosCompetitivos.victorias} victorias** registradas oficialmente.`
                );
            }

            return (
                `No tengo información oficial disponible sobre las victorias de **${nombre}**.`
            );
        }

        // ====================================================
        // ❌ DERROTAS
        // ====================================================

        if (
            texto.includes("derrotas") ||
            texto.includes("derrota") ||
            texto.includes("perdidas") ||
            texto.includes("pérdidas") ||
            texto.includes("perdidos")
        ) {

            const datosCompetitivos =
                entidad &&
                entidad.entidad &&
                typeof entidad.entidad === "object"
                    ? entidad.entidad
                    : entidad;

            if (datosCompetitivos.derrotas !== undefined) {
                return (
                    `**${nombre}** tiene **${datosCompetitivos.derrotas} derrotas** registradas oficialmente.`
                );
            }

            return (
                `No tengo información oficial disponible sobre las derrotas de **${nombre}**.`
            );
        }

        // ====================================================
        // 🤝 EMPATES
        // ====================================================

        if (
            texto.includes("empates") ||
            texto.includes("empate")
        ) {

            const datosCompetitivos =
                entidad &&
                entidad.entidad &&
                typeof entidad.entidad === "object"
                    ? entidad.entidad
                    : entidad;

            if (datosCompetitivos.empates !== undefined) {
                return (
                    `**${nombre}** tiene **${datosCompetitivos.empates} empates** registrados oficialmente.`
                );
            }

            return (
                `No tengo información oficial disponible sobre los empates de **${nombre}**.`
            );
        }

        // ====================================================
        // ⭐ NIVEL
        // ====================================================

        if (
            texto.includes("nivel") ||
            texto.includes("qué nivel") ||
            texto.includes("que nivel")
        ) {

            if (entidad.nivel !== undefined) {
                return (
                    `**${nombre}** está actualmente en **nivel ${entidad.nivel}**.`
                );
            }

            return (
                `No tengo registrado el nivel de **${nombre}**.`
            );
        }

        // ====================================================
        // 📈 EXPERIENCIA / XP
        // ====================================================

        if (
            texto.includes("xp") ||
            texto.includes("experiencia") ||
            texto.includes("experiencia tiene")
        ) {

            if (entidad.xp !== undefined) {
                return (
                    `**${nombre}** tiene **${entidad.xp} XP** registrados.`
                );
            }

            return (
                `No tengo registrada la experiencia de **${nombre}**.`
            );
        }

        // ====================================================
        // 💎 PRESTIGIO
        // ====================================================

        if (
            texto.includes("prestigio") ||
            texto.includes("prestigios")
        ) {

            const datosCompetitivos =
                entidad &&
                entidad.entidad &&
                typeof entidad.entidad === "object"
                    ? entidad.entidad
                    : entidad;

            if (datosCompetitivos.prestigio !== undefined) {
                return (
                    `**${nombre}** tiene **${datosCompetitivos.prestigio} puntos de prestigio** registrados.`
                );
            }

            return (
                `No tengo registrado el prestigio de **${nombre}**.`
            );
        }

        // ====================================================
        // 👥 MIEMBROS / JUGADORES
        // ====================================================

        if (
            texto.includes("miembros") ||
            texto.includes("miembro") ||
            texto.includes("integrantes") ||
            texto.includes("quiénes están") ||
            texto.includes("quienes estan") ||
            texto.includes("jugadores") ||
            texto.includes("jugador") ||
            texto.includes("personas del equipo") ||
            texto.includes("personas tiene") ||
            texto.includes("cuántos jugadores") ||
            texto.includes("cuantos jugadores") ||
            texto.includes("cuántos miembros") ||
            texto.includes("cuantos miembros")
        ) {

            if (Array.isArray(entidad.miembros)) {

                const esConsultaCantidad =
                    texto.includes("cuántos") ||
                    texto.includes("cuantos") ||
                    texto.includes("cantidad") ||
                    texto.includes("número de miembros") ||
                    texto.includes("numero de miembros") ||
                    texto.includes("número de jugadores") ||
                    texto.includes("numero de jugadores");

                if (!esConsultaCantidad) {
                    try {
                        const perfiles = entidad.miembros
                            .map((idMiembro) => {
                                try {
                                    return obtenerPerfilMiembro(idMiembro);
                                } catch (error) {
                                    console.error(
                                        "⚠️ TitansB | Error resolviendo miembro:",
                                        idMiembro,
                                        error.message
                                    );
                                    return null;
                                }
                            })
                            .filter(Boolean);

                        if (perfiles.length) {
                            const nombres = perfiles.map((perfil) => {
                                const nombreMiembro =
                                    perfil?.nombre ||
                                    perfil?.nombreJuego ||
                                    null;

                                if (!nombreMiembro) {
                                    return null;
                                }

                                return perfil?.nombreJuego &&
                                    perfil.nombreJuego !== nombreMiembro
                                    ? `${nombreMiembro} (${perfil.nombreJuego})`
                                    : nombreMiembro;
                            }).filter(Boolean);

                            if (nombres.length) {
                                return (
                                    `Los jugadores registrados de **${nombre}** son: ` +
                                    nombres.map((n) => `**${n}**`).join(", ") +
                                    `.`
                                );
                            }
                        }
                    } catch (error) {
                        console.error(
                            "⚠️ TitansB | Error listando miembros:",
                            error.message
                        );
                    }
                }

                const cantidad = entidad.miembros.length;

                return (
                    `**${nombre}** tiene **${cantidad} ` +
                    `${cantidad === 1 ? "jugador" : "jugadores"} ` +
                    `registrado${cantidad === 1 ? "" : "s"} oficialmente**.`
                );
            }

            return (
                `No tengo registrado el número de jugadores de **${nombre}**.`
            );
        }

        // ====================================================
        // 📝 INSCRIPCIÓN
        // ====================================================

        if (
            texto.includes("inscrito") ||
            texto.includes("inscrita") ||
            texto.includes("inscripcion") ||
            texto.includes("inscripción") ||
            texto.includes("registrado") ||
            texto.includes("registrada")
        ) {

            if (entidad.inscrito !== undefined) {

                return entidad.inscrito
                    ? `¡Sí! **${nombre}** está oficialmente inscrito en el torneo 🏆🎮.`
                    : `**${nombre}** no aparece actualmente como inscrito en el torneo.`;
            }

            return (
                `No tengo información oficial sobre la inscripción de **${nombre}**.`
            );
        }

        // ====================================================
        // 💰 FONDOS
        // ====================================================

        if (
            texto.includes("fondos") ||
            texto.includes("dinero del equipo") ||
            texto.includes("dinero tiene")
        ) {

            if (entidad.fondos !== undefined) {
                return (
                    `**${nombre}** tiene **${entidad.fondos} fondos** registrados oficialmente.`
                );
            }

            return (
                `No tengo registrados los fondos de **${nombre}**.`
            );
        }

        // ====================================================
        // 🏅 LIGA
        // ====================================================

        if (
            texto.includes("liga") ||
            texto.includes("división") ||
            texto.includes("division")
        ) {

            if (entidad.liga !== undefined) {
                return (
                    `**${nombre}** está registrado en la **Liga ${entidad.liga}**.`
                );
            }

            return (
                `No tengo registrada la liga de **${nombre}**.`
            );
        }

        // ====================================================
        // 👥 EQUIPO — SIN INTENCIÓN ESTRUCTURADA
        // ====================================================
        // Las preguntas conversacionales deben continuar hacia Gemini.

        return null;
    }

    return null;
}

// ============================================================
// 📅 PRÓXIMO PARTIDO — FIXTURE OFICIAL
// ============================================================

function obtenerRespuestaProximoPartido(pregunta, entidad) {

    const esEquipo =
        entidad &&
        typeof entidad === "object" &&
        (
            entidad.tipo === "equipo" ||
            (
                entidad.nombre &&
                entidad.nombreLider !== undefined &&
                Array.isArray(entidad.miembros)
            )
        );

    if (!esEquipo) {
        return null;
    }

    const texto =
        String(pregunta || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

    const indicadores = [
        "cuando juega",
        "cuando juega proximamente",
        "cuando juega nuevamente",
        "cuando vuelve a jugar",
        "proximo partido",
        "proximo enfrentamiento",
        "siguiente partido",
        "siguiente enfrentamiento",
        "proximo rival",
        "siguiente rival",
        "cuando es su partido",
        "cuando es su proximo partido"
    ];

    const esConsulta =
        indicadores.some(
            frase => texto.includes(frase)
        );

    if (!esConsulta) {
        return null;
    }

    const normalizarEquipoRival = valor =>
        String(valor || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();

    const equipoConsultadoNormalizado =
        normalizarEquipoRival(entidad.nombre);

    const esNuevamente =
        texto.includes("cuando juega nuevamente") ||
        texto.includes("cuando vuelve a jugar");

    let partido =
        buscarProximoPartidoEquipo(
            entidad.nombre
        );

    if (esNuevamente && partido) {
        const fixtureActual =
            typeof obtenerFixture === "function"
                ? obtenerFixture()
                : null;

        const partidos =
            fixtureActual &&
            Array.isArray(fixtureActual.enfrentamientos)
                ? fixtureActual.enfrentamientos
                : [];

        const indicePartido =
            partidos.findIndex(partidoFixture => {
                if (!partidoFixture || !partido) {
                    return false;
                }

                return (
                    normalizarEquipoRival(partidoFixture.equipo1) ===
                        normalizarEquipoRival(partido.equipo1) &&
                    normalizarEquipoRival(partidoFixture.equipo2) ===
                        normalizarEquipoRival(partido.equipo2) &&
                    String(partidoFixture.fecha || "") ===
                        String(partido.fecha || "") &&
                    String(partidoFixture.hora || "") ===
                        String(partido.hora || "") &&
                    String(partidoFixture.numero ?? "") ===
                        String(partido.numero ?? "")
                );
            });

        if (indicePartido >= 0) {
            const siguientesPendientes =
                partidos.slice(indicePartido + 1).filter(partidoSiguiente => {
                    if (!partidoSiguiente || partidoSiguiente.ganador) {
                        return false;
                    }

                    const equipo1Siguiente =
                        normalizarEquipoRival(partidoSiguiente.equipo1);

                    const equipo2Siguiente =
                        normalizarEquipoRival(partidoSiguiente.equipo2);

                    return (
                        equipo1Siguiente === equipoConsultadoNormalizado ||
                        equipo2Siguiente === equipoConsultadoNormalizado
                    );
                });

            partido =
                siguientesPendientes[0] || null;
        }
    }

    if (!partido) {
        const fixtureActual =
            typeof obtenerFixture === "function"
                ? obtenerFixture()
                : null;

        const partidosFixture =
            fixtureActual &&
            Array.isArray(fixtureActual.enfrentamientos)
                ? fixtureActual.enfrentamientos
                : [];

        const partidosEquipo =
            partidosFixture.filter(partidoFixture => {
                if (!partidoFixture) {
                    return false;
                }

                const equipo1 =
                    normalizarEquipoRival(partidoFixture.equipo1);

                const equipo2 =
                    normalizarEquipoRival(partidoFixture.equipo2);

                return (
                    equipo1 === equipoConsultadoNormalizado ||
                    equipo2 === equipoConsultadoNormalizado
                );
            });

        const ultimoPartido =
            partidosEquipo.length > 0
                ? partidosEquipo[partidosEquipo.length - 1]
                : null;

        if (ultimoPartido) {
            const equipo1 =
                normalizarEquipoRival(ultimoPartido.equipo1);

            const rival =
                equipo1 === equipoConsultadoNormalizado
                    ? String(ultimoPartido.equipo2 || "").trim()
                    : String(ultimoPartido.equipo1 || "").trim();

            let respuesta =
                `📅 **${entidad.nombre}** no tiene partidos pendientes ` +
                `actualmente en el fixture oficial.`;

            respuesta +=
                `\n⚔️ Su último enfrentamiento fue contra **${rival}**.`;

            if (ultimoPartido.fecha) {
                respuesta +=
                    `\n📅 Fecha: **${ultimoPartido.fecha}**`;
            }

            if (ultimoPartido.hora) {
                respuesta +=
                    `\n🕒 Hora: **${ultimoPartido.hora}**`;
            }

            if (ultimoPartido.marcador) {
                const marcadorEquipo1 =
                    ultimoPartido.marcador.equipo1 ?? "-";

                const marcadorEquipo2 =
                    ultimoPartido.marcador.equipo2 ?? "-";

                const marcador =
                    equipo1 === equipoConsultadoNormalizado
                        ? `${marcadorEquipo1}–${marcadorEquipo2}`
                        : `${marcadorEquipo2}–${marcadorEquipo1}`;

                respuesta +=
                    `\n📊 Resultado: **${entidad.nombre} ${marcador} ${rival}**`;
            }

            if (ultimoPartido.jornada) {
                respuesta +=
                    `\n🏆 Fase: **${ultimoPartido.jornada}**`;
            }

            if (ultimoPartido.ganador) {
                const ganador =
                    String(ultimoPartido.ganador).trim();

                if (
                    normalizarEquipoRival(ganador) ===
                    equipoConsultadoNormalizado
                ) {
                    respuesta +=
                        `\n✅ **${entidad.nombre}** ganó este enfrentamiento.`;
                } else {
                    respuesta +=
                        `\n❌ **${entidad.nombre}** perdió este enfrentamiento.`;
                }
            }

            return respuesta;
        }

        return (
            `📅 **${entidad.nombre}** no tiene partidos registrados ` +
            `en el fixture oficial de Liga Titans Team.`
        );
    }

    const equipo1Normalizado =
        normalizarEquipoRival(partido.equipo1);

    const rival =
        equipo1Normalizado === equipoConsultadoNormalizado
            ? String(partido.equipo2 || "").trim()
            : String(partido.equipo1 || "").trim();

    let respuesta =
        `📅 El próximo partido de **${entidad.nombre}** es ` +
        `contra **${rival}**.`;

    if (partido.fecha) {
        respuesta += `\n📅 Fecha: **${partido.fecha}**`;
    }

    if (partido.hora) {
        respuesta += `\n🕒 Hora: **${partido.hora}**`;
    }

    if (partido.numero !== undefined) {
        respuesta +=
            `\n⚔️ Enfrentamiento: **${partido.numero}**`;
    }

    return respuesta;
}

// ============================================================
// ⚠️ FALLBACK — ENTIDAD DESCONOCIDA
// ============================================================

function generarFallbackEntidadDesconocida(pregunta) {

    const original =
        String(pregunta || "").trim();

    const texto =
        original
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

    const patrones = [

        /lider de (.+?)[?¿!.,]*$/i,

        /victorias.*de (.+?)[?¿!.,]*$/i,

        /victorias.*tiene (.+?)[?¿!.,]*$/i,

        /nivel.*de (.+?)[?¿!.,]*$/i,

        /campeonatos.*de (.+?)[?¿!.,]*$/i

    ];

    for (const patron of patrones) {

        const match =
            texto.match(patron);

        if (!match || !match[1]) {
            continue;
        }

        let nombre =
            match[1]
                .trim()
                .replace(/[?¿!.,]+$/g, "");

        if (nombre.length < 3) {
            continue;
        }

        // ========================================================
        // 🧠 REFERENCIA IMPLÍCITA — NO ES ENTIDAD DESCONOCIDA
        // ========================================================
        // Expresiones como "su equipo" o "su líder" deben ser
        // resueltas por el contexto conversacional.
        // Nunca deben convertirse en una entidad desconocida.
        // ========================================================

        const nombreReferencial = nombre
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();

        const referenciasImplicitas = [
            "su equipo",
            "sus equipo",
            "su lider",
            "sus lider",
            "el",
            "la",
            "ese",
            "esa",
            "ellos",
            "ellas"
        ];

        if (referenciasImplicitas.includes(nombreReferencial)) {
            continue;
        }

        const posicion =
            texto.indexOf(
                nombre.toLowerCase()
            );

        if (posicion !== -1) {

            const nombreOriginal =
                original.substring(
                    posicion,
                    posicion + nombre.length
                );

            nombre =
                nombreOriginal.trim();
        }

        return {

            nombre,

            texto:
                `⚠️ **${nombre}** no está registrado actualmente ` +
                `en el sistema oficial de Liga Titans Team. ` +
                `No dispongo de estadísticas oficiales para esta entidad.`

        };

    }

    return null;
}


// ============================================================
// 👤 RESOLVER AUTOR ACTUAL EN LIGA TITANS
// ============================================================
// Resuelve la identidad oficial del autor mediante:
// autorId → usuarios.json → equipos.miembros
//
// IMPORTANTE:
// - No convierte automáticamente al autor en referente.
// - Solo proporciona identidad oficial para preguntas personales.
// - No utiliza Gemini.
// ============================================================

function resolverAutorLiga(autorId) {

    if (!autorId || typeof autorId !== "string") {
        return null;
    }

    try {

        const fs = require("fs");
        const path = require("path");

        const archivoUsuarios = path.join(
            __dirname,
            "../../database/usuarios.json"
        );

        if (!fs.existsSync(archivoUsuarios)) {
            return null;
        }

        const usuarios = JSON.parse(
            fs.readFileSync(
                archivoUsuarios,
                "utf8"
            )
        );

        const baseAutorId = normalizarId(autorId);

        const candidatosUsuario = [
            autorId,
            `${baseAutorId}@lid`,
            `${baseAutorId}@s.whatsapp.net`,
            baseAutorId
        ];

        let usuario = null;

        for (const candidato of candidatosUsuario) {
            const posibleUsuario = usuarios?.[candidato];

            if (
                posibleUsuario &&
                typeof posibleUsuario === "object" &&
                typeof posibleUsuario.nombre === "string" &&
                posibleUsuario.nombre.trim() !== ""
            ) {
                usuario = posibleUsuario;
                break;
            }
        }

        if (!usuario) {
            return null;
        }

        // ========================================================
        // 👤 FASE M-02.10K.12.4.43 — PERFIL COMPETITIVO DEL AUTOR
        // ========================================================
        // Busca las variantes posibles del ID y selecciona el
        // perfil con mayor cantidad de datos competitivos.
        //
        // No modifica perfiles_miembros.json.
        // No crea perfiles.
        // No sustituye la identidad oficial de usuarios.json.
        // ========================================================

        let perfilMiembro = null;

        try {
            const baseId = normalizarId(autorId);

            const candidatosPerfil = [
                autorId,
                `${baseId}@lid`,
                `${baseId}@s.whatsapp.net`,
                baseId
            ];

            const perfilesEncontrados = [];

            for (const candidato of candidatosPerfil) {
                if (!candidato) {
                    continue;
                }

                const perfil = obtenerPerfilMiembro(candidato);

                if (!perfil || typeof perfil !== "object") {
                    continue;
                }

                const campos = [
                    "nombre",
                    "nombreJuego",
                    "pais",
                    "rolJuego",
                    "rango"
                ];

                const puntuacion = campos.reduce(
                    (total, campo) =>
                        total +
                        (
                            typeof perfil[campo] === "string" &&
                            perfil[campo].trim()
                                ? 1
                                : 0
                        ),
                    0
                );

                perfilesEncontrados.push({
                    perfil,
                    puntuacion
                });
            }

            if (perfilesEncontrados.length > 0) {
                perfilesEncontrados.sort(
                    (a, b) => b.puntuacion - a.puntuacion
                );

                perfilMiembro = perfilesEncontrados[0].perfil;
            }
        } catch (error) {
            console.error(
                "⚠️ TitansB | Error leyendo perfil competitivo del autor:",
                error.message
            );
        }

        const perfilCompetitivo = perfilMiembro
            ? {
                nombreJuego: perfilMiembro.nombreJuego || null,
                pais: perfilMiembro.pais || null,
                rolJuego: perfilMiembro.rolJuego || null,
                rango: perfilMiembro.rango || null
            }
            : {
                nombreJuego: null,
                pais: null,
                rolJuego: null,
                rango: null
            };

        // ========================================================
        // 👤 FASE 2.4.428 — PERFIL PERSONAL MULTIFUENTE
        // ========================================================
        // Lectura estricta de datos personales oficiales.
        //
        // IMPORTANTE:
        // - No convierte al autor en referente.
        // - No modifica contexto.js.
        // - No utiliza Gemini.
        // - No utiliza memoria.
        // - No utiliza web.
        // - usuarios.json se lee directamente para evitar
        //   crear usuarios durante una consulta.
        // ========================================================

        const datosPersonales = {
            nivel: usuario.nivel ?? null,
            xp: usuario.xp ?? null,
            coins: usuario.coins ?? null,
            mensajes: usuario.mensajes ?? null,
            racha: usuario.racha ?? null
        };

        let titulo = "Aspirante Titán";
        let logros = [];

        try {
            titulo = obtenerTitulo(autorId);
            logros = obtenerLogros(autorId);

            if (!Array.isArray(logros)) {
                logros = [];
            }
        } catch (error) {
            console.error(
                "⚠️ TitansB | Error leyendo logros del autor:",
                error.message
            );
        }

        let inventario = {
            cajas: 0,
            objetos: []
        };

        try {
            const archivoInventarios = path.join(
                __dirname,
                "../../database/inventarios.json"
            );

            if (fs.existsSync(archivoInventarios)) {
                const inventarios = JSON.parse(
                    fs.readFileSync(
                        archivoInventarios,
                        "utf8"
                    )
                );

                const inv = inventarios?.[autorId];

                if (
                    inv &&
                    typeof inv === "object"
                ) {
                    inventario = {
                        cajas: Number(inv.cajas) || 0,
                        objetos: Array.isArray(inv.objetos)
                            ? inv.objetos
                            : []
                    };
                }
            }
        } catch (error) {
            console.error(
                "⚠️ TitansB | Error leyendo inventario del autor:",
                error.message
            );
        }

        const equipos = obtenerEquipos();

        if (!Array.isArray(equipos)) {
            return {
                nombre: usuario.nombre,
                tipo: "persona",
                rol: "miembro",
                equipo: null,
                autorId,

                // FASE 2.4.430 — RETORNOS PERSONALES SIN EQUIPO
                // El perfil personal existe independientemente
                // de que exista información de equipos.
                ...datosPersonales,
            ...perfilCompetitivo,
            perfilCompetitivo,
                titulo,
                logros,
                inventario,

                origen: "liga_titans"
            };
        }

        for (const equipo of equipos) {

            if (
                !equipo ||
                !equipo.nombre ||
                !Array.isArray(equipo.miembros)
            ) {
                continue;
            }

            if (!equipo.miembros.includes(autorId)) {
                continue;
            }

            const esLider =
                equipo.lider === autorId;

            return {
                nombre: usuario.nombre,
                tipo: "persona",
                rol: esLider
                    ? "líder"
                    : "miembro",
                equipo: equipo.nombre,
                autorId,
                equipoEntidad: equipo,

                // FASE 2.4.428 — Perfil personal oficial
                ...datosPersonales,
            ...perfilCompetitivo,
            perfilCompetitivo,
                titulo,
                logros,
                inventario,

                origen: "liga_titans",
                confianza: "interno"
            };
        }

        return {
            nombre: usuario.nombre,
            tipo: "persona",
            rol: "miembro",
            equipo: null,
            autorId,

            // FASE 2.4.430 — RETORNOS PERSONALES SIN EQUIPO
            // El perfil personal no depende de la pertenencia
            // a un equipo.
            ...datosPersonales,
            ...perfilCompetitivo,
            perfilCompetitivo,
            titulo,
            logros,
            inventario,

            origen: "liga_titans",
            confianza: "interno"
        };

    } catch (error) {

        console.error(
            "⚠️ TitansB | Error resolviendo autor:",
            error.message
        );

        return null;
    }
}


// ============================================================
// 👤 RESOLVER CONSULTAS PERSONALES DEL AUTOR
// ============================================================
// Esta capa responde preguntas que se refieren directamente
// al autor del mensaje.
//
// IMPORTANTE:
// - Utiliza únicamente datos oficiales de Liga Titans Team.
// - NO modifica el referente conversacional.
// - NO convierte al autor en referente.
// - NO utiliza Gemini.
// - NO utiliza memoria ni web.
//
// Ejemplos:
//   ¿quién soy?
//   ¿cuál es mi rol?
//   ¿cuál es mi equipo?
//   ¿en qué equipo estoy?
//   ¿quién es mi líder?
//
// ============================================================

function resolverConsultaPersonalAutor(pregunta, autorLiga) {

    if (
        !autorLiga ||
        typeof autorLiga !== "object"
    ) {
        return null;
    }

    const texto =
        String(pregunta || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

    // ============================================================
    // 🪪 IDENTIDAD DEL AUTOR
    // ============================================================

    const consultaIdentidad =
        texto.includes("quien soy") ||
        texto.includes("quien soy yo") ||
        texto.includes("dime quien soy");

    if (consultaIdentidad) {

        let respuesta =
            `Eres **${autorLiga.nombre || "Usuario"}**`;

        if (autorLiga.rol) {
            respuesta +=
                ` y estás registrado oficialmente como **${autorLiga.rol}**`;
        }

        if (autorLiga.equipo) {
            respuesta +=
                ` en **${autorLiga.equipo}**`;
        }

        return respuesta + ".";
    }

    // ============================================================
    // 🏷️ ROL
    // ============================================================

    const consultaRol =
        texto.includes("cual es mi rol") ||
        texto.includes("que rol tengo") ||
        texto.includes("cual es mi cargo") ||
        texto.includes("que cargo tengo");

    if (consultaRol) {

        if (autorLiga.rol) {
            return `Tu rol registrado oficialmente es **${autorLiga.rol}**.`;
        }

        return "No tengo registrado oficialmente tu rol.";
    }

    // ============================================================
    // 🔗 EQUIPO + LÍDER
    // ============================================================

    const consultaEquipoCompuesta =
        (
            texto.includes("mi equipo") ||
            texto.includes("que equipo tengo") ||
            texto.includes("cual es mi equipo") ||
            texto.includes("en que equipo estoy") ||
            texto.includes("en que equipo juego")
        ) &&
        (
            texto.includes("mi lider") ||
            texto.includes("mi jefe") ||
            texto.includes("quien lo lidera") ||
            texto.includes("quien lo dirige") ||
            texto.includes("quien manda") ||
            texto.includes("lider de mi equipo") ||
            texto.includes("lider")
        );

    if (consultaEquipoCompuesta) {

        const equipo =
            autorLiga.equipo || null;

        const lider =
            autorLiga.equipoEntidad?.nombreLider || null;

        if (equipo && lider) {
            return (
                `Tu equipo registrado oficialmente es **${equipo}** ` +
                `y su líder registrado oficialmente es **${lider}**.`
            );
        }

        if (equipo) {
            return (
                `Tu equipo registrado oficialmente es **${equipo}**, ` +
                `pero no tengo disponible oficialmente el nombre de su líder.`
            );
        }

        return (
            "No tienes un equipo registrado oficialmente " +
            "ni un líder asociado en el sistema."
        );
    }

    // ============================================================
    // 👥 EQUIPO
    // ============================================================

    const consultaEquipo =
        texto.includes("cual es mi equipo") ||
        texto.includes("que equipo tengo") ||
        texto.includes("en que equipo estoy") ||
        texto.includes("en que equipo juego") ||
        texto.includes("donde juego") ||
        texto.includes("a que equipo pertenezco");

    if (consultaEquipo) {

        if (autorLiga.equipo) {
            return (
                `Tu equipo registrado oficialmente es **${autorLiga.equipo}**.`
            );
        }

        return (
            "No tienes un equipo registrado oficialmente en el sistema."
        );
    }

    // ============================================================
    // 👑 LÍDER
    // ============================================================

    const consultaLider =
        texto.includes("quien es mi lider") ||
        texto.includes("quien es mi jefe") ||
        texto.includes("quien manda en mi equipo") ||
        texto.includes("quien es el lider de mi equipo");

    if (consultaLider) {

        const lider =
            autorLiga.equipoEntidad?.nombreLider || null;

        if (lider && autorLiga.equipo) {
            return (
                `El líder registrado oficialmente de **${autorLiga.equipo}** es **${lider}**.`
            );
        }

        if (autorLiga.equipo) {
            return (
                `Tu equipo registrado es **${autorLiga.equipo}**, ` +
                `pero no tengo disponible oficialmente el nombre de su líder.`
            );
        }

        return (
            "No tengo registrado oficialmente un equipo ni un líder asociado."
        );
    }

    // ============================================================
    // 📈 NIVEL
    // ============================================================

    const consultaNivel =
        texto.includes("cual es mi nivel") ||
        texto.includes("que nivel tengo") ||
        texto.includes("mi nivel") ||
        texto.includes("en que nivel estoy");

    if (consultaNivel) {

        if (
            autorLiga.nivel !== null &&
            autorLiga.nivel !== undefined
        ) {
            return (
                `Tu nivel registrado oficialmente es **${autorLiga.nivel}**.`
            );
        }

        return "No tengo registrado oficialmente tu nivel.";
    }

    // ============================================================
    // ⭐ XP
    // ============================================================

    const consultaXP =
        texto.includes("cuanta xp tengo") ||
        texto.includes("cuanta experiencia tengo") ||
        texto.includes("mi xp") ||
        texto.includes("mi experiencia") ||
        texto.includes("experiencia tengo");

    if (consultaXP) {

        if (
            autorLiga.xp !== null &&
            autorLiga.xp !== undefined
        ) {
            return (
                `Tienes **${autorLiga.xp} XP** registradas oficialmente.`
            );
        }

        return "No tengo registrada oficialmente tu experiencia.";
    }

    // ============================================================
    // 💰 COINS
    // ============================================================

    const consultaCoins =
        texto.includes("cuantas monedas tengo") ||
        texto.includes("cuanto dinero tengo") ||
        texto.includes("cuantos coins tengo") ||
        texto.includes("mis monedas") ||
        texto.includes("mis coins");

    if (consultaCoins) {

        if (
            autorLiga.coins !== null &&
            autorLiga.coins !== undefined
        ) {
            return (
                `Tienes **${autorLiga.coins} monedas** registradas oficialmente.`
            );
        }

        return "No tengo registradas oficialmente tus monedas.";
    }

    // ============================================================
    // 📊 MENSAJES
    // ============================================================

    const consultaMensajes =
        texto.includes("cuantos mensajes tengo") ||
        texto.includes("cuantos mensajes he enviado") ||
        texto.includes("mis mensajes");

    if (consultaMensajes) {

        if (
            autorLiga.mensajes !== null &&
            autorLiga.mensajes !== undefined
        ) {
            return (
                `Tienes **${autorLiga.mensajes} mensajes** registrados oficialmente.`
            );
        }

        return (
            "No tengo registrado oficialmente tu número de mensajes."
        );
    }

    // ============================================================
    // 🔥 RACHA
    // ============================================================

    const consultaRacha =
        texto.includes("cual es mi racha") ||
        texto.includes("que racha tengo") ||
        texto.includes("mi racha");

    if (consultaRacha) {

        if (
            autorLiga.racha !== null &&
            autorLiga.racha !== undefined
        ) {
            return (
                `Tu racha registrada oficialmente es de **${autorLiga.racha}**.`
            );
        }

        return "No tengo registrada oficialmente tu racha.";
    }

    // ============================================================
    // 🎖️ FASE 2.4.446 — TÍTULO PERSONAL
    // ============================================================

    const consultaTitulo =
        texto.includes("cual es mi titulo") ||
        texto.includes("que titulo tengo") ||
        texto.includes("mi titulo");

    if (consultaTitulo) {

        if (autorLiga.titulo) {
            return (
                `Tu título registrado oficialmente es **${autorLiga.titulo}**.`
            );
        }

        return "No tengo registrado oficialmente tu título.";
    }

    // ============================================================
    // 🏆 FASE 2.4.446 — LOGROS PERSONALES
    // ============================================================

    const consultaLogros =
        texto.includes("cuales son mis logros") ||
        texto.includes("cuales son mis logros personales") ||
        texto.includes("que logros tengo") ||
        texto.includes("que logros personales tengo") ||
        texto.includes("mis logros") ||
        texto.includes("mis logros personales");

    if (consultaLogros) {

        if (
            Array.isArray(autorLiga.logros) &&
            autorLiga.logros.length
        ) {

            const lista =
                autorLiga.logros
                    .map(logro => {

                        if (
                            !logro ||
                            typeof logro !== "object"
                        ) {
                            return null;
                        }

                        const partes = [];

                        if (logro.emoji) {
                            partes.push(logro.emoji);
                        }

                        if (logro.nombre) {
                            partes.push(logro.nombre);
                        }

                        if (logro.titulo) {
                            partes.push(`Título: ${logro.titulo}`);
                        }

                        return partes.join(" — ") || null;

                    })
                    .filter(Boolean)
                    .join("\n");

            return (
                `Estos son tus logros registrados oficialmente:\n\n${lista}`
            );
        }

        return "No tienes logros registrados oficialmente.";
    }

    // ============================================================
    // 🎒 FASE 2.4.446 — INVENTARIO PERSONAL
    // ============================================================

    const consultaInventario =
        texto.includes("cual es mi inventario") ||
        texto.includes("que tengo en mi inventario") ||
        texto.includes("que objetos tengo") ||
        texto.includes("mis objetos") ||
        texto.includes("mis cajas") ||
        texto.includes("cuantas cajas tengo");

    if (consultaInventario) {

        const inventario =
            autorLiga.inventario &&
            typeof autorLiga.inventario === "object"
                ? autorLiga.inventario
                : null;

        if (!inventario) {
            return "No tengo un inventario registrado oficialmente.";
        }

        const cajas =
            Number(inventario.cajas) || 0;

        const objetos =
            Array.isArray(inventario.objetos)
                ? inventario.objetos
                : [];

        if (!objetos.length) {
            return (
                `Tu inventario oficial registra **${cajas} cajas** ` +
                `y no tiene objetos registrados.`
            );
        }

        const listaObjetos =
            objetos
                .map(objeto => {

                    if (
                        !objeto ||
                        typeof objeto !== "object"
                    ) {
                        return null;
                    }

                    const nombre =
                        objeto.nombre || "Objeto";

                    const rareza =
                        objeto.rareza
                            ? ` — ${objeto.rareza}`
                            : "";

                    return `• ${nombre}${rareza}`;

                })
                .filter(Boolean)
                .join("\n");

        return (
            `Tu inventario oficial registra **${cajas} cajas** ` +
            `y **${objetos.length} objetos**:\n\n` +
            listaObjetos
        );
    }

    return null;
}




function generarRespuestaGlobalLocal(pregunta) {
    try {
        const normalizar = valor => String(valor || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        const q = normalizar(pregunta);
        const torneo = obtenerConocimientoTorneo();
        const inscritos = obtenerEquiposInscritos();
        const equipos = obtenerEquipos();
        const resultados = obtenerResultados();
        const fixture = obtenerFixture();
        const partidos = Array.isArray(fixture?.enfrentamientos)
            ? fixture.enfrentamientos
            : [];

        // Inscritos: utilizar exclusivamente la marca oficial inscrito=true.
        const preguntaInscritos =
            /\b(inscritos|inscritas|inscripcion|inscripciones|participantes)\b/.test(q) ||
            /\bquienes participan\b/.test(q) ||
            /\bque equipos participan\b/.test(q);

        if (preguntaInscritos && /\b(equipo|equipos|torneo|participantes|inscripciones|inscritos|inscritas)\b/.test(q)) {
            if (!inscritos.length) {
                return "No hay equipos marcados como inscritos en los datos locales actuales.";
            }

            const preguntaCantidad =
                /\b(cuantos|cuantas|cantidad|numero|total)\b/.test(q);

            const solicitaLista =
                /\b(cuales|que equipos|lista|nombres|mostrar|quienes participan|quienes estan inscritos)\b/.test(q);

            if (preguntaCantidad && !solicitaLista) {
                return `🏆 Actualmente hay ${inscritos.length} equipos inscritos.`;
            }

            const nombres = inscritos
                .map(e => e?.nombre)
                .filter(Boolean);

            if (!nombres.length) {
                return "Hay equipos marcados como inscritos, pero sus nombres no están disponibles en los datos locales.";
            }

            return [
                `🏆 *Equipos inscritos: ${nombres.length}*`,
                "",
                ...nombres.map((nombre, i) => `${i + 1}. ${nombre}`)
            ].join("\n");
        }

        // Diferenciar equipos registrados de equipos inscritos.
        if (/\b(registrados|registradas|registrado|registrada)\b/.test(q) &&
            /\b(equipo|equipos)\b/.test(q)) {
            const quiereLista =
                /\b(cuales|que|lista|nombres|mostrar)\b/.test(q);

            if (quiereLista) {
                const nombres = equipos.map(e => e?.nombre).filter(Boolean);
                if (!nombres.length) {
                    return "No hay nombres de equipos registrados disponibles en los datos locales.";
                }
                return [
                    `📋 *Equipos registrados en la base local: ${nombres.length}*`,
                    "",
                    ...nombres.map((nombre, i) => `${i + 1}. ${nombre}`)
                ].join("\n");
            }

            return `📋 Hay ${equipos.length} equipos en la base local; ${inscritos.length} figuran marcados como inscritos.`;
        }

        // Tabla oficial: no calcular ni inventar posiciones.
        if (/\b(tabla|clasificacion|posiciones|puestos|puntos|ranking)\b/.test(q)) {
            const tabla = obtenerTabla();

            if (!tabla.length) {
                return "📊 La tabla oficial de posiciones no contiene datos actualmente. No puedo confirmar puestos ni puntos.";
            }

            const filas = tabla.map((e, i) => {
                const nombre = e?.nombre || e?.equipo || "Equipo sin nombre";
                const posicion = e?.posicion ?? e?.puesto ?? (i + 1);
                const puntos = e?.puntos;
                return `• ${posicion}. ${nombre}${puntos !== undefined ? ` — ${puntos} puntos` : ""}`;
            });

            return ["📊 *Tabla oficial de posiciones*", ...filas].join("\n");
        }

        // Próximos partidos: solo encuentros sin ganador y no finalizados.
        if (/\b(proximo|proxima|siguiente|cuando juega|cuando es el partido|fecha del partido|partidos pendientes)\b/.test(q)) {
            const pendientes = partidos.filter(p =>
                p &&
                !p.ganador &&
                normalizar(p.estado) !== "finalizado"
            );

            if (!pendientes.length) {
                return `📅 No hay próximos partidos confirmados en el fixture local. Los ${partidos.length} encuentros registrados figuran sin partidos pendientes confirmados.`;
            }

            return [
                "📅 *Partidos pendientes registrados*",
                ...pendientes.map(p =>
                    `• ${p.equipo1 || "Equipo por confirmar"} vs ${p.equipo2 || "Equipo por confirmar"}${p.fecha ? ` — ${p.fecha}` : ""}`
                )
            ].join("\n");
        }

        // Resultados y final: mostrar el texto oficial guardado.
        if (/\b(resultado|resultados|quien gano|ganador|campeon|campeones|final|marcador)\b/.test(q)) {
            const ordenados = [...resultados].reverse();
            const ultimo = ordenados.find(r => r && r.texto);

            if (ultimo) {
                return `📣 *Resultado oficial registrado*\n${ultimo.texto}${ultimo.fecha ? `\n📅 Fecha registrada: ${ultimo.fecha}` : ""}`;
            }

            return null;
        }

        // Respuestas específicas del torneo: usar únicamente datos locales.
        const nombreTorneo =
            torneo.nombre || torneo.titulo || "Liga Titans Team";

        if (/\b(premio|premios|diamantes|recompensa|recompensas)\b/.test(q)) {
            return torneo.premio
                ? `💎 El premio oficial de ${nombreTorneo} es ${torneo.premio}.`
                : null;
        }

        if (/\b(formato|modalidad)\b/.test(q)) {
            return torneo.formato
                ? `⚔️ El formato de ${nombreTorneo} es ${torneo.formato}.`
                : null;
        }

        if (/\b(region|pais)\b/.test(q)) {
            return torneo.region
                ? `🌎 La región registrada para ${nombreTorneo} es ${torneo.region}.`
                : null;
        }

        if (/\b(horario|hora de inicio|a que hora|cuando empieza)\b/.test(q)) {
            return torneo.horaInicio
                ? `🕗 La hora de inicio registrada es ${torneo.horaInicio}${torneo.hora ? ` (${torneo.hora})` : ""}.`
                : null;
        }

        if (/\b(capacidad|maximo de equipos|cuantos equipos caben)\b/.test(q)) {
            return torneo.maxEquipos
                ? `👥 La capacidad máxima registrada es de ${torneo.maxEquipos} equipos.`
                : null;
        }

        // Resumen solo cuando la pregunta es general.
        if (/\b(torneo|hablame|informacion general|resumen)\b/.test(q)) {
            const lineas = [`🏆 *${nombreTorneo}*`];

            if (torneo.premio) lineas.push(`💎 Premio: ${torneo.premio}`);
            if (torneo.formato) lineas.push(`⚔️ Formato: ${torneo.formato}`);
            if (torneo.region) lineas.push(`🌎 Región: ${torneo.region}`);
            if (torneo.maxEquipos) {
                lineas.push(`👥 Capacidad máxima: ${torneo.maxEquipos} equipos`);
            }
            if (inscritos.length || torneo.maxEquipos) {
                lineas.push(`📝 Inscritos actualmente: ${inscritos.length}`);
            }

            return lineas.join("\n");
        }

        return null;
    } catch (error) {
        console.error("⚠️ TitansB | Error en respuesta local de liga:", error.message);
        return null;
    }
}

async function generarRespuesta(
    pregunta,
    grupo = null,
    autor = null
) {

    let resultados = [];

    // ============================================================
    // 👤 IDENTIDAD DEL AUTOR ACTUAL
    // ============================================================
    // Estos datos identifican al usuario que realizó la consulta.
    // No constituyen información oficial de Liga Titans Team.
    const autorId =
        autor?.autorId || null;

    const autorNombre =
        autor?.autorNombre || null;

    // ============================================================
    // 👤 IDENTIDAD OFICIAL DEL AUTOR
    // ============================================================
    // Resuelve al autor actual contra los datos oficiales de
    // Liga Titans Team sin convertirlo en el referente.
    const autorLiga =
        resolverAutorLiga(autorId);

    // ============================================================
    // 🛡️ RESOLUCIÓN PERSONAL DEL AUTOR
    // ============================================================
    // Las preguntas que utilizan "yo", "mi", "mis", "me", etc.
    // y que corresponden directamente al autor actual se
    // resuelven localmente con datos oficiales.
    //
    // IMPORTANTE:
    // - NO modifica el referente conversacional.
    // - NO crea un nuevo referente.
    // - NO utiliza Gemini.
    // - NO utiliza memoria.
    // - NO utiliza web.
    //
    // ============================================================

    const respuestaPersonalAutor =
        resolverConsultaPersonalAutor(
            pregunta,
            autorLiga
        );

    if (respuestaPersonalAutor) {

        console.log(
            "👤 TitansB | consulta personal del autor | " +
            `autor=${autorLiga?.nombre || "N/D"} | ` +
            `pregunta="${pregunta}"`
        );

        if (grupo) {

            try {

                contexto.guardarInteraccion(
                    grupo,
                    autorNombre || autorLiga?.nombre || "Usuario",
                    pregunta,
                    respuestaPersonalAutor
                );

            } catch (error) {

                console.error(
                    "⚠️ TitansB | Error guardando consulta personal:",
                    error.message
                );
            }
        }

        return {
            texto: respuestaPersonalAutor,
            fuente: "oficial_personal",
            entidad: autorLiga?.nombre || null,
            busco: false
        };
    }


    // ============================================================
    // 👤 CONTEXTO OFICIAL DEL AUTOR
    // ============================================================
    // Este contexto identifica oficialmente a quien escribió el
    // mensaje. No modifica ni reemplaza el referente conversacional.
    let contextoAutor = "";

    if (autorLiga) {

        // ============================================================
        // 👤 FASE 2.4.438 — PERFIL PERSONAL COMPLETO EN CONTEXTO
        // ============================================================
        // Perfil oficial del autor actual.
        //
        // IMPORTANTE:
        // - El autor NO se convierte en referente.
        // - El perfil personal NO sustituye al referente.
        // - Los datos proceden de fuentes internas oficiales.
        // - No se realizan deducciones.
        // ============================================================

        const logrosAutorTexto =
            Array.isArray(autorLiga.logros) &&
            autorLiga.logros.length
                ? autorLiga.logros
                    .map(logro => {
                        if (!logro || typeof logro !== "object") {
                            return null;
                        }

                        const partes = [];

                        if (logro.nombre) {
                            partes.push(logro.nombre);
                        }

                        if (logro.emoji) {
                            partes.push(logro.emoji);
                        }

                        if (logro.titulo) {
                            partes.push(`Título: ${logro.titulo}`);
                        }

                        return partes.join(" — ") || null;
                    })
                    .filter(Boolean)
                    .join("\n")
                : "No hay logros registrados oficialmente.";

        const inventarioAutorTexto =
            autorLiga.inventario &&
            typeof autorLiga.inventario === "object"
                ? (
                    Array.isArray(autorLiga.inventario.objetos) &&
                    autorLiga.inventario.objetos.length
                        ? autorLiga.inventario.objetos
                            .map(objeto => {
                                if (!objeto || typeof objeto !== "object") {
                                    return null;
                                }

                                const nombre =
                                    objeto.nombre || "Objeto";

                                const rareza =
                                    objeto.rareza
                                        ? ` — ${objeto.rareza}`
                                        : "";

                                return `${nombre}${rareza}`;
                            })
                            .filter(Boolean)
                            .join("\n")
                        : "No hay objetos registrados oficialmente."
                )
                : "No hay inventario registrado oficialmente.";

        contextoAutor =
            "━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
            "👤 AUTOR ACTUAL — PERFIL OFICIAL\n" +
            "━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +

            `Nombre: ${autorLiga.nombre || autorNombre || "Usuario"}\n` +
            `Rol: ${autorLiga.rol || "no especificado"}\n` +
            `Equipo: ${autorLiga.equipo || "no especificado"}\n` +
            `Líder del equipo: ${autorLiga.equipoEntidad?.nombreLider || "no disponible"}\n\n` +

            "🎮 PERFIL COMPETITIVO\n" +
            `Nombre de juego: ${autorLiga.nombreJuego || "no disponible"}\n` +
            `País: ${autorLiga.pais || "no disponible"}\n` +
            `Rol(es) competitivo(s): ${autorLiga.rolJuego || "no disponible"}\n` +
            `Rango competitivo: ${autorLiga.rango || "no disponible"}\n\n` +

            "📈 PROGRESIÓN PERSONAL\n" +
            `Nivel: ${autorLiga.nivel ?? "no disponible"}\n` +
            `XP: ${autorLiga.xp ?? "no disponible"}\n` +
            `Racha: ${autorLiga.racha ?? "no disponible"}\n\n` +

            "💰 ECONOMÍA\n" +
            `Coins: ${autorLiga.coins ?? "no disponible"}\n\n` +

            "📊 ACTIVIDAD\n" +
            `Mensajes: ${autorLiga.mensajes ?? "no disponible"}\n\n` +

            "🎖️ TÍTULO\n" +
            `Título actual: ${autorLiga.titulo || "no disponible"}\n\n` +

            "🏆 LOGROS OFICIALES\n" +
            `${logrosAutorTexto}\n\n` +

            "🎒 INVENTARIO OFICIAL\n" +
            `Cajas: ${autorLiga.inventario?.cajas ?? 0}\n` +
            `${inventarioAutorTexto}\n\n` +

            "REGLAS DEL PERFIL PERSONAL:\n" +
            "- Estos datos corresponden exclusivamente al autor real del mensaje.\n" +
            "- Utiliza estos datos para responder referencias personales como \"yo\", \"mi\", \"mis\" o expresiones equivalentes cuando corresponda.\n" +
            "- El autor NO es automáticamente el referente de la conversación.\n" +
            "- El perfil personal NO reemplaza ni modifica el referente actual.\n" +
            "- Si la pregunta se refiere a otra entidad, utiliza los datos del referente correspondiente.\n" +
            "- No atribuyas los logros, nivel, XP, monedas, inventario o actividad del autor a otra persona o entidad.\n" +
            "- No inventes datos personales o competitivos que no aparezcan en este perfil.\n" +
            "- Si un dato personal o competitivo no está disponible, indícalo claramente.\n" +
            "- Conserva exactamente los nombres oficiales proporcionados por el sistema.";

        console.log(
            "👤 TitansB | perfil personal agregado al contexto IA | " +
            `autor=${autorLiga.nombre || autorNombre || "N/D"}`
        );
    }

let contextoLiga = "";
    let memorias = [];
    let contextoConversacional = "";
    let referente = null;
    let entidadReferente = null;
    let entidadReferenciaActiva = null;
    let contextoEntidad = "";

    // ============================================================
    // 🔎 DETECCIÓN DE ENTIDAD EXPLÍCITA
    // ============================================================

      let entidadDetectada = null;

      // ============================================================
      // 🔎 DETECCIÓN DE ENTIDAD EXPLÍCITA
      // ============================================================
      // La detección oficial NO depende de que exista grupo.
      //
      // Una pregunta explícita debe poder resolver su entidad
      // aunque generarRespuesta() sea llamada sin contexto de grupo.
      //
      // El grupo solamente se utiliza para guardar/actualizar
      // el referente conversacional.
      // ============================================================

      try {

          entidadDetectada =
              detectarEntidadLiga(pregunta, autorId);


            // ============================================================
            // 👤 PERFIL COMPETITIVO — ENTIDAD EXPLÍCITA
            // ============================================================
            // La entidad consultada utiliza exclusivamente su propio
            // perfil. Nunca se reutiliza el perfil del autor.
            // ============================================================

            if (
                entidadDetectada &&
                entidadDetectada.tipo === "persona" &&
                entidadDetectada.entidad &&
                typeof entidadDetectada.entidad === "object"
            ) {
                const entidadPersona = entidadDetectada.entidad;

                const idEntidad =
                    entidadPersona.autorId ||
                    entidadDetectada.autorId ||
                    entidadPersona.equipoEntidad?.lider ||
                    null;

                if (idEntidad) {
                    try {
                        const perfilEntidad =
                            obtenerPerfilMiembro(idEntidad);

                        if (
                            perfilEntidad &&
                            typeof perfilEntidad === "object"
                        ) {
                            entidadDetectada.entidad = {
                                ...entidadPersona,
                                nombreJuego:
                                    perfilEntidad.nombreJuego || null,
                                pais:
                                    perfilEntidad.pais || null,
                                rolJuego:
                                    perfilEntidad.rolJuego || null,
                                rango:
                                    perfilEntidad.rango || null
                            };

                            console.log(
                                "🎮 TitansB | perfil competitivo de entidad cargado | " +
                                `persona=${entidadDetectada.nombre} | ` +
                                `id=${idEntidad}`
                            );
                        }
                    } catch (error) {
                        console.error(
                            "⚠️ TitansB | Error cargando perfil de entidad:",
                            error.message
                        );
                    }
                }
            }

          if (entidadDetectada) {

              console.log(
                  `🎯 TitansB | entidad detectada | ` +
                  `nombre=${entidadDetectada.nombre} | ` +
                  `tipo=${entidadDetectada.tipo || entidadDetectada.entidad?.tipo || "N/D"}`
              );

              if (grupo) {

                  contexto.establecerReferente(
                      grupo,
                      {
                          ...entidadDetectada,

                          entidad:
                              entidadDetectada.entidad || null
                      }
                  );

                  // Una entidad oficial nueva reemplaza
                  // cualquier entidad desconocida anterior.
                  contexto.limpiarEntidadDesconocida(
                      grupo
                  );
              }
          }

      } catch (error) {

          console.error(
              "⚠️ TitansB | Error detectando entidad:",
              error.message
          );
      }

    // 🎯 REFERENTE CONVERSACIONAL
    // ============================================================

    if (grupo) {

        try {

              referente =
                  contexto.obtenerReferente(grupo);

              entidadReferenciaActiva =
                  contexto.obtenerEntidadActiva(grupo);

              if (referente) {

                  entidadReferente =
                      contexto.obtenerEntidadReferente(grupo);

                  if (entidadReferente) {

                      contextoEntidad =
                          construirContextoEntidad(
                              entidadReferente
                          );

                      console.log(
                          `📦 TitansB | entidad cargada | ` +
                          `grupo=${grupo} | ` +
                          `nombre=${entidadReferente.nombre}`
                      );
                  }

                  console.log(
                      `🎯 TitansB | referente | ` +
                      `grupo=${grupo} | ` +
                      `nombre=${referente.nombre} | ` +
                      `tipo=${referente.tipo}`
                  );
              }


        } catch (error) {

            console.error(
                "⚠️ TitansB | Error obteniendo referente:",
                error.message
            );

            referente = null;
        }
    }

// 👤 FASE 2.4.536 — TRANSICIÓN EQUIPO → LÍDER/PERSONA
    // ============================================================
    //
    // Cuando el usuario pregunta explícitamente por el líder de un
    // equipo, el equipo puede ser el referente inicial.
    //
    // Una vez identificado oficialmente el líder, este pasa a ser
    // el referente conversacional como PERSONA.
    //
    // Ejemplo:
    //
    //   "¿Quién es el líder de Shadow Phoenix?"
    //
    //              ↓
    //
    //   Shadow Phoenix [equipo]
    //
    //              ↓
    //
    //   SamiX [persona]
    //
    // Las preguntas siguientes:
    //
    //   "¿Qué rol tiene?"
    //   "¿En qué equipo está?"
    //   "¿Qué equipo tiene?"
    //
    // deben continuar sobre SamiX.
    //
    // IMPORTANTE:
    // - Solo se activa con referente tipo equipo.
    // - Solo responde a preguntas explícitas sobre el líder.
    // - No modifica memoria.
    // - No inventa personas.
    // - Utiliza únicamente nombreLider oficial.
    // ============================================================

    if (
        grupo &&
        referente &&
        referente.tipo === "equipo" &&
        entidadReferente &&
        typeof entidadReferente === "object"
    ) {

        const textoPreguntaReferente =
            String(pregunta || "")
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[¿?¡!.,;:]+/g, " ")
                .replace(/\s+/g, " ")
                .trim();

        const preguntasSobreLider = [
            "quien es el lider",
            "quien es su lider",
            "cual es el lider",
            "cual es su lider",
            "quien lidera",
            "quien esta al frente",
            "quien esta a cargo",
            "quien esta encargado",
            "quien es el capitan",
            "quien es su capitan"
        ];

        const solicitaLider =
            preguntasSobreLider.some(
                frase =>
                    textoPreguntaReferente.includes(frase)
            );

        const idLider =
            entidadReferente.lider ||
            null;

        let perfilLider = null;

        if (idLider) {
            try {
                perfilLider = obtenerPerfilMiembro(idLider);
            } catch (error) {
                console.error(
                    "⚠️ TitansB | Error obteniendo perfil del líder:",
                    error.message
                );
            }
        }

        const nombreLider =
            perfilLider?.nombre ||
            entidadReferente.nombreLider ||
            entidadReferente.liderNombre ||
            null;

        if (
            solicitaLider &&
            nombreLider &&
            String(nombreLider).trim().length >= 3
        ) {

            const personaLider = {
                nombre: String(nombreLider).trim(),
                tipo: "persona",
                origen: "liga_titans",
                confianza: "interno",

                entidad: {
                    nombre: String(nombreLider).trim(),
                    tipo: "persona",
                    rol: "líder",
                    equipo:
                        entidadReferente.nombre ||
                        referente.nombre ||
                        null,
                    autorId: idLider,
                    nombreJuego:
                        perfilLider?.nombreJuego || null,
                    pais:
                        perfilLider?.pais || null,
                    rolJuego:
                        perfilLider?.rolJuego || null,
                    rango:
                        perfilLider?.rango || null,
                    equipoEntidad: entidadReferente
                }
            };

            try {

                contexto.establecerReferente(
                    grupo,
                    personaLider
                );

                referente = personaLider;

                entidadReferente =
                    personaLider.entidad;

                entidadReferenciaActiva =
                    personaLider.entidad;

                contextoEntidad =
                    construirContextoEntidad(
                        entidadReferente
                    );

                console.log(
                    "👤 TitansB | transición equipo → líder | " +
                    `grupo=${grupo} | ` +
                    `equipo=${personaLider.entidad.equipo || "N/D"} | ` +
                    `persona=${personaLider.nombre}`
                );

            } catch (error) {

                console.error(
                    "⚠️ TitansB | Error estableciendo líder como referente:",
                    error.message
                );
            }
        }
    }

    // ============================================================
    // 🧠 MEMORIA APRENDIDA DEL GRUPO
    // ============================================================

    if (grupo) {

        try {

            memorias =
                buscarMemorias(pregunta, grupo)
                    .slice(0, 10);

            if (memorias.length) {

                console.log(
                    `🧠 TitansB | memorias recuperadas | ` +
                    `grupo=${grupo} | ` +
                    `total=${memorias.length}`
                );

            }

        } catch (error) {

            console.error(
                "⚠️ TitansB | Error recuperando memoria:",
                error.message
            );

            memorias = [];
        }
    }

    // ============================================================
    // 💬 CONTEXTO CONVERSACIONAL DEL GRUPO
    // ============================================================

    if (grupo) {

        try {

            contextoConversacional =
                contexto.construirContexto(grupo);

            if (contextoConversacional) {

                console.log(
                    `💬 TitansB | contexto conversacional | ` +
                    `grupo=${grupo}`
                );

            }

        } catch (error) {

            console.error(
                "⚠️ TitansB | Error cargando contexto conversacional:",
                error.message
            );

            contextoConversacional = "";
        }
    }

    // ============================================================
    // 🧠 CONOCIMIENTO INTERNO DE LIGA TITANS TEAM
    // ============================================================
    //
    // FASE 2.4.518
    //
    // El conocimiento global de Liga NO debe cargarse automáticamente
    // cuando ya existe una entidad oficial específica.
    //
    // Ejemplo:
    //
    //   ¿Qué equipo tiene?
    //
    // referente = persona
    // entidadReferente = persona
    // equipo = Starlight E-sport
    //
    // En este caso el contexto específico de la entidad es suficiente.
    //
    // El contexto global queda reservado para consultas realmente
    // globales de Liga.
    // ============================================================

    // ============================================================
      // 🌐 FASE 2.4.527 — ALCANCE GLOBAL DE LIGA
      // ============================================================
      //
      // La existencia de un referente conversacional NO bloquea
      // una nueva consulta global.
      //
      // Ejemplo:
      //
      //   ¿Cómo va Starlight?
      //   ¿Cuál es la clasificación?
      //
      // La segunda pregunta debe consultar la Liga completa,
      // aunque Starlight continúe siendo el referente.
      //
      // Las referencias posesivas mantienen el alcance específico:
      //
      //   ¿Cuál es su clasificación?
      //   ¿Quién es su líder?
      //   ¿Cuántos jugadores tiene?
      //
      // ============================================================

      const textoAlcanceGlobal =
          String(pregunta || "")
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .trim();

      const tieneReferenciaEntidad =
          /\b(su|sus|ese|esa|ellos|ellas)\b/.test(
              textoAlcanceGlobal
          );

      const tieneMarcadorEntidad =
          textoAlcanceGlobal.includes("de este equipo") ||
          textoAlcanceGlobal.includes("del equipo") ||
          textoAlcanceGlobal.includes("de ese equipo") ||
          textoAlcanceGlobal.includes("para este equipo") ||
          textoAlcanceGlobal.includes("para ese equipo");

      // ============================================================
      // 👤 FASE 2.4.537 — ALCANCE ESPECÍFICO DE PERSONA REFERENTE
      // ============================================================
      //
      // Si el referente actual es una persona oficial y la pregunta
      // solicita datos propios de esa persona, la consulta NO debe
      // convertirse en una consulta global de Liga.
      //
      // Ejemplos:
      //   ¿Qué rol tiene?
      //   ¿En qué equipo está?
      //   ¿Qué equipo tiene?
      //
      // En estos casos:
      //   referente = SamiX [persona]
      //
      // debe mantenerse el alcance específico.
      //
      // IMPORTANTE:
      // - No modifica el referente.
      // - No modifica memoria.
      // - No bloquea preguntas globales reales.
      // - Solo protege consultas internas de personas oficiales.
      // ============================================================

      const preguntasInternasPersona = [
          "que rol tiene",
          "cual es su rol",
          "que cargo tiene",
          "cual es su cargo",
          "en que equipo esta",
          "que equipo esta",
          "que equipo tiene",
          "cual es su equipo",
          "cual es el equipo",
          "donde juega",
          "en donde juega",
          "que posicion tiene",
          "cual es su posicion",
          "que logros tiene",
          "cuales son sus logros",
          "que premios tiene",
          "cuales son sus premios"
      ,
            "cuantos campeonatos tiene",
            "cuantos campeonatos ha ganado",
            "cuantos campeonatos gano",
            "cuantos titulos tiene",
            "cuántos campeonatos tiene",
            "cuántos campeonatos ha ganado",
            "cuántos campeonatos ganó",
            "cuántos títulos tiene",
            "cuantas victorias tiene",
            "cuantas derrotas tiene",
            "cuantos empates tiene",
            "cuantas victorias ha conseguido",
            "cuantas derrotas ha sufrido",
            "cuantos empates tiene su equipo"];

      const esConsultaInternaPersona =
          referente &&
          referente.tipo === "persona" &&
          preguntasInternasPersona.some(
              frase => textoAlcanceGlobal.includes(frase)
          );

      const esConsultaGlobalLiga =
          detectarPreguntaLiga(pregunta) &&
          !entidadDetectada &&
          !tieneReferenciaEntidad &&
          !tieneMarcadorEntidad &&
          !esConsultaInternaPersona;

      const requiereContextoGlobalLiga =
          esConsultaGlobalLiga;

      if (requiereContextoGlobalLiga) {

          try {

              contextoLiga =
                  construirContextoLiga();

              console.log(
                  "🌐 TitansB | ALCANCE GLOBAL | " +
                  `pregunta="${pregunta}" | ` +
                  "conocimiento global incorporado."
              );

          } catch (error) {

              console.error(
                  "⚠️ TitansB | Error cargando conocimiento global:",
                  error.message
              );

              contextoLiga = "";
          }

      } else if (detectarPreguntaLiga(pregunta)) {

          console.log(
              "🎯 TitansB | ALCANCE ESPECÍFICO | " +
              `pregunta="${pregunta}" | ` +
              `entidad=${
                  entidadDetectada?.nombre ||
                  entidadReferenciaActiva?.nombre ||
                  entidadReferente?.nombre ||
                  referente?.nombre ||
                  "N/D"
              }`
          );
      }

      // ============================================================
      // ============================================================
    
      // ============================================================
      
      // 🧠 RESPUESTAS LOCALES PARA CONSULTAS GENERALES DE LA LIGA.
      // Solo actúa cuando la consulta ya fue clasificada como global.
      if (esConsultaGlobalLiga) {
          const respuestaGlobalLocal =
              generarRespuestaGlobalLocal(pregunta);

          if (respuestaGlobalLocal) {
              console.log(
                  "📚 TitansB | respuesta local de liga | " +
                  `pregunta="${pregunta}"`
              );

              return {
                  texto: respuestaGlobalLocal,
                  fuente: "conocimiento_local_liga",
                  entidad: null,
                  busco: false,
                  fuentes: []
              };
          }
      }

// 📊 PERSONA → EQUIPO — PRIORIDAD COMPETITIVA
      // ============================================================
      // La persona puede ser el referente conversacional, pero
      // las estadísticas pertenecen a su equipo.
      //
      // Esta capa debe ejecutarse ANTES de personalidad local.
      // Así evitamos que expresiones como:
      //
      //   "¿Cómo está su equipo?"
      //   "¿Qué tal va su equipo?"
      //
      // sean interpretadas como personalidad de la persona.
      //
      // IMPORTANTE:
      // - No modifica el referente.
      // - No modifica memoria.
      // - Usa exclusivamente equipoEntidad.
      // - Si el fallback no resuelve la consulta, continúa
      //   normalmente hacia personalidad/Gemini.
      // ============================================================

      const entidadPrioridadEquipo =
          entidadDetectada?.entidad &&
          typeof entidadDetectada.entidad === "object"
              ? {
                  ...entidadDetectada.entidad,
                  tipo:
                      entidadDetectada.entidad.tipo ||
                      entidadDetectada.tipo ||
                      null
              }
              : (
                  entidadReferenciaActiva ||
                  entidadReferente ||
                  null
              );

      const equipoDePersona =
          entidadPrioridadEquipo &&
          entidadPrioridadEquipo.tipo === "persona" &&
          entidadPrioridadEquipo.equipoEntidad &&
          typeof entidadPrioridadEquipo.equipoEntidad === "object"
              ? entidadPrioridadEquipo.equipoEntidad
              : null;

      const textoPrioridadEquipo =
          String(pregunta || "")
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "");

        const consultaCompetitivaEquipoPersona =
            Boolean(equipoDePersona) &&
            (
                // --------------------------------------------
                // 👤 REFERENCIA POSESIVA
                // --------------------------------------------
                textoPrioridadEquipo.includes("como va su equipo") ||
                textoPrioridadEquipo.includes("como esta su equipo") ||
                textoPrioridadEquipo.includes("como se encuentra su equipo") ||
                textoPrioridadEquipo.includes("como sigue su equipo") ||
                textoPrioridadEquipo.includes("como le va a su equipo") ||
                textoPrioridadEquipo.includes("como le va el equipo") ||
                textoPrioridadEquipo.includes("que tal va su equipo") ||

                // --------------------------------------------
                // 👤 PERSONA → EQUIPO EXPLÍCITO
                // "el equipo de [persona]"
                // --------------------------------------------
                textoPrioridadEquipo.includes("como va el equipo de ") ||
                textoPrioridadEquipo.includes("como esta el equipo de ") ||
                textoPrioridadEquipo.includes("como se encuentra el equipo de ") ||
                textoPrioridadEquipo.includes("como sigue el equipo de ") ||
                textoPrioridadEquipo.includes("como le va al equipo de ") ||
                textoPrioridadEquipo.includes("que tal va el equipo de ") ||

                // --------------------------------------------
                // 👥 EQUIPO REFERIDO SIN POSESIVO
                // --------------------------------------------
                textoPrioridadEquipo.includes("como va el equipo") ||
                textoPrioridadEquipo.includes("como esta el equipo") ||
                textoPrioridadEquipo.includes("como se encuentra el equipo") ||
                textoPrioridadEquipo.includes("como sigue el equipo") ||
                textoPrioridadEquipo.includes("como le va al equipo") ||
                textoPrioridadEquipo.includes("que tal va el equipo")
            );

      if (consultaCompetitivaEquipoPersona) {

          // ========================================================
          // 🎯 M-02.11 — PERSISTENCIA DE ENTIDAD SECUNDARIA
          // ========================================================
          // La persona continúa siendo el referente principal.
          // El equipo relacionado se conserva como entidad activa
          // secundaria para consultas posteriores.
          //
          // IMPORTANTE:
          // - No reemplaza el referente.
          // - No modifica entidadReferente.
          // - Solo persiste el equipo oficialmente relacionado.
          // ========================================================

          if (
              grupo &&
              equipoDePersona &&
              typeof equipoDePersona === "object" &&
              equipoDePersona.nombre
          ) {
              try {

                  contexto.establecerEntidadActiva(
                      grupo,
                      {
                          ...equipoDePersona,
                          tipo: "equipo",
                          origen:
                              equipoDePersona.origen ||
                              "liga_titans",
                          confianza:
                              equipoDePersona.confianza ||
                              "interno"
                      }
                  );

                  entidadReferenciaActiva =
                      contexto.obtenerEntidadActiva(grupo);

                  console.log(
                      "🎯 TitansB | ENTIDAD ACTIVA persistida | " +
                      `grupo=${grupo} | ` +
                      `referente=${entidadPrioridadEquipo?.nombre || "N/D"} | ` +
                      `secundaria=${equipoDePersona.nombre}`
                  );

              } catch (error) {

                  console.error(
                      "⚠️ TitansB | Error persistiendo entidad activa:",
                      error.message
                  );

              }
          }

          let fallbackEquipoPersona = null;

          try {

              fallbackEquipoPersona =
                  generarFallbackOficial(
                      pregunta,
                      entidadPrioridadEquipo
                  );

          } catch (error) {

              console.error(
                  "⚠️ TitansB | Error prioridad persona → equipo:",
                  error.message
              );

              fallbackEquipoPersona = null;
          }

          if (fallbackEquipoPersona) {

              console.log(
                  "📊 TitansB | PRIORIDAD PERSONA → EQUIPO activada | " +
                  `persona=${entidadPrioridadEquipo?.nombre || "N/D"} | ` +
                  `equipo=${equipoDePersona?.nombre || "N/D"}`
              );

              if (grupo) {

                  try {

                      contexto.guardarInteraccion(
                          grupo,
                          "Usuario",
                          pregunta,
                          fallbackEquipoPersona
                      );

                  } catch (error) {

                      console.error(
                          "⚠️ TitansB | Error guardando prioridad persona → equipo:",
                          error.message
                      );

                  }
              }

              return {
                  texto: fallbackEquipoPersona,
                  fuente: "fallback_oficial",
                  entidad:
                      entidadPrioridadEquipo?.nombre || null
              };
          }
      }

    // ============================================================
    // 📅 R24 — PRÓXIMO PARTIDO — FIXTURE OFICIAL
    // ============================================================
    // Las consultas de próximo partido deben resolverse localmente
    // antes de personalidad/Gemini.
    //
    // IMPORTANTE:
    // - Solo aplica a entidades tipo equipo.
    // - No modifica el referente conversacional.
    // - No modifica memoria.
    // - No inventa partidos.
    // - Si no existe partido pendiente, la propia función devuelve
    //   el mensaje oficial correspondiente.
    // ============================================================

    const entidadParaProximoPartido =
        entidadDetectada?.entidad &&
        typeof entidadDetectada.entidad === "object"
            ? {
                ...entidadDetectada.entidad,
                tipo:
                    entidadDetectada.entidad.tipo ||
                    entidadDetectada.tipo ||
                    null
            }
            : (
                entidadReferenciaActiva ||
                entidadReferente ||
                null
            );

    let respuestaProximoPartido = null;

    try {
        respuestaProximoPartido =
            obtenerRespuestaProximoPartido(
                pregunta,
                entidadParaProximoPartido
            );
    } catch (error) {
        console.error(
            "⚠️ TitansB | Error en próximo partido:",
            error.message
        );
        respuestaProximoPartido = null;
    }

    if (respuestaProximoPartido) {
        console.log(
            "📅 TitansB | PRÓXIMO PARTIDO | " +
            `entidad=${entidadParaProximoPartido?.nombre || "N/D"}`
        );

        if (grupo) {
            try {
                contexto.guardarInteraccion(
                    grupo,
                    "Usuario",
                    pregunta,
                    respuestaProximoPartido
                );
            } catch (error) {
                console.error(
                    "⚠️ TitansB | Error guardando próximo partido:",
                    error.message
                );
            }
        }

        return {
            texto: respuestaProximoPartido,
            fuente: "fixture_oficial",
            entidad:
                entidadParaProximoPartido?.nombre || null,
            busco: false,
            fuentes: []
        };
    }

// 🤖 PERSONALIDAD LOCAL — MIEMBRO VIRTUAL
    // ============================================================
    //
    // Se ejecuta únicamente cuando no existe una respuesta oficial
    // estructurada para la consulta.
    //
    // Si devuelve NULL, el flujo continúa normalmente hacia Gemini.
    // ============================================================

    const entidadParaPersonalidad =
        entidadDetectada?.entidad
            ? {
                ...entidadDetectada.entidad,
                tipo:
                    entidadDetectada.entidad.tipo ||
                    entidadDetectada.tipo ||
                    null
            }
            : (
                entidadReferenciaActiva ||
                entidadReferente ||
                null
            );

    let respuestaLocalPersonalidad = null;

    try {

        // ============================================================
        // 🎯 ENTIDAD PARA PERSONALIDAD LOCAL
        // ============================================================
        // Una entidad explícitamente detectada en la pregunta tiene
        // prioridad sobre el referente conversacional anterior.
        //
        // Ejemplo:
        // "¿Qué opinas de Vortex Esports?"
        // → entidadDetectada.entidad
        //
        // Las consultas oficiales estructuradas ya fueron procesadas
        // antes de llegar a esta capa.
        // ============================================================

        

        respuestaLocalPersonalidad =
            generarRespuestaPersonalidadLocal(
                pregunta,
                entidadParaPersonalidad
            );

    } catch (error) {

        console.error(
            "⚠️ TitansB | Error en personalidad local:",
            error.message
        );

        respuestaLocalPersonalidad = null;
    }

    if (respuestaLocalPersonalidad) {

        console.log(
            "🤖 TitansB | respuesta personalidad local"
        );

        if (grupo) {

            try {

                contexto.guardarInteraccion(
                    grupo,
                    "Usuario",
                    pregunta,
                    respuestaLocalPersonalidad
                );

            } catch (error) {

                console.error(
                    "⚠️ TitansB | Error guardando personalidad local:",
                    error.message
                );
            }
        }

        return {
            texto: respuestaLocalPersonalidad,
            fuente: "personalidad_local",
            entidad: entidadParaPersonalidad?.nombre || null
        };
    }


    // ============================================================
        // ============================================================
      // ============================================================
      // 🛡️ FALLBACK PRE-GEMINI — DATOS OFICIALES
      // ============================================================
      // Las consultas estructuradas sobre entidades oficiales
      // deben resolverse localmente antes de llamar a Gemini.
      //
      // Esto evita:
      // • consumir cuota innecesariamente;
      // • que Gemini contradiga datos oficiales;
      // • perder estadísticas del equipo asociado a una persona.
      //
      // Si generarFallbackOficial() devuelve NULL, el flujo continúa
      // normalmente hacia búsqueda web / Gemini.
      // ============================================================

      let respuestaFallbackPreGemini = null;

      const entidadFallbackPreGemini =
          entidadDetectada?.entidad
              ? {
                  ...entidadDetectada.entidad,
                  tipo:
                      entidadDetectada.entidad.tipo ||
                      entidadDetectada.tipo ||
                      null
              }
              : (
                  entidadReferenciaActiva ||
                  entidadReferente ||
                  null
              );

      try {

          respuestaFallbackPreGemini =
              generarFallbackOficial(
                  pregunta,
                  entidadFallbackPreGemini
              );

      } catch (error) {

          console.error(
              "⚠️ TitansB | Error en fallback PRE-Gemini:",
              error.message
          );

          respuestaFallbackPreGemini = null;
      }

      if (respuestaFallbackPreGemini) {

          console.log(
              "🛡️ TitansB | FALLBACK PRE-GEMINI activado | " +
              `entidad=${
                  entidadFallbackPreGemini?.nombre ||
                  "N/D"
              }`
          );

          if (grupo) {

              try {

                  contexto.guardarInteraccion(
                      grupo,
                      "Usuario",
                      pregunta,
                      respuestaFallbackPreGemini
                  );

              } catch (error) {

                  console.error(
                      "⚠️ TitansB | Error guardando fallback PRE-Gemini:",
                      error.message
                  );

              }
          }

          return {
              texto: respuestaFallbackPreGemini,
              fuente: "fallback_oficial",
              entidad:
                  entidadFallbackPreGemini?.nombre ||
                  null,
              busco: false,
              fuentes: []
          };
      }

        // 📴 MODO LOCAL: no continuar hacia búsqueda web ni Gemini.
    // Las respuestas locales y los fallbacks oficiales anteriores
    // siguen activos. Si no resolvieron la pregunta, guardar silencio.
    console.log("🤖 TitansB | sin respuesta local; se mantiene silencio.");
    return {
        texto: "",
        fuente: "sin_respuesta_local",
        entidad: entidadParaPersonalidad?.nombre || entidadReferente?.nombre || null,
        busco: false,
        fuentes: []
    };

    // 🌐 BÚSQUEDA WEB
        // ============================================================

        if (necesitaBusqueda(pregunta, entidadReferente)) {

        try {

        resultados =
        await buscarWeb(pregunta);

        } catch (error) {

        console.error(
        "⚠️ Búsqueda web no disponible:",
        error.message
        );

        resultados = [];
        }
        }

        let contextoWeb = "";

        if (resultados.length) {

        contextoWeb =
        resultados
        .map((resultado, i) => {

        const dias =
        resultado.diasAntiguedad !== null &&
        resultado.diasAntiguedad !== undefined
        ? resultado.diasAntiguedad
        : "No disponible";

        const actualidad =
        resultado.actualidad !== undefined
        ? resultado.actualidad
        : 0;

        const relevancia =
        resultado.relevancia !== undefined
        ? resultado.relevancia
        : 0;

        const puntuacion =
        resultado.puntuacion !== undefined
        ? resultado.puntuacion
        : 0;

        let prioridad =
        "INFORMACIÓN GENERAL";

        if (
        typeof dias === "number" &&
        dias <= 1
        ) {
        prioridad =
        "🔥 MUY RECIENTE";
        } else if (
        typeof dias === "number" &&
        dias <= 3
        ) {
        prioridad =
        "🟢 RECIENTE";
        } else if (
        typeof dias === "number" &&
        dias <= 7
        ) {
        prioridad =
        "🟡 RECIENTE";
        } else if (
        typeof dias === "number" &&
        dias <= 14
        ) {
        prioridad =
        "🟠 MENOS RECIENTE";
        } else {
        prioridad =
        "🔴 HISTÓRICA / ANTIGUA";
        }

        return `
        FUENTE ${i + 1}
        Título: ${resultado.titulo}
        Fecha: ${resultado.fecha || "No disponible"}
        Antigüedad: ${dias} días
        Actualidad: ${actualidad}
        Relevancia: ${relevancia}
        Puntuación: ${puntuacion}
        Prioridad temporal: ${prioridad}
        Resumen: ${resultado.resumen || "Sin resumen"}
        Enlace: ${resultado.enlace}
        `;
        })
        .join("\n");
        }

        const reglasActualidadWeb = `
        REGLAS ESPECIALES PARA INFORMACIÓN WEB:

        - Si el usuario solicita "últimas noticias", "noticias recientes",
        "actualidad", "qué ha pasado hoy", "qué pasó recientemente"
        o expresiones equivalentes, prioriza las fuentes más recientes.

        - Para preguntas de actualidad, la antigüedad de la noticia debe
        tener prioridad sobre una puntuación temática ligeramente mayor.

        - Una noticia antigua NO debe presentarse como una noticia reciente.

        - Conserva siempre la fecha real proporcionada por la fuente.

        - Si utilizas una noticia antigua porque aporta contexto importante,
        indícalo claramente como información anterior o histórica.

        - No mezcles noticias actuales con noticias antiguas como si todas
        correspondieran al mismo período.

        - Si existen varias fuentes recientes sobre el mismo acontecimiento,
        prioriza las más recientes y relevantes.

        - Si se realizó una búsqueda web y existen resultados relevantes,
        UTILIZA esos resultados para responder la pregunta. No afirmes
        que no hay noticias, que no tienes información reciente o que no
        dispones de datos cuando el contexto web contiene información
        relevante para la consulta.

        - Para preguntas sobre "qué ha pasado recientemente", interpreta
        las noticias recientes encontradas en el contexto web como la
        información disponible para responder.

        - No inventes fechas, acontecimientos, resultados ni información
        que no aparezca en las fuentes.

        - Cuando una fuente web esté escrita en inglés u otro idioma,
        presenta la información al usuario en español.

        - Traduce al español los títulos y resúmenes de las noticias,
        manteniendo sin traducir nombres propios, nombres de equipos,
        jugadores, torneos, siglas y marcas como MLBB, M8, MPL, MCT
        y MOONTON.

        - La traducción debe conservar fielmente el significado original.
        No agregues información que no aparezca en la fuente.

        - Las fuentes web son información externa y no sustituyen los datos
        oficiales internos de Liga Titans Team.

        `;

        let contextoMemoria = "";

        if (memorias.length) {

        const pesoConfianza = {
        oficial: 3,
        aprendido: 2,
        no_confirmado: 1
        };

        const ordenadas = [...memorias].sort(
        (a, b) => {

        const pesoA =
        pesoConfianza[a.confianza] || 1;

        const pesoB =
        pesoConfianza[b.confianza] || 1;

        if (pesoB !== pesoA) {
        return pesoB - pesoA;
        }

        if (
        (b.importancia || 1) !==
        (a.importancia || 1)
        ) {
        return (
        (b.importancia || 1) -
        (a.importancia || 1)
        );
        }

        return (
        new Date(b.fecha || 0) -
        new Date(a.fecha || 0)
        );
        }
        );

        contextoMemoria =
        ordenadas
        .map((memoria, i) => {

        const confianza =
        memoria.confianza ||
        "aprendido";

        let etiqueta =
        "🧠 APRENDIDO";

        if (confianza === "oficial") {
        etiqueta = "🏆 OFICIAL";
        }

        if (confianza === "no_confirmado") {
        etiqueta = "⚠️ NO CONFIRMADO";
        }

        return (
        `${i + 1}. ${etiqueta} ` +
        `[${memoria.tipo}] ` +
        `${memoria.contenido}`
        );
        })
        .join("\n");
        }

        const instrucciones = `
        Eres TitansB, el asistente virtual de la comunidad Liga Titans Team.

        PERSONALIDAD:

        - Hablas español.
        - Eres natural y claro.
        - Tienes un ligero estilo gamer.
        - No eres excesivamente formal.
        - Respondes de manera adecuada para WhatsApp.
        - Puedes mantener conversaciones naturales.
        - Puedes dar opiniones cuando el usuario pide una opinión.
        - Puedes explicar información de la comunidad de forma sencilla.
        - Puedes utilizar emojis con moderación.

        REGLAS GENERALES:

        - Responde directamente la pregunta.
        - No inventes datos.
        - No presentes rumores como hechos.
        - Si una información no está confirmada, dilo claramente.
        - No copies artículos completos.
        - Resume la información.
        - Mantén las respuestas razonablemente cortas.

        JERARQUÍA DE INFORMACIÓN:

        1. 📦 DATOS OFICIALES DE LA ENTIDAD DEL REFERENTE.
        2. 🏆 INFORMACIÓN OFICIAL DE LIGA TITANS TEAM.
        3. 💬 CONTEXTO CONVERSACIONAL.
        4. 🧠 MEMORIA.
        5. 🌐 INFORMACIÓN WEB.
        6. Conocimiento general del modelo.

        REGLA FUNDAMENTAL:

        - Cuando exista una entidad oficial asociada al referente actual, sus datos tienen máxima prioridad.
        - Los datos oficiales de Liga Titans Team tienen prioridad sobre memoria, contexto conversacional, información web y conocimiento general.
        - La conversación y la memoria sirven principalmente para continuidad y contexto.
        - La información web nunca debe sustituir un dato oficial de Liga Titans Team.
        - Si existe contradicción entre una fuente de menor prioridad y una fuente oficial, utiliza la fuente oficial.
        - Nunca conviertas una deducción en un dato oficial.
        - Si un dato oficial solicitado no está disponible, dilo claramente.
        - No inventes datos para completar información faltante.
        - No confundas información histórica con información actual.
        - No afirmes que una función automática existe si todavía no está implementada.
        - No prometas avisos, notificaciones o acciones futuras que TitansB no pueda ejecutar.

        REGLAS DE PRECISIÓN DE DATOS OFICIALES:

        - Cuando respondas utilizando DATOS OFICIALES DE LA ENTIDAD, separa claramente los hechos disponibles de cualquier explicación adicional.
        - No atribuyas al líder, jugadores, equipo, torneo o entidad funciones, logros, trayectoria, características o acciones que no aparezcan explícitamente en los datos proporcionados.
        - No conviertas una descripción narrativa generada por la IA en un hecho oficial.
        - Puedes utilizar lenguaje natural para explicar un dato oficial, pero no agregues información factual nueva.
        - Si el usuario pregunta por un dato que no aparece en los datos oficiales disponibles, responde que ese dato no está disponible.

        REGLAS ESPECÍFICAS PARA PERSONAS:
        - Si la entidad oficial es una persona, utiliza únicamente los atributos explícitamente disponibles.
        - Si solo están disponibles nombre, rol y equipo, limita la respuesta a esos datos.
        - No describas personalidad, estilo de liderazgo, habilidades, carácter, experiencia, trayectoria o logros si no aparecen explícitamente en los datos oficiales.
        - No utilices expresiones especulativas como "seguro que", "probablemente", "debe ser", "sin duda" o equivalentes para completar información faltante.
        - El tono amistoso no debe introducir hechos, características o inferencias sobre la persona.
        - No completes datos faltantes mediante conocimiento general, suposiciones o imaginación.
        - Si puedes responder parcialmente con datos oficiales, responde solamente con la parte confirmada y señala qué información falta.
        - No amplíes ni reduzcas el alcance de un dato oficial. Por ejemplo, "Campeonatos: 0" no significa "campeonatos internacionales: 0", "campeonatos mundiales: 0" ni ninguna categoría específica que no esté indicada.
        - Cuando la pregunta incluya una categoría, alcance, período, región, modalidad o condición que no aparezca explícitamente en los datos oficiales, considera ese dato como no disponible.
        - No respondas una pregunta específica utilizando como equivalente un dato oficial más general.
        - Conserva exactamente los nombres propios proporcionados por los datos oficiales. No agregues palabras, títulos, cargos, etiquetas o descripciones al nombre de una persona o entidad salvo que aparezcan en la información oficial.

        IDENTIDAD DEL AUTOR ACTUAL:

        ${autorNombre || "Usuario"}

        REGLAS DE IDENTIDAD DEL AUTOR:

        - El nombre anterior corresponde al autor actual de este mensaje.
        - Utiliza su nombre cuando sea natural dirigirte a él.
        - No confundas al autor del mensaje con el referente de la conversación.
        - El autor del mensaje NO es automáticamente la entidad sobre la que pregunta.
        - La identidad del autor no modifica la jerarquía de información oficial.

        PREGUNTA DEL USUARIO:

        ${pregunta}

        ${
        contextoAutor
        ? `${contextoAutor}

        `
        : ""
        }

        ${
        referente
        ? `
        ━━━━━━━━━━━━━━━━━━━━━━━━━━
        🎯 REFERENTE ACTUAL DE LA CONVERSACIÓN
        ━━━━━━━━━━━━━━━━━━━━━━━━━━

        Nombre: ${referente.nombre}
        Tipo: ${referente.tipo}
        Origen: ${referente.origen}
        Confianza: ${referente.confianza}

        REGLAS DEL REFERENTE:

        - Este es el referente activo de la conversación.
        - Las referencias como "su", "sus", "él", "ella", "ellos", "su líder", "su capitán", "cuándo juegan" o expresiones equivalentes deben interpretarse primero respecto a este referente.
        - Mantén este referente mientras el usuario continúe hablando de la misma entidad.
        - No cambies a otra entidad sin una indicación clara del usuario.
        `
        : ""
        }

        ${
        contextoEntidad
        ? `
        ━━━━━━━━━━━━━━━━━━━━━━━━━━
        📦 DATOS OFICIALES DE LA ENTIDAD
        ━━━━━━━━━━━━━━━━━━━━━━━━━━

        ${contextoEntidad}

        REGLAS DE LA ENTIDAD:

        - Estos datos provienen directamente de la información interna de Liga Titans Team.
        - Estos datos tienen máxima prioridad cuando la pregunta se refiere al referente actual.
        - Utiliza estos datos antes que cualquier memoria, conversación, web o conocimiento general.
        - No inventes datos que no aparezcan aquí.
        - Si un dato solicitado no aparece aquí, indica que no está disponible.
        `
        : ""
        }

        ${
        contextoLiga
        ? `
        ━━━━━━━━━━━━━━━━━━━━━━━━━━
        🏆 INFORMACIÓN OFICIAL DE LIGA TITANS TEAM
        ━━━━━━━━━━━━━━━━━━━━━━━━━━

        ${contextoLiga}

        REGLAS DE INFORMACIÓN OFICIAL:

        - Esta información procede del sistema interno de Liga Titans Team.
        - Tiene prioridad sobre memoria, contexto conversacional, web y conocimiento general.
        - Nunca alteres nombres, fechas, resultados, posiciones, estadísticas, premios o estados oficiales.
        - Si la información oficial está incompleta, dilo claramente.
        `
        : ""
        }

        ${
        contextoConversacional
        ? `
        ━━━━━━━━━━━━━━━━━━━━━━━━━━
        💬 CONTEXTO DE LA CONVERSACIÓN
        ━━━━━━━━━━━━━━━━━━━━━━━━━━

        ${contextoConversacional}

        REGLAS DEL CONTEXTO:

        - Utiliza este historial para mantener continuidad.
        - Utiliza el historial para resolver referencias como "él", "ella", "su", "su líder", "ese equipo", "ellos", "allí" o expresiones equivalentes.
        - Si el usuario continúa hablando de una entidad mencionada anteriormente, conserva ese referente salvo que indique explícitamente un cambio.
        - El contexto conversacional NO convierte una respuesta anterior en información oficial.
        - Si el historial contradice información oficial de Liga, prevalece la información oficial.
        - No inventes información basándote únicamente en el historial.
        `
        : ""
        }

        ${
        contextoMemoria
        ? `
        ━━━━━━━━━━━━━━━━━━━━━━━━━━
        🧠 MEMORIA APRENDIDA DE ESTE GRUPO
        ━━━━━━━━━━━━━━━━━━━━━━━━━━

        ${contextoMemoria}

        REGLAS DE MEMORIA:

        - Utiliza estas memorias como contexto adicional.
        - 🏆 OFICIAL tiene prioridad sobre 🧠 APRENDIDO.
        - 🧠 APRENDIDO puede ser útil, pero no equivale automáticamente a información oficial.
        - ⚠️ NO CONFIRMADO nunca debe presentarse como hecho confirmado.
        - Nunca reemplaces un dato oficial por información aprendida.
        - Si existe contradicción, utiliza el dato oficial y señala la incertidumbre cuando sea relevante.
        `
        : ""
        }

        ${
        contextoWeb
        ? `
        ━━━━━━━━━━━━━━━━━━━━━━━━━━
        🌐 INFORMACIÓN ENCONTRADA EN INTERNET
        ━━━━━━━━━━━━━━━━━━━━━━━━━━

        ${contextoWeb}

        ${reglasActualidadWeb}

        REGLAS WEB:

        - Utiliza estas fuentes solamente cuando sean relevantes.
        - La información web tiene menor prioridad que los datos oficiales de Liga Titans Team.
        - No utilices información web para contradecir datos oficiales internos.
        - Resume la información.
        `
        : "No se realizó búsqueda web."
        }
        `;

    // 🧠 GENERACIÓN
    // ============================================================

      // ============================================================
      // 🤖 GENERACIÓN CON MANEJO CONTROLADO DE ERRORES GEMINI
      // ============================================================

      let textoRespuesta = "";
      let fuenteRespuesta = "gemini";

      try {

          const respuesta =
              await ai.models.generateContent({
                  model: MODELO,
                  contents: instrucciones
              });

          textoRespuesta =
              respuesta.text?.trim() ||
              "No pude generar una respuesta.";

      } catch (error) {

          const estado =
              error?.status ||
              error?.code ||
              error?.error?.code;

          const mensaje =
              error?.message ||
              "";

          // ========================================================
          // 🚦 CUOTA GEMINI
          // ========================================================

          if (
              estado === 429 ||
              mensaje.includes("RESOURCE_EXHAUSTED") ||
              mensaje.includes("quota")
          ) {

              console.warn(
                  "⚠️ TitansB | Cuota Gemini agotada."
              );

              // ====================================================
              // 🛡️ FALLBACK LOCAL — DATOS OFICIALES
              // ====================================================

                const entidadFallback =
                    entidadDetectada?.entidad
                        ? {
                            ...entidadDetectada.entidad,
                            tipo:
                                entidadDetectada.entidad.tipo ||
                                entidadDetectada.tipo ||
                                null
                        }
                        : (
                            entidadReferenciaActiva ||
                            entidadReferente ||
                            null
                        );

                const fallback =
                    generarFallbackOficial(
                        pregunta,
                        entidadFallback
                    );

              if (fallback) {

                  console.log(
                      "🛡️ TitansB | Fallback oficial activado."
                  );

                  textoRespuesta = fallback;
                  fuenteRespuesta = "fallback_oficial";

                } else {

                    // ====================================================
                    // ⚠️ FALLBACK — ENTIDAD DESCONOCIDA
                    // ====================================================

                    let fallbackDesconocida = null;
                    let entidadOficialDetectada = null;

                    try {

                        entidadOficialDetectada =
                            detectarEntidadLiga(pregunta, autorId);

                    } catch (error) {

                        console.error(
                            "⚠️ TitansB | Error verificando entidad oficial:",
                            error.message
                        );

                        entidadOficialDetectada = null;
                    }

                    // Solo buscar una entidad desconocida cuando
                    // la pregunta NO contiene una entidad oficial.
                    if (!entidadOficialDetectada) {

                        fallbackDesconocida =
                            generarFallbackEntidadDesconocida(
                                pregunta
                            );
                    }

                    if (fallbackDesconocida) {

                        console.log(
                            "⚠️ TitansB | Entidad no registrada detectada | " +
                            `nombre=${fallbackDesconocida.nombre}`
                        );

                        textoRespuesta =
                            fallbackDesconocida.texto;
                        fuenteRespuesta = "entidad_desconocida";

                    } else {

                        fuenteRespuesta = "cuota_gemini";
                    textoRespuesta =
                        "⚠️ TitansB está temporalmente sin cuota disponible para generar respuestas. " +
                        "El contexto y los datos de la conversación siguen intactos. " +
                        "Inténtalo nuevamente en unos segundos.";                    }
                }

          } else {

              console.error(
                  "⚠️ TitansB | Error de Gemini:",
                  mensaje
              );

              fuenteRespuesta = "error_gemini";
              textoRespuesta =
                  "⚠️ TitansB no pudo generar la respuesta en este momento. " +
                  "El contexto de la conversación se conserva.";
          }
      }

      // ============================================================
      // 💬 GUARDAR CONTEXTO CONVERSACIONAL
      // ============================================================

      if (grupo) {

          try {

              contexto.guardarInteraccion(
                  grupo,
                  "Usuario",
                  pregunta,
                  textoRespuesta
              );

          } catch (error) {

              console.error(
                  "⚠️ TitansB | Error guardando contexto:",
                  error.message
              );

          }
      }


return {

        texto:
            textoRespuesta,

        fuente:
            fuenteRespuesta,

        entidad:
            entidadParaPersonalidad?.nombre ||
            entidadReferente?.nombre ||
            null,

        busco:
            resultados.length > 0,

        fuentes:
            resultados

    };
}

// ============================================================

// ============================================================
// 🛡️ B5.5.1 — FALLBACK INTELIGENTE LOCAL
// ============================================================
// Redacta un comunicado de forma determinista cuando Gemini
// no está disponible.
//
// REGLAS:
// • No inventa información.
// • No agrega fechas, horas, lugares, nombres o condiciones.
// • Conserva los datos proporcionados por el administrador.
// • Mejora únicamente la presentación y estructura.
// • No depende de Internet ni de Gemini.
// ============================================================

function generarFallbackComunicadoLocal(
    solicitud,
    modo = "generar"
) {

    const textoOriginal =
        String(solicitud || "").trim();

    if (!textoOriginal) {
        return {
            titulo: "",
            contenido: "",
            ok: false
        };
    }

    // Normalización mínima, sin alterar los datos.
    const texto =
        textoOriginal
            .replace(/\s+/g, " ")
            .trim();

    // --------------------------------------------------------
    // Detectores simples de contexto.
    // No generan información nueva; únicamente ayudan a
    // escoger una presentación apropiada.
    // --------------------------------------------------------

    const textoNormalizado =
        texto
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

    const esReunion =
        textoNormalizado.includes("reunion");

    const esConvocatoria =
        textoNormalizado.includes("convocatoria") ||
        textoNormalizado.includes("convocamos") ||
        textoNormalizado.includes("convoca");

    const esRecordatorio =
        textoNormalizado.includes("recordatorio") ||
        textoNormalizado.includes("recuerden") ||
        textoNormalizado.includes("recuerda");

    // --------------------------------------------------------
    // 🧹 PRESENTACIÓN LOCAL
    // --------------------------------------------------------
    // Solo elimina prefijos que ya fueron representados
    // mediante el título. No agrega información factual.
    // --------------------------------------------------------

    let textoPresentacion = texto;

    if (esRecordatorio) {
        textoPresentacion =
            texto.replace(
                /^recordatorio\s*:\s*/i,
                ""
            ).trim();
    } else if (esConvocatoria) {
        textoPresentacion =
            texto.replace(
                /^convocamos\s*/i,
                ""
            ).trim();
    }

    // --------------------------------------------------------
    // TÍTULO LOCAL
    // --------------------------------------------------------

    let titulo =
        "COMUNICADO DE LA COMUNIDAD";

    if (esReunion) {
        titulo = "REUNIÓN DE LA COMUNIDAD";
    } else if (esConvocatoria) {
        titulo = "CONVOCATORIA";
    } else if (esRecordatorio) {
        titulo = "RECORDATORIO";
    }

    // --------------------------------------------------------
    // CONTENIDO LOCAL
    //
    // La información factual permanece exactamente en manos
    // de la solicitud original.
    // --------------------------------------------------------

    let contenido;

    if (esReunion) {

        contenido =
            `📢 ¡Atención, equipo Titans!\n\n` +
            `Les informamos que ${textoPresentacion}.\n\n` +
            `⚔️ TitansB • Liga Titans Team`;

    } else if (esConvocatoria) {

        contenido =
            `📢 Atención, equipo Titans.\n\n` +
            `${textoPresentacion}\n\n` +
            `⚔️ TitansB • Liga Titans Team`;

    } else if (esRecordatorio) {

        contenido =
            `📢 Recordatorio para la comunidad:\n\n` +
            `${textoPresentacion}\n\n` +
            `⚔️ TitansB • Liga Titans Team`;

    } else {

        contenido =
            `📢 Información para la comunidad:\n\n` +
            `${texto}\n\n` +
            `⚔️ TitansB • Liga Titans Team`;
    }

    return {
        titulo,
        contenido,
        ok: true
    };
}

// 📢 GENERADOR DE COMUNICADOS OFICIALES
// ============================================================
// Este generador es independiente de generarRespuesta().
// Su función es redactar comunicaciones oficiales utilizando
// exclusivamente el contexto oficial disponible de Liga Titans Team.
// ============================================================

async function generarComunicado(instruccion, autor = null) {

    const solicitud =
        String(instruccion || "").trim();

    const modo =
        autor?.modo === "mejorar"
            ? "mejorar"
            : "generar";

    const menciones =
        Array.isArray(autor?.menciones)
            ? autor.menciones
                .filter(Boolean)
                .map(nombre => String(nombre).trim())
                .filter(Boolean)
            : [];

    if (!solicitud) {
        return {
            ok: false,
            titulo: "",
            contenido: "",
            texto: "",
            motivo: "instruccion_vacia"
        };
    }

    const instruccionesComunicado = `
Eres TitansB, el asistente virtual oficial de la comunidad Liga Titans Team.

Tu tarea es convertir la instrucción escrita por un administrador en un mensaje final listo para enviar a la comunidad.

Antes de redactar, comprende la intención real del administrador, identifica qué quiere comunicar y adapta la redacción al contexto.

OBJETIVO:
El mensaje debe sentirse escrito por un asistente humano que entiende la comunidad: claro, natural, cercano cuando corresponda y profesional cuando la situación lo requiera.

MODO DE TRABAJO:
El administrador puede solicitar una de estas dos operaciones:

1. GENERAR:
La información proporcionada puede ser una idea, instrucción o información
sin redactar. Convierte esa información en un mensaje final profesional,
natural y apropiado para la comunidad.

2. MEJORAR:
El texto proporcionado YA ES un mensaje redactado por el administrador.
Debes conservar su intención, hechos y significado, pero mejorar
ortografía, gramática, claridad, estructura, fluidez y presentación.
No lo trates como una simple idea ni agregues información nueva.

MODO ACTUAL:
${modo}

TIPOS DE MENSAJE:
Determina internamente cuál corresponde mejor al resultado:
- mensaje cercano o comunitario;
- aviso informativo;
- comunicado oficial;
- convocatoria;
- anuncio de torneo;
- información sobre una actividad o evento;
- recordatorio;
- felicitación o reconocimiento;
- otro formato que resulte más natural.

No muestres esta clasificación al administrador.

REGLAS DE REDACCIÓN:
1. Conserva exactamente los hechos e información proporcionados por el administrador.
2. Corrige ortografía, gramática, puntuación y expresiones poco naturales.
3. Reorganiza las ideas cuando sea necesario para mejorar claridad y fluidez.
4. Puedes mejorar la forma de expresar una idea, pero nunca cambiar su significado.

5. Adapta automáticamente el tono al contexto:
   - cercano y natural para mensajes comunitarios;
   - claro e informativo para avisos;
   - profesional para comunicados;
   - dinámico para convocatorias y actividades;
   - serio cuando la información requiera atención.

6. No conviertas automáticamente un mensaje sencillo en un comunicado extremadamente formal.

7. Si la instrucción ya está bien redactada, no la transformes innecesariamente.

8. Utiliza emojis solo cuando aporten claridad, emoción o identidad. No abuses de ellos.

REGLAS ESPECIALES PARA MODO MEJORAR:
- El texto recibido ya contiene el mensaje que el administrador desea transmitir.
- Conserva todos sus hechos, intención y significado.
- Puedes corregir ortografía, gramática, puntuación, claridad, estructura y fluidez.
- Puedes eliminar repeticiones o expresiones poco naturales.
- NO agregues llamadas a la acción que no existan en el texto original.
- NO agregues invitaciones, recomendaciones, despedidas o instrucciones nuevas.
- NO agregues entusiasmo, contexto o información adicional que no esté presente.
- NO agregues nombres, fechas, horarios, lugares, premios, resultados, reglas o cantidades.
- Si una frase original es breve, el resultado puede seguir siendo breve.
- La mejora debe ser una transformación editorial del texto original, no una ampliación creativa.

9. Mantén la identidad de Liga Titans Team y TitansB cuando sea apropiado.
10. No inventes información bajo ninguna circunstancia.
11. No agregues fechas, horarios, resultados, equipos, premios, reglas, enlaces, nombres, lugares, cantidades ni otros datos que no hayan sido proporcionados.
12. No supongas información que el administrador no haya indicado.
13. Si falta un dato importante, redacta únicamente con la información disponible; no lo completes mediante una suposición.
14. Conserva literalmente los datos concretos importantes proporcionados por el administrador, especialmente fechas, horarios, nombres y cantidades.
15. No inventes llamadas a la acción, premios, condiciones o instrucciones adicionales.
16. No incluyas explicaciones sobre el proceso de redacción.
17. No incluyas análisis, comentarios internos, advertencias del modelo ni texto fuera del formato solicitado.
18. El resultado debe estar listo para copiar y enviar directamente a la comunidad.

INSTRUCCIÓN DEL ADMINISTRADOR:
${solicitud}

Redacta ahora el mensaje final siguiendo todas las reglas anteriores.

Devuelve únicamente este formato:

TÍTULO:
[título breve y natural]

CONTENIDO:
[contenido final listo para enviar a la comunidad]`;

    try {

        const respuesta =
            await ai.models.generateContent({
                model: MODELO,
                contents: instruccionesComunicado
            });

        const texto =
            respuesta.text?.trim() || "";

        if (!texto) {
            return {
                ok: false,
                titulo: "",
                contenido: "",
                texto: "",
                motivo: "respuesta_vacia"
            };
        }

        const coincidencia =
            texto.match(
                /T[ÍI]TULO\s*:\s*([\s\S]*?)\s+CONTENIDO\s*:\s*([\s\S]*)$/i
            );

        if (!coincidencia) {

            console.warn(
                "⚠️ TitansB | Formato de comunicado no reconocido."
            );

            return {
                ok: false,
                titulo: "",
                contenido: "",
                texto,
                motivo: "formato_invalido"
            };
        }

        const titulo =
            coincidencia[1]
                .trim()
                .replace(/^["'“”]+|["'“”]+$/g, "");

        const contenido =
            coincidencia[2]
                .trim();

        if (!titulo || !contenido) {
            return {
                ok: false,
                titulo,
                contenido,
                texto,
                motivo: "titulo_o_contenido_vacio"
            };
        }

        return {
            ok: true,
            titulo,
            contenido,
            texto,
            menciones,
            motivo: null
        };

    } catch (error) {
        console.error(
            "❌ TitansB | Error generando comunicado:",
            error.message
        );

        // 🛡️ B5.5.1 — Fallback local inteligente.
        // Si Gemini no está disponible, utilizamos el generador
        // determinista sin inventar información.
        const fallbackLocal =
            generarFallbackComunicadoLocal(
                solicitud,
                modo
            );

        if (fallbackLocal.ok) {
            console.log(
                "🛡️ TitansB | Fallback local de comunicado activado."
            );

            return {
                ok: true,
                titulo: fallbackLocal.titulo,
                contenido: fallbackLocal.contenido,
                texto: fallbackLocal.contenido,
                menciones,
                motivo: "fallback_local"
            };
        }

        return {
            ok: false,
            titulo: "",
            contenido: "",
            texto: "",
            motivo: "error_gemini"
        };
    }
}

module.exports = {
    generarRespuesta,
    generarComunicado,
    resolverAutorLiga,
    generarFallbackOficial,
    generarRespuestaPersonalidadLocal,
    necesitaBusqueda,
    construirContextoEntidad,
    obtenerRespuestaProximoPartido
};
