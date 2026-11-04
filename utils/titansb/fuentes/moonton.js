const axios = require("axios");
const cheerio = require("cheerio");

// ============================================================
// 📰 TITANSB — FUENTE MOONTON
// ============================================================

const URL =
    "https://en.moonton.com/news/index1.html";

const USER_AGENT =
    "Mozilla/5.0 (Android 13) AppleWebKit/537.36 " +
    "Chrome/146 Mobile Safari/537.36";

// ============================================================
// 🔤 NORMALIZAR
// ============================================================

function normalizar(texto = "") {

    return String(texto)
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
// 🎯 RELEVANCIA MLBB
// ============================================================

function esMobileLegends(
    titulo = "",
    resumen = ""
) {

    const texto =
        normalizar(
            `${titulo} ${resumen}`
        );

    const indicadores = [
        "mobile legends",
        "mobile legends bang bang",
        "mlbb",
        "moonton games",
        "mpl",
        "msc",
        "m series",
        "mct"
    ];

    return indicadores.some(
        termino =>
            texto.includes(
                normalizar(termino)
            )
    );
}

// ============================================================
// 📅 FECHA
// ============================================================

function extraerFecha(texto = "") {

    const coincidencia =
        texto.match(
            /\b2026\/\d{2}\/\d{2}\b/
        );

    if (!coincidencia) {
        return null;
    }

    const partes =
        coincidencia[0]
            .split("/");

    const fecha =
        new Date(
            `${partes[0]}-${partes[1]}-${partes[2]}T12:00:00Z`
        );

    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {
        return null;
    }

    return fecha;
}

// ============================================================
// 📰 BUSCAR MOONTON
// ============================================================

async function buscarMoonton(
    consulta = ""
) {

    try {

        const respuesta =
            await axios.get(
                URL,
                {
                    headers: {
                        "User-Agent":
                            USER_AGENT
                    },
                    timeout: 15000
                }
            );

        const $ =
            cheerio.load(
                respuesta.data
            );

        const resultados = [];
        const enlacesVistos = new Set();

        // ========================================================
        // 📰 DETECTAR ARTÍCULOS REALES DE MOONTON
        // ========================================================

        $("a[href]").each(
            (i, elemento) => {

                const enlaceOriginal =
                    $(elemento).attr("href");

                if (
                    !enlaceOriginal ||
                    typeof enlaceOriginal !== "string"
                ) {
                    return;
                }

                let enlace =
                    enlaceOriginal.trim();

                // Solo artículos de noticias
                if (
                    !enlace.includes("/news/")
                ) {
                    return;
                }

                // Evitar duplicados
                let urlFinal = enlace;

                if (
                    urlFinal.startsWith("/")
                ) {
                    urlFinal =
                        "https://en.moonton.com" +
                        urlFinal;
                }

                if (
                    enlacesVistos.has(urlFinal)
                ) {
                    return;
                }

                enlacesVistos.add(urlFinal);

                // ==================================================
                // 📝 TÍTULO
                // ==================================================

                let titulo =
                    $(elemento)
                        .find(".t")
                        .first()
                        .text()
                        .replace(/\s+/g, " ")
                        .trim();

                if (
                    !titulo ||
                    titulo.length < 15
                ) {
                    return;
                }

                // ==================================================
                // 📦 CONTENEDOR DE LA NOTICIA
                // ==================================================

                let contenedor =
                    $(elemento);

                // Subimos algunos niveles buscando
                // la tarjeta real de la noticia.
                for (
                    let nivel = 0;
                    nivel < 5;
                    nivel++
                ) {

                    const texto =
                        contenedor
                            .text()
                            .replace(/\s+/g, " ")
                            .trim();

                    if (
                        /\b20\d{2}\/\d{2}\/\d{2}\b/.test(
                            texto
                        )
                    ) {
                        break;
                    }

                    const padre =
                        contenedor.parent();

                    if (
                        !padre ||
                        !padre.length
                    ) {
                        break;
                    }

                    contenedor = padre;
                }

                const textoContenedor =
                    contenedor
                        .text()
                        .replace(/\s+/g, " ")
                        .trim();

                // ==================================================
                // 📅 FECHA REAL
                // ==================================================

                const fecha =
                    extraerFecha(
                        textoContenedor
                    );

                if (!fecha) {
                    return;
                }

                // ==================================================
                // 🎯 FILTRO MOBILE LEGENDS
                // ==================================================

                if (
                    !esMobileLegends(
                        titulo,
                        textoContenedor
                    )
                ) {
                    return;
                }

                // ==================================================
                // 📝 RESUMEN
                // ==================================================

                // MOONTON separa claramente:
                // .d = fecha
                // .t = título
                // .c = resumen
                // .smallMore = "View More"

                let resumen =
                    contenedor
                        .find(".c")
                        .first()
                        .text()
                        .replace(/\s+/g, " ")
                        .trim();

                // Si existe un párrafo dentro de .c,
                // preferimos su contenido directamente.
                const parrafoResumen =
                    contenedor
                        .find(".c p")
                        .first();

                if (parrafoResumen.length) {
                    resumen =
                        parrafoResumen
                            .text()
                            .replace(/\s+/g, " ")
                            .trim();
                }

                // Evitar resumen idéntico al título.
                if (
                    normalizar(resumen) ===
                    normalizar(titulo)
                ) {
                    resumen = "";
                }

                resultados.push({

                    titulo,

                    enlace:
                        urlFinal,

                    fecha:
                        fecha.toUTCString(),

                    resumen,

                    fuente:
                        "MOONTON",

                    fuenteTipo:
                        "oficial",

                    consulta

                });

            }
        );

        // ========================================================
        // 🧹 ELIMINAR DUPLICADOS POR ENLACE
        // ========================================================

        const unicos =
            Array.from(
                new Map(
                    resultados.map(
                        noticia =>
                            [
                                noticia.enlace,
                                noticia
                            ]
                    )
                ).values()
            );

        // ========================================================
        // 🕒 ORDENAR DE MÁS RECIENTE A MÁS ANTIGUA
        // ========================================================

        unicos.sort(
            (a, b) =>
                new Date(b.fecha).getTime() -
                new Date(a.fecha).getTime()
        );

        // ========================================================
        // 📦 LÍMITE
        // ========================================================

        return unicos.slice(
            0,
            30
        );

    } catch (error) {

        console.error(
            "⚠️ TitansB | Error MOONTON:",
            error.message
        );

        return [];
    }
}

// ============================================================
// 📦 EXPORTAR
// ============================================================

module.exports = {
    buscarMoonton
};
