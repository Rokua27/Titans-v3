const {
    cerrarInscripciones,
    obtenerTemporada
} = require("../utils/torneoManager");

module.exports = {

    nombre: "cerrarinscripciones",

    alias: ["cerrarregistro"],

    categoria: "torneos",

    descripcion: "Cierra las inscripciones del torneo.",

    permisos: ["admin"],

    uso: "!cerrarinscripciones",

    async ejecutar(sock, from) {

        const temporada = obtenerTemporada();

        if (!temporada.nombre || temporada.nombre === "Sin temporada") {

            return await sock.sendMessage(from, {
                text: "❌ No existe una temporada creada."
            });

        }

        if (!temporada.inscripciones) {

            return await sock.sendMessage(from, {
                text: "⚠️ Las inscripciones ya están cerradas."
            });

        }

        cerrarInscripciones();

        await sock.sendMessage(from, {

            text:
`╔══════════════════════════════╗
║    🔴 INSCRIPCIONES CERRADAS ║
╚══════════════════════════════╝

🏆 Temporada:
${temporada.nombre}

⛔ Ya no se aceptarán más equipos.

⚔️ La organización del torneo comenzará.

🤖 TitansBot v3`

        });

    }

};
