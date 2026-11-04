const fs = require("fs");
const path = require("path");

function leerJSON(archivo) {

    const ruta = path.join(__dirname, "..", "database", archivo);

    if (!fs.existsSync(ruta)) {
        return null;
    }

    try {
        return JSON.parse(fs.readFileSync(ruta, "utf8"));

} catch (error) {

    console.error(`❌ Error leyendo ${archivo}:`, error.message);

    // Restauración automática de usuarios
    if (archivo === "usuarios.json") {

        try {

            const respaldo = path.join(
                __dirname,
                "..",
                "database",
                "backups",
                "usuarios_backup.json"
            );

            if (fs.existsSync(respaldo)) {

                fs.copyFileSync(respaldo, ruta);

                console.log("✅ usuarios.json restaurado automáticamente.");

                return JSON.parse(fs.readFileSync(ruta, "utf8"));

            }

        } catch (e) {

            console.error("❌ No se pudo restaurar usuarios.json:", e.message);

        }

    }

    return null;
}

}

function guardarJSON(archivo, datos) {

    const ruta = path.join(__dirname, "..", "database", archivo);

    // Crear respaldo automático SOLO para usuarios.json
    if (
        archivo === "usuarios.json" &&
        fs.existsSync(ruta)
    ) {

        try {

            const carpeta = path.join(
                __dirname,
                "..",
                "database",
                "backups"
            );

            if (!fs.existsSync(carpeta)) {
                fs.mkdirSync(carpeta, { recursive: true });
            }

const respaldo = path.join(carpeta, "usuarios_backup.json");

if (!fs.existsSync(respaldo)) {
    fs.copyFileSync(ruta, respaldo);
}

        } catch (e) {

            console.log("⚠️ No se pudo crear el respaldo:", e.message);

        }

    }

    fs.writeFileSync(
        ruta,
        JSON.stringify(datos, null, 2),
        "utf8"
    );

}

module.exports = {
    leerJSON,
    guardarJSON
};
