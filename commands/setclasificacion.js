const { leerJSON, guardarJSON } = require("../utils/database");
const { esAdmin } = require("../utils/admin");

module.exports = {

    nombre: "setclasificacion",

    alias: ["settablafinal"],

    categoria: "torneos",

    descripcion: "Registra la clasificación final del torneo.",

    permisos: ["admin"],

    uso: "!setclasificacion Equipo|Puntos",

    async ejecutar(sock, from, args, msg) {

        const sender = msg.key.participant || msg.key.remoteJid;

        if (!(await esAdmin(sock, from, sender))) {
            return await sock.sendMessage(from, {
                text: "❌ Solo los administradores pueden usar este comando."
            });
        }

        const texto = args.join(" ");

        if (!texto.includes("|")) {
            return await sock.sendMessage(from, {
                text:
`❌ Uso correcto:

!setclasificacion Atlas E-Sport|27`
            });
        }

        const [nombre, puntos] = texto.split("|");

        const tabla = leerJSON("tabla.json") || {
            equipos: []
        };

        tabla.equipos.push({
            nombre: nombre.trim(),
            puntos: Number(puntos.trim())
        });

        tabla.equipos.sort((a, b) => b.puntos - a.puntos);

        guardarJSON("tabla.json", tabla);

        await sock.sendMessage(from, {
            text:
`✅ Equipo agregado

🏆 ${nombre.trim()}
⭐ ${puntos.trim()} puntos`
        });

    }

};
