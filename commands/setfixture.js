const { leerJSON, guardarJSON } = require("../utils/database");
const { esAdmin } = require("../utils/admin");

module.exports = {

    nombre: "setfixture",

    alias: [],

    categoria: "admin",

    descripcion: "Agrega un partido al fixture.",

    permisos: ["admin"],

    uso: "!setfixture Jornada | Equipo A vs Equipo B | Fecha | Hora",

    async ejecutar(sock, from, args, msg) {

        const sender = msg.key.participant || msg.key.remoteJid;

        if (!(await esAdmin(sock, from, sender))) {
            return await sock.sendMessage(from, {
                text: "⛔ Solo los administradores pueden usar este comando."
            });
        }

        const texto = args.join(" ");

        const partes = texto.split("|").map(t => t.trim());

        if (partes.length < 4) {

            return await sock.sendMessage(from, {
                text:
`❌ Uso correcto

!setfixture Jornada 1 | Titans vs Monster | 20 Jul | 8:30 PM`
            });

        }

        const jornada = partes[0];
        const partido = partes[1];
        const fecha = partes[2];
        const hora = partes[3];

        if (!partido.includes(" vs ")) {

            return await sock.sendMessage(from, {
                text: "❌ El partido debe tener el formato: Equipo A vs Equipo B"
            });

        }

        const [equipo1, equipo2] =
            partido.split(" vs ").map(e => e.trim());

        const fixture = leerJSON("fixture.json") || {
            enfrentamientos: []
        };

        fixture.enfrentamientos.push({

            numero: fixture.enfrentamientos.length + 1,

            jornada,

            equipo1,

            equipo2,

            fecha,

            hora,

            estado: "pendiente",

            ganador: null

        });

        guardarJSON("fixture.json", fixture);

        await sock.sendMessage(from, {
            text:
`✅ Partido agregado

🏆 ${jornada}

🛡️ ${equipo1}

🆚

🛡️ ${equipo2}

📅 ${fecha}

🕒 ${hora}`
        });

    }

};
