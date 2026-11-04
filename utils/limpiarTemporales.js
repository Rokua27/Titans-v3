const fs = require("fs-extra");
const path = require("path");

const CARPETA_TEMP = path.join(
    process.cwd(),
    "temp"
);

const MAX_EDAD_MS = 24 * 60 * 60 * 1000;

async function limpiarTemporales() {

    await fs.ensureDir(CARPETA_TEMP);

    const ahora = Date.now();

    const archivos =
        await fs.readdir(CARPETA_TEMP);

    let eliminados = 0;
    let bytesLiberados = 0;

    for (const nombre of archivos) {

        const ruta =
            path.join(CARPETA_TEMP, nombre);

        try {

            const stat =
                await fs.stat(ruta);

            if (!stat.isFile()) {
                continue;
            }

            const edad =
                ahora - stat.mtimeMs;

            if (edad <= MAX_EDAD_MS) {
                continue;
            }

            bytesLiberados += stat.size;

            await fs.remove(ruta);

            eliminados++;

            console.log(
                `🧹 Temporal eliminado: ${nombre}`
            );

        } catch (error) {

            console.error(
                `⚠️ No se pudo limpiar ${nombre}:`,
                error.message
            );
        }
    }

    const mbLiberados =
        bytesLiberados / 1024 / 1024;

    console.log(
        `🧹 Limpieza multimedia: ` +
        `${eliminados} archivo(s), ` +
        `${mbLiberados.toFixed(2)} MB liberados.`
    );

    return {
        eliminados,
        bytesLiberados,
        mbLiberados
    };
}

module.exports = {
    limpiarTemporales
};
