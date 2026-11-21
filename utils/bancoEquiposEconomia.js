const crypto = require("crypto");

const { gestor } = require("./economiaCompartida");
const { resolverClaveUsuario } = require("./comunidad");
const {
    esMiembro,
    tienePermisoEquipo
} = require("./permisos");

function crearIdOperacion(tipo, identidad, messageId) {
    if (
        typeof identidad !== "string" ||
        !identidad.trim() ||
        typeof messageId !== "string" ||
        !messageId.trim()
    ) {
        throw new Error("Falta la identidad o el ID único del mensaje.");
    }

    const identidadHash = crypto
        .createHash("sha256")
        .update(identidad.trim())
        .digest("hex")
        .slice(0, 40);

    const mensajeHash = crypto
        .createHash("sha256")
        .update(messageId.trim())
        .digest("hex")
        .slice(0, 40);

    return `banco-${tipo}-${identidadHash}-${mensajeHash}`;
}

function validarCantidad(cantidad) {
    return Number.isSafeInteger(cantidad) && cantidad > 0;
}

function validarSaldo(valor, nombre) {
    const saldo = valor === undefined || valor === null
        ? 0
        : valor;

    if (!Number.isSafeInteger(saldo) || saldo < 0) {
        throw new Error(`SALDO_INVALIDO:${nombre}`);
    }

    return saldo;
}

function buscarEquipo(equipos, identidad) {
    for (const [nombre, equipo] of Object.entries(equipos)) {
        if (
            equipo &&
            typeof equipo === "object" &&
            esMiembro(equipo, identidad)
        ) {
            return { nombre, equipo };
        }
    }

    return null;
}

function crearServicioBancoEquipos({
    gestor: gestorInyectado,
    resolverClaveUsuario: resolverInyectado = resolverClaveUsuario
}) {
    if (!gestorInyectado || typeof gestorInyectado.ejecutar !== "function") {
        throw new Error("Gestor económico inválido.");
    }

    async function transferir(tipo, identidad, messageId, cantidad, ahora = Date.now()) {
        if (tipo !== "DEPOSITO" && tipo !== "RETIRO") {
            throw new Error("Tipo de movimiento inválido.");
        }

        if (!validarCantidad(cantidad)) {
            return {
                ok: false,
                motivo: "cantidad_invalida"
            };
        }

        if (!Number.isSafeInteger(ahora) || ahora < 0) {
            return {
                ok: false,
                motivo: "fecha_invalida"
            };
        }

        let operacion;

        try {
            operacion = crearIdOperacion(
                tipo.toLowerCase(),
                identidad,
                messageId
            );
        } catch (error) {
            return {
                ok: false,
                motivo: "identidad_invalida"
            };
        }

        try {
            const transaccion = await gestorInyectado.ejecutar(
                operacion,
                leer => {
                    const usuarios = leer("usuarios.json") || {};
                    const equipos = leer("equipos.json") || {};

                    if (
                        !usuarios ||
                        typeof usuarios !== "object" ||
                        Array.isArray(usuarios) ||
                        !equipos ||
                        typeof equipos !== "object" ||
                        Array.isArray(equipos)
                    ) {
                        throw new Error("DATOS_INVALIDOS");
                    }

                    const claveUsuario = resolverInyectado(
                        identidad,
                        usuarios
                    );

                    if (
                        !claveUsuario ||
                        !Object.prototype.hasOwnProperty.call(
                            usuarios,
                            claveUsuario
                        )
                    ) {
                        throw new Error("PERFIL_NO_ENCONTRADO");
                    }

                    const usuario = usuarios[claveUsuario];

                    if (!usuario || typeof usuario !== "object") {
                        throw new Error("PERFIL_INVALIDO");
                    }

                    const encontrado = buscarEquipo(equipos, identidad);

                    if (!encontrado) {
                        throw new Error("EQUIPO_NO_ENCONTRADO");
                    }

                    const { nombre, equipo } = encontrado;

                    if (
                        tipo === "RETIRO" &&
                        !tienePermisoEquipo(equipo, identidad, ["lider"])
                    ) {
                        throw new Error("SIN_PERMISO");
                    }

                    const saldoUsuario = validarSaldo(
                        usuario.coins,
                        "usuario"
                    );

                    const fondosEquipo = validarSaldo(
                        equipo.fondos,
                        "equipo"
                    );

                    const totalDepositado = validarSaldo(
                        equipo.totalDepositado,
                        "totalDepositado"
                    );

                    const totalRetirado = validarSaldo(
                        equipo.totalRetirado,
                        "totalRetirado"
                    );

                    if (!Array.isArray(equipo.movimientos ?? [])) {
                        throw new Error("MOVIMIENTOS_INVALIDOS");
                    }

                    if (tipo === "DEPOSITO") {
                        if (saldoUsuario < cantidad) {
                            throw new Error("SALDO_INSUFICIENTE");
                        }

                        if (!Number.isSafeInteger(fondosEquipo + cantidad)) {
                            throw new Error("LIMITE_SALDO_EQUIPO");
                        }

                        if (!Number.isSafeInteger(totalDepositado + cantidad)) {
                            throw new Error("LIMITE_TOTAL_DEPOSITADO");
                        }

                        usuario.coins = saldoUsuario - cantidad;
                        equipo.fondos = fondosEquipo + cantidad;
                        equipo.totalDepositado = totalDepositado + cantidad;
                    } else {
                        if (fondosEquipo < cantidad) {
                            throw new Error("FONDOS_EQUIPO_INSUFICIENTES");
                        }

                        if (!Number.isSafeInteger(saldoUsuario + cantidad)) {
                            throw new Error("LIMITE_SALDO_USUARIO");
                        }

                        if (!Number.isSafeInteger(totalRetirado + cantidad)) {
                            throw new Error("LIMITE_TOTAL_RETIRADO");
                        }

                        usuario.coins = saldoUsuario + cantidad;
                        equipo.fondos = fondosEquipo - cantidad;
                        equipo.totalRetirado = totalRetirado + cantidad;
                    }

                    equipo.nombre ??= nombre;
                    equipo.movimientos ??= [];

                    equipo.movimientos.push({
                        tipo,
                        usuario: identidad,
                        cantidad,
                        fecha: ahora
                    });

                    usuarios[claveUsuario] = usuario;
                    equipos[nombre] = equipo;

                    return {
                        cambios: {
                            "usuarios.json": usuarios,
                            "equipos.json": equipos
                        },
                        resultado: {
                            tipo,
                            equipo: nombre,
                            cantidad,
                            nombreUsuario: usuario.nombre || "Titán",
                            saldoUsuario: usuario.coins,
                            fondosEquipo: equipo.fondos,
                            totalDepositado: equipo.totalDepositado,
                            totalRetirado: equipo.totalRetirado
                        }
                    };
                }
            );

            return {
                ok: true,
                duplicada: transaccion.duplicada,
                resultado: transaccion.resultado
            };
        } catch (error) {
            const motivos = {
                PERFIL_NO_ENCONTRADO: "perfil_no_encontrado",
                PERFIL_INVALIDO: "perfil_invalido",
                EQUIPO_NO_ENCONTRADO: "equipo_no_encontrado",
                SIN_PERMISO: "sin_permiso",
                SALDO_INSUFICIENTE: "saldo_insuficiente",
                FONDOS_EQUIPO_INSUFICIENTES: "fondos_insuficientes",
                MOVIMIENTOS_INVALIDOS: "movimientos_invalidos",
                DATOS_INVALIDOS: "datos_invalidos",
                LIMITE_SALDO_EQUIPO: "limite_saldo",
                LIMITE_TOTAL_DEPOSITADO: "limite_acumulado",
                LIMITE_SALDO_USUARIO: "limite_saldo",
                LIMITE_TOTAL_RETIRADO: "limite_acumulado"
            };

            if (motivos[error.message]) {
                return {
                    ok: false,
                    motivo: motivos[error.message]
                };
            }

            if (error.message.startsWith("SALDO_INVALIDO:")) {
                return {
                    ok: false,
                    motivo: "saldo_invalido"
                };
            }

            throw error;
        }
    }

    return {
        depositar(identidad, messageId, cantidad, ahora) {
            return transferir(
                "DEPOSITO",
                identidad,
                messageId,
                cantidad,
                ahora
            );
        },

        retirar(identidad, messageId, cantidad, ahora) {
            return transferir(
                "RETIRO",
                identidad,
                messageId,
                cantidad,
                ahora
            );
        }
    };
}

const servicio = crearServicioBancoEquipos({
    gestor,
    resolverClaveUsuario
});

module.exports = {
    crearServicioBancoEquipos,
    depositar: servicio.depositar,
    retirar: servicio.retirar
};
