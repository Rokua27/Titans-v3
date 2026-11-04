const {
    obtenerOrdenRemota
} = require("./estadoRemoto");

/**
 * Convierte una respuesta de selección en un índice numérico.
 *
 * Ejemplos:
 * "1"       -> 0
 * "2"       -> 1
 * " 3 "     -> 2
 * "grupo 1" -> null
 */
function interpretarSeleccion(texto = "") {
    const valor = String(texto || "").trim();

    if (!/^\d+$/.test(valor)) {
        return null;
    }

    const numero = Number(valor);

    if (!Number.isSafeInteger(numero) || numero < 1) {
        return null;
    }

    return numero - 1;
}

/**
 * Recupera una orden pendiente y selecciona uno de
 * sus grupos candidatos.
 *
 * No ejecuta comandos.
 * No elimina la orden pendiente.
 */
function seleccionarGrupoRemoto(
    origen,
    actorId,
    texto
) {
    if (!origen || !actorId) {
        return {
            ok: false,
            motivo: "datos_seleccion_invalidos"
        };
    }

    const orden =
        obtenerOrdenRemota(
            origen,
            actorId
        );

    if (!orden) {
        return {
            ok: false,
            motivo: "orden_remota_no_encontrada"
        };
    }

    if (orden.requiereSeleccionGrupo !== true) {
        return {
            ok: false,
            motivo: "orden_no_requiere_seleccion"
        };
    }

    const grupos =
        Array.isArray(orden.gruposCandidatos)
            ? orden.gruposCandidatos
            : [];

    if (grupos.length === 0) {
        return {
            ok: false,
            motivo: "sin_grupos_candidatos"
        };
    }

    const indice =
        interpretarSeleccion(texto);

    if (indice === null) {
        return {
            ok: false,
            motivo: "seleccion_invalida",
            grupos
        };
    }

    if (indice >= grupos.length) {
        return {
            ok: false,
            motivo: "seleccion_fuera_de_rango",
            grupos
        };
    }

    const grupoSeleccionado =
        grupos[indice];

    return {
        ok: true,
        motivo: "grupo_remoto_seleccionado",
        indice,
        orden,
        grupo: grupoSeleccionado
    };
}

module.exports = {
    interpretarSeleccion,
    seleccionarGrupoRemoto
};
