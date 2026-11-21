"use strict";

const {
    normalizarIdentidad,
    obtenerCandidatosIdentidad
} = require("./comunidad");

const RAREZAS_CAJAS = Object.freeze([
    "comun",
    "rara",
    "epica",
    "legendaria",
    "especial"
]);

const INVENTARIO_VACIO = Object.freeze({
    cajas: 0,
    cajasPorRareza: Object.freeze({
        comun: 0,
        rara: 0,
        epica: 0,
        legendaria: 0,
        especial: 0
    }),
    objetos: []
});

function errorInventario(motivo, detalles = {}) {
    return {
        ok: false,
        motivo,
        ...detalles
    };
}

function validarRegistro(registro) {
    if (!registro || typeof registro !== "object" || Array.isArray(registro)) {
        return errorInventario("inventario_invalido");
    }

    const cajas = registro.cajas === undefined
        ? 0
        : Number(registro.cajas);

    const objetos = registro.objetos === undefined
        ? []
        : registro.objetos;

    if (!Number.isSafeInteger(cajas) || cajas < 0) {
        return errorInventario("cantidad_cajas_invalida");
    }

    if (!Array.isArray(objetos)) {
        return errorInventario("lista_objetos_invalida");
    }

    const origenRarezas = registro.cajasPorRareza === undefined
        ? {}
        : registro.cajasPorRareza;

    if (
        !origenRarezas ||
        typeof origenRarezas !== "object" ||
        Array.isArray(origenRarezas)
    ) {
        return errorInventario("cajas_por_rareza_invalidas");
    }

    for (const clave of Object.keys(origenRarezas)) {
        if (!RAREZAS_CAJAS.includes(clave)) {
            return errorInventario("rareza_caja_desconocida", {
                rareza: clave
            });
        }
    }

    const cajasPorRareza = {};

    for (const rareza of RAREZAS_CAJAS) {
        const cantidad = origenRarezas[rareza] === undefined
            ? 0
            : Number(origenRarezas[rareza]);

        if (!Number.isSafeInteger(cantidad) || cantidad < 0) {
            return errorInventario("cantidad_caja_rareza_invalida", {
                rareza
            });
        }

        cajasPorRareza[rareza] = cantidad;
    }

    return {
        ok: true,
        inventario: {
            ...registro,
            cajas,
            cajasPorRareza,
            objetos: [...objetos]
        }
    };
}

/*
 * No fusiona identidades.
 * Si hay más de una variante almacenada, rechaza la resolución.
 * Si no existe ninguna, propone la clave canónica @lid sin persistirla.
 */
function resolverInventario(identidad, inventarios = {}) {
    if (
        !identidad ||
        typeof identidad !== "string" ||
        !identidad.trim()
    ) {
        return errorInventario("identidad_invalida");
    }

    if (
        !inventarios ||
        typeof inventarios !== "object" ||
        Array.isArray(inventarios)
    ) {
        return errorInventario("archivo_inventarios_invalido");
    }

    const base = normalizarIdentidad(identidad);

    if (!base) {
        return errorInventario("identidad_invalida");
    }

    const candidatos = obtenerCandidatosIdentidad(identidad);

    const encontrados = candidatos.filter(clave =>
        Object.prototype.hasOwnProperty.call(inventarios, clave)
    );

    if (encontrados.length > 1) {
        return errorInventario("identidad_ambigua", {
            claves: encontrados
        });
    }

    const clave = encontrados.length === 1
        ? encontrados[0]
        : `${base}@lid`;

    if (encontrados.length === 0) {
        return {
            ok: true,
            clave,
            existente: false,
            inventario: {
                cajas: INVENTARIO_VACIO.cajas,
                cajasPorRareza: { ...INVENTARIO_VACIO.cajasPorRareza },
                objetos: []
            }
        };
    }

    const validacion = validarRegistro(inventarios[clave]);

    if (!validacion.ok) {
        return errorInventario(validacion.motivo, {
            clave,
            ...(validacion.rareza ? { rareza: validacion.rareza } : {})
        });
    }

    return {
        ok: true,
        clave,
        existente: true,
        inventario: validacion.inventario
    };
}

function obtenerInventario(identidad, inventarios = {}) {
    return resolverInventario(identidad, inventarios);
}

module.exports = {
    RAREZAS_CAJAS,
    resolverInventario,
    obtenerInventario,
    validarRegistro
};
