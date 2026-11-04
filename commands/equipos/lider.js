const { tienePermisoEquipo } = require("../../utils/permisos");
const {
    obtenerEquipoUsuario,
    transferirLider
} = require("../../utils/equipos");

const { obtenerNombreUsuario } = require("../../utils/usuarios");
const { error, equipo } = require("../../utils/embeds");

module.exports = {

    nombre: "lider",

    alias: ["transferirlider"],

    categoria: "equipos",

    descripcion: "Transfiere el liderazgo del equipo.",

    permisos: ["lider"],

    uso: "!lider @usuario",

    async ejecutar(sock, from, args, msg) {

        const sender = msg.key.participant || msg.key.remoteJid;

        const equipoActual = obtenerEquipoUsuario(sender);

        if (!equipoActual) {

            return sock.sendMessage(from, {
                text: error(
                    "Equipo",
                    "No perteneces a ningún equipo."
                )
            });

        }

        if (!tienePermisoEquipo(equipoActual, sender, ["lider"])) {

            return sock.sendMessage(from, {
                text: error(
                    "Permisos",
                    "Solo el Capitán puede transferir el liderazgo."
                )
            });

        }

        const mencionado =
            msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

        if (!mencionado) {

            return sock.sendMessage(from, {
                text: error(
                    "Uso",
                    "Debes mencionar al nuevo Capitán.\n\nEjemplo:\n!lider @usuario"
                )
            });

        }

        const resultado = transferirLider(
            equipoActual.nombre,
            mencionado
        );

        if (!resultado.ok) {

            return sock.sendMessage(from, {
                text: error(
                    "Equipo",
                    resultado.mensaje
                )
            });

        }

        await sock.sendMessage(from, {

            text: equipo(
                "Cambio de Capitán",

`👑 El liderazgo fue transferido correctamente.

🏆 Equipo
${equipoActual.nombre}

👤 Nuevo Capitán
${obtenerNombreUsuario(mencionado)}

⚔️ ¡Que continúe la conquista de la Liga Titans!`

            )

        });

    }

};
