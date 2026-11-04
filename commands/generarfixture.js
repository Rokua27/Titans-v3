const { cargarEquipos } = require("../utils/equipos");
const {
    guardarFixture,
    obtenerTemporada
} = require("../utils/torneoManager");

module.exports = {

    nombre: "generarfixture",

    alias: ["fixture"],

    categoria: "torneos",

    descripcion: "Genera automáticamente el fixture del torneo.",

    permisos: ["admin"],

    uso: "!generarfixture",

    async ejecutar(sock, from) {

        const temporada = obtenerTemporada();

        const equipos = Object.values(cargarEquipos())
            .filter(e => e.inscrito);

        if (equipos.length < 2) {

            return await sock.sendMessage(from, {
                text: "❌ No hay suficientes equipos inscritos."
            });

        }

        // Mezclar equipos aleatoriamente
        equipos.sort(() => Math.random() - 0.5);

        const fixture = {
            temporada: temporada.nombre,
            enfrentamientos: []
        };

        for (let i = 0; i < equipos.length; i += 2) {

            if (!equipos[i + 1]) break;

            fixture.enfrentamientos.push({

                numero: fixture.enfrentamientos.length + 1,

                equipo1: equipos[i].nombre,

                equipo2: equipos[i + 1].nombre,

                ganador: null,

                fecha: null,

                hora: null

            });

        }

        guardarFixture(fixture);

        let mensaje =
`╔══════════════════════════════╗
║      ⚔️ FIXTURE OFICIAL      ║
╚══════════════════════════════╝

🏆 ${temporada.nombre}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

        fixture.enfrentamientos.forEach(partido => {

            mensaje +=
`🥊 ENFRENTAMIENTO ${partido.numero}

🛡️ ${partido.equipo1}
🆚
🛡️ ${partido.equipo2}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

        });

        mensaje +=
`🎮 El fixture oficial ha sido generado.

🤖 TitansBot v3`;

        await sock.sendMessage(from, {
            text: mensaje
        });

    }

};
