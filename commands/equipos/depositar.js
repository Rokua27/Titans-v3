const {
    obtenerEquipoUsuario,
    depositarFondos
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
    nombre: "depositar",

categoria: "equipo",

descripcion: "Deposita monedas al banco del equipo.",

uso: "!depositar <cantidad>",

permisos: ["miembro"],

alias: [],

    async ejecutar(sock, from, args, msg) {

        try {

            const sender = msg.key.participant || msg.key.remoteJid;

            if (!args[0]) {
                return sock.sendMessage(from,{
                    text:error(
                        "Banco del Equipo",
                        "Uso:\n!depositar <cantidad>"
                    )
                });
            }

            const cantidad = parseInt(args[0]);

            if (isNaN(cantidad) || cantidad <= 0) {
                return sock.sendMessage(from,{
                    text:error(
                        "Cantidad",
                        "Debes ingresar un número válido."
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

const usuario = obtenerUsuario(sender);

if (!usuario) {
    return sock.sendMessage(from,{
        text:error(
            "Perfil",
            "No se encontró tu perfil."
        )
    });
}

if ((usuario.coins || 0) < cantidad) {
       return sock.sendMessage(from,{
                    text:error(
                        "Fondos",
                        "No tienes suficientes monedas."
                    )
                });
            }

usuario.coins -= cantidad;

await guardarUsuario(sender, usuario);

            depositarFondos(
                equipoActual.nombre,
                sender,
                cantidad
            );

            await sock.sendMessage(from,{
                text:equipo(
                    "Depósito realizado",
`🏦 Equipo
${equipoActual.nombre}

💰 Depositado
${cantidad.toLocaleString()} monedas

👤 Jugador
${obtenerNombreUsuario(sender)}

✅ El dinero fue añadido al banco del equipo.`
                )
            });

        } catch(err){

            console.error(err);

            monitor.registrarEvento("ERROR_SISTEMA", {
                estado: "ERROR",
                componente: "DEPOSITAR",
                codigo: "SYSTEM_ERROR",
                descripcion: err.message
            });

            sock.sendMessage(from,{
                text:error(
                    "Sistema",
                    "No fue posible realizar el depósito."
                )
            });

        }

    }
};
