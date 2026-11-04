const { obtenerEquipoUsuario } = require("../utils/equipos");
const { obtenerTabla } = require("../utils/torneoManager");

module.exports = {
    nombre: "estadisticas",
    alias: ["stats"],
    categoria: "equipos",
    descripcion: "Muestra las estadísticas del equipo.",
    uso: "!estadisticas",

    async ejecutar(sock, from, args, msg) {

        const sender = msg.key.participant || msg.key.remoteJid;

        const equipo = obtenerEquipoUsuario(sender);

        if (!equipo) {
            return await sock.sendMessage(from, {
                text: "❌ No perteneces a ningún equipo."
            });
        }

        const tabla = obtenerTabla();

        const registro = tabla.equipos.find(
            e => e.nombre === equipo.nombre
        ) || {
            pj: 0,
            victorias: 0,
            empates: 0,
            derrotas: 0,
            puntos: 0
        };

        const winRate =
            registro.pj === 0
                ? 0
                : Math.round((registro.victorias / registro.pj) * 100);

        const ligas = {
            1: "Bronce I",
            2: "Plata I",
            3: "Oro I",
            4: "Diamante",
            5: "Titán"
        };

        await sock.sendMessage(from, {
            text:
`╔════════════════════════════╗
        🏆 LIGA TITANS TEAM
╚════════════════════════════╝

🛡 Equipo
${equipo.nombre}

👑 Líder
${equipo.nombreLider || "Desconocido"}

━━━━━━━━━━━━━━━━━━━━

🏅 Liga
${ligas[equipo.liga] || "Bronce I"}

⭐ Nivel
${equipo.nivel}

✨ XP
${equipo.xp}

👑 Prestigio
${equipo.prestigio}

━━━━━━━━━━━━━━━━━━━━

⚔ PJ
${registro.pj}

✅ Victorias
${registro.victorias}

🤝 Empates
${registro.empates}

❌ Derrotas
${registro.derrotas}

🏆 Puntos
${registro.puntos}

🔥 Win Rate
${winRate}%

━━━━━━━━━━━━━━━━━━━━

👥 Miembros
${equipo.miembros.length}/${equipo.maxMiembros}

💰 Fondos
$${equipo.fondos.toLocaleString("es-CO")}

🥇 Campeonatos
${equipo.campeonatos}

━━━━━━━━━━━━━━━━━━━━

🤖 TitansBot v3`
        });

    }
};
