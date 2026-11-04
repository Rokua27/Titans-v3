const axios = require("axios");
const cheerio = require("cheerio");
const { buscarMoonton } = require("./fuentes/moonton");

// ============================================================
// 📰 TITANSB — BUSCADOR V2.7
// Relevancia + actualidad + ranking híbrido
// ============================================================

const DIAS_ACTUALIDAD = 14;
const DIAS_AMPLIADOS = 30;
const DIAS_MAXIMOS = 90;

const MAX_RESULTADOS = 8;

// ============================================================
// 🧠 TÉRMINOS DE RELEVANCIA
// ============================================================

const TERMINOS = [
    {
        palabras: [
            "mobile legends bang bang",
            "mobile legends",
            "mlbb"
        ],
        puntos: 10
    },

    {
        palabras: [
            "moonton"
        ],
        puntos: 8
    },

    {
        palabras: [
            "msc",
            "m series",
            "m-series",
            "m6",
            "m7",
            "m8"
        ],
        puntos: 8
    },

    {
        palabras: [
            "esports world cup",
            "ewc"
        ],
        puntos: 5
    },

    {
        palabras: [
            "mlbb esports",
            "mobile legends esports"
        ],
        puntos: 7
    },

    {
        palabras: [
            "mobile legends latam",
            "mlbb latam",
            "mobile legends latinoamerica",
            "mobile legends latinoamérica"
        ],
        puntos: 7
    },

    {
        palabras: [
            "mobile legends colombia",
            "mlbb colombia"
        ],
        puntos: 7
    }
];

// ============================================================
// 🔤 NORMALIZAR
// ============================================================

function normalizar(texto = "") {

    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

// ============================================================
// 🛡️ RELEVANCIA DIRECTA — MOBILE LEGENDS
// ============================================================

const INDICADORES_DIRECTOS = [
    "mobile legends",
    "mobile legends bang bang",
    "mlbb"
];

const INDICADORES_MLBB_ESPECIFICOS = [
    "mobile legends esports",
    "mlbb esports",
    "mobile legends latam",
    "mlbb latam",
    "mobile legends colombia",
    "mlbb colombia",
    "mobile legends latinoamerica",
    "mobile legends latinoamérica",
    "mobile legends bang bang"
];

function esNoticiaMobileLegends(
    titulo = "",
    resumen = ""
) {

    const tituloNormalizado =
        normalizar(titulo);

    const resumenNormalizado =
        normalizar(resumen);

    // Coincidencia directa en título
    if (
        INDICADORES_DIRECTOS.some(
            termino =>
                tituloNormalizado.includes(
                    normalizar(termino)
                )
        )
    ) {
        return true;
    }

    // Coincidencia específica en título o resumen
    if (
        INDICADORES_MLBB_ESPECIFICOS.some(
            termino => {

                const terminoNormalizado =
                    normalizar(termino);

                return (
                    tituloNormalizado.includes(
                        terminoNormalizado
                    ) ||
                    resumenNormalizado.includes(
                        terminoNormalizado
                    )
                );
            }
        )
    ) {
        return true;
    }

    // Moonton necesita contexto de Mobile Legends
    if (
        tituloNormalizado.includes("moonton") ||
        resumenNormalizado.includes("moonton")
    ) {

        const contextoMLBB = [
            "mobile legends",
            "mlbb",
            "m series",
            "m-series",
            "msc"
        ];

        return contextoMLBB.some(
            termino => {

                const terminoNormalizado =
                    normalizar(termino);

                return (
                    tituloNormalizado.includes(
                        terminoNormalizado
                    ) ||
                    resumenNormalizado.includes(
                        terminoNormalizado
                    )
                );
            }
        );
    }

    return false;
}

// ============================================================
// ============================================================
// 🕒 FECHA
// ============================================================

function obtenerFecha(fecha) {

    if (!fecha) {
        return null;
    }

    const fechaParseada =
        new Date(fecha);

    if (
        Number.isNaN(
            fechaParseada.getTime()
        )
    ) {
        return null;
    }

    return fechaParseada;
}

function diasDesde(fecha) {

    const fechaNoticia =
        obtenerFecha(fecha);

    if (!fechaNoticia) {
        return null;
    }

    const diferencia =
        Date.now() -
        fechaNoticia.getTime();

    return Math.max(
        0,
        Math.floor(
            diferencia /
            (1000 * 60 * 60 * 24)
        )
    );
}

// ============================================================
// 🧠 RELEVANCIA
// ============================================================

function calcularRelevancia(
    titulo,
    resumen = "",
    consulta = ""
) {

    const tituloNormalizado =
        normalizar(titulo);

    const resumenNormalizado =
        normalizar(resumen);

    const consultaNormalizada =
        normalizar(consulta);

    let puntuacion = 0;

    // Coincidencia exacta de consulta en título
    if (
        consultaNormalizada &&
        tituloNormalizado.includes(
            consultaNormalizada
        )
    ) {
        puntuacion += 6;
    }

    for (
        const grupo
        of TERMINOS
    ) {

        for (
            const palabra
            of grupo.palabras
        ) {

            const termino =
                normalizar(palabra);

            // Título = máxima relevancia
            if (
                tituloNormalizado.includes(
                    termino
                )
            ) {
                puntuacion +=
                    grupo.puntos;

                break;
            }

            // Resumen = relevancia secundaria
            if (
                resumenNormalizado.includes(
                    termino
                )
            ) {
                puntuacion +=
                    Math.max(
                        2,
                        grupo.puntos - 3
                    );

                break;
            }
        }
    }

    return puntuacion;
}

// ============================================================
// 🕒 BONIFICACIÓN DE ACTUALIDAD
// ============================================================

function calcularActualidad(
    dias
) {

    if (dias === null) {
        return 0;
    }

    if (dias <= 1) {
        return 12;
    }

    if (dias <= 3) {
        return 10;
    }

    if (dias <= 7) {
        return 8;
    }

    if (dias <= 14) {
        return 6;
    }

    if (dias <= 30) {
        return 3;
    }

    if (dias <= 60) {
        return 1;
    }

    return 0;
}

// ============================================================
// 🏆 PUNTUACIÓN FINAL
// ============================================================

function calcularPuntuacionFinal(
    relevancia,
    dias
) {

    return (
        relevancia +
        calcularActualidad(dias)
    );
}

// ============================================================
// 🔎 RSS
// ============================================================

async function consultarRSS(
    consulta,
    dias = null
) {

    const url =
        "https://news.google.com/rss/search";

    const params = {

        // V2.7:
        // Google News entrega los resultados ordenados por fecha.
        // La antigüedad se calcula posteriormente en TitansB.
        q: consulta,

        hl: "es-419",

        gl: "CO",

        ceid: "CO:es-419"
    };

    const respuesta =
        await axios.get(
            url,
            {

                params,

                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Android 13) AppleWebKit/537.36 Chrome/146 Mobile Safari/537.36"
                },

                timeout: 15000
            }
        );

    const $ =
        cheerio.load(
            respuesta.data,
            {
                xmlMode: true
            }
        );

    const resultados = [];

    $("item").each(
        (i, elemento) => {

            if (
                resultados.length >= 30
            ) {
                return;
            }

            const titulo =
                $(elemento)
                    .find("title")
                    .text()
                    .trim();

            const enlace =
                $(elemento)
                    .find("link")
                    .text()
                    .trim();

            const fecha =
                $(elemento)
                    .find("pubDate")
                    .text()
                    .trim();

            const resumen =
                $(elemento)
                    .find("description")
                    .text()
                    .trim();

            if (!titulo) {
                return;
            }

              // ==================================================
              // 🛡️ FILTRO V2.5 — RELEVANCIA DIRECTA
              // ==================================================

              if (
                  !esNoticiaMobileLegends(
                      titulo,
                      resumen
                  )
              ) {
                  return;
              }


            const diasAntiguedad =
                diasDesde(fecha);

            const relevancia =
                calcularRelevancia(
                    titulo,
                    resumen,
                    consulta
                );

            const actualidad =
                calcularActualidad(
                    diasAntiguedad
                );

            const puntuacion =
                calcularPuntuacionFinal(
                    relevancia,
                    diasAntiguedad
                );

            resultados.push({

                titulo,

                enlace,

                fecha,

                resumen,

                diasAntiguedad,

                relevancia,

                actualidad,

                puntuacion
            });
        }
    );

    return resultados;
}

// ============================================================
// 🧹 DEDUPLICACIÓN
// ============================================================

function deduplicar(
    resultados
) {

    const unicos =
        new Map();

    for (
        const resultado
        of resultados
    ) {

        const clave =
            normalizar(
                resultado.titulo
            );

        const anterior =
            unicos.get(clave);

        if (
            !anterior ||
            resultado.puntuacion >
            anterior.puntuacion
        ) {

            unicos.set(
                clave,
                resultado
            );
        }
    }

    return Array.from(
        unicos.values()
    );
}

// ============================================================
// 🏆 ORDENAR
// ============================================================

function ordenarResultados(
    resultados
) {

    return resultados.sort(
        (a, b) => {

            // Primero puntuación final
            if (
                b.puntuacion !==
                a.puntuacion
            ) {

                return (
                    b.puntuacion -
                    a.puntuacion
                );
            }

            // Desempate por relevancia
            if (
                b.relevancia !==
                a.relevancia
            ) {

                return (
                    b.relevancia -
                    a.relevancia
                );
            }

            // Desempate por fecha
            const fechaA =
                obtenerFecha(
                    a.fecha
                );

            const fechaB =
                obtenerFecha(
                    b.fecha
                );

            if (
                !fechaA &&
                !fechaB
            ) {
                return 0;
            }

            if (!fechaA) {
                return 1;
            }

            if (!fechaB) {
                return -1;
            }

            return (
                fechaB.getTime() -
                fechaA.getTime()
            );
        }
    );
}

// ============================================================
// 📰 BUSCAR
// ============================================================

async function buscarNoticias(
    consulta
) {

    try {

        if (
            !consulta ||
            !consulta.trim()
        ) {
            return [];
        }

        const texto =
            consulta.trim();

        // ========================================================
        // 🔎 V2.7 — CONSULTAS ESPECIALIZADAS
        // ========================================================

        const consultas = [
            texto,
            "Mobile Legends",
            "MLBB",
            "Mobile Legends esports",
            "MLBB esports",
            "MSC Mobile Legends",
            "Mobile Legends LATAM",
            "Mobile Legends Colombia",
            "Moonton Mobile Legends"
        ];

        // Eliminar consultas duplicadas
        const consultasUnicas = [
            ...new Set(
                consultas.map(
                    q => q.trim()
                )
            )
        ];

        console.log(
            `🔎 TitansB V2.7 | ${consultasUnicas.length} consultas especializadas.`
        );

        // ========================================================
        // 📰 CONSULTAR TODAS LAS FUENTES RSS
        // ========================================================

        const coleccion = [];

// ========================================================
// 🟣 MOONTON OFICIAL (PRIORIDAD)
// ========================================================

try {
    console.log("🟣 TitansB | Consultando MOONTON oficial...");

    const noticiasMoonton =
        await buscarMoonton(texto);

    // Dar prioridad a MOONTON en el ranking.
    noticiasMoonton.forEach((n) => {
        n.relevancia = 100;
        n.actualidad = 100;
        n.puntuacion = 1000;
    });

    coleccion.push(...noticiasMoonton);

    console.log(
        `🟣 MOONTON: ${noticiasMoonton.length} noticias oficiales.`
    );
} catch (error) {
    console.error(
        "⚠️ Error consultando MOONTON:",
        error.message
    );
}

        for (
            const consultaActual
            of consultasUnicas
        ) {

            try {

                console.log(
                    `🔎 Buscando: ${consultaActual}`
                );

                const resultados =
                    await consultarRSS(
                        consultaActual,
                        DIAS_ACTUALIDAD
                    );

                coleccion.push(
                    ...resultados
                );

            } catch (error) {

                console.error(
                    `⚠️ TitansB V2.7 | Error en consulta "${consultaActual}":`,
                    error.message
                );

            }

        }

        // ========================================================
        // 🧹 DEDUPLICAR
        // ========================================================

        let resultados =
            deduplicar(
                coleccion
            );

        // ========================================================
        // 🏆 ORDENAR
        // ========================================================

        resultados =
            ordenarResultados(
                resultados
            );

        // ========================================================
        // 🔎 SI NO HAY RESULTADOS → 30 DÍAS
        // ========================================================

        if (
            resultados.length === 0
        ) {

            console.log(
                `🕒 TitansB V2.7 | ampliando búsqueda a ${DIAS_AMPLIADOS} días.`
            );

            for (
                const consultaActual
                of consultasUnicas
            ) {

                try {

                    const resultadosAmpliados =
                        await consultarRSS(
                            consultaActual,
                            DIAS_AMPLIADOS
                        );

                    resultados.push(
                        ...resultadosAmpliados
                    );

                } catch (error) {

                    console.error(
                        "⚠️ TitansB V2.7 | Error búsqueda ampliada:",
                        error.message
                    );

                }

            }

            resultados =
                deduplicar(
                    resultados
                );

            resultados =
                ordenarResultados(
                    resultados
                );
        }

        // ========================================================
        // 🎯 RESULTADO FINAL
        // ========================================================

        resultados =
            resultados.slice(
                0,
                MAX_RESULTADOS
            );

        console.log(
            `📰 Google News RSS V2.7: ${resultados.length} resultados`
        );

        console.log(
            `🕒 TitansB | búsqueda múltiple + actualidad.`
        );

        return resultados;

    } catch (error) {

        console.error(
            "❌ Error Google News RSS V2.7:",
            error.message
        );

        return [];
    }
}

// ============================================================
// 🌐 COMPATIBILIDAD MOTOR
// ============================================================

async function buscarWeb(
    consulta
) {

    return buscarNoticias(
        consulta
    );
}

module.exports = {
    buscarWeb,
    buscarNoticias
};
