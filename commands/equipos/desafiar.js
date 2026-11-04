const { tienePermisoEquipo } = require("../../utils/permisos");
const {
    obtenerEquipoUsuario,
    cargarGuerras,
    guardarGuerras
} = require("../../utils/equipos");

const { equipo, error } = require("../../utils/embeds");

module.exports = {

    nombre: "desafiar",

categoria: "equipo",

descripcion: "Desafía a otro equipo.",

uso: "!desafiar <equipo>",

permisos: ["lider"],

alias: [],

    async ejecutar(sock, from, args, msg) {

        const sender = msg.key.participant || msg.key.remoteJid;

        const datos = obtenerEquipoUsuario(sender);

        if (!datos) {

            return sock.sendMessage(from,{
                text:error(
                    "Equipo",
                    "No perteneces a ningún equipo."
                )
            });

        }

        if (!tienePermisoEquipo(datos, sender, ["lider"])) {

            return sock.sendMessage(from,{
                text:error(
                    "Permisos",
                    "Solo el Líder puede iniciar una guerra."
                )
            });

        }

        if (!args.length) {

            return sock.sendMessage(from,{
                text:error(
                    "Uso",
                    "!desafiar NombreDelEquipo"
                )
            });

        }

        const rival = args.join(" ");

        if (rival === datos.nombre) {

            return sock.sendMessage(from,{
                text:error(
                    "Guerra",
                    "No puedes desafiar a tu propio equipo."
                )
            });

        }

        const guerras = cargarGuerras();

        guerras[datos.nombre] = {

            atacante: datos.nombre,

            defensor: rival,

            estado: "PENDIENTE",

            inicio: Date.now(),

            puntosAtacante: 0,

            puntosDefensor: 0

        };

        guardarGuerras(guerras);

        await sock.sendMessage(from,{

            text:equipo(
                "⚔️ Desafío Enviado",
`🛡️ Equipo
${datos.nombre}

🎯 Rival
${rival}

⏳ Estado
Pendiente de aceptación`
            )

        });

    }

};
