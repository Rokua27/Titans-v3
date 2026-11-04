const { cargarEquipos, guardarEquipos } = require("../utils/equipos");

module.exports = {

    nombre: "equipoadminEliminar",

    async ejecutar(sock, from, args) {

        const nombre = args.join(" ").trim();

        if (!nombre) {
            return await sock.sendMessage(from, {
                text:
`❌ Uso correcto

!equipoadmin eliminar NombreDelEquipo`
            });
        }

        const equipos = cargarEquipos();

        if (!equipos[nombre]) {
            return await sock.sendMessage(from, {
                text: "❌ Ese equipo no existe."
            });
        }

        const datos = equipos[nombre];

        delete equipos[nombre];

        guardarEquipos(equipos);

        await sock.sendMessage(from, {
            text:
`🗑️ EQUIPO ELIMINADO

🛡️ Equipo:
${datos.nombre}

👑 Líder:
${datos.nombreLider || "Sin asignar"}

✅ El equipo fue eliminado correctamente.

🤖 TitansBot v3`
        });

    }

};
