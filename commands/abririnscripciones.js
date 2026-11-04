const {
    abrirInscripciones,
    obtenerTemporada
} = require("../utils/torneoManager");

module.exports = {

    nombre: "abririnscripciones",

    alias: ["abrirregistro"],

    categoria: "torneos",

    descripcion: "Abre las inscripciones del torneo.",

    permisos: ["admin"],

    uso: "!abririnscripciones",

    async ejecutar(sock, from) {

        const temporada = obtenerTemporada();

        if (!temporada.nombre || temporada.nombre === "Sin temporada") {

            return await sock.sendMessage(from, {

                text:
`❌ No existe una temporada creada.`

            });

        }

        if (temporada.inscripciones) {

            return await sock.sendMessage(from, {

                text:
`⚠️ Las inscripciones ya están abiertas.`

            });

        }

        abrirInscripciones();

        await sock.sendMessage(from, {

            text:
`╔══════════════════════════════╗
║    🟢 INSCRIPCIONES ABIERTAS  ║
╚══════════════════════════════╝

🏆 Temporada:
${temporada.nombre}

✅ Los equipos ya pueden inscribirse.

⚔️ ¡Comienza la preparación para una nueva batalla!

🤖 TitansBot v3`

        });

    }

};
