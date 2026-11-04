const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs-extra");
const path = require("path");

const MAX_RESULTADOS = 20;
const MAX_ENVIAR = 2;
const TIMEOUT_BUSQUEDA = 20000;
const TIMEOUT_DESCARGA = 30000;

const PIE_MULTIMEDIA =
`━━━━━━━━━━━━━━━━━━
🏆 Liga Titans Team
🤖 TitansB
Tu asistente oficial de la comunidad
━━━━━━━━━━━━━━━━━━`;

const TERMINOS_BLOQUEADOS = [
    "porn",
    "porno",
    "pornografia",
    "pornografía",
    "xxx",
    "nsfw",
    "hentai",
    "sex",
    "sexo",
    "sexual",
    "explicit",
    "explícito",
    "desnuda",
    "desnudo",
    "nude",
    "nudity",
    "naked",
    "genital",
    "genitales",
    "penetracion",
    "penetración",
    "blowjob",
    "oral sex",
    "anal",
    "fetish",
    "fetiche",
    "escort",
    "prostituta",
    "prostitución",
    "onlyfans",
    "porno",
    "lewd"
];

const TERMINOS_MENORES = [
    "loli",
    "lolita",
    "shota",
    "child",
    "kid",
    "niña",
    "niño",
    "menor",
    "schoolgirl",
    "school boy",
    "colegiala",
    "colegial",
    "teen",
    "teenage",
    "adolescente",
    "underage"
];

const CONTEXTO_SEGURO = [
    "adult glamour",
    "sensual artistic",
    "fashion",
    "model",
    "glamour photography"
];

function normalizarTexto(texto = "") {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function contieneBloqueado(texto = "") {
    const normalizado = normalizarTexto(texto);

    return (
        TERMINOS_BLOQUEADOS.some(term =>
            normalizado.includes(normalizarTexto(term))
        ) ||
        TERMINOS_MENORES.some(term =>
            normalizado.includes(normalizarTexto(term))
        )
    );
}

function consultaPermitida(consulta) {
    return !contieneBloqueado(consulta);
}

function puntuarImagen(resultado, consulta) {

    const busqueda = normalizarTexto(consulta);

    const texto = normalizarTexto(
        `${resultado.title || ""}
         ${resultado.description || ""}
         ${resultado.source || ""}`
    );

    if (contieneBloqueado(texto)) {
        return -10000;
    }

    const palabras =
        busqueda
            .split(/\s+/)
            .filter(p => p.length >= 3);

    let puntos = 0;

    for (const palabra of palabras) {
        if (texto.includes(palabra)) {
            puntos += 20;
        }
    }

    if (texto.includes(busqueda)) {
        puntos += 40;
    }

    const positivos = [
        "adult",
        "erotic",
        "erotica",
        "glamour",
        "boudoir",
        "seductive",
        "seduction",
        "provocative",
        "sensual",
        "pin up",
        "pinup",
        "lingerie",
        "swimwear",
        "cosplay",
        "artistic",
        "anime",
        "manga",
        "portrait",
        "curvy",
        "voluptuous",
        "busty",
        "muscular",
        "athletic",
        "handsome",
        "sexy"
    ];

    for (const termino of positivos) {
        if (texto.includes(termino)) {
            puntos += 8;
        }
    }

    if (resultado.width && resultado.height) {

        const area =
            resultado.width * resultado.height;

        if (area >= 1000000) {
            puntos += 10;
        } else if (area >= 500000) {
            puntos += 5;
        }
    }

    return puntos;
}

function extraerResultados(html) {

    const resultados = [];
    const vistos = new Set();

    const $ = cheerio.load(html);

    $(".iusc").each((_, elemento) => {

        try {

            const datos =
                $(elemento).attr("m");

            if (!datos) return;

            const info =
                JSON.parse(datos);

            const imagen =
                info.murl ||
                info.turl;

            if (!imagen) return;

            if (!/^https?:\/\//i.test(imagen)) {
                return;
            }

            if (vistos.has(imagen)) {
                return;
            }

            vistos.add(imagen);

            resultados.push({
                url: imagen,
                thumbnail: info.turl || imagen,
                title: info.t || "",
                description: info.desc || "",
                source: info.purl || "",
                width: Number(info.w || 0),
                height: Number(info.h || 0)
            });

        } catch {}
    });

    if (!resultados.length) {

        const coincidencias =
            html.match(
                /murl&quot;:&quot;https?:\/\/[^"&]+/g
            ) || [];

        for (const coincidencia of coincidencias) {

            const url =
                coincidencia
                    .replace(/^.*?https?:\/\//, "https://")
                    .replace(/&amp;/g, "&");

            if (!/^https?:\/\//i.test(url)) {
                continue;
            }

            if (vistos.has(url)) {
                continue;
            }

            vistos.add(url);

            resultados.push({
                url,
                thumbnail: url,
                title: "",
                description: "",
                source: "",
                width: 0,
                height: 0
            });

            if (
                resultados.length >=
                MAX_RESULTADOS
            ) {
                break;
            }
        }
    }

    return resultados;
}

function construirConsulta(consulta) {

    const texto =
        normalizarTexto(consulta);

    const esAnime =
        /\b(anime|manga|waifu|cosplay)\b/
            .test(texto);

    const esMasculino =
        /\b(hombre|hombres|masculino|modelo masculino|chico|man|male)\b/
            .test(texto);

    const esFemenino =
        /\b(mujer|mujeres|femenina|chica|modelo femenina|woman|female)\b/
            .test(texto);

    const extras = [
        "adult",
        "erotic glamour",
        "sensual boudoir",
        "seductive adult",
        "provocative adult art",
        esAnime ? "adult anime erotic art" : "erotic glamour art",
        esMasculino ? "sexy adult male model" : "",
        esFemenino ? "sexy adult female model" : ""
    ];

    return `${consulta} ${extras.filter(Boolean).join(" ")}`;
}

async function buscarImagenes(consulta) {

    if (!consultaPermitida(consulta)) {
        throw new Error(
            "La búsqueda contiene términos no permitidos."
        );
    }

    const consultaBing =
        construirConsulta(consulta);

    const url =
        `https://www.bing.com/images/search?q=${encodeURIComponent(consultaBing)}`;

    const respuesta =
        await axios.get(url, {

            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",

                "Accept-Language":
                    "es-ES,es;q=0.9,en;q=0.8"
            },

            timeout:
                TIMEOUT_BUSQUEDA,

            maxRedirects:
                5
        });

    const resultados =
        extraerResultados(respuesta.data)
            .filter(resultado =>
                puntuarImagen(resultado, consulta) > -1000
            );

    if (!resultados.length) {
        throw new Error(
            "No se encontraron imágenes adecuadas."
        );
    }

    resultados.sort(
        (a, b) =>
            puntuarImagen(b, consulta) -
            puntuarImagen(a, consulta)
    );

    return resultados.slice(
        0,
        MAX_RESULTADOS
    );
}

async function descargarImagen(url, archivo) {

    const respuesta =
        await axios.get(url, {

            responseType:
                "stream",

            timeout:
                TIMEOUT_DESCARGA,

            maxRedirects:
                5,

            headers: {
                "User-Agent":
                    "Mozilla/5.0",

                "Accept":
                    "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
            }
        });

    const contentType =
        respuesta.headers["content-type"] || "";

    if (!contentType.startsWith("image/")) {
        throw new Error(
            "La URL no devolvió una imagen."
        );
    }

    const writer =
        fs.createWriteStream(archivo);

    return new Promise((resolve, reject) => {

        respuesta.data.pipe(writer);

        writer.on(
            "finish",
            resolve
        );

        writer.on(
            "error",
            reject
        );

        respuesta.data.on(
            "error",
            reject
        );
    });
}

async function enviarImagenesSensuales(
    sock,
    from,
    consulta
) {

    const carpetaTemp =
        path.join(
            process.cwd(),
            "temp"
        );

    await fs.ensureDir(
        carpetaTemp
    );

    const archivos = [];

    try {

        const resultados =
            await buscarImagenes(
                consulta
            );

        const urlsUsadas =
            new Set();

        for (
            let i = 0;
            i < resultados.length &&
            archivos.length < MAX_ENVIAR;
            i++
        ) {

            const resultado =
                resultados[i];

            if (
                urlsUsadas.has(
                    resultado.url
                )
            ) {
                continue;
            }

            urlsUsadas.add(
                resultado.url
            );

            const archivo =
                path.join(
                    carpetaTemp,
                    `titans_sensual_${Date.now()}_${i}.jpg`
                );

            try {

                await descargarImagen(
                    resultado.url,
                    archivo
                );

                const stat =
                    await fs.stat(
                        archivo
                    );

                if (stat.size < 1000) {
                    await fs.remove(
                        archivo
                    );
                    continue;
                }

                archivos.push(
                    archivo
                );

                console.log(
                    `🌹 TitansB | imagen sensual ${archivos.length}/${MAX_ENVIAR} | ` +
                    `${resultado.title || consulta}`
                );

            } catch (error) {

                console.log(
                    `⚠️ Resultado sensual ${i + 1} falló:`,
                    error.message
                );

                await fs.remove(
                    archivo
                ).catch(() => {});
            }
        }

        if (!archivos.length) {
            throw new Error(
                "No se pudo descargar ninguna imagen adecuada."
            );
        }

        for (let i = 0; i < archivos.length; i++) {

            await sock.sendMessage(
                from,
                {
                    image:
                        fs.readFileSync(
                            archivos[i]
                        ),

                    caption:
                        i === 0
                            ? `🌹 *TitansB Sensual*\n\n${PIE_MULTIMEDIA}`
                            : undefined
                }
            );
        }

    } finally {

        for (const archivo of archivos) {

            if (
                await fs.pathExists(
                    archivo
                )
            ) {

                await fs.remove(
                    archivo
                ).catch(() => {});

                console.log(
                    "🧹 TitansB | temporal sensual eliminado."
                );
            }
        }
    }
}

module.exports = {

    nombre:
        "sensual",

    alias: [
        "sensualidad"
    ],

    categoria:
        "utilidades",

    descripcion:
        "Busca y envía dos imágenes sensuales no explícitas.",

    permisos: [
        "usuario"
    ],

    uso:
        "!sensual <búsqueda>",

    async ejecutar(
        sock,
        from,
        args
    ) {

        const consulta =
            args.join(" ").trim();

        if (!consulta) {

            return sock.sendMessage(
                from,
                {
                    text:
`🌹 *TITANS SENSUAL*

Busca imágenes sensuales de estilo artístico, glamour, anime adulto, cosplay o fitness.

Uso:
!sensual <búsqueda>

Ejemplos:
!sensual mujer anime voluptuosa
!sensual hombre anime musculoso
!sensual cosplay adulto
!sensual modelo glamour
!sensual hombre fitness

🚫 Solo contenido sensual no explícito.

${PIE_MULTIMEDIA}`
                }
            );
        }

        try {

            await sock.sendMessage(
                from,
                {
                    text:
`🌹 *Buscando imágenes...*

🔎 ${consulta}
📸 Seleccionando las 2 más relevantes...`
                }
            );

            await enviarImagenesSensuales(
                sock,
                from,
                consulta
            );

        } catch (error) {

            console.error(
                "❌ Error buscando imágenes sensuales:",
                error.message
            );

            await sock.sendMessage(
                from,
                {
                    text:
`❌ *No pude encontrar imágenes adecuadas.*

🔎 Intenta realizar una búsqueda diferente.

🚫 Recuerda: solo contenido sensual no explícito.

${PIE_MULTIMEDIA}`
                }
            );
        }
    }
};
