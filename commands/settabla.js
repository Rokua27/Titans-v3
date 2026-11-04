const { leerJSON, guardarJSON } = require("../utils/database");

module.exports = {
    nombre: "settabla",

    alias: [],

    categoria: "admin",

    descripcion: "Actualiza la tabla de posiciones.",

    uso: "!settabla",

    permisos: ["admin"],

    async ejecutar(sock, from, args) {

        if (args.length < 5) {
            return await sock.sendMessage(from, {
                text:
`❌ Uso correcto:

!settabla <equipo> <puntos> <pj> <victorias> <derrotas>

Ejemplo:
!settabla Titans 24 8 8 0`
            });
        }

        const [nombre, puntos, pj, victorias, derrotas] = args;

        const tabla = leerJSON("tabla.json") || {
            equipos: []
        };

        const index = tabla.equipos.findIndex(
            e => e.nombre.toLowerCase() === nombre.toLowerCase()
        );

        const nuevoEquipo = {
            nombre,
            puntos: Number(puntos),
            pj: Number(pj),
            victorias: Number(victorias),
            empates: 0,
            derrotas: Number(derrotas)
        };

        if (index >= 0) {
            tabla.equipos[index] = nuevoEquipo;
        } else {
            tabla.equipos.push(nuevoEquipo);
        }

        tabla.equipos.sort((a, b) => {

            if (b.puntos !== a.puntos)
                return b.puntos - a.puntos;

            return b.victorias - a.victorias;

        });

        guardarJSON("tabla.json", tabla);

        await sock.sendMessage(from, {
            text:
`✅ Tabla actualizada

🏷️ Equipo: ${nombre}
⭐ Puntos: ${puntos}
🎮 PJ: ${pj}
🏆 Victorias: ${victorias}
❌ Derrotas: ${derrotas}`
        });

    }
};
