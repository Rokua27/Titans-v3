const {
    validarMiembroEnGrupo
} = require("./menciones");

const {
    validarAdminTitansB
} = require("./ejecutorRemoto");

const {
    normalizarID
} = require("./ejecutorRemoto");

/**
 * Revalida un grupo seleccionado antes de ejecutar
 * una orden remota.
 *
 * NO ejecuta comandos.
 * NO modifica grupos.
 * NO envía mensajes.
 */
async function revalidarGrupoRemoto(
    sock,
    orden,
    grupoSeleccionado
) {
    if (
        !sock ||
        !orden ||
        typeof orden !== "object" ||
        !grupoSeleccionado ||
        typeof grupoSeleccionado !== "object"
    ) {
        return {
            ok: false,
            motivo: "datos_revalidacion_invalidos"
        };
    }

    const groupId =
        grupoSeleccionado.groupId;

    const objetivoJid =
        orden.objetivo?.jid;

    if (!groupId || !groupId.endsWith("@g.us")) {
        return {
            ok: false,
            motivo: "grupo_seleccionado_invalido"
        };
    }

    if (!objetivoJid) {
        return {
            ok: false,
            motivo: "objetivo_invalido"
        };
    }

    const miembro =
        await validarMiembroEnGrupo(
            sock,
            groupId,
            objetivoJid
        );

    if (!miembro.ok) {
        return {
            ok: false,
            motivo: miembro.motivo,
            grupo: grupoSeleccionado,
            detalle: miembro.error || null
        };
    }

    const adminBot =
        await validarAdminTitansB(
            sock,
            groupId
        );

    if (!adminBot.ok) {
        return {
            ok: false,
            motivo: adminBot.motivo,
            grupo: grupoSeleccionado,
            detalle: adminBot.error || null
        };
    }

    const mismoObjetivo =
        normalizarID(miembro.jid) ===
        normalizarID(objetivoJid);

    if (!mismoObjetivo) {
        return {
            ok: false,
            motivo: "objetivo_identidad_no_coincide",
            grupo: grupoSeleccionado,
            objetivoEsperado: objetivoJid,
            objetivoActual: miembro.jid
        };
    }

    return {
        ok: true,
        motivo: "grupo_remoto_revalidado",
        grupo: {
            ...grupoSeleccionado,
            groupId,
            jid: miembro.jid
        },
        objetivo: {
            ...orden.objetivo,
            jid: miembro.jid
        },
        bot: {
            jid: adminBot.botJid,
            esAdmin: true
        }
    };
}

module.exports = {
    revalidarGrupoRemoto
};
