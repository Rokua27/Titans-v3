const { leerJSON, guardarJSON } = require("../utils/database");
const { esAdmin } = require("../utils/admin");
const generarTablaSVG = require("../utils/generarTablaSVG");


const {
    obtenerFixture,
    guardarFixture,
    obtenerTabla,
    guardarTabla,
    cerrarTorneo
} = require("../utils/torneoManager");

const {
    cargarEquipos,
    guardarEquipos
} = require("../utils/equipos");

module.exports = {

    nombre: "setresultado",

    alias: [],

    categoria: "admin",

    descripcion: "Registra el resultado oficial de un enfrentamiento.",

    permisos: ["admin"],

    uso: "!setresultado <partido> <equipo ganador>",

    async ejecutar(sock, from, args, msg) {

        const sender = msg.key.participant || msg.key.remoteJid;

        if (!(await esAdmin(sock, from, sender))) {
            return await sock.sendMessage(from, {
                text: "⛔ Solo los administradores pueden usar este comando."
            });
        }

        if (args.length < 2) {
            return await sock.sendMessage(from, {
                text:
`❌ Uso correcto:

!setresultado 1 Titans Wolves`
            });
        }

        const numero = Number(args[0]);
        const ganador = args.slice(1).join(" ");

const fixture = obtenerFixture();
const torneo = leerJSON("torneo.json") || {};

// ========================================================
// 🏆 TITANS PRIDE CUP — PROTECCIÓN DE RESULTADO
// ========================================================
// En eliminación directa, el resultado oficial BO3 debe
// pasar por matchlive.js + game.js para conservar el score,
// cerrar la serie y avanzar automáticamente de ronda.
if (
    String(torneo.formato || "").trim().toLowerCase() ===
    "eliminación directa".toLowerCase()
) {
    return await sock.sendMessage(from, {
        text:
`🏆 TITANS PRIDE CUP — RESULTADO BO3

⚠️ Este torneo utiliza eliminación directa.

🎮 El resultado oficial debe registrarse mediante:
!matchlive EquipoA vs EquipoB

Después utiliza el sistema LIVE para registrar las partidas
hasta que un equipo llegue a 2 victorias.

🚫 !setresultado no puede utilizarse para este torneo,
porque omitiría el marcador BO3 y el avance automático.`
    });
}


const partido = fixture.enfrentamientos.find(
    p => p.numero === numero
);

if (!partido) {
    return await sock.sendMessage(from, {
        text: "❌ Ese enfrentamiento no existe."
    });
}

if (partido.estado === "finalizado") {
    return await sock.sendMessage(from, {
        text:
`⚠️ El partido #${numero} ya tiene un resultado registrado.

🏆 Ganador oficial: **${partido.ganador || "No disponible"}**

❌ No se modificará nuevamente la clasificación.`
    });
}

if (
    ganador !== partido.equipo1 &&
    ganador !== partido.equipo2
) {
    return await sock.sendMessage(from, {
        text:
`❌ El equipo indicado no pertenece a este enfrentamiento.

🥊 Partido #${numero}

🛡️ ${partido.equipo1}

🆚

🛡️ ${partido.equipo2}`
    });
}


partido.ganador = ganador;
partido.estado = "finalizado";

guardarFixture(fixture);

const tabla = obtenerTabla();

console.log("========== TABLA ==========");
console.log(tabla);

const rival =
    partido.equipo1 === ganador
        ? partido.equipo2
        : partido.equipo1;

function obtenerRegistro(nombre) {

    let equipo = tabla.equipos.find(
        e => e.nombre === nombre
    );

    if (!equipo) {

        equipo = {
            nombre,
            pj: 0,
            victorias: 0,
            empates: 0,
            derrotas: 0,
            gf: 0,
            gc: 0,
            dg: 0,
            puntos: 0
        };

        tabla.equipos.push(equipo);

    }

    return equipo;

}

const equipoGanador = obtenerRegistro(ganador);
const equipoPerdedor = obtenerRegistro(rival);

console.log("========== EQUIPOS ==========");
console.log(equipoGanador);
console.log(equipoPerdedor);

equipoGanador.pj++;
equipoGanador.victorias++;
equipoGanador.puntos += 3;

equipoPerdedor.pj++;
equipoPerdedor.derrotas++;

tabla.equipos.sort((a, b) => {

    if (b.puntos !== a.puntos) {
        return b.puntos - a.puntos;
    }

    return b.victorias - a.victorias;

});

console.log("========== TABLA FINAL ==========");
console.log(JSON.stringify(tabla, null, 2));

guardarTabla(tabla);

try {

    await generarTablaSVG();

} catch (error) {

    console.error("Error generando tabla:", error);

}

const pendientes = fixture.enfrentamientos.filter(
    partido => partido.estado !== "finalizado"
);

if (pendientes.length === 0) {

    await cerrarTorneo(sock, from);

}

await sock.sendMessage(from, {
    text:
`╔════════════════════════════╗
        🏆 LIGA TITANS TEAM
╚════════════════════════════╝

⚔️ RESULTADO OFICIAL

🥊 Partido #${numero}

🛡️ ${partido.equipo1}

🆚

🛡️ ${partido.equipo2}

━━━━━━━━━━━━━━━━━━━━

👑 GANADOR

🏆 ${ganador}

━━━━━━━━━━━━━━━━━━━━

📊 La clasificación del torneo
ha sido actualizada automáticamente.

🤖 TitansBot v3`
});

    }

};
