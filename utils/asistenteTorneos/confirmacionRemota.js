/**
 * C-10.11.40-G.5
 *
 * Confirmación administrativa de órdenes remotas.
 *
 * RESPONSABILIDAD:
 * - Construir una confirmación legible.
 * - Enviarla exclusivamente a Gestiones TitansB.
 *
 * NO:
 * - ejecuta comandos;
 * - modifica grupos;
 * - resuelve miembros;
 * - cambia permisos;
 * - decide autorizaciones.
 */

const GESTIONES_TITANSB =
    "120363429976095850@g.us";

/**
 * Construye el texto de confirmación de una orden remota.
 */
function construirConfirmacionRemota(
    contexto,
    ejecucion
) {
    if (!contexto || typeof contexto !== "object") {
        return {
            ok: false,
            motivo: "contexto_confirmacion_invalido"
        };
    }

    const comando =
        String(contexto.comando || "")
            .trim()
            .toUpperCase();

    const objetivo =
        contexto.objetivo || {};

    const destino =
        contexto.destino || {};

    const nombreObjetivo =
        objetivo.nombre ||
        objetivo.jid ||
        "Usuario";

    const esGlobal = destino.tipo === "global" || contexto.alcance === "global";

    const nombreGrupo =
        destino.nombreGrupo ||
        destino.nombre ||
        destino.subject ||
        destino.groupId ||
        "Grupo destino";

    const ejecucionOk =
        ejecucion?.ok === true;

    const estado =
        ejecucionOk
            ? "✅ Orden procesada"
            : "⚠️ Orden no completada";

    const detalleError =
        !ejecucionOk && ejecucion?.error
            ? `│ Detalle: ${ejecucion.error}`
            : "";

    const texto = [
        "╭─── ⚡ TITANSB • EJECUCIÓN REMOTA",
        "│",
        `│ ${estado}`,
        "│",
        `│ Comando: ${comando || "DESCONOCIDO"}`,
        `│ Usuario: ${nombreObjetivo}`,
        esGlobal
            ? "│ Alcance: GLOBAL"
            : `│ Grupo: ${nombreGrupo}`,
        detalleError
            ? detalleError
            : "",
        "│",
        "╰────────────────────────"
    ].join("\n");

    return {
        ok: true,
        motivo: "confirmacion_construida",
        texto
    };
}

/**
 * Envía la confirmación exclusivamente a Gestiones TitansB.
 */
async function enviarConfirmacionRemota(
    sock,
    contexto,
    ejecucion
) {
    if (!sock || typeof sock.sendMessage !== "function") {
        return {
            ok: false,
            motivo: "sock_invalido"
        };
    }

    const confirmacion =
        construirConfirmacionRemota(
            contexto,
            ejecucion
        );

    if (!confirmacion.ok) {
        return confirmacion;
    }

    try {
        const resultado =
            await sock.sendMessage(
                GESTIONES_TITANSB,
                {
                    text: confirmacion.texto
                }
            );

        return {
            ok: true,
            motivo: "confirmacion_enviada",
            destino: GESTIONES_TITANSB,
            texto: confirmacion.texto,
            resultado
        };

    } catch (error) {
        return {
            ok: false,
            motivo: "error_enviando_confirmacion",
            destino: GESTIONES_TITANSB,
            error: error?.message || String(error)
        };
    }
}

module.exports = {
    GESTIONES_TITANSB,
    construirConfirmacionRemota,
    enviarConfirmacionRemota
};
