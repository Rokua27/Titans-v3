"use strict";

function crearGestorRecompensasRaid(dependencias) {
    const {
        gestor,
        resolverClaveUsuario,
        normalizarIdentidad,
        aplicarXPRecompensa,
        resolverInventario
    } = dependencias || {};

    if (
        !gestor ||
        typeof gestor.ejecutar !== "function" ||
        typeof resolverClaveUsuario !== "function" ||
        typeof normalizarIdentidad !== "function" ||
        typeof aplicarXPRecompensa !== "function" ||
        typeof resolverInventario !== "function"
    ) {
        throw new Error("Dependencias del gestor de recompensas Raid inválidas.");
    }

    async function entregar(raid) {
        const fechaInicio = Number(raid?.fechaInicio);

        if (!Number.isSafeInteger(fechaInicio) || fechaInicio <= 0) {
            throw new Error("El Raid no tiene un identificador válido.");
        }

        if (
            !raid.participantes ||
            typeof raid.participantes !== "object" ||
            Array.isArray(raid.participantes)
        ) {
            throw new Error("El Raid no tiene participantes válidos.");
        }

        const participantes = Object.keys(raid.participantes);

        if (!participantes.length) {
            throw new Error("El Raid no tiene participantes para recompensar.");
        }

        const raidId = String(fechaInicio);
        const operacion = "raid-" + raidId;

        const transaccion = await gestor.ejecutar(
            operacion,
            leer => {
                const usuarios = leer("usuarios.json") || {};
                const inventarios = leer("inventarios.json") || {};

                if (
                    !usuarios ||
                    typeof usuarios !== "object" ||
                    Array.isArray(usuarios)
                ) {
                    throw new Error("Archivo de usuarios inválido.");
                }

                if (
                    !inventarios ||
                    typeof inventarios !== "object" ||
                    Array.isArray(inventarios)
                ) {
                    throw new Error("Archivo de inventarios inválido.");
                }

                let perfilesEntregados = 0;
                let inventariosEntregados = 0;
                let perfilesYaEntregados = 0;
                let inventariosYaEntregados = 0;
                let cambiosUsuarios = false;
                let cambiosInventarios = false;

                for (const id of participantes) {
                    if (typeof id !== "string" || !id.trim()) {
                        throw new Error("Identidad inválida en participantes.");
                    }

                    const claveUsuario = resolverClaveUsuario(id, usuarios);

                    if (
                        typeof claveUsuario !== "string" ||
                        !claveUsuario.trim()
                    ) {
                        throw new Error("No se pudo resolver el perfil: " + id);
                    }

                    const jugador = usuarios[claveUsuario] || {
                        xp: 0,
                        nivel: 1,
                        coins: 0,
                        mensajes: 0,
                        daily: 0,
                        racha: 0,
                        nombre: ""
                    };

                    if (
                        !jugador ||
                        typeof jugador !== "object" ||
                        Array.isArray(jugador)
                    ) {
                        throw new Error("Perfil inválido: " + claveUsuario);
                    }

                    if (
                        !jugador.raidRecompensas ||
                        typeof jugador.raidRecompensas !== "object" ||
                        Array.isArray(jugador.raidRecompensas)
                    ) {
                        jugador.raidRecompensas = {};
                    }

                    const perfilMarcado = Boolean(
                        jugador.raidRecompensas[raidId]
                    );

                    if (!perfilMarcado) {
                        const resultadoXP = aplicarXPRecompensa(jugador, 300);

                        if (!resultadoXP || resultadoXP.motivo !== "otorgada") {
                            throw new Error(
                                "No se pudo aplicar la XP del Raid a " + id
                            );
                        }

                        const saldo = Number(jugador.coins);

                        if (
                            !Number.isSafeInteger(saldo) ||
                            saldo < 0 ||
                            saldo > Number.MAX_SAFE_INTEGER - 500
                        ) {
                            throw new Error(
                                "Saldo inválido para recompensa Raid: " + id
                            );
                        }

                        jugador.coins = saldo + 500;
                        jugador.raidRecompensas[raidId] = true;
                        usuarios[claveUsuario] = jugador;

                        perfilesEntregados++;
                        cambiosUsuarios = true;
                    } else {
                        perfilesYaEntregados++;
                    }

                    const resuelto = resolverInventario(id, inventarios);

                    if (!resuelto || resuelto.ok !== true) {
                        const motivo = resuelto?.motivo || "inventario_invalido";
                        throw new Error(
                            "No se pudo resolver el inventario de " +
                            id + ": " + motivo
                        );
                    }

                    const claveInventario = resuelto.clave;

                    if (
                        typeof claveInventario !== "string" ||
                        !claveInventario.trim()
                    ) {
                        throw new Error("Clave de inventario inválida: " + id);
                    }

                    const inventario = {
                        ...resuelto.inventario
                    };

                    if (
                        !Number.isSafeInteger(Number(inventario.cajas)) ||
                        Number(inventario.cajas) < 0
                    ) {
                        throw new Error("Cantidad de cajas inválida: " + id);
                    }

                    if (!Array.isArray(inventario.objetos)) {
                        throw new Error("Lista de objetos inválida: " + id);
                    }

                    if (
                        !inventario.raidRecompensas ||
                        typeof inventario.raidRecompensas !== "object" ||
                        Array.isArray(inventario.raidRecompensas)
                    ) {
                        inventario.raidRecompensas = {};
                    }

                    if (!inventario.raidRecompensas[raidId]) {
                        const cajas = Number(inventario.cajas);

                        if (cajas >= Number.MAX_SAFE_INTEGER) {
                            throw new Error("Límite de cajas alcanzado: " + id);
                        }

                        inventario.cajas = cajas + 1;
                        inventario.raidRecompensas[raidId] = true;
                        inventarios[claveInventario] = inventario;

                        inventariosEntregados++;
                        cambiosInventarios = true;
                    } else {
                        inventariosYaEntregados++;
                    }
                }

                const cambios = {};

                if (cambiosUsuarios) {
                    cambios["usuarios.json"] = usuarios;
                }

                if (cambiosInventarios) {
                    cambios["inventarios.json"] = inventarios;
                }

                return {
                    cambios,
                    resultado: {
                        raidId,
                        participantes: participantes.length,
                        perfilesEntregados,
                        inventariosEntregados,
                        perfilesYaEntregados,
                        inventariosYaEntregados,
                        completo: true
                    }
                };
            }
        );

        return {
            ok: true,
            duplicada: transaccion.duplicada,
            ...transaccion.resultado,
            completo: true
        };
    }

    return { entregar };
}

function raidDerrotado(raid) {
    return Boolean(
        raid &&
        (
            raid.estadoRecompensas === "pendiente" ||
            (
                raid.activo === true &&
                Number(raid.vidaActual) <= 0
            )
        )
    );
}

function marcarRaidPendiente(raid) {
    if (!raid || Number(raid.vidaActual) > 0) {
        throw new Error("No se puede marcar pendiente un Raid no derrotado.");
    }

    raid.estadoRecompensas = "pendiente";
    return raid;
}

function cerrarRaid(raid) {
    if (!raid || raid.estadoRecompensas !== "pendiente") {
        throw new Error(
            "No se puede cerrar un Raid sin entrega pendiente confirmada."
        );
    }

    raid.activo = false;
    raid.vidaActual = raid.vidaMax;
    raid.participantes = {};
    raid.iniciadoPor = null;
    raid.fechaInicio = 0;
    raid.estadoRecompensas = null;

    return raid;
}

module.exports = {
    crearGestorRecompensasRaid,
    raidDerrotado,
    marcarRaidPendiente,
    cerrarRaid
};
