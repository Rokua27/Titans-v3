const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { adquirirBloqueo } = require("./bloqueoEconomia");

function crearGestorEconomia(dependencias) {
    const { directorio, leerJSON, guardarJSON } = dependencias;

    if (
        typeof directorio !== "string" ||
        typeof leerJSON !== "function" ||
        typeof guardarJSON !== "function"
    ) {
        throw new Error("Dependencias del gestor económico inválidas.");
    }

    const carpetaRegistro = path.join(
        directorio,
        ".economia-transacciones"
    );

    let cola = Promise.resolve();

    function serializarTrabajo(trabajo) {
        const actual = cola.then(trabajo, trabajo);
        cola = actual.catch(() => {});
        return actual;
    }

    async function conBloqueo(trabajo) {
        const liberar = await adquirirBloqueo(directorio);

        try {
            return await trabajo();
        } finally {
            await liberar();
        }
    }

    function validarId(id) {
        if (
            typeof id !== "string" ||
            !/^[a-zA-Z0-9._-]{1,160}$/.test(id)
        ) {
            throw new Error("Identificador de operación inválido.");
        }
    }

    function validarArchivo(archivo) {
        if (
            typeof archivo !== "string" ||
            !archivo ||
            path.basename(archivo) !== archivo ||
            !archivo.endsWith(".json")
        ) {
            throw new Error("Nombre de archivo inválido.");
        }
    }

    function rutaRegistro(id) {
        validarId(id);
        return path.join(carpetaRegistro, id + ".json");
    }

    function serializar(datos) {
        const contenido = JSON.stringify(datos);

        if (contenido === undefined) {
            throw new Error("Datos económicos no serializables.");
        }

        JSON.parse(contenido);
        return contenido;
    }

    function hashContenido(contenido) {
        return crypto
            .createHash("sha256")
            .update(contenido, "utf8")
            .digest("hex");
    }

    function leerEstado(archivo) {
        validarArchivo(archivo);

        const ruta = path.join(directorio, archivo);

        if (!fs.existsSync(ruta)) {
            return {
                existe: false,
                hash: null
            };
        }

        const contenido = fs.readFileSync(ruta, "utf8");

        // Un archivo existente pero corrupto nunca se considera vacío.
        const datos = JSON.parse(contenido);
        const canonico = serializar(datos);

        return {
            existe: true,
            hash: hashContenido(canonico)
        };
    }

    function coincide(actual, esperado) {
        return (
            actual.existe === esperado.existe &&
            actual.hash === esperado.hash
        );
    }

    function escribirAtomico(ruta, datos) {
        const contenido = serializar(datos);
        const temporal = ruta + "." + crypto.randomUUID() + ".tmp";

        let fd = null;

        try {
            fd = fs.openSync(temporal, "wx", 0o600);
            fs.writeFileSync(fd, contenido, "utf8");
            fs.fsyncSync(fd);
            fs.closeSync(fd);
            fd = null;

            JSON.parse(fs.readFileSync(temporal, "utf8"));
            fs.renameSync(temporal, ruta);
        } catch (error) {
            if (fd !== null) {
                try {
                    fs.closeSync(fd);
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

    function leerRegistro(ruta) {
        const registro = JSON.parse(
            fs.readFileSync(ruta, "utf8")
        );

        if (
            !registro ||
            registro.version !== 2 ||
            typeof registro.id !== "string" ||
            path.basename(ruta) !== registro.id + ".json" ||
            !["pendiente", "confirmada"].includes(registro.estado) ||
            !registro.cambios ||
            typeof registro.cambios !== "object" ||
            Array.isArray(registro.cambios) ||
            !Object.keys(registro.cambios).length
        ) {
            throw new Error("Registro económico inválido: " + ruta);
        }

        validarId(registro.id);

        for (const archivo of Object.keys(registro.cambios)) {
            validarArchivo(archivo);

            const cambio = registro.cambios[archivo];

            if (
                !cambio ||
                !cambio.antes ||
                typeof cambio.antes.existe !== "boolean" ||
                !cambio.despues ||
                cambio.despues.existe !== true ||
                typeof cambio.despues.hash !== "string" ||
                typeof cambio.despues.datos === "undefined"
            ) {
                throw new Error(
                    "Cambio inválido en registro económico: " + archivo
                );
            }

            if (
                cambio.antes.existe &&
                (
                    typeof cambio.antes.hash !== "string" ||
                    !/^[a-f0-9]{64}$/.test(cambio.antes.hash)
                )
            ) {
                throw new Error("Huella anterior inválida: " + archivo);
            }

            if (
                !cambio.antes.existe &&
                cambio.antes.hash !== null
            ) {
                throw new Error("Estado anterior inválido: " + archivo);
            }

            const contenido = serializar(cambio.despues.datos);

            if (
                hashContenido(contenido) !== cambio.despues.hash ||
                !/^[a-f0-9]{64}$/.test(cambio.despues.hash)
            ) {
                throw new Error("Huella nueva inválida: " + archivo);
            }
        }

        return registro;
    }

    async function aplicarRegistro(registro, ruta) {
        for (const archivo of Object.keys(registro.cambios)) {
            const cambio = registro.cambios[archivo];
            const actual = leerEstado(archivo);

            // Si ya está aplicado, no se vuelve a escribir.
            if (coincide(actual, cambio.despues)) {
                continue;
            }

            // Solo se permite aplicar desde el estado anterior esperado.
            if (!coincide(actual, cambio.antes)) {
                throw new Error(
                    "Conflicto económico en " + archivo +
                    ": el archivo cambió desde que se preparó la transacción."
                );
            }

            await guardarJSON(archivo, cambio.despues.datos);

            const verificado = leerEstado(archivo);

            if (!coincide(verificado, cambio.despues)) {
                throw new Error(
                    "No se pudo verificar la escritura económica: " + archivo
                );
            }
        }

        registro.estado = "confirmada";
        registro.confirmadaEn = Date.now();

        escribirAtomico(ruta, registro);
    }

    async function recuperarInterno() {
        fs.mkdirSync(carpetaRegistro, {
            recursive: true,
            mode: 0o700
        });

        const archivos = fs.readdirSync(carpetaRegistro)
            .filter(nombre => nombre.endsWith(".json"))
            .sort();

        let recuperadas = 0;

        for (const nombre of archivos) {
            const ruta = path.join(carpetaRegistro, nombre);
            const registro = leerRegistro(ruta);

            if (registro.estado === "pendiente") {
                await aplicarRegistro(registro, ruta);
                recuperadas++;
            }
        }

        return {
            ok: true,
            recuperadas
        };
    }

    async function ejecutar(id, preparar) {
        return serializarTrabajo(() => conBloqueo(async () => {
            validarId(id);

            if (typeof preparar !== "function") {
                throw new Error("Se requiere una función preparadora.");
            }

            fs.mkdirSync(carpetaRegistro, {
                recursive: true,
                mode: 0o700
            });

            const ruta = rutaRegistro(id);

            if (fs.existsSync(ruta)) {
                const anterior = leerRegistro(ruta);

                if (anterior.estado === "pendiente") {
                    await aplicarRegistro(anterior, ruta);
                }

                return {
                    ok: true,
                    duplicada: true,
                    resultado: anterior.resultado ?? null
                };
            }

            const archivosAntes = {};
            const archivosLeidos = new Set();

            // Capturar el estado antes de cada lectura usada para preparar.
            const leerParaPreparar = archivo => {
                validarArchivo(archivo);

                if (!archivosLeidos.has(archivo)) {
                    archivosAntes[archivo] = leerEstado(archivo);
                    archivosLeidos.add(archivo);
                }

                return leerJSON(archivo);
            };

            const plan = await preparar(leerParaPreparar);

            if (
                !plan ||
                !plan.cambios ||
                typeof plan.cambios !== "object" ||
                Array.isArray(plan.cambios)
            ) {
                throw new Error("Plan económico inválido.");
            }

            const archivos = Object.keys(plan.cambios);

            if (!archivos.length) {
                throw new Error("La operación no contiene cambios.");
            }

            for (const archivo of archivos) {
                validarArchivo(archivo);

                // Si no se leyó durante la preparación, capturar ahora.
                if (!archivosLeidos.has(archivo)) {
                    archivosAntes[archivo] = leerEstado(archivo);
                    archivosLeidos.add(archivo);
                }

                const estadoActual = leerEstado(archivo);

                if (!coincide(estadoActual, archivosAntes[archivo])) {
                    throw new Error(
                        "Conflicto al preparar la transacción: " + archivo
                    );
                }
            }

            const cambios = {};

            for (const archivo of archivos) {
                const contenido = serializar(plan.cambios[archivo]);

                // Comprobar que no hubo cambios durante la preparación.
                const estadoActual = leerEstado(archivo);

                if (!coincide(estadoActual, archivosAntes[archivo])) {
                    throw new Error(
                        "Conflicto al preparar la transacción: " + archivo
                    );
                }

                cambios[archivo] = {
                    antes: archivosAntes[archivo],
                    despues: {
                        existe: true,
                        hash: hashContenido(contenido),
                        datos: JSON.parse(contenido)
                    }
                };
            }

            const registro = {
                version: 2,
                id,
                estado: "pendiente",
                creadoEn: Date.now(),
                cambios,
                resultado: plan.resultado ?? null
            };

            // Primero se registra el plan verificable; después se escriben datos.
            escribirAtomico(ruta, registro);

            await aplicarRegistro(registro, ruta);

            return {
                ok: true,
                duplicada: false,
                resultado: registro.resultado
            };
        }));
    }

    function recuperar() {
        return serializarTrabajo(() => conBloqueo(recuperarInterno));
    }

    return {
        ejecutar,
        recuperar
    };
}

module.exports = { crearGestorEconomia };
