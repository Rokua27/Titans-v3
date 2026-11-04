function planificarTorneo(interpretacion, torneoActual = {}) {
    if (
        !interpretacion ||
        interpretacion.accion !== "crear_torneo"
    ) {
        return {
            accion: "desconocida",
            cambios: {},
            pendientes: [],
            advertencias: [],
            requiereConfirmacion: false
        };
    }

    const datos = interpretacion.datos || {};
    const cambios = {};
    const pendientes = [];
    const advertencias = [];

    if (datos.nombre) {
        cambios.nombre = datos.nombre;
    }

    if (datos.premio) {
        cambios.premio = datos.premio;
    }

    if (datos.fecha) {
        cambios.proximaFecha = datos.fecha;
    }

    if (datos.hora) {
        cambios.horaInicio = datos.hora;
    }

    if (Number.isInteger(datos.maxEquipos)) {
        cambios.maxEquipos = datos.maxEquipos;
    }

    if (datos.formato) {
        const formatos = {
            eliminacion_directa: "Eliminación directa",
            todos_contra_todos: "Todos contra todos",
            fase_de_grupos: "Fase de grupos",
            suizo: "Sistema suizo"
        };

        cambios.formato =
            formatos[datos.formato] || datos.formato;
    }

    if (datos.serie) {
        pendientes.push({
            campo: "serie",
            valor: datos.serie,
            motivo: "El modelo actual de torneo.json no define un campo oficial para BO3/BO5."
        });
    }

    if (!cambios.nombre) {
        advertencias.push(
            `El torneo conservará el nombre actual: "${torneoActual.nombre || "Sin nombre"}".`
        );
    }

    return {
        accion: "crear_torneo",
        cambios,
        pendientes,
        advertencias,
        requiereConfirmacion: true
    };
}

module.exports = {
    planificarTorneo
};
