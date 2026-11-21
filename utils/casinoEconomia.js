const crypto = require("crypto");
const { gestor: gestorCompartido } = require("./economiaCompartida");
const { resolverClaveUsuario: resolverClaveUsuarioReal } = require("./comunidad");
const { LIMITE_DIARIO, prepararLimite } = require("./limitesCasino");
const { seleccionarPremioReal, registrarPremio } = require("./premiosReales");

const COSTO_RULETA = 100;
const COOLDOWN_RULETA = 30000;
const JACKPOT_INICIAL = 5000;

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
        xp: 0,
        nivel: 1,
        coins: 0,
        mensajes: 0,
        daily: 0,
        racha: 0,
        nombre: ""
    };
}

function aplicarXP(usuario, cantidad) {
    usuario.xp = Math.max(0, Number(usuario.xp) || 0);
    usuario.nivel = Math.max(1, Math.floor(Number(usuario.nivel) || 1));
    usuario.coins = Math.max(0, Number(usuario.coins) || 0);

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

function crearServicioCasino(dependencias = {}) {
    const gestorCasino = dependencias.gestor || gestorCompartido;
    const resolverUsuario =
        dependencias.resolverClaveUsuario || resolverClaveUsuarioReal;

    if (!gestorCasino || typeof gestorCasino.ejecutar !== "function") {
        throw new Error("Gestor económico inválido.");
    }

    if (typeof resolverUsuario !== "function") {
        throw new Error("Resolvedor de usuarios inválido.");
    }

    async function jugarRuleta(
        identidad, messageId, aleatorio, ahora = Date.now(),
        aleatorioReal = Math.random(), aleatorioPremioReal = Math.random()
    ) {
    const id = crearId("ruleta", identidad, messageId);

    if (
        !Number.isSafeInteger(ahora) ||
        ahora < 0 ||
        !Number.isFinite(aleatorio) ||
        aleatorio < 0 ||
        aleatorio >= 1
    ) {
        throw new Error("Fecha o resultado aleatorio inválido.");
    }

    try {
        const transaccion = await gestorCasino.ejecutar(id, leer => {
            const usuarios = leer("usuarios.json") || {};
            const limites = leer("limites.json") || {};
            const dataRuleta = leer("ruleta.json") || {
                jackpot: JACKPOT_INICIAL
            };

            const clave = resolverUsuario(identidad, usuarios);

            if (!clave) {
                throw new Error("No se pudo resolver el perfil.");
            }

            const usuario = obtenerUsuario(usuarios, clave);
            const saldo = Number(usuario.coins) || 0;

            if (!Number.isSafeInteger(saldo) || saldo < 0) {
                throw new Error("Saldo del jugador inválido.");
            }

            const premioSeleccionado = seleccionarPremioReal(
                "ruleta", aleatorioReal, aleatorioPremioReal
            );

            const jackpot = Number(dataRuleta.jackpot);

            if (!Number.isSafeInteger(jackpot) || jackpot < 0) {
                throw new Error("Jackpot inválido; se rechazó la jugada.");
            }

            const ultimoUso = Number(usuario.ruletaUltimoUsoAt) || 0;
            const restante = COOLDOWN_RULETA - (ahora - ultimoUso);

            if (ultimoUso && restante > 0) {
                const error = new Error("COOLDOWN_RULETA");
                error.restante = restante;
                throw error;
            }

            if (saldo < COSTO_RULETA) {
                const error = new Error("SALDO_INSUFICIENTE");
                error.saldo = saldo;
                throw error;
            }

            const usos = prepararLimite(
                limites,
                clave,
                identidad,
                "ruleta",
                ahora
            );

            let premioCoins = 0;
            let premioXP = 0;
            let titulo = "";
            let descripcion = "";
            let jackpotFinal = jackpot + 20;

            if (aleatorio < 0.01) {
                premioCoins = jackpotFinal;
                jackpotFinal = JACKPOT_INICIAL;
                titulo = "🏆 JACKPOT LEGENDARIO";
                descripcion = `💰 Has ganado el JACKPOT de *${premioCoins} monedas*.`;
            } else if (aleatorio < 0.10) {
                premioCoins = 1000;
                titulo = "💎 GRAN PREMIO";
                descripcion = "💰 Has obtenido *1000 monedas*.";
            } else if (aleatorio < 0.30) {
                premioCoins = 400;
                titulo = "🎁 PREMIO ÉPICO";
                descripcion = "💰 Has ganado *400 monedas*.";
            } else if (aleatorio < 0.55) {
                premioCoins = 200;
                titulo = "💰 PREMIO";
                descripcion = "💰 Has ganado *200 monedas*.";
            } else if (aleatorio < 0.75) {
                premioXP = 100;
                titulo = "⭐ XP DOBLE";
                descripcion = "⭐ Has obtenido *100 XP*.";
            } else if (aleatorio < 0.90) {
                premioCoins = -50;
                titulo = "☠️ MALA SUERTE";
                descripcion = "💸 La ruleta te quitó *50 monedas adicionales*.";
            } else {
                titulo = "😶 CASILLA VACÍA";
                descripcion = "🎡 Esta vez no obtuviste ninguna recompensa.";
            }

            let resultadoXP = {
                nivelesGanados: 0,
                monedasNivel: 0
            };

            if (premioXP > 0) {
                resultadoXP = aplicarXP(usuario, premioXP);
            }

            usuario.coins = Math.max(
                0,
                saldo - COSTO_RULETA + premioCoins + resultadoXP.monedasNivel
            );

            usuario.ruletaUltimoUsoAt = ahora;
            dataRuleta.jackpot = jackpotFinal;
            usuarios[clave] = usuario;

            const cambios = {
                "usuarios.json": usuarios,
                "limites.json": limites,
                "ruleta.json": dataRuleta
            };

            let registroPremioReal = null;

            if (premioSeleccionado) {
                const ledger = leer("premiosReales.json") || {
                    version: 1,
                    registros: {}
                };
                const registro = registrarPremio(ledger, {
                    fuente: "ruleta",
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
                    coins: usuario.coins,
                    xp: usuario.xp,
                    premioCoins,
                    premioXP,
                    titulo,
                    descripcion,
                    jackpot: jackpotFinal,
                    jackpotGanado: aleatorio < 0.01,
                    nivelesGanados: resultadoXP.nivelesGanados,
                    monedasNivel: resultadoXP.monedasNivel,
                    usos,
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

        if (error.message === "COOLDOWN_RULETA") {
            return {
                ok: false,
                motivo: "cooldown",
                restante: error.restante
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

async function jugarCoinflip(
    identidad,
    messageId,
    apuesta,
    eleccion,
    resultado,
    ahora = Date.now()
) {
    const id = crearId("coinflip", identidad, messageId);

    if (
        !Number.isSafeInteger(ahora) ||
        ahora < 0 ||
        !Number.isSafeInteger(apuesta) ||
        apuesta < 50 ||
        !["cara", "cruz"].includes(eleccion) ||
        !["cara", "cruz"].includes(resultado)
    ) {
        throw new Error("Datos de CoinFlip inválidos.");
    }

    try {
        const transaccion = await gestorCasino.ejecutar(id, leer => {
            const usuarios = leer("usuarios.json") || {};
            const limites = leer("limites.json") || {};

            const clave = resolverUsuario(identidad, usuarios);

            if (!clave) {
                throw new Error("No se pudo resolver el perfil.");
            }

            const usuario = obtenerUsuario(usuarios, clave);
            const saldo = Number(usuario.coins) || 0;

            if (!Number.isSafeInteger(saldo) || saldo < 0) {
                throw new Error("Saldo del jugador inválido.");
            }

            if (apuesta > saldo) {
                const error = new Error("SALDO_INSUFICIENTE");
                error.saldo = saldo;
                throw error;
            }

            const usos = prepararLimite(
                limites,
                clave,
                identidad,
                "coinflip",
                ahora
            );

            const gano = eleccion === resultado;
            const cambio = gano ? apuesta : -apuesta;

            usuario.coins = saldo + cambio;
            usuarios[clave] = usuario;

            return {
                cambios: {
                    "usuarios.json": usuarios,
                    "limites.json": limites
                },
                resultado: {
                    nombre: usuario.nombre || "Titán",
                    eleccion,
                    resultado,
                    gano,
                    cambio,
                    coins: usuario.coins,
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
        jugarRuleta,
        jugarCoinflip
    };
}

const servicioCasino = crearServicioCasino();

module.exports = {
    crearServicioCasino,
    jugarRuleta: servicioCasino.jugarRuleta,
    jugarCoinflip: servicioCasino.jugarCoinflip
};
