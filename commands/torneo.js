const {
    obtenerTemporada,
    obtenerFixture,
    obtenerTabla,
    obtenerHistorial
} = require("../utils/torneoManager");

const {
    cargarEquipos
} = require("../utils/equipos");

const { leerJSON } = require("../utils/database");

const torneo = require("../database/torneo.json");

module.exports = {

    nombre: "torneo",
    alias: ["liga"],
    categoria: "torneos",
    descripcion: "Panel principal del torneo.",
    permisos: ["usuario"],

    async ejecutar(sock, from) {

const torneo = leerJSON("torneo.json") || {
    titulo: "LIGA TITANS TEAM",
    subtitulo: "TORNEO OFICIAL",
    estado: "Sin información",
    formato: "-",
    clasifican: "-",
    region: "-",
    hora: "-",
    proximaFecha: "-",
    descripcion: "-",
    comandos: []
};
        const temporada = obtenerTemporada();
        const fixture = obtenerFixture();
        const tabla = obtenerTabla();
        const historial = obtenerHistorial();

        const equipos = cargarEquipos();

        const inscritos = Object.values(equipos)
            .filter(e => e.inscrito).length;

        const totalEquipos = Object.keys(equipos).length;

        const jugados = fixture.enfrentamientos.filter(
            p => p.ganador
        ).length;

        const total = fixture.enfrentamientos.length;

        const progreso =
            total > 0
                ? Math.round((jugados / total) * 100)
                : 0;

        const lider =
            tabla.equipos.length
                ? tabla.equipos[0].nombre
                : "Sin datos";

        const campeonActual =
            historial.temporadas.length
                ? historial.temporadas[0].campeon
                : "Sin campeón";

        const proximo = fixture.enfrentamientos.find(
            p => !p.ganador
        );

        await sock.sendMessage(from, {

text:
`🏆━━━━━━━━━━━━━━━━━━━━━━🏆
      ${torneo.titulo}
🏆━━━━━━━━━━━━━━━━━━━━━━🏆

🥇 ${torneo.subtitulo}

📢 ${torneo.descripcion}

━━━━━━━━━━━━━━━━━━

🌎 Región
${torneo.region}

📅 Fecha
${torneo.proximaFecha}

🕒 Hora
${torneo.hora}

📋 Estado
${torneo.estado}

🎮 Formato
${torneo.formato}

🏅 Clasifican
${torneo.clasifican}

━━━━━━━━━━━━━━━━━━

👥 Equipos inscritos
${inscritos} / ${totalEquipos}

⚔️ Partidos jugados
${jugados} / ${total}

📈 Progreso
${progreso}%

🎮 Próximo partido
${proximo
? `${proximo.equipo1} 🆚 ${proximo.equipo2}`
: "No hay partidos programados"}

👑 Líder actual
${lider}

🏆 Campeón vigente
${campeonActual}

━━━━━━━━━━━━━━━━━━

📚 Comandos disponibles

${torneo.comandos.join("\n")}

━━━━━━━━━━━━━━━━━━

🤖 TitansBot v3`

        });

    }

};
