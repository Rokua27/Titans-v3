const { cargarEquipos } = require("../utils/equipos");

module.exports = {

    nombre: "equipoadminListar",

    async ejecutar(sock, from) {

        const equipos = cargarEquipos();

        const lista = Object.values(equipos);

        if (!lista.length) {
            return await sock.sendMessage(from, {
                text: "❌ No existen equipos registrados."
            });
        }

        let mensaje =
`╔══════════════════════════════╗
║      🛡️ EQUIPOS OFICIALES 🛡️      ║
╚══════════════════════════════╝

`;

        lista.forEach((equipo, index) => {

            mensaje +=
`${index + 1}. 🛡️ ${equipo.nombre}

👑 Líder: ${equipo.nombreLider || "Sin asignar"}

👥 Miembros: ${equipo.miembros.length}

🏆 Nivel: ${equipo.nivel}

⭐ Prestigio: ${equipo.prestigio}

💰 Fondos: ${equipo.fondos.toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━

`;

        });

        mensaje += "🤖 TitansBot v3";

        await sock.sendMessage(from, {
            text: mensaje
        });

    }

};
