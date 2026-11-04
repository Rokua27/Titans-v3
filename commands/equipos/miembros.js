const { obtenerEquipoUsuario } = require("../../utils/equipos");
const { obtenerNombre } = require("../../utils/usuarios");
const { equipo, error } = require("../../utils/embeds");

module.exports = {

    nombre: "miembros",

    categoria: "equipo",

    descripcion: "Lista los miembros del equipo.",

    uso: "!miembros",

    permisos: ["usuario"],

    alias: [],

    async ejecutar(sock, from, args, msg) {

        try {

            const sender = msg.key.participant || msg.key.remoteJid;

            const datos = obtenerEquipoUsuario(sender);

            if (!datos) {
                return sock.sendMessage(from, {
                    text: error(
                        "Equipo",
                        "No perteneces a ningún equipo."
                    )
                });
            }

            const lider = `👑 Líder\n• ${obtenerNombre(datos.lider)}`;

            const subLideres = datos.subLideres.length
                ? datos.subLideres
                    .map(id => `• ${obtenerNombre(id)}`)
                    .join("\n")
                : "Sin sublíderes";

            const miembros = datos.miembros.filter(
                id =>
                    id !== datos.lider &&
                    !datos.subLideres.includes(id)
            );

            const listaMiembros = miembros.length
                ? miembros
                    .map(id => `• ${obtenerNombre(id)}`)
                    .join("\n")
                : "Sin miembros";

            await sock.sendMessage(from, {

                text: equipo(
                    "Miembros del Equipo",

`🛡️ ${datos.nombre}
🏷️ ${datos.tag || "Sin TAG"}

${lider}

⭐ Sublíderes
${subLideres}

👥 Miembros
${listaMiembros}

━━━━━━━━━━━━━━━━━━

📊 Total de integrantes
${datos.miembros.length}/${datos.maxMiembros}`

                )

            });

        } catch (err) {

            console.error(err);

            sock.sendMessage(from, {
                text: error(
                    "Sistema",
                    "No fue posible obtener los miembros."
                )
            });

        }

    }

};
