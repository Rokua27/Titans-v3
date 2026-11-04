const { cargarEquipos, guardarEquipos } = require("../utils/equipos");
const { obtenerNombre } = require("../utils/usuarios");

module.exports = {
    nombre: "equipoadminCrear",

    async ejecutar(sock, from, args) {

        const texto = args.join(" ");
        const partes = texto.split("|").map(t => t.trim());

        if (partes.length < 3) {
            return await sock.sendMessage(from, {
                text:
`❌ Uso correcto

!equipoadmin crear NombreDelEquipo | Nombre del Líder | @Número

Ejemplo:

!equipoadmin crear Starlight E-sport | Titan Heat | @12017821839520`
            });
        }

        const nombre = partes[0];
        const nombreLider = partes[1];

        const lider =
            partes[2]
                .replace("@", "")
                .replace(/\D/g, "") + "@s.whatsapp.net";

        const equipos = cargarEquipos();

        if (equipos[nombre]) {
            return await sock.sendMessage(from, {
                text: "❌ Ya existe un equipo con ese nombre."
            });
        }

        equipos[nombre] = {

            nombre,

            lider,

            nombreLider,

            miembros: [lider],

            nivel: 1,

            xp: 0,

            prestigio: 0,

            liga: 1,

            victorias: 0,

            derrotas: 0,

            empates: 0,

            campeonatos: 0,

            fondos: 0,

            totalDepositado: 0,

            totalRetirado: 0,

            movimientos: [],

            subLideres: [],

            reclutas: [],

            invitaciones: [],

            maxMiembros: 10,

            tag: "",

            descripcion: "",

            region: "",

            inscrito: false,

            fechaCreacion: Date.now(),

            mejoras: {
                banco: 1,
                academia: 1,
                cuartel: 1,
                defensa: 1,
                reclutamiento: 1,
                salaTrofeos: 1
            }

        };

        guardarEquipos(equipos);

await sock.sendMessage(from, {
    text:
`✅ EQUIPO CREADO

🛡️ Equipo:
${nombre}

👑 Capitán:
${nombreLider}

📢 Se ha notificado al nuevo Capitán.

🎉 El equipo quedó registrado correctamente.`,
    mentions: [lider]
});

    }

};
