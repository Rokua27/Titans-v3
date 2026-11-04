const fs = require("fs");
const path = require("path");

const DATABASE = path.join(process.cwd(), "database");

function leerJSON(nombre, defecto = null) {
    try {
        const archivo = path.join(DATABASE, nombre);

        if (!fs.existsSync(archivo)) {
            return defecto;
        }

        return JSON.parse(
            fs.readFileSync(archivo, "utf8")
        );

    } catch (error) {

        console.error(
            `⚠️ TitansB | Error leyendo ${nombre}:`,
            error.message
        );

        return defecto;
    }
}

// ============================================================
// 🏆 TORNEO
// ============================================================

function obtenerConocimientoTorneo() {

    const torneo =
        leerJSON("torneo.json", {});

    return {

        titulo:
            torneo.titulo ||
            "LIGA TITANS TEAM",

        nombre:
            torneo.nombre ||
            "No especificado",

        descripcion:
            torneo.descripcion ||
            "",

        creador:
            torneo.creador ||
            "",

        premio:
            torneo.premio ||
            "",

        estado:
            torneo.estado ||
            "",

        formato:
            torneo.formato ||
            "",

        clasifican:
            torneo.clasifican ||
            "",

        region:
            torneo.region ||
            "",

        hora:
            torneo.hora ||
            "",

        horaInicio:
            torneo.horaInicio ||
            "",

        proximaFecha:
            torneo.proximaFecha ||
            "",

        maxEquipos:
            torneo.maxEquipos ||
            null
    };
}

// ============================================================
// 👥 EQUIPOS
// ============================================================

function obtenerEquipos() {

    const equipos =
        leerJSON("equipos.json", {});

    if (
        equipos &&
        !Array.isArray(equipos) &&
        typeof equipos === "object"
    ) {
        return Object.values(equipos);
    }

    if (Array.isArray(equipos)) {
        return equipos;
    }

    return [];
}

// ============================================================
// 🏆 EQUIPOS INSCRITOS
// ============================================================

function obtenerEquiposInscritos() {

    return obtenerEquipos().filter(
        equipo =>
            equipo &&
            equipo.inscrito === true
    );
}

// ============================================================
// 📊 TABLA
// ============================================================

function obtenerTabla() {

    const tabla =
        leerJSON("tabla.json", {});

    if (Array.isArray(tabla)) {
        return tabla;
    }

    if (
        tabla &&
        Array.isArray(tabla.equipos)
    ) {
        return tabla.equipos;
    }

    return [];
}

// ============================================================
// 📅 FIXTURE
// ============================================================

function obtenerFixture() {

    return leerJSON(
        "fixture.json",
        {}
    );
}

// ============================================================
// 📅 PRÓXIMO PARTIDO DE UN EQUIPO
// ============================================================

function buscarProximoPartidoEquipo(nombreEquipo) {

    const fixture = obtenerFixture();

    const partidos =
        fixture &&
        Array.isArray(fixture.enfrentamientos)
            ? fixture.enfrentamientos
            : [];

    const normalizarEquipo = valor =>
        String(valor || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();

    const buscado =
        normalizarEquipo(nombreEquipo);

    if (!buscado) {
        return null;
    }

    const pendientes =
        partidos.filter(partido => {

            if (!partido || partido.ganador) {
                return false;
            }

            const equipo1 =
                normalizarEquipo(partido.equipo1);

            const equipo2 =
                normalizarEquipo(partido.equipo2);

            return (
                equipo1 === buscado ||
                equipo2 === buscado
            );
        });

    return pendientes[0] || null;
}

// ============================================================
// ⚔️ RESULTADOS
// ============================================================

function obtenerResultados() {

    const datos =
        leerJSON(
            "resultados.json",
            {}
        );

    if (Array.isArray(datos)) {
        return datos;
    }

    if (
        datos &&
        Array.isArray(datos.resultados)
    ) {
        return datos.resultados;
    }

    return [];
}

// ============================================================
// 🧠 CONSTRUIR CONTEXTO
// ============================================================

function construirContextoLiga() {

    const torneo =
        obtenerConocimientoTorneo();

    const equipos =
        obtenerEquipos();

    const inscritos =
        obtenerEquiposInscritos();

    const tabla =
        obtenerTabla();

    const fixture =
        obtenerFixture();

    const resultados =
        obtenerResultados();

    let contexto = `

DATOS OFICIALES DE LIGA TITANS TEAM

━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 TORNEO
━━━━━━━━━━━━━━━━━━━━━━━━━━

Título: ${torneo.titulo}
Nombre: ${torneo.nombre}
Descripción: ${torneo.descripcion}
Premio: ${torneo.premio}
Estado: ${torneo.estado}
Formato: ${torneo.formato}
Clasificación: ${torneo.clasifican}
Región: ${torneo.region}
Hora: ${torneo.hora}
Hora de inicio: ${torneo.horaInicio}
Próxima fecha: ${torneo.proximaFecha}
Máximo de equipos: ${torneo.maxEquipos}

━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 EQUIPOS
━━━━━━━━━━━━━━━━━━━━━━━━━━

Equipos registrados: ${equipos.length}
Equipos inscritos oficialmente: ${inscritos.length}
`;

    if (inscritos.length) {

        contexto += `

EQUIPOS INSCRITOS OFICIALMENTE:
`;

        inscritos.forEach((equipo, i) => {

            contexto += `${i + 1}. ${
                equipo.nombre ||
                equipo.equipo ||
                "Equipo sin nombre"
            }\n`;

        });

    } else {

        contexto += `
No hay equipos inscritos oficialmente disponibles.
`;
    }

    if (equipos.length) {

        contexto += `

EQUIPOS REGISTRADOS EN EL SISTEMA:
`;

        equipos.slice(0, 30).forEach((equipo, i) => {

            if (typeof equipo === "string") {

                contexto +=
                    `${i + 1}. ${equipo}\n`;

                return;
            }

            contexto +=
                `${i + 1}. ${
                    equipo.nombre ||
                    equipo.equipo ||
                    "Equipo sin nombre"
                } | Inscrito: ${
                    equipo.inscrito === true
                        ? "SÍ"
                        : "NO"
                }\n`;
        });
    }

    // ========================================================
    // 📊 CLASIFICACIÓN
    // ========================================================

    contexto += `

━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 CLASIFICACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    if (tabla.length) {

        contexto +=
            "Existe una clasificación oficial registrada:\n\n";

        tabla
            .slice(0, 20)
            .forEach((equipo, i) => {

                if (!equipo) return;

                contexto +=
                    `${i + 1}. ${
                        equipo.nombre ||
                        equipo.equipo ||
                        "Equipo"
                    } | ` +
                    `Puntos: ${
                        equipo.puntos ?? 0
                    } | ` +
                    `PJ: ${
                        equipo.pj ??
                        equipo.PJ ??
                        0
                    } | ` +
                    `V: ${
                        equipo.victorias ??
                        equipo.v ??
                        0
                    } | ` +
                    `D: ${
                        equipo.derrotas ??
                        equipo.d ??
                        0
                    }\n`;
            });

    } else {

        contexto +=
            "⚠️ No existe una clasificación oficial registrada actualmente.\n";
    }

    // ========================================================
    // 📅 FIXTURE
    // ========================================================

    contexto += `

━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 FIXTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    if (
        fixture &&
        Object.keys(fixture).length
    ) {

        contexto +=
            JSON.stringify(
                fixture,
                null,
                2
            );

    } else {

        contexto +=
            "⚠️ No hay fixture oficial disponible.";
    }

    // ========================================================
    // ⚔️ RESULTADOS
    // ========================================================

    contexto += `

━━━━━━━━━━━━━━━━━━━━━━━━━━
⚔️ RESULTADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    if (resultados.length) {

        contexto +=
            JSON.stringify(
                resultados.slice(-20),
                null,
                2
            );

    } else {

        contexto +=
            "⚠️ No hay resultados oficiales registrados.";
    }

    return contexto.trim();
}

// ============================================================
// 🔎 DETECTAR PREGUNTA DE LIGA
// ============================================================

function detectarPreguntaLiga(
    pregunta = ""
) {

    const texto =
        String(pregunta || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .trim();

    if (!texto) {
        return false;
    }

    // ========================================================
    // 🌐 PALABRAS EXPLÍCITAS DE LIGA
    // ========================================================

    const palabras = [

        "liga",
        "titans",

        "torneo",

        "equipo",
        "equipos",

        "inscrito",
        "inscritos",
        "inscripcion",
        "inscripciones",

        "tabla",
        "clasificacion",

        "fixture",
        "jornada",

        "partido",
        "partidos",

        "resultado",
        "resultados",

        "campeon",
        "campeones",
        "campeonato",
        "campeonatos",

        "titulo",
        "titulos",

        "final",
        "octavos",
        "cuartos",
        "semifinal",

        "premio",
        "region",
        "pais",
        "hora",
        "horario",
        "horarios",
        "inicio",
        "empieza",
        "capacidad",
        "puntos",
        "victorias",
        "derrotas",
        "empates",

        "reglamento",
        "reglas",

        "lider",
        "capitan",
        "jugadores",
        "miembros",

        "roster"
    ];

    if (
        palabras.some(
            palabra =>
                texto.includes(palabra)
        )
    ) {
        return true;
    }

    // ========================================================
    // 🎯 ENTIDAD OFICIAL DETECTADA
    // ========================================================
    //
    // Si la pregunta no contiene una palabra explícita
    // de Liga, pero menciona una entidad oficial registrada,
    // también debe considerarse una consulta interna.
    //
    // Ejemplos:
    //
    // ¿Quién es Atlas?
    // ¿Cómo va Atlas?
    // ¿Quién lidera Atlas?
    // ¿Cuántos jugadores tiene Atlas?
    // ¿Cuándo juega Atlas?
    //
    // La entidad se valida mediante el detector oficial.
    // ========================================================

    try {

        const entidad =
            detectarEntidadLiga(texto);

        if (
            entidad &&
            entidad.origen === "liga_titans"
        ) {
            return true;
        }

    } catch (error) {

        console.error(
            "⚠️ TitansB | Error detectando pregunta de Liga:",
            error.message
        );
    }

    return false;
}

// ============================================================
// 🎯 DETECTAR ENTIDAD DE LIGA TITANS
// ============================================================

function detectarEntidadLiga(pregunta, autorId = null) {

    if (!pregunta || typeof pregunta !== "string") {
        return null;
    }

    const texto =
        pregunta
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();

    if (!texto) {
        return null;
    }

    // ============================================================
    // 🔧 NORMALIZADOR
    // ============================================================

    function normalizar(valor) {

        return String(valor || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\p{L}\p{N}\s]/gu, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

      // ============================================================
      // 🆔 NORMALIZADOR DE IDs DE LIGA
      // ============================================================
      // Permite comparar el mismo usuario independientemente
      // del identificador utilizado por WhatsApp.
      //
      // 123456789@lid
      // 123456789@s.whatsapp.net
      // 123456789@c.us
      // ============================================================

      function normalizarIdLiga(id) {
          return String(id || "")
              .replace(/@lid$/i, "")
              .replace(/@s\.whatsapp\.net$/i, "")
              .replace(/@c\.us$/i, "");
      }

      const usuariosPorIdLiga =
          leerJSON("usuarios.json", {});

      function obtenerNombreUsuarioPorIdLiga(id) {
          const idNormalizado =
              normalizarIdLiga(id);

          if (
              !idNormalizado ||
              !usuariosPorIdLiga ||
              typeof usuariosPorIdLiga !== "object" ||
              Array.isArray(usuariosPorIdLiga)
          ) {
              return null;
          }

          const claveUsuario =
              Object.keys(usuariosPorIdLiga).find(clave =>
                  normalizarIdLiga(clave) === idNormalizado &&
                  usuariosPorIdLiga[clave] &&
                  typeof usuariosPorIdLiga[clave] === "object" &&
                  typeof usuariosPorIdLiga[clave].nombre === "string" &&
                  usuariosPorIdLiga[clave].nombre.trim() !== ""
              );

          return claveUsuario
              ? usuariosPorIdLiga[claveUsuario].nombre.trim()
              : null;
      }

    // ============================================================
    // 🆔 PERSONA — ID EXPLÍCITO
    // ============================================================
    // FASE 2.4.464
    //
    // Permite resolver una persona cuando la pregunta contiene
    // directamente su ID oficial.
    //
    // Ejemplos:
    //
    //   "¿Quién es 239526316363896?"
    //   "¿Qué equipo tiene 239526316363896?"
    //
    // usuarios.json puede almacenar:
    //
    //   239526316363896@lid
    //
    // o:
    //
    //   12017821839520@s.whatsapp.net
    //
    // IMPORTANTE:
    // - No utiliza autorId.
    // - No convierte al autor actual en referente.
    // - Solo resuelve IDs escritos explícitamente en la pregunta.
    // - La resolución es exclusivamente contra usuarios.json.
    // - Después se consulta equipos.json para obtener pertenencia
    //   y rol oficial.
    // ============================================================

    const usuariosPorId =
        leerJSON("usuarios.json", {});

    if (
        usuariosPorId &&
        typeof usuariosPorId === "object" &&
        !Array.isArray(usuariosPorId)
    ) {

        const idsNumericos = [
            ...texto.matchAll(/(?<!\d)(\d{8,})(?!\d)/g)
        ].map(match => match[1]);

        if (idsNumericos.length) {

            const equiposDisponibles =
                obtenerEquipos();

            for (const idNumerico of idsNumericos) {

                let usuarioEncontrado = null;
                let idEncontrado = null;

                // ----------------------------------------------------
                // 🔎 BUSCAR ID EN usuarios.json
                // ----------------------------------------------------

                for (const [idGuardado, usuario] of Object.entries(
                    usuariosPorId
                )) {

                    if (
                        !usuario ||
                        typeof usuario !== "object" ||
                        !usuario.nombre
                    ) {
                        continue;
                    }

                    const idNormalizado =
                        String(idGuardado)
                            .replace(/@lid$/i, "")
                            .replace(/@s\.whatsapp\.net$/i, "")
                            .replace(/@c\.us$/i, "");

                    const digitosId =
                        idNormalizado.replace(/\D/g, "");

                    if (digitosId === idNumerico) {

                        usuarioEncontrado = usuario;
                        idEncontrado = idGuardado;

                        break;
                    }
                }

                if (!usuarioEncontrado) {
                    continue;
                }

                // ----------------------------------------------------
                // 👥 BUSCAR EQUIPO OFICIAL DEL MIEMBRO
                // ----------------------------------------------------

                let equipoEncontrado = null;

                if (Array.isArray(equiposDisponibles)) {

                    for (const equipo of equiposDisponibles) {

                        if (
                            !equipo ||
                            !equipo.nombre ||
                            !Array.isArray(equipo.miembros)
                        ) {
                            continue;
                        }


                        const idConsultado =
                            normalizarIdLiga(idEncontrado);

                        const perteneceAlEquipo =
                            equipo.miembros.some(miembroId =>
                                normalizarIdLiga(miembroId) ===
                                idConsultado
                            );

                        if (perteneceAlEquipo) {
                            equipoEncontrado = equipo;
                            break;
                        }
                    }
                }

                const esLider =
                    equipoEncontrado &&
                    normalizarIdLiga(equipoEncontrado.lider) ===
                    normalizarIdLiga(idEncontrado);

                console.log(
                    "🆔 TitansB | ID explícito resuelto | " +
                    `id=${idEncontrado} | ` +
                    `nombre=${usuarioEncontrado.nombre} | ` +
                    `equipo=${equipoEncontrado?.nombre || "N/D"}`
                );

                return {
                    nombre: usuarioEncontrado.nombre,
                    tipo: "persona",
                    origen: "liga_titans",
                    confianza: "interno",
                    entidad: {
                        nombre: usuarioEncontrado.nombre,
                        tipo: "persona",
                        rol: esLider
                            ? "líder"
                            : "miembro",
                        autorId: idEncontrado,
                        equipo:
                            equipoEncontrado?.nombre || null,
                        equipoEntidad:
                            equipoEncontrado || null
                    }
                };
            }
        }
    }

    // ============================================================
    // 👥 EQUIPOS
    // ============================================================

    const equipos = obtenerEquipos();

    if (Array.isArray(equipos) && equipos.length) {

        // --------------------------------------------------------
        // 1️⃣ COINCIDENCIA POR NOMBRE COMPLETO
        // --------------------------------------------------------

        const coincidencias =
            equipos
                .filter(equipo => {

                    if (!equipo || !equipo.nombre) {
                        return false;
                    }

                    const nombre =
                        normalizar(equipo.nombre);

                    if (!nombre || nombre.length < 3) {
                        return false;
                    }

                    return texto.includes(nombre);
                })
                .sort(
                    (a, b) =>
                        String(b.nombre).length -
                        String(a.nombre).length
                );

        if (coincidencias.length) {

            const equipo =
                coincidencias[0];

            return {
                nombre: equipo.nombre,
                tipo: "equipo",
                origen: "liga_titans",
                confianza: "interno",
                entidad: equipo
            };
        }

        // --------------------------------------------------------
        // 1.5️⃣ PERSONA / LÍDER — NOMBRE EXACTO
        // --------------------------------------------------------
        //
        // Si el texto contiene exactamente el nombre de una persona
        // registrada como líder, debe tener prioridad sobre una
        // coincidencia corta de equipo.
        //
        // Ejemplo:
        //   "Shadow" → Shadow [persona]
        //
        // Esto evita que "Shadow" sea absorbido por:
        //   Shadow Phoenix
        //
        // IMPORTANTE:
        // Los nombres completos de equipos ya fueron evaluados
        // arriba, por lo que:
        //
        //   "Shadow Phoenix" → equipo
        //
        // sigue teniendo prioridad.
        // --------------------------------------------------------

        const coincidenciasLiderExactas = [];

        for (const equipo of equipos) {

            if (!equipo || !equipo.nombre || !equipo.nombreLider) {
                continue;
            }

            const nombreLider =
                normalizar(equipo.nombreLider);

            const nombreLiderUsuario =
                normalizar(
                    obtenerNombreUsuarioPorIdLiga(
                        equipo.lider
                    )
                );

            const nombresLider = [
                nombreLider,
                nombreLiderUsuario
            ].filter((nombre, indice, lista) =>
                nombre &&
                nombre.length >= 3 &&
                lista.indexOf(nombre) === indice
            );

            for (const nombreCoincidencia of nombresLider) {

                const patronLider =
                    new RegExp(
                        `\\b${nombreCoincidencia.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
                        "i"
                    );

                if (patronLider.test(texto)) {

                    coincidenciasLiderExactas.push({
                        equipo,
                        nombreLider: nombreCoincidencia,
                        nombreRespuesta:
                            nombreCoincidencia === nombreLiderUsuario
                                ? obtenerNombreUsuarioPorIdLiga(equipo.lider)
                                : equipo.nombreLider
                    });
                }
            }
        }

        if (coincidenciasLiderExactas.length) {

            coincidenciasLiderExactas.sort(
                (a, b) =>
                    b.nombreLider.length -
                    a.nombreLider.length
            );

            const encontrada =
                coincidenciasLiderExactas[0];

            return {
                nombre: encontrada.nombreRespuesta,
                tipo: "persona",
                origen: "liga_titans",
                confianza: "interno",
                entidad: {
                    nombre: encontrada.nombreRespuesta,
                    tipo: "persona",
                    rol: "líder",
                    autorId: encontrada.equipo.lider,
                    equipo: encontrada.equipo.nombre,
                    equipoEntidad: encontrada.equipo
                }
            };
        }

        // --------------------------------------------------------
        // 1.6️⃣ PERSONA / MIEMBRO
        try {
            const { obtenerTodosLosPerfiles } = require("./perfilesMiembros");
            const perfiles = obtenerTodosLosPerfiles();
            const miembro = perfiles
                .map(p => {
                    if (!p || !p.nombre) return null;
                    const nombres = [p.nombre, p.nombreJuego].filter(Boolean).map(normalizar);
                    const coincide = nombres.some(n => {
                        const palabras = n.split(/\s+/).filter(x => x.length >= 3);
                        return palabras.some(palabra => texto.includes(palabra));
                    });
                    return coincide ? p : null;
                })
                .filter(Boolean)
                .sort((a,b) => String(b.nombre || "").length - String(a.nombre || "").length)[0];
            if (miembro) {
                return {
                    nombre: miembro.nombre,
                    tipo: "persona",
                    origen: "liga_titans",
                    confianza: "interno",
                    entidad: {
                        nombre: miembro.nombre,
                        tipo: "persona",
                        rol: "miembro",
                        autorId: miembro.usuarioId || null,
                        nombreJuego: miembro.nombreJuego || null,
                        pais: miembro.pais || null,
                        rolJuego: miembro.rolJuego || null,
                        rango: miembro.rango || null,
                        equipo: miembro.equipo || null,
                        equipoEntidad: miembro.equipoEntidad || null
                    }
                };
            }
        } catch (error) {
            console.error("⚠️ TitansB | Error resolviendo miembro:", error.message);
        }
        // 2️⃣ COINCIDENCIA POR NOMBRE CORTO
        // --------------------------------------------------------

        const palabrasIgnoradas = new Set([
            "e",
            "esport",
            "esports",
            "sport",
            "sports",
            "team",
            "squad",
            "gaming",
            "gaming",
            "club",
            "official",
            "oficial"
        ]);

        const candidatos = [];

        for (const equipo of equipos) {

            if (!equipo || !equipo.nombre) {
                continue;
            }

            const nombre =
                normalizar(equipo.nombre);

            const palabras =
                nombre
                    .split(/\s+/)
                    .filter(
                        palabra =>
                            palabra.length >= 3 &&
                            !palabrasIgnoradas.has(palabra)
                    );

            for (const palabra of palabras) {

                const patron =
                    new RegExp(
                        `\\b${palabra.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
                        "i"
                    );

                if (patron.test(texto)) {

                    candidatos.push({
                        equipo,
                        palabra
                    });
                }
            }
        }

        if (candidatos.length) {

            // ----------------------------------------------------
            // 🛡️ PROTECCIÓN CONTRA COLISIONES
            // ----------------------------------------------------
            //
            // Una palabra corta puede pertenecer a varios equipos.
            // Ejemplo:
            //
            // Shadow Phoenix
            // Vortex Esports
            //
            // La palabra "Shadow" no debe identificar por sí sola
            // a Shadow Phoenix si también existe una persona llamada
            // Shadow como líder de otro equipo.
            //
            // Por eso primero agrupamos las coincidencias por palabra.
            // Si una palabra apunta a más de un equipo, la descartamos.
            // ----------------------------------------------------

            const candidatosInequivocos =
                candidatos.filter(candidato => {

                    const mismaPalabra =
                        candidatos.filter(
                            otro =>
                                otro.palabra ===
                                candidato.palabra
                        );

                    const equiposUnicos =
                        new Set(
                            mismaPalabra.map(
                                otro =>
                                    otro.equipo.nombre
                            )
                        );

                    return equiposUnicos.size === 1;
                });

            if (candidatosInequivocos.length) {

                // Preferir la palabra más específica y después
                // el nombre de equipo más largo.
                candidatosInequivocos.sort(
                    (a, b) => {

                        if (
                            b.palabra.length !==
                            a.palabra.length
                        ) {
                            return (
                                b.palabra.length -
                                a.palabra.length
                            );
                        }

                        return (
                            String(b.equipo.nombre).length -
                            String(a.equipo.nombre).length
                        );
                    }
                );

                const equipo =
                    candidatosInequivocos[0].equipo;

                return {
                    nombre: equipo.nombre,
                    tipo: "equipo",
                    origen: "liga_titans",
                    confianza: "interno",
                    entidad: equipo
                };
            }
        }
    }

    // ============================================================
    // 👤 PERSONAS RELACIONADAS — LÍDERES DE EQUIPO
    // ============================================================

    if (Array.isArray(equipos) && equipos.length) {

        const coincidenciasLider = [];

        for (const equipo of equipos) {

            if (!equipo || !equipo.nombre || !equipo.nombreLider) {
                continue;
            }

            const nombreLider =
                normalizar(equipo.nombreLider);

            // ------------------------------------------------
            // 🛡️ MATCHING EXACTO DE LÍDER
            // ------------------------------------------------
            //
            // Nunca debemos aceptar coincidencias parciales.
            //
            // Shadow  → válido
            // Shadows → NO válido
            //
            // Usamos límites de palabra para impedir que un
            // nombre de líder sea encontrado dentro de otra palabra.
            // ------------------------------------------------

            if (
                nombreLider &&
                nombreLider.length >= 3
            ) {

                const patronLider =
                    new RegExp(
                        `\\b${nombreLider.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
                        "i"
                    );

                if (patronLider.test(texto)) {

                    coincidenciasLider.push({
                        equipo,
                        nombreLider
                    });
                }
            }
        }

        if (coincidenciasLider.length) {

            const encontrada =
                coincidenciasLider
                    .sort(
                        (a, b) =>
                            b.nombreLider.length -
                            a.nombreLider.length
                    )[0];

            return {
                nombre: encontrada.equipo.nombreLider,
                tipo: "persona",
                origen: "liga_titans",
                confianza: "interno",
                entidad: {
                    nombre: encontrada.equipo.nombreLider,
                    tipo: "persona",
                    rol: "líder",
                    equipo: encontrada.equipo.nombre,
                    equipoEntidad: encontrada.equipo
                }
            };
        }
    }

    // ============================================================
    // 👤 PERSONAS RELACIONADAS — MIEMBROS NO LÍDERES
    // ============================================================
    // Los miembros se identifican mediante los IDs almacenados en
    // equipos.json y su nombre oficial en usuarios.json.
    //
    // IMPORTANTE:
    // • El líder ya fue evaluado anteriormente.
    // • No usamos el autor del mensaje como entidad automática.
    // • La coincidencia del nombre utiliza límites de palabra.
    // • Solo se consideran miembros registrados oficialmente.
    // ============================================================

    const usuarios = leerJSON("usuarios.json", {});

    if (
        usuarios &&
        typeof usuarios === "object" &&
        !Array.isArray(usuarios) &&
        Array.isArray(equipos) &&
        equipos.length
    ) {
        const coincidenciasMiembro = [];

        for (const equipo of equipos) {
            if (
                !equipo ||
                !equipo.nombre ||
                !Array.isArray(equipo.miembros)
            ) {
                continue;
            }

            for (const miembroId of equipo.miembros) {
                if (!miembroId) {
                    continue;
                }

                // El líder ya tiene su propia resolución.
                if (miembroId === equipo.lider) {
                    continue;
                }

                const idNormalizadoMiembro = normalizarIdLiga(miembroId);

                const claveUsuario = Object.keys(usuarios).find(clave =>
                    normalizarIdLiga(clave) === idNormalizadoMiembro
                );

                const usuario = claveUsuario ? usuarios[claveUsuario] : null;

                if (
                    !usuario ||
                    typeof usuario !== "object" ||
                    !usuario.nombre
                ) {
                    continue;
                }

                const nombreMiembro = normalizar(usuario.nombre);

                if (!nombreMiembro || nombreMiembro.length < 3) {
                    continue;
                }

                const patronMiembro = new RegExp(
                    `\\b${nombreMiembro.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
                    "i"
                );

                if (patronMiembro.test(texto)) {
                    coincidenciasMiembro.push({
                        equipo,
                        miembroId,
                        usuario,
                        nombreMiembro
                    });
                }
            }
        }

        if (coincidenciasMiembro.length) {
            coincidenciasMiembro.sort(
                (a, b) =>
                    b.nombreMiembro.length -
                    a.nombreMiembro.length
            );

            const encontrada = coincidenciasMiembro[0];

            return {
                nombre: encontrada.usuario.nombre,
                tipo: "persona",
                origen: "liga_titans",
                confianza: "interno",
                entidad: {
                    nombre: encontrada.usuario.nombre,
                    tipo: "persona",
                    rol: "miembro",
                    autorId: encontrada.miembroId,
                    equipo: encontrada.equipo.nombre,
                    equipoEntidad: encontrada.equipo
                }
            };
        }
    }

    // ============================================================
    // 🏆 TORNEO
    // ============================================================

    const torneo =
        obtenerConocimientoTorneo();

    if (torneo) {

        const nombresTorneo = [
            torneo.nombre,
            torneo.titulo
        ];

        for (const nombreTorneo of nombresTorneo) {

            const nombre =
                normalizar(nombreTorneo);

            if (
                nombre &&
                nombre.length >= 3 &&
                texto.includes(nombre)
            ) {

                return {
                    nombre: nombreTorneo,
                    tipo: "torneo",
                    origen: "liga_titans",
                    confianza: "interno",
                    entidad: torneo
                };
            }
        }
    }

    // ============================================================
    // 📅 TEMPORADA
    // ============================================================

    const temporada =
        leerJSON("temporada.json", {});

    if (
        temporada &&
        typeof temporada === "object"
    ) {

        const nombreTemporada =
            temporada.nombre;

        const normalizada =
            normalizar(nombreTemporada);

        if (
            normalizada &&
            texto.includes(normalizada)
        ) {

            return {
                nombre: nombreTemporada,
                tipo: "temporada",
                origen: "liga_titans",
                confianza: "interno",
                entidad: temporada
            };
        }

        // También reconocer "temporada 1"
        if (
            texto.includes("temporada") &&
            /\b1\b/.test(texto)
        ) {

            return {
                nombre:
                    nombreTemporada ||
                    "Temporada 1",
                tipo: "temporada",
                origen: "liga_titans",
                confianza: "interno",
                entidad: temporada
            };
        }
    }

    // ============================================================
    // 📅 JORNADAS
    // ============================================================

    const jornadas =
        leerJSON("jornadas.json", {});

    if (
        jornadas &&
        typeof jornadas === "object" &&
        !Array.isArray(jornadas)
    ) {

        const coincidenciasJornada = [];

        for (const [numero, jornada] of Object.entries(jornadas)) {

            const patrones = [
                `jornada ${numero}`,
                `jornada${numero}`,
                `jornada-${numero}`,
                `jornada ${String(numero).padStart(2, "0")}`
            ];

            if (
                patrones.some(
                    patron =>
                        texto.includes(
                            normalizar(patron)
                        )
                )
            ) {

                coincidenciasJornada.push({
                    numero,
                    jornada
                });
            }
        }

        if (coincidenciasJornada.length) {

            const encontrada =
                coincidenciasJornada[0];

            return {
                nombre:
                    `Jornada ${encontrada.numero}`,
                tipo: "jornada",
                origen: "liga_titans",
                confianza: "interno",
                entidad: {
                    numero:
                        encontrada.numero,
                    ...encontrada.jornada
                }
            };
        }
    }

    return null;
}

// 📦 EXPORTACIONES
// ============================================================

module.exports = {

    obtenerConocimientoTorneo,

    obtenerEquipos,

    obtenerEquiposInscritos,

    obtenerTabla,

    obtenerFixture,
    buscarProximoPartidoEquipo,

    obtenerResultados,

    construirContextoLiga,

    detectarPreguntaLiga,

    detectarEntidadLiga

};
