const {
    obtenerIdentificadores,
    obtenerNombreVisible
} = require("./menciones");

/**
 * C-10.11.36-A
 *
 * Busca en qué grupos donde participa TitansB
 * se encuentra un usuario determinado.
 *
 * RESPONSABILIDADES:
 * - Descubrir los grupos donde está el objetivo.
 * - Resolver su identificador real.
 * - Obtener su nombre visible.
 *
 * NO:
 * - Ejecuta comandos.
 * - Modifica grupos.
 * - Envía mensajes.
 * - Valida permisos del actor.
 * - Valida si TitansB es administrador.
 */

async function resolverGruposDeMiembro(sock, objetivoJid) {
    if (!sock || !objetivoJid) {
        return {
            ok: false,
            motivo: "datos_invalidos",
            grupos: []
        };
    }

    let grupos;

    try {
        grupos = await sock.groupFetchAllParticipating();
    } catch (error) {
        return {
            ok: false,
            motivo: "error_obteniendo_grupos",
            error: error.message,
            grupos: []
        };
    }

    const identificadoresObjetivo =
        new Set(obtenerIdentificadores(objetivoJid));

    const resultados = [];

    for (const [groupId, grupo] of Object.entries(grupos || {})) {
        const participantes =
            Array.isArray(grupo?.participants)
                ? grupo.participants
                : [];

        const participante = participantes.find(item =>
            obtenerIdentificadores(item?.id)
                .some(id =>
                    identificadoresObjetivo.has(id)
                )
        );

        if (!participante) continue;

        resultados.push({
            groupId,

            nombreGrupo:
                grupo?.subject ||
                grupo?.name ||
                groupId,

            jid: participante.id,

            nombre:
                obtenerNombreVisible(
                    participante.id,
                    participante
                )
        });
    }

    return {
        ok: true,

        motivo:
            resultados.length === 0
                ? "miembro_no_encontrado"
                : resultados.length === 1
                    ? "grupo_unico"
                    : "miembro_en_multiples_grupos",

        grupos: resultados
    };
}

module.exports = {
    resolverGruposDeMiembro
};
