const {
    detectarOrdenRemota
} = require("./detectorRemoto");

const {
    prepararEjecucionRemota
} = require("./ejecutorRemoto");

const {
    esAdmin
} = require("../admin");

const {
    resolverMiembroPorNombre
} = require("./menciones");

const GESTIONES_TITANSB =
    "120363429976095850@g.us";

const GRUPO_PRINCIPAL =
    "120363179556270758@g.us";

/**
 * C-10.11.40-C
 *
 * Puente seguro entre el mensaje natural de Gestiones
 * y el preparador de ejecución remota.
 *
 * IMPORTANTE:
 * - NO ejecuta comandos.
 * - NO modifica grupos.
 * - NO envía mensajes.
 * - NO cambia permisos.
 *
 * Solo detecta y prepara.
 */

function tieneGatilloTitansB(texto = "") {
    const valor = String(texto || "").trim();

    return /^titansb(?:\s|[,!:;-])/i.test(valor);
}

async function prepararOrdenRemota(
    sock,
    msg,
    texto,
    actorNombre = ""
) {
    const origen = msg?.key?.remoteJid;
    const actorJid =
        msg?.key?.participant ||
        msg?.participant ||
        msg?.key?.remoteJid;

    if (!origen) {
        return {
            ok: false,
            motivo: "origen_invalido"
        };
    }

    if (origen !== GESTIONES_TITANSB) {
        return {
            ok: false,
            motivo: "origen_no_autorizado"
        };
    }

    if (!tieneGatilloTitansB(texto)) {
        return {
            ok: false,
            motivo: "gatillo_titansb_ausente"
        };
    }

    if (!actorJid) {
        return {
            ok: false,
            motivo: "actor_invalido"
        };
    }

    /*
     * C-10.11.40-F.1-A
     *
     * El actor debe ser administrador real de
     * Gestiones TitansB.
     *
     * Esto evita que un usuario con algún rango
     * global pueda emitir órdenes remotas
     * simplemente por tener acceso al grupo.
     */
    const actorEsAdminGestiones =
        await esAdmin(
            sock,
            GESTIONES_TITANSB,
            actorJid
        );

    if (!actorEsAdminGestiones) {
        return {
            ok: false,
            motivo: "actor_no_admin_gestiones"
        };
    }

    const orden = detectarOrdenRemota(texto, msg);

    if (!orden.ok) {
        return {
            ok: false,
            motivo: orden.motivo,
            comando: orden.comando || null
        };
    }

    const solicitud = {
        actor: {
            jid: actorJid,
            nombre: actorNombre || actorJid
        },

        origen,

        comando: orden.comando,

        objetivo: {
            jid: orden.objetivo?.jid || null,
            nombre: orden.objetivo?.nombre || null
        },

        argumentos: Array.isArray(orden.argumentos)
            ? orden.argumentos
            : [],

        remoto: true
    };

    /*
     * D.7.3-C.3
     *
     * Si la orden llegó con nombre visible pero sin JID,
     * resolvemos la identidad contra el grupo principal.
     *
     * No se elige arbitrariamente una coincidencia:
     * - 0 coincidencias -> rechazo
     * - 1 coincidencia  -> JID resuelto
     * - múltiples       -> miembro_ambiguo
     */
    if (!solicitud.objetivo.jid && solicitud.objetivo.nombre) {
        const resolucion = await resolverMiembroPorNombre(
            sock,
            GRUPO_PRINCIPAL,
            solicitud.objetivo.nombre
        );

        if (!resolucion.ok) {
            return {
                ok: false,
                motivo: resolucion.motivo,
                solicitud,
                candidatos: resolucion.candidatos || []
            };
        }

        solicitud.objetivo.jid = resolucion.jid;
        solicitud.objetivo.nombre =
            resolucion.nombre || solicitud.objetivo.nombre;
    }

    /*
     * El preparador realiza:
     * - autorización jerárquica;
     * - allowlist;
     * - resolución del grupo;
     * - validación de TitansB como admin;
     * - construcción del mensaje virtual.
     *
     * Todavía NO ejecuta nada.
     */
    const preparado =
        await prepararEjecucionRemota(
            sock,
            solicitud
        );

    if (!preparado.ok) {
        return {
            ok: false,
            motivo: preparado.motivo,
            tipoActor: preparado.tipoActor || null,
            grupo: preparado.grupo || null,
            grupos: preparado.grupos || [],
            solicitud,
            detalle: preparado.detalle || null
        };
    }

    return {
        ok: true,
        motivo: "orden_remota_preparada",
        orden,
        solicitud,
        preparado
    };
}

module.exports = {
    GESTIONES_TITANSB,
    tieneGatilloTitansB,
    prepararOrdenRemota
};
