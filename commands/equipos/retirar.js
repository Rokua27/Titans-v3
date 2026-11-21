const { retirar } = require("../../utils/bancoEquiposEconomia");

const { equipo, error } = require("../../utils/embeds");
const { obtenerNombreUsuario } = require("../../utils/usuarios");
const monitor = require("../../utils/monitor");

module.exports = {
    nombre: "retirar",
    categoria: "equipo",
    descripcion: "Retira monedas del banco del equipo.",
    uso: "!retirar <cantidad>",
    permisos: ["lider"],
    alias: [],

    async ejecutar(sock, from, args, msg) {
        try {
            const sender = msg.key.participant || msg.key.remoteJid;

            if (!args[0]) {
                return sock.sendMessage(from, {
                    text: error(
                        "Banco del Equipo",
                        "Uso:\n!retirar <cantidad>"
                    )
                });
            }

            if (!/^\d+$/.test(args[0])) {
                return sock.sendMessage(from, {
                    text: error(
                        "Cantidad",
                        "Debes ingresar una cantidad entera válida."
                    )
                });
            }

            const cantidad = Number(args[0]);

            if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
                return sock.sendMessage(from, {
                    text: error(
                        "Cantidad",
                        "La cantidad debe ser un número entero positivo."
                    )
                });
            }

            const messageId = msg.key.id;

            if (!messageId) {
                return sock.sendMessage(from, {
                    text: error(
                        "Operación",
                        "No se pudo verificar el identificador del mensaje. Intenta nuevamente."
                    )
                });
            }

            const operacion = await retirar(
                sender,
                messageId,
                cantidad
            );

            if (operacion.duplicada) return;

            if (!operacion.ok) {
                const mensajes = {
                    cantidad_invalida: "La cantidad ingresada no es válida.",
                    identidad_invalida: "No se pudo identificar tu cuenta.",
                    perfil_no_encontrado: "No se encontró tu perfil.",
                    perfil_invalido: "Tu perfil no tiene información válida.",
                    equipo_no_encontrado: "No perteneces a ningún equipo.",
                    sin_permiso: "Solo el Líder puede retirar fondos.",
                    fondos_insuficientes: "El equipo no tiene suficientes fondos.",
                    saldo_invalido: "Se detectó un saldo inválido. La operación fue cancelada.",
                    limite_saldo: "El retiro supera el límite permitido del saldo.",
                    limite_acumulado: "El retiro supera el límite permitido del acumulado.",
                    movimientos_invalidos: "El historial bancario necesita revisión.",
                    datos_invalidos: "Los datos del banco necesitan revisión."
                };

                return sock.sendMessage(from, {
                    text: error(
                        "Retiro no realizado",
                        mensajes[operacion.motivo] ||
                            "No fue posible realizar el retiro."
                    )
                });
            }

            const datos = operacion.resultado;

            await sock.sendMessage(from, {
                text: equipo(
                    "Retiro realizado",
`🏦 Equipo
${datos.equipo}

💰 Retirado
${datos.cantidad.toLocaleString()} monedas

👑 Líder
${obtenerNombreUsuario(sender)}

💳 Saldo personal
${datos.saldoUsuario.toLocaleString()} monedas

🏦 Fondos restantes
${datos.fondosEquipo.toLocaleString()} monedas

✅ El dinero fue transferido correctamente.`
                )
            });
        } catch (err) {
            console.error(err);

            monitor.registrarEvento("ERROR_SISTEMA", {
                estado: "ERROR",
                componente: "RETIRAR",
                codigo: "SYSTEM_ERROR",
                descripcion: err.message
            });

            await sock.sendMessage(from, {
                text: error(
                    "Sistema",
                    "No fue posible realizar el retiro."
                )
            });
        }
    }
};
