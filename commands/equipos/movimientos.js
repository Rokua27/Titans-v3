const { obtenerEquipoUsuario } = require("../../utils/equipos");
const { obtenerNombreUsuario } = require("../../utils/usuarios");
const { equipo, error } = require("../../utils/embeds");

module.exports = {

    nombre: "movimientos",

    categoria: "equipo",

    descripcion: "Muestra el historial del banco.",

    uso: "!movimientos",

    permisos: ["miembro"],

    alias: [],

    async ejecutar(sock, from, args, msg) {

        try {

            const sender = msg.key.participant || msg.key.remoteJid;

            const datos = obtenerEquipoUsuario(sender);

            if (!datos) {

                return sock.sendMessage(from, {
                    text: error(
                        "Banco",
                        "No perteneces a ningún equipo."
                    )
                });

            }

            const historial = datos.movimientos || [];

            if (historial.length === 0) {

                return sock.sendMessage(from, {
                    text: equipo(
                        "Movimientos del Banco",
                        "📭 Aún no existen movimientos registrados."
                    )
                });

            }

            const ultimos = historial.slice(-10).reverse();

            let texto = "";

            for (const mov of ultimos) {

                const fecha = new Date(mov.fecha)
                    .toLocaleDateString("es-CO");

                let icono = "📄";

                switch (mov.tipo) {

                    case "DEPOSITO":
                        icono = "📈";
                        break;

                    case "RETIRO":
                        icono = "📉";
                        break;

                    case "MEJORA":
                        icono = "🏗️";
                        break;

                    default:
                        icono = "📄";

                }

                texto +=
`${icono} ${mov.tipo}

👤 ${mov.usuario
    ? obtenerNombreUsuario(mov.usuario)
    : "Sistema"}

💰 ${Number(mov.cantidad || 0).toLocaleString("es-CO")}

📅 ${fecha}

──────────────────

`;

            }

            await sock.sendMessage(from, {

                text: equipo(
                    "Historial del Banco",
                    texto.trim()
                )

            });

        } catch (err) {

            console.error(err);

            sock.sendMessage(from, {
                text: error(
                    "Sistema",
                    "No fue posible obtener el historial."
                )
            });

        }

    }

};
