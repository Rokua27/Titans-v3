const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function crearDatabase(opciones = {}) {
    const carpeta = opciones.directorio ||
        path.join(__dirname, "..", "database");

    const MAX_RESPALDOS = 5;
    const INTERVALO_RESPALDO_MS = 6 * 60 * 60 * 1000;

    function rutaArchivo(archivo) {
        if (
            typeof archivo !== "string" ||
            !archivo ||
            path.basename(archivo) !== archivo
        ) {
            throw new Error("Nombre de archivo JSON no válido.");
        }

        return path.join(carpeta, archivo);
    }

    function escribirAtomico(ruta, datos) {
        const contenido = JSON.stringify(datos, null, 2);

        if (contenido === undefined) {
            throw new Error("Los datos no se pueden convertir a JSON.");
        }

        const temporal = path.join(
            path.dirname(ruta),
            "." + path.basename(ruta) +
            "." + crypto.randomUUID() + ".tmp"
        );

        let descriptor = null;

        try {
            descriptor = fs.openSync(temporal, "wx", 0o600);
            fs.writeFileSync(descriptor, contenido, "utf8");
            fs.fsyncSync(descriptor);
            fs.closeSync(descriptor);
            descriptor = null;

            JSON.parse(fs.readFileSync(temporal, "utf8"));
            fs.renameSync(temporal, ruta);
        } catch (error) {
            if (descriptor !== null) {
                try {
                    fs.closeSync(descriptor);
                } catch (_) {}
            }

            try {
                if (fs.existsSync(temporal)) {
                    fs.unlinkSync(temporal);
                }
            } catch (_) {}

            throw error;
        }
    }

    function obtenerRespaldos() {
        const backups = path.join(carpeta, "backups");

        if (!fs.existsSync(backups)) return [];

        const historicos = fs.readdirSync(backups)
            .filter(nombre =>
                nombre !== "usuarios_backup.json" &&
                /^usuarios_.*\.json$/.test(nombre)
            )
            .map(nombre => ({
                ruta: path.join(backups, nombre),
                fecha: fs.statSync(path.join(backups, nombre)).mtimeMs
            }))
            .sort((a, b) => b.fecha - a.fecha);

        const respaldoBase = path.join(
            backups,
            "usuarios_backup.json"
        );

        if (fs.existsSync(respaldoBase)) {
            historicos.push({
                ruta: respaldoBase,
                fecha: 0
            });
        }

        return historicos;
    }

    function leerJSON(archivo) {
        const ruta = rutaArchivo(archivo);

        if (!fs.existsSync(ruta)) return null;

        try {
            return JSON.parse(fs.readFileSync(ruta, "utf8"));
        } catch (error) {
            console.error(
                "❌ Error leyendo " + archivo + ":",
                error.message
            );

            if (archivo !== "usuarios.json") return null;

            for (const respaldo of obtenerRespaldos()) {
                try {
                    const datos = JSON.parse(
                        fs.readFileSync(respaldo.ruta, "utf8")
                    );

                    escribirAtomico(ruta, datos);

                    console.log(
                        "✅ usuarios.json restaurado desde:",
                        path.basename(respaldo.ruta)
                    );

                    return datos;
                } catch (errorRespaldo) {
                    console.error(
                        "⚠️ Respaldo no válido:",
                        path.basename(respaldo.ruta),
                        errorRespaldo.message
                    );
                }
            }

            console.error(
                "❌ No se encontró un respaldo válido de usuarios."
            );

            return null;
        }
    }

    function leerJSONEstricto(archivo) {
        const ruta = rutaArchivo(archivo);

        if (!fs.existsSync(ruta)) return null;

        // A diferencia de leerJSON(), la corrupción nunca se convierte
        // silenciosamente en null. El consumidor debe detenerse.
        return JSON.parse(fs.readFileSync(ruta, "utf8"));
    }

    function crearRespaldosUsuarios(ruta, datosAnteriores) {
        const backups = path.join(carpeta, "backups");

        fs.mkdirSync(backups, { recursive: true });

        const respaldoBase = path.join(
            backups,
            "usuarios_backup.json"
        );

        if (!fs.existsSync(respaldoBase)) {
            escribirAtomico(respaldoBase, datosAnteriores);
        }

        const historicos = fs.readdirSync(backups)
            .filter(nombre =>
                nombre !== "usuarios_backup.json" &&
                /^usuarios_.*\.json$/.test(nombre)
            )
            .map(nombre => ({
                ruta: path.join(backups, nombre),
                fecha: fs.statSync(
                    path.join(backups, nombre)
                ).mtimeMs
            }))
            .sort((a, b) => b.fecha - a.fecha);

        const ahora = Date.now();
        const ultimoRespaldo = historicos[0];

        if (
            ultimoRespaldo &&
            ahora - ultimoRespaldo.fecha < INTERVALO_RESPALDO_MS
        ) {
            return;
        }

        const marcaTiempo = new Date(ahora)
            .toISOString()
            .replace(/[:.]/g, "-");

        const nombre =
            "usuarios_" + marcaTiempo + "_" +
            crypto.randomUUID() + ".json";

        const rutaNuevo = path.join(backups, nombre);

        escribirAtomico(rutaNuevo, datosAnteriores);

        const historicosActualizados = fs.readdirSync(backups)
            .filter(nombre =>
                nombre !== "usuarios_backup.json" &&
                /^usuarios_.*\.json$/.test(nombre)
            )
            .map(nombre => ({
                ruta: path.join(backups, nombre),
                fecha: fs.statSync(
                    path.join(backups, nombre)
                ).mtimeMs
            }))
            .sort((a, b) => b.fecha - a.fecha);

        for (
            const antiguo of historicosActualizados.slice(MAX_RESPALDOS)
        ) {
            fs.unlinkSync(antiguo.ruta);
        }
    }

    function guardarJSON(archivo, datos) {
        const ruta = rutaArchivo(archivo);

        // Validar antes de crear respaldos o modificar archivos.
        const contenido = JSON.stringify(datos, null, 2);

        if (contenido === undefined) {
            throw new Error("Los datos no se pueden convertir a JSON.");
        }

        JSON.parse(contenido);

        if (archivo === "usuarios.json" && fs.existsSync(ruta)) {
            let datosAnteriores;

            try {
                datosAnteriores = JSON.parse(
                    fs.readFileSync(ruta, "utf8")
                );
            } catch (error) {
                throw new Error(
                    "No se guardarán usuarios porque el archivo actual " +
                    "está dañado. Ejecuta primero la recuperación: " +
                    error.message
                );
            }

            crearRespaldosUsuarios(ruta, datosAnteriores);
        }

        escribirAtomico(ruta, datos);
    }

    return { leerJSON, leerJSONEstricto, guardarJSON };
}

const database = crearDatabase();

module.exports = {
    leerJSON: database.leerJSON,
    leerJSONEstricto: database.leerJSONEstricto,
    guardarJSON: database.guardarJSON,
    crearDatabase
};
