const { obtenerNombreUsuario } = require("../comunidad");

// ==========================================
// C-10 — Utilidades de menciones
// ==========================================

function normalizarTexto(texto = "") {
    return String(texto)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function obtenerIdentificadores(jid = "") {
    if (!jid) return [];

    const limpio = String(jid).trim();

    const variantes = new Set([
        limpio
    ]);

    if (limpio.endsWith("@lid")) {
        variantes.add(
            limpio.replace("@lid", "@s.whatsapp.net")
        );
    }

    if (limpio.endsWith("@s.whatsapp.net")) {
        variantes.add(
            limpio.replace("@s.whatsapp.net", "@lid")
        );
    }

    return [...variantes];
}

function obtenerNombreVisible(jid, participant = null) {
    const nombre =
        participant?.notify ||
        participant?.name ||
        participant?.verifiedName ||
        "";

    if (String(nombre).trim()) {
        return String(nombre).trim();
    }

    const nombreRegistrado =
        obtenerNombreUsuario(jid);

    if (
        nombreRegistrado &&
        String(nombreRegistrado).trim() &&
        String(nombreRegistrado) !== String(jid)
    ) {
        return String(nombreRegistrado).trim();
    }

    return String(jid)
        .replace("@lid", "")
        .replace("@s.whatsapp.net", "");
}

function buscarCoincidenciasParticipante(
    participantes = [],
    nombreBuscado = ""
) {
    const consulta =
        normalizarTexto(nombreBuscado);

    if (!consulta || !Array.isArray(participantes)) {
        return [];
    }

    const personas = participantes
        .filter(participante => participante?.id)
        .map(participante => {
            const nombre =
                obtenerNombreVisible(
                    participante.id,
                    participante
                );

            return {
                jid: participante.id,
                nombre,
                textoNormalizado:
                    normalizarTexto(nombre)
            };
        });

    // C-10.14.15 — Prioridad de coincidencia exacta.
    //
    // Si existe una coincidencia exacta, no permitimos que
    // coincidencias parciales adicionales la conviertan en ambigua.
    const coincidenciasExactas = personas.filter(
        persona => persona.textoNormalizado === consulta
    );

    if (coincidenciasExactas.length > 0) {
        return coincidenciasExactas;
    }

    // Si no existe coincidencia exacta, conservamos la búsqueda
    // parcial para permitir consultas abreviadas.
    return personas.filter(
        persona => persona.textoNormalizado.includes(consulta)
    );
}

async function resolverMiembroPorNombre(
    sock,
    grupoOrigen,
    nombreBuscado
) {
    if (!sock || !grupoOrigen || !nombreBuscado) {
        return {
            ok: false,
            motivo: "datos_invalidos"
        };
    }

    let metadata;

    try {
        metadata =
            await sock.groupMetadata(grupoOrigen);
    } catch (error) {
        return {
            ok: false,
            motivo: "error_metadata",
            error: error.message
        };
    }

    const coincidencias =
        buscarCoincidenciasParticipante(
            metadata?.participants || [],
            nombreBuscado
        );

    if (coincidencias.length === 0) {
        return {
            ok: false,
            motivo: "miembro_no_encontrado",
            nombreBuscado
        };
    }

    if (coincidencias.length > 1) {
        return {
            ok: false,
            motivo: "miembro_ambiguo",
            nombreBuscado,
            candidatos: coincidencias.map(
                persona => ({
                    jid: persona.jid,
                    nombre: persona.nombre
                })
            )
        };
    }

    return {
        ok: true,
        jid: coincidencias[0].jid,
        nombre: coincidencias[0].nombre,
        grupoOrigen
    };
}

async function validarMiembroEnGrupo(
    sock,
    grupoDestino,
    jid
) {
    if (!sock || !grupoDestino || !jid) {
        return {
            ok: false,
            motivo: "datos_invalidos"
        };
    }

    let metadata;

    try {
        metadata =
            await sock.groupMetadata(grupoDestino);
    } catch (error) {
        return {
            ok: false,
            motivo: "error_metadata",
            error: error.message
        };
    }

    const identificadores =
        new Set(obtenerIdentificadores(jid));

    const participante =
        (metadata?.participants || [])
            .find(item =>
                obtenerIdentificadores(item?.id)
                    .some(id =>
                        identificadores.has(id)
                    )
            );

    if (!participante) {
        return {
            ok: false,
            motivo: "no_es_miembro_destino",
            jid
        };
    }

    return {
        ok: true,
        jid: participante.id
    };
}

module.exports = {
    normalizarTexto,
    obtenerIdentificadores,
    obtenerNombreVisible,
    buscarCoincidenciasParticipante,
    resolverMiembroPorNombre,
    validarMiembroEnGrupo
};
