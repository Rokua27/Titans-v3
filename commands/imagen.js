const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs-extra");
const path = require("path");

const MAX_RESULTADOS = 10;
const TIMEOUT_BUSQUEDA = 20000;
const TIMEOUT_DESCARGA = 30000;

const PIE_MULTIMEDIA =
`━━━━━━━━━━━━━━━━━━
🏆 Liga Titans Team
🤖 TitansB
Tu asistente oficial de la comunidad
━━━━━━━━━━━━━━━━━━`;

function normalizarTexto(texto = "") {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function puntuarImagen(resultado, consulta) {
    const busqueda = normalizarTexto(consulta);

    const texto = normalizarTexto(
        `${resultado.title || ""} ${resultado.description || ""} ${resultado.source || ""}`
    );

    const palabras = busqueda
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

    if (resultado.width && resultado.height) {
        const area = resultado.width * resultado.height;

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

    /*
     * Bing incluye los datos de resultados dentro de elementos
     * con class="iusc" y atributo m.
     */
    const $ = cheerio.load(html);

    $(".iusc").each((_, elemento) => {
        try {
            const datos = $(elemento).attr("m");

            if (!datos) return;

            const info = JSON.parse(datos);

            const imagen =
                info.murl ||
                info.turl;

            if (!imagen) return;

            if (!/^https?:\/\//i.test(imagen)) return;

            if (vistos.has(imagen)) return;

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

    /*
     * Respaldo para cambios menores en el HTML de Bing.
     */
    if (!resultados.length) {
        const coincidencias =
            html.match(/murl&quot;:&quot;https?:\/\/[^"&]+/g) || [];

        for (const coincidencia of coincidencias) {
            const url = coincidencia
                .replace(/^.*?https?:\/\//, "https://")
                .replace(/&amp;/g, "&");

            if (!/^https?:\/\//i.test(url)) continue;

            if (vistos.has(url)) continue;

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

            if (resultados.length >= MAX_RESULTADOS) break;
        }
    }

    return resultados;
}

async function buscarImagenes(consulta) {
    const url =
        `https://www.bing.com/images/search?q=${encodeURIComponent(consulta)}`;

    const respuesta = await axios.get(url, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
            "Accept-Language": "es-ES,es;q=0.9,en;q=0.8"
        },
        timeout: TIMEOUT_BUSQUEDA,
        maxRedirects: 5
    });

    const resultados = extraerResultados(respuesta.data);

    if (!resultados.length) {
        throw new Error("No se encontraron imágenes.");
    }

    resultados.sort(
        (a, b) =>
            puntuarImagen(b, consulta) -
            puntuarImagen(a, consulta)
    );

    return resultados.slice(0, MAX_RESULTADOS);
}

async function descargarImagen(url, archivo) {
    const respuesta = await axios.get(url, {
        responseType: "stream",
        timeout: TIMEOUT_DESCARGA,
        maxRedirects: 5,
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
        }
    });

    const contentType =
        respuesta.headers["content-type"] || "";

    if (!contentType.startsWith("image/")) {
        throw new Error("La URL no devolvió una imagen.");
    }

    const writer =
        fs.createWriteStream(archivo);

    return new Promise((resolve, reject) => {

        respuesta.data.pipe(writer);

        writer.on("finish", resolve);
        writer.on("error", reject);

        respuesta.data.on("error", reject);
    });
}

async function enviarImagen(sock, from, consulta) {

    const carpetaTemp =
        path.join(process.cwd(), "temp");

    await fs.ensureDir(carpetaTemp);

    let archivo = null;

    try {

        const resultados =
            await buscarImagenes(consulta);

        let descargada = false;

        for (let i = 0; i < resultados.length; i++) {

            const resultado = resultados[i];

            const candidato =
                path.join(
                    carpetaTemp,
                    `titans_imagen_${Date.now()}_${i}.jpg`
                );

            try {

                await descargarImagen(
                    resultado.url,
                    candidato
                );

                const stat =
                    await fs.stat(candidato);

                if (stat.size < 1000) {
                    await fs.remove(candidato);
                    continue;
                }

                archivo = candidato;
                descargada = true;

                console.log(
                    `🖼️ TitansB | imagen encontrada | ` +
                    `${resultado.title || consulta}`
                );

                break;

            } catch (error) {

                console.log(
                    `⚠️ Imagen ${i + 1} falló:`,
                    error.message
                );

                await fs.remove(candidato).catch(() => {});
            }
        }

        if (!descargada || !archivo) {
            throw new Error(
                "No se pudo descargar ninguna imagen."
            );
        }

        await sock.sendMessage(from, {
            image: fs.readFileSync(archivo),
            caption: PIE_MULTIMEDIA
        });

    } finally {

        if (
            archivo &&
            await fs.pathExists(archivo)
        ) {
            await fs.remove(archivo).catch(() => {});

            console.log(
                "🧹 TitansB | temporal de imagen eliminado."
            );
        }
    }
}

module.exports = {

    nombre: "imagen",

    alias: [
        "img",
        "foto"
    ],

    categoria: "utilidades",

    descripcion:
        "Busca y envía la imagen más relevante.",

    permisos: [
        "usuario"
    ],

    uso:
        "!imagen <búsqueda>",

    async ejecutar(
        sock,
        from,
        args
    ) {

        const consulta =
            args.join(" ").trim();

        if (!consulta) {

            return sock.sendMessage(from, {
                text:
`🖼️ *TITANS IMAGEN*

Uso:
!imagen <búsqueda>

Ejemplo:
!imagen Mobile Legends Granger

${PIE_MULTIMEDIA}`
            });
        }

        try {

            await sock.sendMessage(from, {
                text:
`🔎 *Buscando imagen...*

🖼️ ${consulta}`
            });

            await enviarImagen(
                sock,
                from,
                consulta
            );

        } catch (error) {

            console.error(
                "❌ Error buscando imagen:",
                error.message
            );

            await sock.sendMessage(from, {
                text:
`❌ *No pude encontrar una imagen adecuada.*

🔎 Intenta realizar una búsqueda más específica.

${PIE_MULTIMEDIA}`
            });
        }
    }
};
