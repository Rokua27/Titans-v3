const ordenesRemotasPendientes = new Map();

const TTL_ORDEN_REMOTA = 10 * 60 * 1000;

function crearClave(origen, actorId) {
    return `${origen}:${actorId}`;
}

function guardarOrdenRemota(origen, actorId, orden) {
    if (!origen || !actorId || !orden) {
        return false;
    }

    const clave = crearClave(origen, actorId);

    ordenesRemotasPendientes.set(clave, {
        orden,
        creada: Date.now()
    });

    return true;
}

function obtenerOrdenRemota(origen, actorId) {
    if (!origen || !actorId) {
        return null;
    }

    const clave = crearClave(origen, actorId);

    const pendiente =
        ordenesRemotasPendientes.get(clave);

    if (!pendiente) {
        return null;
    }

    if (
        Date.now() - pendiente.creada >
        TTL_ORDEN_REMOTA
    ) {
        ordenesRemotasPendientes.delete(clave);
        return null;
    }

    return pendiente.orden;
}

function eliminarOrdenRemota(origen, actorId) {
    if (!origen || !actorId) {
        return false;
    }

    const clave = crearClave(origen, actorId);

    return ordenesRemotasPendientes.delete(clave);
}

module.exports = {
    guardarOrdenRemota,
    obtenerOrdenRemota,
    eliminarOrdenRemota
};
