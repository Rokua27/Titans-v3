"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { spawn } = require("child_process");

const CODIGO_GUARDIAN = [
    'process.stdout.write("TITANS_FLOCK_READY\\n");',
    "process.stdin.resume();",
    'process.stdin.on("end", () => process.exit(0));',
    'process.stdin.on("error", () => process.exit(1));'
].join("");

function leerInicioProceso(pid) {
    const contenido = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    const cierre = contenido.lastIndexOf(")");

    if (cierre < 0) {
        throw new Error("Identidad del proceso ilegible.");
    }

    const campos = contenido.slice(cierre + 2).trim().split(/\s+/);
    const inicio = campos[19];

    if (!/^\d+$/.test(inicio || "")) {
        throw new Error("Tiempo de inicio del proceso inválido.");
    }

    return inicio;
}

function inspeccionarRuta(ruta) {
    let stat;

    try {
        stat = fs.lstatSync(ruta);
    } catch (error) {
        if (error.code === "ENOENT") return { estado: "libre" };

        return {
            estado: "no_verificable",
            motivo: "No se pudo inspeccionar la ruta."
        };
    }

    if (!stat.isDirectory() || stat.isSymbolicLink()) {
        return {
            estado: "no_verificable",
            motivo: "La ruta no es un directorio seguro."
        };
    }

    let propietario;

    try {
        propietario = JSON.parse(
            fs.readFileSync(path.join(ruta, "propietario.json"), "utf8")
        );
    } catch (_) {
        return {
            estado: "no_verificable",
            motivo: "El propietario falta o es ilegible."
        };
    }

    if (
        !propietario ||
        !Number.isSafeInteger(propietario.pid) ||
        propietario.pid <= 0 ||
        typeof propietario.inicio !== "string" ||
        !/^\d+$/.test(propietario.inicio) ||
        typeof propietario.hostname !== "string" ||
        !propietario.hostname ||
        typeof propietario.token !== "string" ||
        !propietario.token ||
        !Number.isFinite(propietario.creadoEn)
    ) {
        return {
            estado: "no_verificable",
            motivo: "Los datos del propietario son inválidos."
        };
    }

    const resumen = {
        pid: propietario.pid,
        hostname: propietario.hostname,
        creadoEn: propietario.creadoEn
    };

    if (propietario.hostname !== os.hostname()) {
        return {
            estado: "no_verificable",
            motivo: "El propietario pertenece a otro equipo.",
            propietario: resumen
        };
    }

    try {
        process.kill(propietario.pid, 0);
    } catch (error) {
        if (error.code === "ESRCH") {
            return {
                estado: "posiblemente_abandonado",
                motivo: "El proceso propietario ya no existe.",
                propietario: resumen
            };
        }

        return {
            estado: "no_verificable",
            motivo: "No se pudo verificar el proceso.",
            propietario: resumen
        };
    }

    try {
        if (leerInicioProceso(propietario.pid) !== propietario.inicio) {
            return {
                estado: "posiblemente_abandonado",
                motivo: "El PID pertenece a otro proceso.",
                propietario: resumen
            };
        }
    } catch (error) {
        if (error.code === "ENOENT") {
            return {
                estado: "posiblemente_abandonado",
                motivo: "El proceso desapareció.",
                propietario: resumen
            };
        }

        return {
            estado: "no_verificable",
            motivo: "No se pudo verificar la identidad del proceso.",
            propietario: resumen
        };
    }

    return {
        estado: "activo",
        motivo: "La identidad del propietario coincide.",
        propietario: resumen
    };
}

function inspeccionarBloqueo(directorio) {
    if (typeof directorio !== "string" || !directorio) {
        throw new Error("Directorio de bloqueo inválido.");
    }

    return inspeccionarRuta(
        path.join(directorio, ".economia.lock")
    );
}

function escribirPropietario(ruta, propietario) {
    const archivo = path.join(ruta, "propietario.json");
    const fd = fs.openSync(archivo, "wx", 0o600);

    try {
        fs.writeFileSync(fd, JSON.stringify(propietario), "utf8");
        fs.fsyncSync(fd);
    } finally {
        fs.closeSync(fd);
    }
}

function liberarDirectorioPropio(ruta, token) {
    const archivo = path.join(ruta, "propietario.json");
    const actual = JSON.parse(fs.readFileSync(archivo, "utf8"));

    if (
        actual.token !== token ||
        actual.pid !== process.pid ||
        actual.hostname !== os.hostname() ||
        actual.inicio !== leerInicioProceso(process.pid)
    ) {
        throw new Error("El bloqueo no pertenece a este proceso.");
    }

    fs.unlinkSync(archivo);
    fs.rmdirSync(ruta);
}

function recuperarRutaAbandonada(ruta, etiqueta) {
    const estado = inspeccionarRuta(ruta);

    if (estado.estado === "libre") return false;

    if (estado.estado !== "posiblemente_abandonado") {
        throw new Error(
            "No se recupera " + etiqueta + ": " + estado.estado +
            ". " + (estado.motivo || "")
        );
    }

    const antes = fs.lstatSync(ruta);
    const segunda = inspeccionarRuta(ruta);

    if (segunda.estado !== "posiblemente_abandonado") {
        throw new Error("El propietario cambió durante la inspección.");
    }

    const actual = fs.lstatSync(ruta);

    if (actual.dev !== antes.dev || actual.ino !== antes.ino) {
        throw new Error("La ruta cambió durante la inspección.");
    }

    const cuarentena = ruta + ".abandonado." + crypto.randomUUID();

    fs.renameSync(ruta, cuarentena);

    const movido = fs.lstatSync(cuarentena);

    if (movido.dev !== antes.dev || movido.ino !== antes.ino) {
        throw new Error(
            "La ruta movida no coincide. Se conserva en cuarentena."
        );
    }

    return true;
}

function prepararArchivoFlock(ruta) {
    const flags =
        fs.constants.O_CREAT |
        fs.constants.O_RDWR |
        (fs.constants.O_NOFOLLOW || 0);

    const fd = fs.openSync(ruta, flags, 0o600);

    try {
        if (!fs.fstatSync(fd).isFile()) {
            throw new Error("El archivo flock no es regular.");
        }

        const abierto = fs.fstatSync(fd);
        const rutaActual = fs.lstatSync(ruta);

        if (
            rutaActual.isSymbolicLink() ||
            abierto.dev !== rutaActual.dev ||
            abierto.ino !== rutaActual.ino
        ) {
            throw new Error("El archivo flock cambió durante su apertura.");
        }
    } finally {
        fs.closeSync(fd);
    }
}

function adquirirFlock(ruta) {
    return new Promise((resolve, reject) => {
        let listo = false;
        let terminado = false;
        let salida = "";
        let errorSalida = "";
        let asentado = false;

        const hijo = spawn(
            "flock",
            [
                "-n",
                "-x",
                ruta,
                process.execPath,
                "-e",
                CODIGO_GUARDIAN
            ],
            {
                stdio: ["pipe", "pipe", "pipe"]
            }
        );

        const cierre = new Promise(resolveCierre => {
            hijo.once("close", (codigo, senal) => {
                terminado = true;
                resolveCierre({ codigo, senal });
            });
        });

        hijo.stdout.setEncoding("utf8");
        hijo.stderr.setEncoding("utf8");

        hijo.stdout.on("data", datos => {
            salida += datos;

            if (!listo && salida.includes("TITANS_FLOCK_READY\n")) {
                listo = true;
                resolve({
                    hijo,
                    cierre,
                    comprobar() {
                        if (terminado) {
                            throw new Error(
                                "El proceso guardián perdió el bloqueo flock."
                            );
                        }
                    },
                    async liberar() {
                        if (asentado) {
                            throw new Error("El flock ya fue liberado.");
                        }

                        asentado = true;

                        if (!terminado) hijo.stdin.end();

                        const resultado = await cierre;

                        if (resultado.codigo !== 0) {
                            throw new Error(
                                "El guardián flock terminó con código " +
                                resultado.codigo + ". " + errorSalida
                            );
                        }
                    }
                });
            }
        });

        hijo.stderr.on("data", datos => {
            errorSalida += datos;
        });

        hijo.once("error", error => {
            if (!listo) reject(error);
        });

        cierre.then(resultado => {
            if (!listo) {
                reject(
                    new Error(
                        resultado.codigo === 1
                            ? "Economía bloqueada: otro proceso mantiene flock."
                            : "No se pudo adquirir flock. " + errorSalida
                    )
                );
            }
        });
    });
}

async function adquirirBloqueo(directorio) {
    if (typeof directorio !== "string" || !directorio) {
        throw new Error("Directorio de bloqueo inválido.");
    }

    fs.mkdirSync(directorio, {
        recursive: true,
        mode: 0o700
    });

    const rutaFlock = path.join(directorio, ".economia.flock");
    const rutaCoordinadorAntiguo = path.join(
        directorio,
        ".economia.coordinator.lock"
    );
    const rutaPrincipal = path.join(directorio, ".economia.lock");

    prepararArchivoFlock(rutaFlock);

    const guardian = await adquirirFlock(rutaFlock);
    const tokenPrincipal = crypto.randomUUID();

    const propietarioPrincipal = {
        pid: process.pid,
        inicio: leerInicioProceso(process.pid),
        hostname: os.hostname(),
        token: tokenPrincipal,
        creadoEn: Date.now()
    };

    let principalCreado = false;
    let liberado = false;

    try {
        guardian.comprobar();

        recuperarRutaAbandonada(
            rutaCoordinadorAntiguo,
            "el coordinador anterior"
        );

        recuperarRutaAbandonada(
            rutaPrincipal,
            "el bloqueo principal"
        );

        guardian.comprobar();

        fs.mkdirSync(rutaPrincipal, { mode: 0o700 });
        principalCreado = true;

        escribirPropietario(rutaPrincipal, propietarioPrincipal);

        guardian.comprobar();

    } catch (error) {
        if (principalCreado) {
            try {
                liberarDirectorioPropio(rutaPrincipal, tokenPrincipal);
            } catch (_) {}
        }

        try {
            await guardian.liberar();
        } catch (_) {}

        throw error;
    }

    return async function liberarBloqueo() {
        if (liberado) {
            throw new Error("El bloqueo ya fue liberado.");
        }

        let errorLiberacion = null;

        try {
            guardian.comprobar();
            liberarDirectorioPropio(rutaPrincipal, tokenPrincipal);
        } catch (error) {
            errorLiberacion = error;
        }

        try {
            await guardian.liberar();
            liberado = true;
        } catch (error) {
            if (!errorLiberacion) errorLiberacion = error;
        }

        if (errorLiberacion) throw errorLiberacion;
    };
}

module.exports = {
    adquirirBloqueo,
    inspeccionarBloqueo
};
