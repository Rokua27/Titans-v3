const SUPER_ADMINS = require("../../config/superadmins");
const { leerJSON, guardarJSON } = require("../../utils/database");
const { equipo, error } = require("../../utils/embeds");
const { obtenerNombreUsuario } = require("../../utils/comunidad");

module.exports = {

    nombre: "fundador",

    categoria: "moderacion",

    descripcion: "Asigna el fundador del bot.",

    uso: "!fundador @usuario",

    permisos: ["superadmin"],

    alias: [],

    async ejecutar(sock, from, args, msg) {

        try {

            const sender = msg.key.participant || msg.key.remoteJid;

            if (!SUPER_ADMINS.includes(sender)) {

                return sock.sendMessage(from, {
                    text: error(
                        "Permisos",
                        "Solo un SuperAdmin puede asignar el Fundador."
                    )
                });

            }

let usuario =
    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

// Si no se menciona a nadie,
// el fundador será quien ejecutó el comando.
if (!usuario) {

    usuario = sender;

}
            const datos = leerJSON("moderadores.json") || {
                fundador: "",
                admins: [],
                supermods: [],
                moderadores: [],
                ayudantes: [],
                baneados: []
            };

            datos.fundador = usuario;

            guardarJSON("moderadores.json", datos);

            const nombre = obtenerNombreUsuario(usuario);

            await sock.sendMessage(from, {
                text: equipo(
                    "Fundador Asignado",
`👑 Nuevo Fundador

${nombre}

🛡️ Desde este momento tendrá control sobre toda la comunidad.

⚙️ Asignado por un SuperAdmin.`
                ),
                mentions: [usuario]
            });

        } catch (err) {

            console.error(err);

            sock.sendMessage(from, {
                text: error(
                    "Sistema",
                    "No fue posible asignar el fundador."
                )
            });

        }

    }

};
