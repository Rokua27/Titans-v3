const yts = require("yt-search");
const { spawn } = require("child_process");
const fs = require("fs-extra");
const path = require("path");

const MAX_DURACION = 20 * 60;
const MAX_RESULTADOS = 5;
const TIMEOUT_DESCARGA = 180000;

const selecciones = new Map();

const PIE_MULTIMEDIA =
`━━━━━━━━━━━━━━━━━━
🏆 Liga Titans Team
🤖 Titansb
Tu asistente oficial de la comunidad
━━━━━━━━━━━━━━━━━━`;

function convertirSegundos(timestamp) {
    if (!timestamp) return 0;

    const partes = timestamp.split(":").map(Number);

    if (partes.length === 2) {
        return partes[0] * 60 + partes[1];
    }

    if (partes.length === 3) {
        return partes[0] * 3600 + partes[1] * 60 + partes[2];
    }

    return 0;
}

function puntuarVideo(video, busqueda) {
    const titulo = (video.title || "").toLowerCase();
    const consulta = busqueda.toLowerCase();

    let puntos = 0;

    const palabras = consulta
        .split(/\s+/)
        .filter(p => p.length >= 3);

    for (const palabra of palabras) {
        if (titulo.includes(palabra)) {
            puntos += 10;
        }
    }

    const positivas = [
        "mundial",
        "world",
        "championship",
        "final",
        "mobile legends",
        "mlbb",
        "gameplay",
        "partida",
        "partido",
        "resumen",
        "match",
        "highlights"
    ];

    for (const palabra of positivas) {
        if (titulo.includes(palabra)) {
            puntos += 8;
        }
    }

    const negativas = [
        "official music video",
        "music video",
        "canción",
        "song",
        "lyrics",
        "#shorts",
        "shorts"
    ];

    for (const palabra of negativas) {
        if (titulo.includes(palabra)) {
            puntos -= 25;
        }
    }

    const duracion = convertirSegundos(video.timestamp);

    if (duracion > 0 && duracion <= MAX_DURACION) {
        puntos += 15;
    }

    if (video.views > 100000) {
        puntos += 8;
    } else if (video.views > 10000) {
        puntos += 4;
    }

    return puntos;
}

function descargarVideo(url, archivo) {
    return new Promise((resolve, reject) => {

        const proceso = spawn("yt-dlp", [
            "--extractor-args",
            "youtube:player_client=android",

            "--js-runtimes",
            "node",

            "-f",
            "18",

            "--no-playlist",

            "--no-warnings",

            "--restrict-filenames",

            "-o",
            archivo,

            url
        ]);

        let errorOutput = "";

        const temporizador = setTimeout(() => {
            proceso.kill("SIGKILL");

            reject(
                new Error(
                    "La descarga superó los 3 minutos."
                )
            );
        }, TIMEOUT_DESCARGA);

        proceso.stderr.on("data", data => {
            errorOutput += data.toString();
        });

        proceso.stdout.on("data", data => {
            console.log(
                `[yt-dlp] ${data.toString().trim()}`
            );
        });

        proceso.on("error", error => {
            clearTimeout(temporizador);
            reject(error);
        });

        proceso.on("close", codigo => {
            clearTimeout(temporizador);

            if (codigo === 0) {
                resolve();
            } else {
                reject(
                    new Error(
                        errorOutput.slice(-1000) ||
                        "yt-dlp terminó con error."
                    )
                );
            }
        });
    });
}

async function enviarVideo(sock, from, video) {

    let archivo;

    try {

        const duracion =
            convertirSegundos(video.timestamp);

        if (duracion > MAX_DURACION) {

            return sock.sendMessage(from, {
                text:
`❌ Este video dura demasiado.

⏱️ Duración: ${video.timestamp}
🚫 Máximo permitido: 20 minutos.

Prueba con un resumen o highlights.

${PIE_MULTIMEDIA}`
            });
        }

        await sock.sendMessage(from, {
            text:
`🎬 *${video.title}*

📺 ${video.author?.name || "Canal desconocido"}
⏱️ ${video.timestamp}

⏳ Descargando en calidad optimizada...`
        });

        const carpetaTemp =
            path.join(process.cwd(), "temp");

        await fs.ensureDir(carpetaTemp);

        archivo = path.join(
            carpetaTemp,
            `titans_video_${Date.now()}.mp4`
        );

        await descargarVideo(
            video.url,
            archivo
        );

        if (!(await fs.pathExists(archivo))) {
            throw new Error(
                "No se generó el archivo de video."
            );
        }

        const estadisticas =
            await fs.stat(archivo);

        const tamañoMB =
            estadisticas.size / 1024 / 1024;

        console.log(
            `📦 TitansB | video generado | ${tamañoMB.toFixed(2)} MB`
        );

        const caption =
`🎬 *${video.title}*

📺 ${video.author?.name || "Canal desconocido"}
⏱️ ${video.timestamp}

${PIE_MULTIMEDIA}`;

        await sock.sendMessage(from, {
            video: fs.readFileSync(archivo),
            mimetype: "video/mp4",
            fileName: "TitansB_video.mp4",
            caption
        });

    } catch (error) {

        console.error(
            "❌ Error descargando video:",
            error.message
        );

        await sock.sendMessage(from, {
            text:
`❌ *No pude generar este video.*

🔎 Intenta seleccionar otra opción.

${PIE_MULTIMEDIA}`
        });

    } finally {

        if (
            archivo &&
            await fs.pathExists(archivo)
        ) {

            try {

                await fs.remove(archivo);

                console.log(
                    "🧹 TitansB | temporal eliminado."
                );

            } catch {}
        }
    }
}

module.exports = {
    nombre: "video",
    alias: ["yt"],
    categoria: "utilidades",
    descripcion:
        "Busca y envía videos de YouTube.",
    permisos: ["usuario"],
    uso: "!video <búsqueda>",

    async ejecutar(sock, from, args, msg) {

        const sender =
            msg?.key?.participant ||
            msg?.key?.remoteJid ||
            from;

        const entrada =
            args.join(" ").trim();

        if (!entrada) {

            return sock.sendMessage(from, {
                text:
`🎬 *TITANS VIDEO*

Uso:
!video <búsqueda>

Ejemplo:
!video Mobile Legends mundial

${PIE_MULTIMEDIA}`
            });
        }

        if (/^[1-5]$/.test(entrada)) {

            const numero =
                Number(entrada);

            const pendiente =
                selecciones.get(sender);

            if (!pendiente) {

                return sock.sendMessage(from, {
                    text:
`❌ No tienes una búsqueda pendiente.

Usa:
!video <búsqueda>

${PIE_MULTIMEDIA}`
                });
            }

            const video =
                pendiente[numero - 1];

            if (!video) {

                return sock.sendMessage(from, {
                    text:
`❌ Esa opción no existe.

${PIE_MULTIMEDIA}`
                });
            }

            selecciones.delete(sender);

            return enviarVideo(
                sock,
                from,
                video
            );
        }

        try {

            await sock.sendMessage(from, {
                text:
`🔎 *Buscando video...*
🎬 ${entrada}`
            });

            const resultados =
                await yts(entrada);

            if (
                !resultados ||
                !resultados.videos ||
                !resultados.videos.length
            ) {

                return sock.sendMessage(from, {
                    text:
`❌ No encontré videos para esa búsqueda.

${PIE_MULTIMEDIA}`
                });
            }

            const candidatos =
                resultados.videos
                    .filter(video => {

                        const duracion =
                            convertirSegundos(
                                video.timestamp
                            );

                        return (
                            duracion > 0 &&
                            duracion <= MAX_DURACION
                        );
                    })
                    .slice(0, 15);

            if (!candidatos.length) {

                return sock.sendMessage(from, {
                    text:
`❌ No encontré videos adecuados.

⏱️ Máximo: 20 minutos.

${PIE_MULTIMEDIA}`
                });
            }

            candidatos.sort(
                (a, b) =>
                    puntuarVideo(b, entrada) -
                    puntuarVideo(a, entrada)
            );

            const seleccion =
                candidatos.slice(
                    0,
                    MAX_RESULTADOS
                );

            selecciones.set(
                sender,
                seleccion
            );

            let texto =
`╔════════════════════════════╗
║      🎬 TITANS VIDEO       ║
╚════════════════════════════╝

🔎 *${entrada}*

Encontré estas opciones:

`;

            seleccion.forEach((video, i) => {

                texto +=
`${i + 1}️⃣ *${video.title}*
📺 ${video.author?.name || "Desconocido"}
⏱️ ${video.timestamp}
👀 ${Number(
    video.views || 0
).toLocaleString()} vistas

`;
            });

            texto +=
`━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👉 Elige una opción:

!video 1
!video 2
!video 3
!video 4
!video 5

${PIE_MULTIMEDIA}`;

            await sock.sendMessage(from, {
                text: texto
            });

        } catch (error) {

            console.error(
                "❌ Error buscando video:",
                error.message
            );

            await sock.sendMessage(from, {
                text:
`❌ No pude realizar la búsqueda de videos.

${PIE_MULTIMEDIA}`
            });
        }
    }
};
