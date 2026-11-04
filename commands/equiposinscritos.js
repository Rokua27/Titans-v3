const { cargarEquipos } = require("../utils/equipos");
const torneo = require("../database/torneo.json");

module.exports = {

    nombre: "equiposinscritos",
    alias: ["inscritos"],
    categoria: "torneos",
    descripcion: "Muestra los equipos inscritos en el torneo.",
    permisos: ["usuario"],
    uso: "!equiposinscritos",

    async ejecutar(sock, from) {

        const equipos = cargarEquipos();

        const inscritos = Object.values(equipos)
            .filter(e => e.inscrito)
            .sort((a, b) => a.nombre.localeCompare(b.nombre));

        const totalInscritos = inscritos.length;

        if (totalInscritos === 0) {

            return await sock.sendMessage(from, {
                text:
`╔══════════════════════════════╗
        🏆 LIGA TITANS TEAM
╚══════════════════════════════╝

📋 EQUIPOS INSCRITOS

🏆 Torneo
${torneo.nombre}

👤 Organizador
${torneo.creador}

📅 Fecha oficial
${torneo.proximaFecha}

🕒 Hora de inicio
${torneo.horaInicio}

📌 Estado
${torneo.estado}

━━━━━━━━━━━━━━━━━━

❌ Aún no hay equipos inscritos.

🤖 TitansBot v3`
            });

        }

        const listaEquipos = inscritos
            .map((e, i) => `${i + 1}. 🛡️ ${e.nombre}`)
            .join("\n\n");

        const mensaje =
`╔══════════════════════════════╗
        🏆 LIGA TITANS TEAM
╚══════════════════════════════╝

📋 EQUIPOS INSCRITOS

🏆 Torneo
${torneo.nombre}

👤 Organizador
${torneo.creador}

📅 Fecha oficial
${torneo.proximaFecha}

🕒 Hora de inicio
${torneo.horaInicio}

📌 Estado
${torneo.estado}

━━━━━━━━━━━━━━━━━━

👥 EQUIPOS REGISTRADOS

${listaEquipos}

━━━━━━━━━━━━━━━━━━

📊 Total inscritos
${totalInscritos} equipos

━━━━━━━━━━━━━━━━━━

⚔️ Espera la publicación del fixture oficial.

🤖 TitansBot v3`;

        await sock.sendMessage(from, {
            text: mensaje
        });

    }

};
