const crypto = require("crypto");
const { gestor: gestorCompartido } = require("./economiaCompartida");
const { resolverClaveUsuario: resolverClaveUsuarioReal } = require("./comunidad");
const { LIMITE_DIARIO, prepararLimite } = require("./limitesCasino");
const { seleccionarPremioReal, registrarPremio } = require("./premiosReales");

const COSTO_MINIMO = 50;

const SIMBOLOS = [
    "🍒", "🍋", "🍊", "🔔", "💎", "7️⃣"
];

function crearId(tipo, identidad, messageId) {
    if (
        typeof identidad !== "string" ||
        !identidad.trim() ||
        typeof messageId !== "string" ||
        !messageId.trim()
    ) {
        throw new Error("Identidad o ID de mensaje inválido.");
    }

    const hashIdentidad = crypto
        .createHash("sha256")
        .update(identidad.trim())
        .digest("hex")
        .slice(0, 40);

    const hashMensaje = crypto
        .createHash("sha256")
        .update(messageId.trim())
        .digest("hex")
        .slice(0, 40);

    return `${tipo}-${hashIdentidad}-${hashMensaje}`;
}

function obtenerUsuario(usuarios, clave) {
    return usuarios[clave] || {
        nombre: "",
        coins: 0,
        xp: 0,
        nivel: 1
    };
}

function validarSaldo(usuario) {
    const saldo = usuario.coins === undefined
        ? 0
        : Number(usuario.coins);

    if (!Number.isSafeInteger(saldo) || saldo < 0) {
        throw new Error("SALDO_INVALIDO");
    }

    return saldo;
}

function calcularPremioSlots(resultado, apuesta) {
    if (
        !Array.isArray(resultado) ||
        resultado.length !== 3 ||
        resultado.some(simbolo => !SIMBOLOS.includes(simbolo))
    ) {
        throw new Error("RESULTADO_SLOTS_INVALIDO");
    }

    const [a, b, c] = resultado;

    let multiplicador = 0;

    if (a === b && b === c) {
        if (a === "7️⃣") multiplicador = 10;
        else if (a === "💎") multiplicador = 8;
        else if (a === "🔔") multiplicador = 6;
        else multiplicador = 5;
    } else if (a === b || a === c || b === c) {
        multiplicador = 2;
    }

    const premio = apuesta * multiplicador;

    if (!Number.isSafeInteger(premio)) {
        throw new Error("PREMIO_FUERA_DE_RANGO");
    }

    return premio;
}

function crearServicioJuegos(dependencias = {}) {
    const gestor = dependencias.gestor || gestorCompartido;

    const resolverUsuario =
        dependencias.resolverClaveUsuario || resolverClaveUsuarioReal;

    if (!gestor || typeof gestor.ejecutar !== "function") {
        throw new Error("Gestor económico inválido.");
    }

    if (typeof resolverUsuario !== "function") {
        throw new Error("Resolvedor de usuarios inválido.");
    }

    async function jugarSlots(
        identidad,
        messageId,
        apuesta,
        resultado,
        ahora = Date.now(),
        aleatorioReal = Math.random(),
        aleatorioPremioReal = Math.random()
    ) {
        const id = crearId("slots", identidad, messageId);

        if (!Number.isSafeInteger(ahora) || ahora < 0) {
            throw new Error("FECHA_LIMITE_INVALIDA");
        }

        if (
            !Number.isSafeInteger(apuesta) ||
            apuesta < COSTO_MINIMO
        ) {
            throw new Error("APUESTA_INVALIDA");
        }

        const premio = calcularPremioSlots(resultado, apuesta);
        const premioSeleccionado = seleccionarPremioReal(
            "slots", aleatorioReal, aleatorioPremioReal
        );

        try {
            const transaccion = await gestor.ejecutar(id, leer => {
                const usuarios = leer("usuarios.json") || {};
                const limites = leer("limites.json") || {};
                const clave = resolverUsuario(identidad, usuarios);

                if (!clave) {
                    throw new Error("PERFIL_NO_RESUELTO");
                }

                const usuario = obtenerUsuario(usuarios, clave);
                const saldo = validarSaldo(usuario);

                if (saldo < apuesta) {
                    const error = new Error("SALDO_INSUFICIENTE");
                    error.saldo = saldo;
                    throw error;
                }

                const usos = prepararLimite(
                    limites,
                    clave,
                    identidad,
                    "slots",
                    ahora
                );

                const saldoFinal = saldo - apuesta + premio;

                if (!Number.isSafeInteger(saldoFinal)) {
                    throw new Error("SALDO_FUERA_DE_RANGO");
                }

                usuario.coins = saldoFinal;
                usuarios[clave] = usuario;

                const cambios = {
                    "usuarios.json": usuarios,
                    "limites.json": limites
                };
                let registroPremioReal = null;

                if (premioSeleccionado) {
                    const ledger = leer("premiosReales.json") || {
                        version: 1,
                        registros: {}
                    };
                    const registro = registrarPremio(ledger, {
                        fuente: "slots",
                        ganadorId: identidad,
                        ganadorNombre: usuario.nombre || "Titán",
                        premio: premioSeleccionado,
                        operacionId: id
                    });
                    cambios["premiosReales.json"] = registro.ledger;
                    registroPremioReal = registro.registro;
                }

                return {
                    cambios,
                    resultado: {
                        nombre: usuario.nombre || "Titán",
                        apuesta,
                        premio,
                        usos,
                        cambio: premio - apuesta,
                        coins: saldoFinal,
                        simbolos: resultado,
                        premioReal: registroPremioReal
                    }
                };
            });

            return {
                ok: true,
                duplicada: transaccion.duplicada,
                resultado: transaccion.resultado
            };
        } catch (error) {
            if (error.message === "LIMITE_DIARIO") {
                return {
                    ok: false,
                    motivo: "limite",
                    usados: error.usados,
                    limite: LIMITE_DIARIO
                };
            }

            if (error.message === "SALDO_INSUFICIENTE") {
                return {
                    ok: false,
                    motivo: "saldo_insuficiente",
                    saldo: error.saldo
                };
            }

            throw error;
        }
    }

    async function jugarDados(
        identidad,
        messageId,
        apuesta,
        dadoJugador,
        dadoTitans,
        ahora = Date.now()
    ) {
        const id = crearId("dados", identidad, messageId);

        if (!Number.isSafeInteger(ahora) || ahora < 0) {
            throw new Error("FECHA_LIMITE_INVALIDA");
        }

        if (
            !Number.isSafeInteger(apuesta) ||
            apuesta < COSTO_MINIMO ||
            !Number.isInteger(dadoJugador) ||
            dadoJugador < 1 ||
            dadoJugador > 6 ||
            !Number.isInteger(dadoTitans) ||
            dadoTitans < 1 ||
            dadoTitans > 6
        ) {
            throw new Error("DATOS_DADOS_INVALIDOS");
        }

        try {
            const transaccion = await gestor.ejecutar(id, leer => {
                const usuarios = leer("usuarios.json") || {};
                const limites = leer("limites.json") || {};
                const clave = resolverUsuario(identidad, usuarios);

                if (!clave) {
                    throw new Error("PERFIL_NO_RESUELTO");
                }

                const usuario = obtenerUsuario(usuarios, clave);
                const saldo = validarSaldo(usuario);

                if (saldo < apuesta) {
                    const error = new Error("SALDO_INSUFICIENTE");
                    error.saldo = saldo;
                    throw error;
                }

                const usos = prepararLimite(
                    limites,
                    clave,
                    identidad,
                    "dados",
                    ahora
                );

                let premio = 0;

                if (dadoJugador > dadoTitans) {
                    premio = apuesta * 2;
                } else if (dadoJugador === dadoTitans) {
                    premio = apuesta;
                }

                if (!Number.isSafeInteger(premio)) {
                    throw new Error("PREMIO_FUERA_DE_RANGO");
                }

                const saldoFinal = saldo - apuesta + premio;

                if (!Number.isSafeInteger(saldoFinal)) {
                    throw new Error("SALDO_FUERA_DE_RANGO");
                }

                usuario.coins = saldoFinal;
                usuarios[clave] = usuario;

                return {
                    cambios: {
                        "usuarios.json": usuarios,
                        "limites.json": limites
                    },
                    resultado: {
                        nombre: usuario.nombre || "Titán",
                        apuesta,
                        premio,
                        usos,
                        cambio: premio - apuesta,
                        coins: saldoFinal,
                        dadoJugador,
                        dadoTitans,
                        gano: dadoJugador > dadoTitans,
                        perdio: dadoJugador < dadoTitans,
                        empate: dadoJugador === dadoTitans
                    }
                };
            });

            return {
                ok: true,
                duplicada: transaccion.duplicada,
                resultado: transaccion.resultado
            };
        } catch (error) {
            if (error.message === "LIMITE_DIARIO") {
                return {
                    ok: false,
                    motivo: "limite",
                    usados: error.usados,
                    limite: LIMITE_DIARIO
                };
            }

            if (error.message === "SALDO_INSUFICIENTE") {
                return {
                    ok: false,
                    motivo: "saldo_insuficiente",
                    saldo: error.saldo
                };
            }

            throw error;
        }
    }

    return {
        jugarSlots,
        jugarDados
    };
}

const servicio = crearServicioJuegos();

module.exports = {
    crearServicioJuegos,
    jugarSlots: servicio.jugarSlots,
    jugarDados: servicio.jugarDados
};
