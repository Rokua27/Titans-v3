const { obtenerEquipoUsuario } = require("../../utils/equipos");
const { obtenerNombreUsuario } = require("../../utils/usuarios");
const { equipo, error } = require("../../utils/embeds");

module.exports = {

    nombre: "fondos",

    categoria: "equipo",

    descripcion: "Consulta los fondos del equipo.",

    uso: "!fondos",

    permisos: ["miembro"],

    alias: [],

    async ejecutar(sock, from, args, msg) {

        try {

            const sender = msg.key.participant || msg.key.remoteJid;

            const datos = obtenerEquipoUsuario(sender);

            if (!datos) {

                return sock.sendMessage(from, {
                    text: error(
                        "Banco del Equipo",
                        "No perteneces a ningún equipo."
                    )
                });

            }

            const mensaje = equipo(

                "Banco del Equipo",

`🏦 EQUIPO
${datos.nombre}

💰 Fondos
${Number(datos.fondos || 0).toLocaleString("es-CO")}

📈 Total Depositado
${Number(datos.totalDepositado || 0).toLocaleString("es-CO")}

📉 Total Retirado
${Number(datos.totalRetirado || 0).toLocaleString("es-CO")}

👑 Líder
${obtenerNombreUsuario(datos.lider)}

👥 Miembros
${datos.miembros.length}/${datos.maxMiembros}

🏅 Liga
${datos.liga}

⭐ Nivel
${datos.nivel}`

            );

            await sock.sendMessage(from, {

                text: mensaje

            });

        } catch (err) {

            console.error(err);

            sock.sendMessage(from, {

                text: error(
                    "Sistema",
                    "No fue posible consultar los fondos."
                )

            });

        }

    }

};
