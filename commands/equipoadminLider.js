const { cargarEquipos, guardarEquipos } = require("../utils/equipos");

module.exports = {

    nombre: "equipoadminLider",

    async ejecutar(sock, from, args) {

        const texto = args.join(" ");
        const partes = texto.split("|").map(t => t.trim());

        if (partes.length < 3) {
            return await sock.sendMessage(from, {
                text:
`❌ Uso correcto

!equipoadmin lider NombreDelEquipo | Nombre del Nuevo Líder | @Número

Ejemplo:

!equipoadmin lider Starlight E-sport | Juan Pablo | @12017821839520`
            });
        }

        const nombreEquipo = partes[0];
        const nuevoNombreLider = partes[1];

        const nuevoLider =
            partes[2]
                .replace("@", "")
                .replace(/\D/g, "") + "@s.whatsapp.net";

        const equipos = cargarEquipos();

        if (!equipos[nombreEquipo]) {
            return await sock.sendMessage(from, {
                text: "❌ Ese equipo no existe."
            });
        }

        const equipo = equipos[nombreEquipo];

        equipo.lider = nuevoLider;
        equipo.nombreLider = nuevoNombreLider;

        if (!equipo.miembros.includes(nuevoLider)) {
            equipo.miembros.push(nuevoLider);
        }

        guardarEquipos(equipos);

        await sock.sendMessage(from, {
            text:
`✅ LÍDER ACTUALIZADO

🛡️ Equipo:
${equipo.nombre}

👑 Nuevo líder:
${nuevoNombreLider}

📱 ID:
${nuevoLider}

🤖 TitansBot v3`
        });

    }

};
