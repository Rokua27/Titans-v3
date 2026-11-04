const { leerJSON } = require("../utils/database");
const { obtenerTemporada } = require("../utils/torneoManager");

module.exports = {
    nombre: "fixture",
    alias: [],
    categoria: "torneos",
    descripcion: "Muestra el calendario oficial.",
    uso: "!fixture",
    permisos: ["usuario"],

    async ejecutar(sock, from) {

        const temporada = obtenerTemporada();

        const fixture = leerJSON("fixture.json") || {
            enfrentamientos: []
        };

        const partidos = fixture.enfrentamientos || [];

        if (partidos.length === 0) {

            return await sock.sendMessage(from, {
                text:
`🏆━━━━━━━━━━━━━━━━━━━━━━🏆
      LIGA TITANS TEAM
🏆━━━━━━━━━━━━━━━━━━━━━━🏆

📅 Temporada
${temporada.nombre}

❌ No hay partidos programados.

🤖 TitansBot v3`
            });

        }

        let mensaje =
`🏆━━━━━━━━━━━━━━━━━━━━━━🏆
      LIGA TITANS TEAM
🏆━━━━━━━━━━━━━━━━━━━━━━🏆

📅 Temporada
${temporada.nombre}

`;

        partidos.forEach((p, i) => {

            mensaje +=
`━━━━━━━━━━━━━━━━━━━━━━

${i + 1}️⃣ Partido

⚔️ ${p.equipo1}
🆚
${p.equipo2}

${p.ganador
? `🏆 Ganador: ${p.ganador}`
: "🟡 Pendiente"}

`;
        });

        const jugados = partidos.filter(
            p => p.ganador
        ).length;

        mensaje +=
`━━━━━━━━━━━━━━━━━━━━━━

📊 Progreso
${jugados}/${partidos.length} partidos

🤖 TitansBot v3`;

        await sock.sendMessage(from, {
            text: mensaje
        });

    }
};
