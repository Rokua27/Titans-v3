const {
    inscribirEquipo,
    cargarEquipos,
    obtenerEquipoUsuario
} = require("../utils/equipos");
const { obtenerTemporada } = require("../utils/torneoManager");
const { leerJSON } = require("../utils/database");

module.exports = {

    nombre: "inscribirequipo",

    alias: ["inscribir"],

    categoria: "torneos",

    descripcion: "Inscribe un equipo en la temporada actual.",

    permisos: ["lider"],

    uso: "!inscribirequipo NombreEquipo",

        async ejecutar(sock, from, args, msg) {

const nombreEquipo = args
    .join(" ")
    .trim()
    .replace(/[.,;:!?]+$/g, "");

console.log("🧪 Equipo recibido:", `"${nombreEquipo}"`);

const sender =
    msg.key.participant || msg.key.remoteJid;

const senderNormalizado = sender.replace("@lid", "@s.whatsapp.net");

const equipoUsuario = obtenerEquipoUsuario(senderNormalizado);

if (!equipoUsuario) {

    return await sock.sendMessage(from, {
        text: "❌ No perteneces a ningún equipo."
    });

}

if (equipoUsuario.lider !== senderNormalizado) {

    return await sock.sendMessage(from, {
        text:
`❌ Solo el capitán del equipo puede realizar la inscripción.`
    });

}

if (
    equipoUsuario.nombre.toLowerCase() !==
    nombreEquipo.toLowerCase()
) {

    return await sock.sendMessage(from, {
        text:
`❌ Solo puedes inscribir tu propio equipo.

🛡️ Tu equipo:
${equipoUsuario.nombre}`
    });

}

        if (!nombreEquipo) {
            return await sock.sendMessage(from, {
                text:
`❌ Uso correcto:

!inscribirequipo NombreEquipo`
            });
        }

        const temporada = obtenerTemporada();

const torneo = leerJSON("torneo.json") || {};

        if (!temporada || !temporada.nombre) {
            return await sock.sendMessage(from, {
                text: "❌ No hay una temporada activa."
            });
        }

if (!temporada.inscripciones) {

    return await sock.sendMessage(from, {

        text:
`╔══════════════════════════════╗
║      🔒 INSCRIPCIONES        ║
╚══════════════════════════════╝

❌ Las inscripciones están cerradas.

⚔️ Espera la próxima apertura de registros.`

    });

}

        const equipos = cargarEquipos();

        if (!equipos[nombreEquipo]) {
            return await sock.sendMessage(from, {
                text: "❌ Ese equipo no existe."
            });
        }

        const resultado =
            inscribirEquipo(nombreEquipo, temporada.nombre);

        if (!resultado.ok) {
            return await sock.sendMessage(from, {
                text: `❌ ${resultado.mensaje}`
            });
        }

await sock.sendMessage(from, {
    text:
`╔══════════════════════════════╗
║      🏆 EQUIPO INSCRITO 🏆
╚══════════════════════════════╝

🛡️ Equipo
${nombreEquipo}

🏆 Torneo
${torneo.titulo || "Liga Titans Team"}

🎖️ Evento
${torneo.subtitulo || "Torneo Oficial"}

🌎 Región
${torneo.region || "Sin definir"}

📅 Fecha
${torneo.proximaFecha || "Por anunciar"}

📌 Estado
✅ INSCRITO OFICIALMENTE

🏅 Descripción
${torneo.descripcion || "Sin descripción"}

━━━━━━━━━━━━━━━━━━

⚔️ Tu equipo ya hace parte del torneo oficial.

📢 Espera la publicación del fixture para conocer tu primer rival.

🤖 TitansBot v3`
});

    }

};
