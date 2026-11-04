const confirmacionesPendientes = new Map();

const TTL_CONFIRMACION = 10 * 60 * 1000;

function crearClave(grupo, autorId) {
    return `${grupo}:${autorId}`;
}

function guardarConfirmacion(grupo, autorId, plan) {
    const clave = crearClave(grupo, autorId);

    confirmacionesPendientes.set(clave, {
        plan,
        creada: Date.now()
    });

    return true;
}

function obtenerConfirmacion(grupo, autorId) {
    const clave = crearClave(grupo, autorId);
    const confirmacion = confirmacionesPendientes.get(clave);

    if (!confirmacion) {
        return null;
    }

    if (Date.now() - confirmacion.creada > TTL_CONFIRMACION) {
        confirmacionesPendientes.delete(clave);
        return null;
    }

    return confirmacion;
}

function eliminarConfirmacion(grupo, autorId) {
    const clave = crearClave(grupo, autorId);
    return confirmacionesPendientes.delete(clave);
}

module.exports = {
    guardarConfirmacion,
    obtenerConfirmacion,
    eliminarConfirmacion
};
