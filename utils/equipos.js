const { leerJSON, guardarJSON } = require('./database');

function cargarEquipos() {

   let equipos = leerJSON("equipos.json");

    if (!equipos || typeof equipos !== "object") {
        equipos = {};
    }

    return equipos;
}

function guardarEquipos(equipos) {
guardarJSON("equipos.json", equipos);
}

function obtenerEquipoUsuario(userId) {

    const equipos = cargarEquipos();

    // Compatibilidad entre @lid y @s.whatsapp.net
    const ids = [
        userId,
        userId.replace("@lid", "@s.whatsapp.net"),
        userId.replace("@s.whatsapp.net", "@lid")
    ];

    for (const nombre in equipos) {

        const equipo = equipos[nombre];

        if (!equipo || typeof equipo !== "object") continue;

        if (
            Array.isArray(equipo.miembros) &&
            equipo.miembros.some(id => ids.includes(id))
        ) {

            // Migración automática de equipos antiguos
            equipo.nombre ??= nombre;
            equipo.tag ??= "";
            equipo.descripcion ??= "";
            equipo.region ??= "";

            equipo.subLideres ??= [];
            equipo.reclutas ??= [];
            equipo.invitaciones ??= [];

            equipo.nivel ??= 1;
            equipo.xp ??= 0;
            equipo.prestigio ??= 0;
            equipo.liga ??= 1;

            equipo.fondos ??= 0;
            equipo.totalDepositado ??= 0;
            equipo.totalRetirado ??= 0;

            equipo.victorias ??= 0;
            equipo.derrotas ??= 0;
            equipo.empates ??= 0;
            equipo.campeonatos ??= 0;

            equipo.maxMiembros ??= 10;

            equipo.movimientos ??= [];

            equipo.fechaCreacion ??= Date.now();

            equipo.mejoras ??= {
                banco: 1,
                academia: 1,
                cuartel: 1,
                defensa: 1,
                reclutamiento: 1,
                salaTrofeos: 1
            };

            guardarEquipos(equipos);

            return {
                nombre,
                ...equipo
            };
        }
    }

    return null;
}

function existeEquipo(nombre) {
    const equipos = cargarEquipos();
    return equipos.hasOwnProperty(nombre);
}

function crearEquipo(datos) {

    const equipos = cargarEquipos();

    if (equipos[datos.nombre]) {
        return {
            ok: false,
            mensaje: "❌ Ya existe un equipo con ese nombre."
        };
    }

    equipos[datos.nombre] = {

        nombre: datos.nombre,
        tag: datos.tag || "",
        descripcion: "",
        region: "",

        lider: datos.lider,

        subLideres: [],

        miembros: [
            datos.lider
        ],

        reclutas: [],

        invitaciones: [],

        nivel: 1,

        xp: 0,

        prestigio: 0,

        liga: 1,

        fondos: 0,

        totalDepositado: 0,

        totalRetirado: 0,

        victorias: 0,

        derrotas: 0,

        empates: 0,

        campeonatos: 0,

        maxMiembros: 10,

        mejoras: {

            banco: 1,

            academia: 1,

            cuartel: 1,

            defensa: 1,

            reclutamiento: 1,

            salaTrofeos: 1

        },

        movimientos: [],

fechaCreacion: Date.now(),

inscrito: false,

temporada: null,

grupo: null

    };

    guardarEquipos(equipos);

    return {

        ok: true,

        equipo: equipos[datos.nombre]

    };

}

function agregarInvitacion(nombreEquipo, usuario) {
    const equipos = cargarEquipos();

    if (!equipos[nombreEquipo]) {
        return false;
    }

    const invitaciones = equipos[nombreEquipo].invitaciones || [];

    if (!invitaciones.includes(usuario)) {
        invitaciones.push(usuario);
    }

    equipos[nombreEquipo].invitaciones = invitaciones;

    guardarEquipos(equipos);

    return true;
}

function eliminarInvitacion(nombreEquipo, usuario) {
    const equipos = cargarEquipos();

    if (!equipos[nombreEquipo]) {
        return false;
    }

    equipos[nombreEquipo].invitaciones =
        (equipos[nombreEquipo].invitaciones || [])
            .filter(id => id !== usuario);

    guardarEquipos(equipos);

    return true;
}

function tieneInvitacion(usuario) {
    const equipos = cargarEquipos();

    for (const nombre in equipos) {
        const equipo = equipos[nombre];

        if (
            equipo.invitaciones &&
            equipo.invitaciones.includes(usuario)
        ) {
            return equipo;
        }
    }

    return null;
}

function agregarMiembro(nombreEquipo, usuario) {
    const equipos = cargarEquipos();

    if (!equipos[nombreEquipo]) {
        return false;
    }

    const equipo = equipos[nombreEquipo];

    if (!equipo.miembros.includes(usuario)) {
        equipo.miembros.push(usuario);
    }

    equipo.invitaciones =
        (equipo.invitaciones || []).filter(id => id !== usuario);

    guardarEquipos(equipos);

    return true;
}

function ascenderSubLider(nombreEquipo, usuario) {
    const equipos = cargarEquipos();

    if (!equipos[nombreEquipo]) {
        return {
            ok: false,
            mensaje: "El equipo no existe."
        };
    }

    const equipo = equipos[nombreEquipo];

    if (!equipo.miembros.includes(usuario)) {
        return {
            ok: false,
            mensaje: "El jugador no pertenece al equipo."
        };
    }

    if (equipo.lider === usuario) {
        return {
            ok: false,
            mensaje: "El líder ya tiene el máximo rango."
        };
    }

    if (equipo.subLideres.includes(usuario)) {
        return {
            ok: false,
            mensaje: "Ese jugador ya es Sublíder."
        };
    }

    if (equipo.subLideres.length >= 2) {
        return {
            ok: false,
            mensaje: "Ya alcanzaste el límite de Sublíderes."
        };
    }

    equipo.subLideres.push(usuario);

    guardarEquipos(equipos);

    return {
        ok: true
    };
}

function degradarSubLider(nombreEquipo, usuario) {
    const equipos = cargarEquipos();

    if (!equipos[nombreEquipo]) {
        return {
            ok: false,
            mensaje: "El equipo no existe."
        };
    }

    const equipo = equipos[nombreEquipo];

    if (!equipo.subLideres.includes(usuario)) {
        return {
            ok: false,
            mensaje: "Ese jugador no es Sublíder."
        };
    }

    equipo.subLideres =
        equipo.subLideres.filter(id => id !== usuario);

    guardarEquipos(equipos);

    return {
        ok: true
    };
}

function expulsarMiembro(nombreEquipo, usuario) {
    const equipos = cargarEquipos();

    if (!equipos[nombreEquipo]) {
        return {
            ok: false,
            mensaje: "El equipo no existe."
        };
    }

    const equipo = equipos[nombreEquipo];

    if (!equipo.miembros.includes(usuario)) {
        return {
            ok: false,
            mensaje: "El jugador no pertenece al equipo."
        };
    }

    if (equipo.lider === usuario) {
        return {
            ok: false,
            mensaje: "No puedes expulsar al Líder."
        };
    }

    equipo.miembros = equipo.miembros.filter(id => id !== usuario);
    equipo.subLideres = equipo.subLideres.filter(id => id !== usuario);

    guardarEquipos(equipos);

    return {
        ok: true
    };
}

function abandonarEquipo(usuario) {
    const equipos = cargarEquipos();

    for (const nombre in equipos) {
        const equipo = equipos[nombre];

        if (!equipo.miembros.includes(usuario)) continue;

        if (equipo.lider === usuario) {
            return {
                ok: false,
                mensaje: "El Líder no puede abandonar el equipo. Debe transferir el liderazgo o disolver el equipo."
            };
        }

        equipo.miembros = equipo.miembros.filter(id => id !== usuario);
        equipo.subLideres = equipo.subLideres.filter(id => id !== usuario);

        guardarEquipos(equipos);

        return {
            ok: true,
            equipo: nombre
        };
    }

    return {
        ok: false,
        mensaje: "No perteneces a ningún equipo."
    };
}

function depositarFondos(nombreEquipo, usuario, cantidad) {

    const equipos = cargarEquipos();

    if (!equipos[nombreEquipo]) {
        return {
            ok: false,
            mensaje: "El equipo no existe."
        };
    }

    const equipo = equipos[nombreEquipo];

    equipo.fondos += cantidad;
    equipo.totalDepositado += cantidad;

    equipo.movimientos.push({
        tipo: "DEPOSITO",
        usuario,
        cantidad,
        fecha: Date.now()
    });

    guardarEquipos(equipos);

    return {
        ok: true
    };
}

function retirarFondos(nombreEquipo, usuario, cantidad) {

    const equipos = cargarEquipos();

    if (!equipos[nombreEquipo]) {
        return {
            ok: false,
            mensaje: "El equipo no existe."
        };
    }

    const equipo = equipos[nombreEquipo];

    if (equipo.fondos < cantidad) {
        return {
            ok: false,
            mensaje: "El equipo no tiene suficientes fondos."
        };
    }

    equipo.fondos -= cantidad;
    equipo.totalRetirado += cantidad;

    equipo.movimientos.push({
        tipo: "RETIRO",
        usuario,
        cantidad,
        fecha: Date.now()
    });

    guardarEquipos(equipos);

    return {
        ok: true
    };
}

function mejorarEquipo(nombreEquipo, mejora) {

    const equipos = cargarEquipos();

    const CONFIG = require("../config/equipos");

    if (!equipos[nombreEquipo]) {
        return {
            ok: false,
            mensaje: "El equipo no existe."
        };
    }

    const equipo = equipos[nombreEquipo];

    if (!equipo.mejoras[mejora]) {
        return {
            ok: false,
            mensaje: "La mejora no existe."
        };
    }

    const datos = CONFIG.MEJORAS[mejora];

    const nivelActual = equipo.mejoras[mejora];

    if (nivelActual >= datos.max) {
        return {
            ok: false,
            mensaje: "La mejora ya alcanzó el nivel máximo."
        };
    }

    const costo = datos.costo * nivelActual;

    if (equipo.fondos < costo) {
        return {
            ok: false,
            mensaje: "Fondos insuficientes."
        };
    }

    equipo.fondos -= costo;

    equipo.mejoras[mejora]++;

    equipo.movimientos.push({
        tipo: "MEJORA",
        mejora,
        cantidad: costo,
        fecha: Date.now()
    });

    guardarEquipos(equipos);

    return {
        ok: true,
        costo,
        nivel: equipo.mejoras[mejora]
    };
}

function cargarGuerras() {
    return leerJSON("guerras.json") || {};
}

function guardarGuerras(guerras) {
    guardarJSON("guerras.json", guerras);
}

function obtenerEquipo(nombre) {

    const equipos = cargarEquipos();

    return equipos[nombre] || null;

}

function obtenerEquipos() {

    return cargarEquipos();

}

function cambiarLider(nombreEquipo, nuevoLider) {

    const equipos = cargarEquipos();

    if (!equipos[nombreEquipo]) {

        return {
            ok: false,
            mensaje: "El equipo no existe."
        };

    }

    const equipo = equipos[nombreEquipo];

    // Si el nuevo líder no pertenece al equipo,
    // se agrega automáticamente.

    if (!equipo.miembros.includes(nuevoLider)) {
        equipo.miembros.push(nuevoLider);
    }

    // Si era sublíder, deja de serlo.

    equipo.subLideres =
        equipo.subLideres.filter(id => id !== nuevoLider);

    // Nuevo líder

    equipo.lider = nuevoLider;

    guardarEquipos(equipos);

    return {
        ok: true
    };

}

function eliminarEquipo(nombreEquipo) {

    const equipos = cargarEquipos();

    if (!equipos[nombreEquipo]) {

        return {
            ok: false,
            mensaje: "El equipo no existe."
        };

    }

    delete equipos[nombreEquipo];

    guardarEquipos(equipos);

    return {
        ok: true
    };

}

function transferirLider(nombreEquipo, nuevoLider) {

    const equipos = cargarEquipos();

    if (!equipos[nombreEquipo]) {
        return {
            ok: false,
            mensaje: "El equipo no existe."
        };
    }

    const equipo = equipos[nombreEquipo];

    if (!equipo.miembros.includes(nuevoLider)) {
        return {
            ok: false,
            mensaje: "El nuevo líder debe pertenecer al equipo."
        };
    }

    // Si era sublíder deja de serlo
    equipo.subLideres =
        equipo.subLideres.filter(id => id !== nuevoLider);

    equipo.lider = nuevoLider;

    guardarEquipos(equipos);

    return {
        ok: true,
        equipo
    };
}

function inscribirEquipo(nombreEquipo, temporada) {

    const equipos = cargarEquipos();

    if (!equipos[nombreEquipo]) {
        return {
            ok: false,
            mensaje: "El equipo no existe."
        };
    }

    const equipo = equipos[nombreEquipo];

    if (equipo.inscrito) {
        return {
            ok: false,
            mensaje: "Ese equipo ya está inscrito."
        };
    }

    equipo.inscrito = true;
    equipo.temporada = temporada;
    equipo.grupo = null;

    guardarEquipos(equipos);

    return {
        ok: true,
        equipo
    };
}

module.exports = {
    cargarEquipos,
    guardarEquipos,

    obtenerEquipoUsuario,
    obtenerEquipo,
    obtenerEquipos,

    existeEquipo,
    crearEquipo,

    agregarInvitacion,
    eliminarInvitacion,
    tieneInvitacion,
    agregarMiembro,

    ascenderSubLider,
    degradarSubLider,

    expulsarMiembro,
    abandonarEquipo,

    depositarFondos,
    retirarFondos,
    mejorarEquipo,

    cargarGuerras,
    guardarGuerras,

    cambiarLider,
    transferirLider,
    eliminarEquipo,

    inscribirEquipo
};
