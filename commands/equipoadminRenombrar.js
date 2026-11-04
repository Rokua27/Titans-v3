const { cargarEquipos, guardarEquipos } = require("../utils/equipos");

module.exports = {

    nombre: "equipoadminRenombrar",

    async ejecutar(sock, from, args) {

        const texto = args.join(" ");
        const partes = texto.split("|").map(t => t.trim());

        if (partes.length < 2) {
            return await sock.sendMessage(from, {
                text:
`❌ Uso correcto

!equipoadmin renombrar NombreActual | NuevoNombre

Ejemplo:

!equipoadmin renombrar Starlight E-sport | Titans Elite`
            });
        }

        const nombreActual = partes[0];
        const nuevoNombre = partes[1];

        const equipos = cargarEquipos();

        if (!equipos[nombreActual]) {
            return await sock.sendMessage(from, {
                text: "❌ Ese equipo no existe."
            });
        }

        if (equipos[nuevoNombre]) {
            return await sock.sendMessage(from, {
                text: "❌ Ya existe un equipo con ese nombre."
            });
        }

        const datos = equipos[nombreActual];

        datos.nombre = nuevoNombre;

        equipos[nuevoNombre] = datos;

        delete equipos[nombreActual];

        guardarEquipos(equipos);

        await sock.sendMessage(from, {
            text:
`✅ EQUIPO RENOMBRADO

🛡️ Nombre anterior:
${nombreActual}

➡️ Nuevo nombre:
${nuevoNombre}

🤖 TitansBot v3`
        });

    }

};
