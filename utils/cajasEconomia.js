"use strict";

const crypto = require("crypto");
const { gestor: gestorCompartido } = require("./economiaCompartida");
const { resolverClaveUsuario: resolverClaveUsuarioReal } = require("./comunidad");
const { prepararLimite, LIMITE_DIARIO } = require("./limitesCasino");
const { resolverInventario, RAREZAS_CAJAS } = require("./inventarioTitansB");
const { seleccionarPremioReal, registrarPremio } = require("./premiosReales");

const ZONA_HORARIA = "America/Bogota";
const LIMITE_ALMACENAMIENTO = 10;

const PRECIOS_CAJAS = Object.freeze({
    comun: 1500,
    rara: 3500,
    epica: 7500,
    legendaria: 15000,
    especial: 30000
});

const FUENTES_CAJAS = Object.freeze({
    comun: "caja_comun",
    rara: "caja_rara",
    epica: "caja_epica",
    legendaria: "caja_legendaria",
    especial: "caja_especial"
});

function crearId(tipo, identidad, messageId) {
    if (
        typeof identidad !== "string" ||
        !identidad.trim() ||
        typeof messageId !== "string" ||
        !messageId.trim()
    ) {
        throw new Error("Identidad o ID de mensaje inválido.");
    }

    const hashIdentidad = crypto.createHash("sha256")
        .update(identidad.trim()).digest("hex").slice(0, 40);

    const hashMensaje = crypto.createHash("sha256")
        .update(messageId.trim()).digest("hex").slice(0, 40);

    return `${tipo}-${hashIdentidad}-${hashMensaje}`;
}

function validarFecha(ahora) {
    if (!Number.isSafeInteger(ahora) || ahora < 0) {
        throw new Error("FECHA_CAJA_INVALIDA");
    }
}

function obtenerUsuario(usuarios, clave) {
    return usuarios[clave] || {
        nombre: "",
        xp: 0,
        nivel: 1,
        coins: 0,
        mensajes: 0,
        daily: 0,
        racha: 0
    };
}

function validarSaldo(usuario) {
    const saldo = usuario.coins === undefined ? 0 : Number(usuario.coins);

    if (!Number.isSafeInteger(saldo) || saldo < 0) {
        throw new Error("SALDO_INVALIDO");
    }

    return saldo;
}

function aplicarXP(usuario, cantidad) {
    usuario.xp = Math.max(0, Number(usuario.xp) || 0);
    usuario.nivel = Math.max(1, Math.floor(Number(usuario.nivel) || 1));

    usuario.xp += cantidad;

    let nivelesGanados = 0;

    while (usuario.xp >= usuario.nivel * 100) {
        usuario.xp -= usuario.nivel * 100;
        usuario.nivel++;
        usuario.coins += 50;
        nivelesGanados++;
    }

    return {
        nivelesGanados,
        monedasNivel: nivelesGanados * 50
    };
}

function obtenerPremio(aleatorio) {
    if (
        typeof aleatorio !== "number" ||
        !Number.isFinite(aleatorio) ||
        aleatorio < 0 ||
        aleatorio >= 1
    ) {
        throw new Error("ALEATORIO_INTERNO_INVALIDO");
    }

    if (aleatorio < 0.02) {
        return {
            rareza: "🟡 MÍTICA",
            xp: 500,
            coins: 0,
            objeto: "Reliquia Mítica",
            mitica: true
        };
    }

    if (aleatorio < 0.10) {
        return {
            rareza: "🟣 LEGENDARIA",
            xp: 0,
            coins: 600,
            objeto: "Corona Legendaria",
            mitica: false
        };
    }

    if (aleatorio < 0.25) {
        return {
            rareza: "🔵 ÉPICA",
            xp: 0,
            coins: 250,
            objeto: "Emblema Épico",
            mitica: false
        };
    }

    if (aleatorio < 0.55) {
        return {
            rareza: "🟢 RARA",
            xp: 150,
            coins: 0,
            objeto: "Boost de XP",
            mitica: false
        };
    }

    return {
        rareza: "⚪ COMÚN",
        xp: 50,
        coins: 0,
        objeto: "Fragmento de XP",
        mitica: false
    };
}

function crearServicioCajas(dependencias = {}) {
    const gestor = dependencias.gestor || gestorCompartido;
    const resolverUsuario =
        dependencias.resolverClaveUsuario || resolverClaveUsuarioReal;

    if (!gestor || typeof gestor.ejecutar !== "function") {
        throw new Error("Gestor económico inválido.");
    }

    if (typeof resolverUsuario !== "function") {
        throw new Error("Resolvedor de usuarios inválido.");
    }

    async function comprarCaja(identidad, messageId, rareza, ahora = Date.now()) {
        // Compatibilidad temporal con llamadas antiguas:
        // comprarCaja(identidad, messageId, ahora) compra una común.
        if (typeof rareza === "number") {
            ahora = rareza;
            rareza = "comun";
        }

        if (rareza === undefined || rareza === null || rareza === "") {
            rareza = "comun";
        }

        if (!Object.prototype.hasOwnProperty.call(PRECIOS_CAJAS, rareza)) {
            return {
                ok: false,
                motivo: "rareza_invalida",
                rarezas: [...RAREZAS_CAJAS]
            };
        }

        validarFecha(ahora);

        const operacion = crearId("caja", identidad, messageId);
        const costo = PRECIOS_CAJAS[rareza];

        try {
            const transaccion = await gestor.ejecutar(operacion, leer => {
                const usuarios = leer("usuarios.json") || {};
                const inventarios = leer("inventarios.json") || {};
                const limites = leer("limites.json") || {};

                const clave = resolverUsuario(identidad, usuarios);

                if (!clave) {
                    throw new Error("PERFIL_NO_RESUELTO");
                }

                const usuario = obtenerUsuario(usuarios, clave);
                const saldo = validarSaldo(usuario);

                const resuelto = resolverInventario(identidad, inventarios);

                if (!resuelto.ok) {
                    throw new Error("INVENTARIO_INVALIDO");
                }

                const inventario = {
                    ...resuelto.inventario,
                    cajasPorRareza: { ...resuelto.inventario.cajasPorRareza },
                    objetos: [...resuelto.inventario.objetos]
                };

                const actuales = inventario.cajasPorRareza[rareza];

                if (actuales >= LIMITE_ALMACENAMIENTO) {
                    const error = new Error("ALMACENAMIENTO_LLENO");
                    error.rareza = rareza;
                    error.limite = LIMITE_ALMACENAMIENTO;
                    throw error;
                }

                if (saldo < costo) {
                    const error = new Error("SALDO_INSUFICIENTE");
                    error.saldo = saldo;
                    error.costo = costo;
                    throw error;
                }

                // Un único contador compartido para todas las rarezas.
                const usos = prepararLimite(
                    limites,
                    clave,
                    identidad,
                    "caja",
                    ahora
                );

                usuario.coins = saldo - costo;
                inventario.cajasPorRareza[rareza] = actuales + 1;

                usuarios[clave] = usuario;
                inventarios[resuelto.clave] = inventario;

                return {
                    cambios: {
                        "usuarios.json": usuarios,
                        "inventarios.json": inventarios,
                        "limites.json": limites
                    },
                    resultado: {
                        nombre: usuario.nombre || "Titán",
                        rareza,
                        costo,
                        saldoFinal: usuario.coins,
                        cajas: inventario.cajasPorRareza[rareza],
                        cajasPorRareza: { ...inventario.cajasPorRareza },
                        usos
                    }
                };
            });

            return {
                ok: true,
                duplicada: transaccion.duplicada,
                resultado: transaccion.resultado
            };
        } catch (error) {
            if (error.message === "SALDO_INSUFICIENTE") {
                return {
                    ok: false,
                    motivo: "saldo_insuficiente",
                    saldo: error.saldo,
                    costo
                };
            }

            if (error.message === "LIMITE_DIARIO") {
                return {
                    ok: false,
                    motivo: "limite",
                    usados: error.usados,
                    limite: LIMITE_DIARIO
                };
            }

            if (error.message === "ALMACENAMIENTO_LLENO") {
                return {
                    ok: false,
                    motivo: "almacenamiento_lleno",
                    rareza: error.rareza,
                    limite: error.limite
                };
            }

            if (error.message === "INVENTARIO_INVALIDO") {
                return { ok: false, motivo: "inventario_invalido" };
            }

            throw error;
        }
    }

    async function abrirCaja(
        identidad,
        messageId,
        rarezaOpcion,
        aleatorioInterno,
        ahora = Date.now(),
        aleatorioReal,
        aleatorioPremioReal
    ) {
        let rareza = rarezaOpcion;
        let esGenerica = false;

        // Compatibilidad con la firma anterior:
        // abrirCaja(identidad, messageId, aleatorioInterno, ahora)
        if (typeof rarezaOpcion === "number") {
            esGenerica = true;
            rareza = null;
            ahora = Number.isSafeInteger(aleatorioInterno)
                ? aleatorioInterno
                : Date.now();
            aleatorioInterno = rarezaOpcion;
        }

        if (
            !esGenerica &&
            !Object.prototype.hasOwnProperty.call(PRECIOS_CAJAS, rareza)
        ) {
            return {
                ok: false,
                motivo: "rareza_invalida",
                rarezas: [...RAREZAS_CAJAS]
            };
        }

        validarFecha(ahora);

        const operacion = crearId("abrir", identidad, messageId);

        try {
            const transaccion = await gestor.ejecutar(operacion, leer => {
                const usuarios = leer("usuarios.json") || {};
                const inventarios = leer("inventarios.json") || {};
                const limites = leer("limites.json") || {};

                const clave = resolverUsuario(identidad, usuarios);

                if (!clave) {
                    throw new Error("PERFIL_NO_RESUELTO");
                }

                const usuario = obtenerUsuario(usuarios, clave);
                validarSaldo(usuario);

                const resuelto = resolverInventario(identidad, inventarios);

                if (!resuelto.ok) {
                    throw new Error("INVENTARIO_INVALIDO");
                }

                const inventario = {
                    ...resuelto.inventario,
                    cajasPorRareza: { ...resuelto.inventario.cajasPorRareza },
                    objetos: [...resuelto.inventario.objetos]
                };

                if (esGenerica) {
                    if (inventario.cajas <= 0) {
                        throw new Error("SIN_CAJAS");
                    }
                } else if (inventario.cajasPorRareza[rareza] <= 0) {
                    const error = new Error("SIN_CAJAS_RAREZA");
                    error.rareza = rareza;
                    throw error;
                }

                // Selección realizada dentro de la preparación transaccional.
                const numeroInterno = aleatorioInterno === undefined
                    ? Math.random()
                    : aleatorioInterno;

                const premio = obtenerPremio(numeroInterno);

                let premioReal = null;
                let cambiosPremios = null;

                if (!esGenerica) {
                    const numeroReal = aleatorioReal === undefined
                        ? Math.random()
                        : aleatorioReal;

                    const numeroCatalogo = aleatorioPremioReal === undefined
                        ? Math.random()
                        : aleatorioPremioReal;

                    const seleccionado = seleccionarPremioReal(
                        FUENTES_CAJAS[rareza],
                        numeroReal,
                        numeroCatalogo
                    );

                    if (seleccionado) {
                        const ledger = leer("premiosReales.json") || {
                            version: 1,
                            registros: {}
                        };

                        const registro = registrarPremio(ledger, {
                            fuente: FUENTES_CAJAS[rareza],
                            ganadorId: identidad,
                            ganadorNombre: usuario.nombre || "Titán",
                            premio: seleccionado,
                            operacionId: operacion
                        });

                        premioReal = registro.registro;
                        cambiosPremios = registro.ledger;
                    }
                }

                const usos = prepararLimite(
                    limites,
                    clave,
                    identidad,
                    "abrir",
                    ahora
                );

                const resultadoXP = aplicarXP(usuario, premio.xp);
                usuario.coins += premio.coins;

                if (esGenerica) {
                    inventario.cajas--;
                } else {
                    inventario.cajasPorRareza[rareza]--;
                }

                inventario.objetos.push({
                    nombre: premio.objeto,
                    rareza: premio.rareza,
                    fecha: ahora
                });

                usuarios[clave] = usuario;
                inventarios[resuelto.clave] = inventario;

                const cambios = {
                    "usuarios.json": usuarios,
                    "inventarios.json": inventarios,
                    "limites.json": limites
                };

                if (premioReal) {
                    cambios["premiosReales.json"] = cambiosPremios;
                }

                return {
                    cambios,
                    resultado: {
                        nombre: usuario.nombre || "Titán",
                        cajaRareza: esGenerica ? "generica" : rareza,
                        rareza: premio.rareza,
                        objeto: premio.objeto,
                        xp: premio.xp,
                        coins: premio.coins,
                        mitica: premio.mitica,
                        nivelesGanados: resultadoXP.nivelesGanados,
                        monedasNivel: resultadoXP.monedasNivel,
                        nivel: usuario.nivel,
                        cajas: inventario.cajas,
                        cajasPorRareza: { ...inventario.cajasPorRareza },
                        objetos: inventario.objetos.length,
                        usos,
                        premioReal
                    }
                };
            });

            return {
                ok: true,
                duplicada: transaccion.duplicada,
                resultado: transaccion.resultado
            };
        } catch (error) {
            if (
                error.message === "SIN_CAJAS" ||
                error.message === "SIN_CAJAS_RAREZA"
            ) {
                return {
                    ok: false,
                    motivo: "sin_cajas",
                    rareza: error.rareza || "generica"
                };
            }

            if (error.message === "LIMITE_DIARIO") {
                return {
                    ok: false,
                    motivo: "limite",
                    usados: error.usados,
                    limite: LIMITE_DIARIO
                };
            }

            if (error.message === "INVENTARIO_INVALIDO") {
                return { ok: false, motivo: "inventario_invalido" };
            }

            throw error;
        }
    }

    return {
        comprarCaja,
        abrirCaja
    };
}

const servicio = crearServicioCajas();

module.exports = {
    PRECIOS_CAJAS,
    LIMITE_ALMACENAMIENTO,
    obtenerPremio,
    crearServicioCajas,
    comprarCaja: servicio.comprarCaja,
    abrirCaja: servicio.abrirCaja
};
