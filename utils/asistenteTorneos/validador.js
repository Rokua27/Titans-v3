const { leerJSON } = require("../database");

function validarPlanTorneo(plan, torneoActual = null) {
    const errores = [];
    const advertencias = [];

    if (!plan || plan.accion !== "crear_torneo") {
        errores.push("La acción del plan no es crear_torneo.");
        return {
            valido: false,
            errores,
            advertencias
        };
    }

    const cambios = plan.cambios || {};
    const pendientes = Array.isArray(plan.pendientes)
        ? plan.pendientes
        : [];

    if (Object.keys(cambios).length === 0 && pendientes.length === 0) {
        errores.push(
            "No hay cambios ni configuraciones concretas para aplicar."
        );
    }

    if (
        cambios.maxEquipos !== undefined &&
        (
            !Number.isInteger(cambios.maxEquipos) ||
            cambios.maxEquipos < 2
        )
    ) {
        errores.push(
            "La cantidad máxima de equipos debe ser un número entero de al menos 2."
        );
    }

    const torneo =
        torneoActual ||
        leerJSON("torneo.json") ||
        {};

    if (
        Number.isInteger(cambios.maxEquipos) &&
        Number.isInteger(torneo.maxEquipos) &&
        cambios.maxEquipos > torneo.maxEquipos
    ) {
        errores.push(
            `El máximo solicitado (${cambios.maxEquipos}) supera el límite actual del torneo (${torneo.maxEquipos}).`
        );
    }

    const formatosPermitidos = [
        "Eliminación directa",
        "Todos contra todos",
        "Fase de grupos",
        "Sistema suizo"
    ];

    if (
        cambios.formato &&
        !formatosPermitidos.includes(cambios.formato)
    ) {
        errores.push(
            `El formato "${cambios.formato}" no está soportado por el planificador actual.`
        );
    }

    for (const pendiente of pendientes) {
        if (
            pendiente &&
            pendiente.campo === "serie" &&
            pendiente.valor === "BO3"
        ) {
            advertencias.push(
                "BO3 será atendido por el motor de series existente; no requiere un nuevo campo en torneo.json."
            );
            continue;
        }

        if (
            pendiente &&
            pendiente.campo === "serie" &&
            pendiente.valor === "BO5"
        ) {
            errores.push(
                "BO5 fue solicitado, pero el motor actual de series solo finaliza en BO3."
            );
            continue;
        }

        if (pendiente && pendiente.motivo) {
            advertencias.push(pendiente.motivo);
        }
    }

    return {
        valido: errores.length === 0,
        errores,
        advertencias
    };
}

module.exports = {
    validarPlanTorneo
};
