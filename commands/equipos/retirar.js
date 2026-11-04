const { tienePermisoEquipo } = require("../../utils/permisos");
const {
    obtenerEquipoUsuario,
    retirarFondos
} = require("../../utils/equipos");

const {
    obtenerUsuario,
    guardarUsuario
} = require("../../utils/comunidad");

const {
    equipo,
    error
} = require("../../utils/embeds");

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
                return sock.sendMessage(from,{
                    text:error(
                        "Banco del Equipo",
                        "Uso:\n!retirar <cantidad>"
                    )
                });
            }

            const cantidad = parseInt(args[0]);

            if (isNaN(cantidad) || cantidad <= 0) {
                return sock.sendMessage(from,{
                    text:error(
                        "Cantidad",
                        "Debes ingresar una cantidad válida."
                    )
                });
            }

            const equipoActual = obtenerEquipoUsuario(sender);

            if (!equipoActual) {
                return sock.sendMessage(from,{
                    text:error(
                        "Equipo",
                        "No perteneces a ningún equipo."
                    )
                });
            }

            if (!tienePermisoEquipo(equipoActual, sender, ["lider"])) {
                return sock.sendMessage(from,{
                    text:error(
                        "Permisos",
                        "Solo el Líder puede retirar fondos."
                    )
                });
            }

            const resultado = retirarFondos(
                equipoActual.nombre,
                sender,
                cantidad
            );

            if (!resultado.ok) {
                return sock.sendMessage(from,{
                    text:error(
                        "Banco",
                        resultado.mensaje
                    )
                });
            }

const usuario = obtenerUsuario(sender);

usuario.coins = (usuario.coins || 0) + cantidad;

await guardarUsuario(sender, usuario);

            await sock.sendMessage(from,{
                text:equipo(
                    "Retiro realizado",
`🏦 Equipo
${equipoActual.nombre}

💰 Retirado
${cantidad.toLocaleString()} monedas

👑 Líder
${obtenerNombreUsuario(sender)}

✅ El dinero fue transferido correctamente.`
                )
            });

        } catch(err){

            console.error(err);

            monitor.registrarEvento("ERROR_SISTEMA", {
                estado: "ERROR",
                componente: "RETIRAR",
                codigo: "SYSTEM_ERROR",
                descripcion: err.message
            });

            sock.sendMessage(from,{
                text:error(
                    "Sistema",
                    "No fue posible realizar el retiro."
                )
            });

        }

    }
};
