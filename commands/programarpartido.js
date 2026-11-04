const {
    obtenerFixture,
    guardarFixture
} = require("../utils/torneoManager");

module.exports = {

    nombre: "programarpartido",

    alias: ["programar"],

    categoria: "torneos",

    descripcion: "Programa la fecha y hora de un enfrentamiento.",

    permisos: ["admin"],

    uso: "!programarpartido <número> <fecha> <hora>",

    async ejecutar(sock, from, args) {

        if (args.length < 3) {

            return await sock.sendMessage(from, {
                text:
`❌ Uso correcto:

!programarpartido 1 30/07/2026 20:00`
            });

        }

        const numero = Number(args[0]);

        const fecha = args[1];

        const hora = args[2];

        const fixture = obtenerFixture();

        const partido = fixture.enfrentamientos.find(
            p => p.numero === numero
        );

        if (!partido) {

            return await sock.sendMessage(from, {
                text: "❌ Ese enfrentamiento no existe."
            });

        }

        partido.fecha = fecha;
        partido.hora = hora;

        guardarFixture(fixture);

        await sock.sendMessage(from, {

            text:
`╔══════════════════════════════╗
║      📅 PARTIDO PROGRAMADO   ║
╚══════════════════════════════╝

🥊 Enfrentamiento ${partido.numero}

🛡️ ${partido.equipo1}
🆚
🛡️ ${partido.equipo2}

📅 Fecha:
${fecha}

🕒 Hora:
${hora}

🏆 Liga Titans Team
🤖 TitansBot v3`

        });

    }

};
