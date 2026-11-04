const { leerJSON, guardarJSON } = require("../database");

const CAMPOS_PERMITIDOS = [
    "nombre",
    "premio",
    "proximaFecha",
    "horaInicio",
    "maxEquipos",
    "formato"
];

function ejecutarPlanTorneo(plan) {
    if (!plan || plan.accion !== "crear_torneo") {
        return {
            ejecutado: false,
            cambiosAplicados: [],
            errores: ["El plan no es válido para ejecución."]
        };
    }

    if (plan.requiereConfirmacion !== false) {
        return {
            ejecutado: false,
            cambiosAplicados: [],
            errores: [
                "El plan requiere confirmación antes de ejecutar cambios."
            ]
        };
    }

    const cambios = plan.cambios || {};
    const campos = Object.keys(cambios);

    const camposNoPermitidos = campos.filter(
        campo => !CAMPOS_PERMITIDOS.includes(campo)
    );

    if (camposNoPermitidos.length > 0) {
        return {
            ejecutado: false,
            cambiosAplicados: [],
            errores: [
                `Campos no permitidos para ejecución: ${camposNoPermitidos.join(", ")}`
            ]
        };
    }

    const torneo = leerJSON("torneo.json") || {};
    const cambiosAplicados = [];

    for (const campo of CAMPOS_PERMITIDOS) {
        if (Object.prototype.hasOwnProperty.call(cambios, campo)) {
            torneo[campo] = cambios[campo];
            cambiosAplicados.push({
                campo,
                valor: cambios[campo]
            });
        }
    }

    if (cambiosAplicados.length === 0) {
        return {
            ejecutado: false,
            cambiosAplicados: [],
            errores: [
                "No existen cambios permitidos para aplicar."
            ]
        };
    }

    guardarJSON("torneo.json", torneo);

    return {
        ejecutado: true,
        cambiosAplicados,
        errores: []
    };
}

module.exports = {
    ejecutarPlanTorneo,
    CAMPOS_PERMITIDOS
};
