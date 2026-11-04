const MAX_MENSAJES = 8;

// ============================================================
// 🧠 TITANSB — CONTEXTO CONVERSACIONAL
// ============================================================

const conversaciones = new Map();

// ============================================================
// 🎯 REFERENTE ACTUAL DE LA CONVERSACIÓN
// ============================================================

const referentes = new Map();

// ============================================================
// 🎯 ENTIDAD ACTIVA DE LA CONVERSACIÓN
// ============================================================
// Representa la entidad concreta sobre la que se está
// realizando la consulta actual.
//
// IMPORTANTE:
// - No reemplaza al referente.
// - El referente conserva la entidad principal de la conversación.
// - La entidad activa permite navegar relaciones semánticas.
//
// Ejemplo:
//
// referente  → Shadow
// entidad    → Vortex Esports
//
// Así "¿Cuál es su equipo?" puede consultar Vortex Esports
// sin perder que la conversación originalmente trata sobre Shadow.

const entidadesActivas = new Map();

// ============================================================
// ⚠️ ENTIDAD DESCONOCIDA DE LA CONVERSACIÓN
// ============================================================
// Se mantiene separada de los referentes oficiales.
// Nunca debe convertirse en una entidad de Liga Titans.

const entidadesDesconocidas = new Map();

// ============================================================
// 🔤 NORMALIZAR GRUPO
// ============================================================

function obtenerClave(grupo) {
    return grupo || "global";
}

// ============================================================
// 💾 GUARDAR INTERACCIÓN
// ============================================================

function guardarInteraccion(
    grupo,
    usuario,
    mensaje,
    respuesta
) {

    if (!mensaje) {
        return false;
    }

    const clave =
        obtenerClave(grupo);

    if (!conversaciones.has(clave)) {
        conversaciones.set(
            clave,
            []
        );
    }

    const historial =
        conversaciones.get(clave);

    historial.push({
        usuario:
            usuario || "usuario",

        mensaje:
            mensaje.trim(),

        respuesta:
            respuesta
                ? respuesta.trim()
                : "",

        fecha:
            new Date().toISOString()
    });

    // Mantener solamente las últimas interacciones
    if (
        historial.length >
        MAX_MENSAJES
    ) {
        historial.splice(
            0,
            historial.length -
                MAX_MENSAJES
        );
    }

    return true;
}

// ============================================================
// 📚 OBTENER HISTORIAL
// ============================================================

function obtenerHistorial(
    grupo,
    limite = MAX_MENSAJES
) {

    const historial =
        conversaciones.get(
            obtenerClave(grupo)
        ) || [];

    return historial
        .slice(-limite);
}

// ============================================================
// 🧠 CONSTRUIR CONTEXTO PARA TITANSB
// ============================================================

function construirContexto(
    grupo,
    limite = MAX_MENSAJES
) {

    const historial =
        obtenerHistorial(
            grupo,
            limite
        );

    if (!historial.length) {
        return "";
    }

    return historial
        .map(
            (item, index) =>
                `${index + 1}. Usuario: ${item.mensaje}\n` +
                `   TitansB: ${item.respuesta}`
        )
        .join("\n");
}

// ============================================================
// 🎯 ESTABLECER REFERENTE
// ============================================================

function establecerReferente(
    grupo,
    referente
) {
    if (!grupo || !referente) {
        return false;
    }

    const clave =
        obtenerClave(grupo);

    // ========================================================
    // 🧠 PERSISTENCIA ÍNTEGRA DE LA ENTIDAD
    // ========================================================
    // conocimiento.js puede devolver:
    //
    // {
    //     nombre,
    //     tipo,
    //     origen,
    //     confianza,
    //     entidad: {
    //         rol,
    //         autorId,
    //         equipo,
    //         equipoEntidad,
    //         ...
    //     }
    // }
    //
    // El referente conversacional debe conservar tanto
    // la información de resolución como los datos reales
    // de la entidad.
    // ========================================================

    const entidad =
        referente.entidad &&
        typeof referente.entidad === "object"
            ? referente.entidad
            : {};

    referentes.set(
        clave,
        {
            ...referente,
            ...entidad,

            nombre:
                entidad.nombre ||
                referente.nombre ||
                null,

            tipo:
                entidad.tipo ||
                referente.tipo ||
                null,

            origen:
                referente.origen ||
                entidad.origen ||
                "desconocido",

            confianza:
                referente.confianza ||
                entidad.confianza ||
                "contextual",

            fecha:
                new Date().toISOString()
        }
    );

    // ========================================================
    // 🧹 INVALIDAR ENTIDAD ACTIVA AL CAMBIAR DE REFERENTE
    // ========================================================
    // La entidad activa pertenece al referente conversacional
    // que estaba vigente. Cuando ese referente cambia, la
    // entidad activa anterior no debe contaminar el nuevo
    // contexto.
    // ========================================================

    entidadesActivas.delete(clave);

    return true;
}

// ============================================================
// ⚠️ ESTABLECER ENTIDAD DESCONOCIDA
// ============================================================

function establecerEntidadDesconocida(
    grupo,
    entidad
) {

    if (!grupo || !entidad || !entidad.nombre) {
        return false;
    }

    entidadesDesconocidas.set(
        obtenerClave(grupo),
        {
            nombre: entidad.nombre,
            tipo: entidad.tipo || "desconocida",
            fecha: new Date().toISOString()
        }
    );

    return true;
}

// ============================================================
// ⚠️ OBTENER ENTIDAD DESCONOCIDA
// ============================================================

function obtenerEntidadDesconocida(
    grupo
) {

    return (
        entidadesDesconocidas.get(
            obtenerClave(grupo)
        ) || null
    );
}

// ============================================================
// 🧹 LIMPIAR ENTIDAD DESCONOCIDA
// ============================================================

function limpiarEntidadDesconocida(
    grupo = null
) {

    if (!grupo) {
        entidadesDesconocidas.clear();
        return true;
    }

    entidadesDesconocidas.delete(
        obtenerClave(grupo)
    );

    return true;
}

// ============================================================
// 🔎 OBTENER REFERENTE
// ============================================================

function obtenerReferente(
    grupo
) {

    return (
        referentes.get(
            obtenerClave(grupo)
        ) || null
    );
}

// ============================================================
// 📦 OBTENER ENTIDAD DEL REFERENTE
// ============================================================

function obtenerEntidadReferente(grupo) {

    const referente =
        obtenerReferente(grupo);

    if (!referente || !referente.nombre) {
        return null;
    }

    try {

        const conocimiento =
            require("./conocimiento");

        const normalizar = texto =>
            String(texto || "")
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .trim();

        const nombreReferente =
            normalizar(referente.nombre);

          // ========================================================
          // 🆔 NORMALIZADOR DE IDs DE LIGA
          // ========================================================
          const normalizarIdLiga = id =>
              String(id || "")
                  .replace(/@lid$/i, "")
                  .replace(/@s\.whatsapp\.net$/i, "")
                  .replace(/@c\.us$/i, "");

          const autorIdReferente =
              referente.autorId ||
              referente.entidad?.autorId ||
              referente.entidad?.equipoEntidad?.lider ||
              null;

          const idReferenteNormalizado =
              normalizarIdLiga(autorIdReferente);

        // ========================================================
        // 👥 EQUIPO
        // ========================================================

        if (referente.tipo === "equipo") {

            const equipos =
                conocimiento.obtenerEquipos();

            if (!Array.isArray(equipos)) {
                return null;
            }

            return (
                equipos.find(
                    equipo =>
                        equipo &&
                        normalizar(equipo.nombre) ===
                            nombreReferente
                ) || null
            );
        }

        // ========================================================
        // 👤 PERSONA
        // ========================================================

        if (referente.tipo === "persona") {

            const equipos =
                conocimiento.obtenerEquipos();

            if (!Array.isArray(equipos)) {
                return null;
            }

            for (const equipo of equipos) {

                if (!equipo || !equipo.nombreLider) {
                    continue;
                }

                  const idLiderNormalizado =
                      normalizarIdLiga(equipo.lider);

                  if (
                      (
                          idReferenteNormalizado &&
                          idLiderNormalizado ===
                          idReferenteNormalizado
                      ) ||
                      normalizar(equipo.nombreLider) ===
                      nombreReferente
                  ) {

                      return {
                          // Conservamos la identidad original
                          // del referente, no la etiqueta nombreLider.
                          nombre:
                              referente.nombre ||
                              equipo.nombreLider,

                          tipo:
                              "persona",

                          rol:
                              "líder",

                          autorId:
                              autorIdReferente ||
                              null,

                          equipo:
                              equipo.nombre,

                          equipoEntidad:
                              equipo,

                          // Perfil competitivo preservado
                          // desde la entidad enriquecida.
                          nombreJuego:
                              referente.entidad?.nombreJuego ||
                              null,

                          pais:
                              referente.entidad?.pais ||
                              null,

                          rolJuego:
                              referente.entidad?.rolJuego ||
                              null,

                          rango:
                              referente.entidad?.rango ||
                              null
                      };
                }
            }

            // No es líder.
            // El flujo continúa hacia la resolución
            // de miembros no líderes.
        }

        // ========================================================
        // 👤 MIEMBRO NO LÍDER
        // ========================================================
        // Reconstruye una persona miembro desde su nombre oficial
        // registrado en usuarios.json y su pertenencia a equipos.json.
        //
        // El líder conserva prioridad en el bloque anterior.
        // ========================================================

        if (referente.tipo === "persona") {

            const fs = require("fs");
            const path = require("path");

            const archivoUsuarios =
                path.join(
                    __dirname,
                    "../../database/usuarios.json"
                );

            if (!fs.existsSync(archivoUsuarios)) {
                return null;
            }

            const usuarios =
                JSON.parse(
                    fs.readFileSync(
                        archivoUsuarios,
                        "utf8"
                    )
                );

            if (
                !usuarios ||
                typeof usuarios !== "object" ||
                Array.isArray(usuarios)
            ) {
                return null;
            }

            const equipos =
                conocimiento.obtenerEquipos();

            if (!Array.isArray(equipos)) {
                return null;
            }

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

                    // El líder ya fue resuelto anteriormente.
                    if (miembroId === equipo.lider) {
                        continue;
                    }

                      const idMiembroNormalizado =
                          normalizarIdLiga(miembroId);

                      // ====================================================
                      // 🆔 RESOLUCIÓN PRIORITARIA POR ID
                      // ====================================================
                      // La identidad se compara por ID base, ignorando
                      // @lid, @s.whatsapp.net y @c.us.
                      // ====================================================

                      const coincidePorId =
                          Boolean(
                              idReferenteNormalizado &&
                              idMiembroNormalizado ===
                              idReferenteNormalizado
                          );

                      let usuario = null;

                      if (coincidePorId) {
                          usuario =
                              usuarios[miembroId] ||
                              Object.entries(usuarios).find(
                                  ([usuarioId]) =>
                                      normalizarIdLiga(usuarioId) ===
                                      idMiembroNormalizado
                              )?.[1] ||
                              null;
                      }

                      // ====================================================
                      // 👤 FALLBACK POR NOMBRE
                      // ====================================================

                      if (!usuario) {
                          usuario = usuarios[miembroId] || null;
                      }

                      if (
                          !usuario ||
                          typeof usuario !== "object" ||
                          !usuario.nombre
                      ) {
                          continue;
                      }

                      const coincidePorNombre =
                          normalizar(usuario.nombre) ===
                          nombreReferente;

                      if (
                          coincidePorId ||
                          coincidePorNombre
                      ) {
                        return {
                            nombre:
                                usuario.nombre,

                            tipo:
                                "persona",

                            rol:
                                "miembro",

                            equipo:
                                equipo.nombre,

                            autorId:
                                miembroId,

                            equipoEntidad:
                                equipo,

                            // Perfil competitivo preservado
                            // desde la entidad enriquecida.
                            nombreJuego:
                                referente.entidad?.nombreJuego ||
                                null,

                            pais:
                                referente.entidad?.pais ||
                                null,

                            rolJuego:
                                referente.entidad?.rolJuego ||
                                null,

                            rango:
                                referente.entidad?.rango ||
                                null
                        };
                    }
                }
            }

            return null;
        }

        // ========================================================
        // 🏆 TORNEO
        // ========================================================

        if (referente.tipo === "torneo") {

            const torneo =
                conocimiento.obtenerConocimientoTorneo();

            if (!torneo) {
                return null;
            }

            const coincidencias = [
                torneo.nombre,
                torneo.titulo
            ];

            const coincide =
                coincidencias.some(
                    nombre =>
                        normalizar(nombre) ===
                        nombreReferente
                );

            return coincide
                ? torneo
                : null;
        }

        // ========================================================
        // 📅 TEMPORADA
        // ========================================================

        if (referente.tipo === "temporada") {

            const temporada =
                require("./conocimiento")
                    ? null
                    : null;

            // La lectura se hace mediante el mismo
            // sistema interno de conocimiento.
            const fs =
                require("fs");

            const path =
                require("path");

            const archivo =
                path.join(
                    __dirname,
                    "../../database/temporada.json"
                );

            if (!fs.existsSync(archivo)) {
                return null;
            }

            const datos =
                JSON.parse(
                    fs.readFileSync(
                        archivo,
                        "utf8"
                    )
                );

            if (!datos || typeof datos !== "object") {
                return null;
            }

            return normalizar(datos.nombre) ===
                nombreReferente
                ? datos
                : null;
        }

        // ========================================================
        // ⚔️ JORNADA
        // ========================================================

        if (referente.tipo === "jornada") {

            const fs =
                require("fs");

            const path =
                require("path");

            const archivo =
                path.join(
                    __dirname,
                    "../../database/jornadas.json"
                );

            if (!fs.existsSync(archivo)) {
                return null;
            }

            const jornadas =
                JSON.parse(
                    fs.readFileSync(
                        archivo,
                        "utf8"
                    )
                );

            if (
                !jornadas ||
                typeof jornadas !== "object" ||
                Array.isArray(jornadas)
            ) {
                return null;
            }

            for (const [numero, jornada] of Object.entries(jornadas)) {

                const nombre =
                    normalizar(
                        `Jornada ${numero}`
                    );

                if (nombre === nombreReferente) {

                    return {
                        nombre: `Jornada ${numero}`,
                        numero,
                        ...(jornada || {})
                    };
                }
            }

            return null;
        }

        return null;

    } catch (error) {

        console.error(
            "⚠️ TitansB | Error obteniendo entidad referente:",
            error.message
        );

        return null;
    }
}

// ============================================================
// 🎯 ESTABLECER ENTIDAD ACTIVA
// ============================================================

function establecerEntidadActiva(
    grupo,
    entidad
) {
    if (!grupo || !entidad || !entidad.nombre) {
        return false;
    }

    // ========================================================
    // 🧠 PERSISTENCIA ÍNTEGRA DE LA ENTIDAD ACTIVA
    // ========================================================
    // La entidad ya fue resuelta oficialmente por
    // conocimiento.js.
    //
    // Conservamos todos los campos recibidos para evitar
    // reconstrucciones innecesarias.
    //
    // Especialmente importante para equipos, que contienen
    // estadísticas, miembros, líder, fondos, liga, temporada,
    // mejoras y demás información oficial.
    // ========================================================

    entidadesActivas.set(
        obtenerClave(grupo),
        {
            ...entidad,

            nombre:
                entidad.nombre,

            tipo:
                entidad.tipo || null,

            origen:
                entidad.origen || "desconocido",

            confianza:
                entidad.confianza || "contextual",

            fecha:
                new Date().toISOString()
        }
    );

    return true;
}

// ============================================================
// 🔎 OBTENER ENTIDAD ACTIVA
// ============================================================

function obtenerEntidadActiva(
    grupo
) {

    return (
        entidadesActivas.get(
            obtenerClave(grupo)
        ) || null
    );
}

// ============================================================
// 🧹 LIMPIAR ENTIDAD ACTIVA
// ============================================================

function limpiarEntidadActiva(
    grupo = null
) {

    if (!grupo) {
        entidadesActivas.clear();
        return true;
    }

    entidadesActivas.delete(
        obtenerClave(grupo)
    );

    return true;
}

// ============================================================
// 🧹 LIMPIAR REFERENTE
// ============================================================

function limpiarReferente(
    grupo = null
) {

    if (!grupo) {
        referentes.clear();
        return true;
    }

    referentes.delete(
        obtenerClave(grupo)
    );

    return true;
}

// ============================================================
// 🧹 LIMPIAR CONTEXTO
// ============================================================

function limpiarContexto(
    grupo = null
) {

    if (!grupo) {
        conversaciones.clear();
        referentes.clear();
        entidadesActivas.clear();
        entidadesDesconocidas.clear();
        return true;
    }

    conversaciones.delete(
        obtenerClave(grupo)
    );

    referentes.delete(
        obtenerClave(grupo)
    );

    entidadesActivas.delete(
        obtenerClave(grupo)
    );

    entidadesDesconocidas.delete(
        obtenerClave(grupo)
    );

    return true;
}

// ============================================================
// 📊 ESTADÍSTICAS
// ============================================================

function estadisticasContexto() {

    let mensajes = 0;

    for (
        const historial
        of conversaciones.values()
    ) {
        mensajes +=
            historial.length;
    }

    return {
        grupos:
            conversaciones.size,

        mensajes
    };
}

// ============================================================
// 📤 EXPORTAR
// ============================================================

module.exports = {

    guardarInteraccion,

    obtenerHistorial,

    construirContexto,

    establecerReferente,

    obtenerReferente,

    establecerEntidadDesconocida,

    obtenerEntidadDesconocida,

    limpiarEntidadDesconocida,

    obtenerEntidadReferente,

    establecerEntidadActiva,
    obtenerEntidadActiva,
    limpiarEntidadActiva,

    limpiarReferente,

    limpiarContexto,

    estadisticasContexto
};
