const { cargarEquipos } = require("../utils/equipos");

module.exports = {

    nombre: "equipoadminInfo",

    async ejecutar(sock, from, args) {

        const nombre = args.join(" ").trim();

        if (!nombre) {
            return await sock.sendMessage(from, {
                text:
`❌ Uso correcto

!equipoadmin info NombreDelEquipo`
            });
        }

        const equipos = cargarEquipos();
        const equipo = equipos[nombre];

        if (!equipo) {
            return await sock.sendMessage(from, {
                text: "❌ Ese equipo no existe."
            });
        }

        const mensaje =
`╔══════════════════════════════╗
║        📋 FICHA DEL EQUIPO        ║
╚══════════════════════════════╝

🛡️ Nombre:
${equipo.nombre}

👑 Líder:
${equipo.nombreLider || "Sin asignar"}

👥 Miembros:
${equipo.miembros.length}/${equipo.maxMiembros}

🏆 Nivel:
${equipo.nivel}

⭐ XP:
${equipo.xp}

🌟 Prestigio:
${equipo.prestigio}

🏅 Liga:
${equipo.liga}

⚔️ Victorias:
${equipo.victorias}

🤝 Empates:
${equipo.empates}

❌ Derrotas:
${equipo.derrotas}

👑 Campeonatos:
${equipo.campeonatos}

💰 Fondos:
${equipo.fondos.toLocaleString()}

📅 Creado:
${new Date(equipo.fechaCreacion).toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━

🤖 TitansBot v3`;

        await sock.sendMessage(from, {
            text: mensaje
        });

    }

};
