const { leerJSON } = require("../utils/database");

module.exports = {

    nombre: "clasificacion",

    alias: ["tablafinal"],

    categoria: "torneos",

    descripcion: "Muestra la clasificación final del torneo.",

    permisos: ["usuario"],

    uso: "!clasificacion",

    async ejecutar(sock, from) {

        const tabla = leerJSON("tabla.json") || {
            equipos: []
        };

        if (tabla.equipos.length === 0) {
            return await sock.sendMessage(from, {
                text: "❌ No hay clasificación registrada."
            });
        }

let mensaje = `
╔══════════════════════════════╗
║      🏆 LIGA TITANS TEAM 🏆
╠══════════════════════════════╣
║      ⚔️ CLASIFICACIÓN FINAL
╚══════════════════════════════╝

🔥 Después de una temporada llena de
batallas, estrategia y trabajo en equipo...

📜 Así quedó la clasificación oficial.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏅 POS │ EQUIPO               │ PTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

tabla.equipos.forEach((equipo, i) => {

    let medalla = "🔹";

    if (i === 0) medalla = "🥇";
    else if (i === 1) medalla = "🥈";
    else if (i === 2) medalla = "🥉";

    mensaje += `${medalla} ${String(i + 1).padStart(2,"0")} │ ${equipo.nombre.padEnd(20)} ${equipo.puntos}\n`;

});

mensaje += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👑 CAMPEÓN
🥇 ${tabla.equipos[0].nombre}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚔️ Gracias a todos los equipos
que hicieron parte de esta temporada.

🔥 La historia termina...
pero una nueva temporada está por comenzar.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 Liga Titans Team
🤖 TitansBot v3
`;

        await sock.sendMessage(from, {
            text: mensaje
        });

    }

};
