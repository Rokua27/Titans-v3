const { obtenerEquipoUsuario } = require("../../utils/equipos");
const { obtenerNombre } = require("../../utils/usuarios");
const { equipo, error } = require("../../utils/embeds");
const monitor = require("../../utils/monitor");

module.exports = {
    nombre: "equipo",

    categoria: "equipo",

    descripcion: "Muestra la información de tu equipo.",

    uso: "!equipo",

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

           const integrantes = datos.miembros
.map(id => `• ${obtenerNombre(id)}`)
    .join("\n");

            const estado = "🟢 Activo";

            const torneo = datos.inscrito
                ? (datos.temporada || "Liga Titans Team")
                : "Sin torneo";

            const inscripcion = datos.inscrito
                ? "✅ Inscrito"
                : "❌ No inscrito";

            const texto = `🏆 Equipo
${datos.nombre}

👑 Capitán
${obtenerNombre(datos.lider)}

👥 Integrantes (${datos.miembros.length}/${datos.maxMiembros})

${integrantes}

━━━━━━━━━━━━━━━━━━

📌 Estado
${estado}

🏆 Torneo
${torneo}

📋 Inscripción
${inscripcion}`;

            await sock.sendMessage(from, {
                text: equipo(
                    "Perfil del Equipo",
                    texto
                )
            });

        } catch (err) {

            console.error(err);

            monitor.registrarEvento("ERROR_SISTEMA", {
                estado: "ERROR",
                componente: "EQUIPO",
                codigo: "SYSTEM_ERROR",
                descripcion: err.message
            });

            await sock.sendMessage(from, {
                text: error(
                    "Sistema",
                    "No fue posible cargar el perfil del equipo."
                )
            });

        }

    }

};
