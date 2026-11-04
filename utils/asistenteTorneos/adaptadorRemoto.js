const {
    obtenerComando
} = require("../commandHandler");

/**
 * C-10.11.40-F.2
 *
 * Adaptador entre el contexto remoto preparado
 * y la interfaz normal de los comandos TitansB.
 *
 * IMPORTANTE:
 * Esta función NO inventa una nueva forma de ejecutar
 * comandos. Reutiliza exactamente:
 *
 * comando.ejecutar(sock, from, args, msg)
 *
 * Los comandos originales permanecen intactos.
 */

function obtenerArgumentosParaEjecucion(preparado) {
    if (!preparado) {
        return [];
    }

    const argumentos =
        Array.isArray(preparado.argumentosCompatibles)
            ? preparado.argumentosCompatibles
            : [];

    /*
     * argumentosCompatibles contiene:
     *
     * ["mute", "@objetivo", "10", ...]
     *
     * events/messages.js normalmente entrega a
     * comando.ejecutar() solamente:
     *
     * ["@objetivo", "10", ...]
     *
     * Por eso eliminamos el nombre del comando.
     */
    return argumentos.slice(1);
}

function prepararInvocacionComandoRemoto(preparado) {
    if (!preparado?.ok) {
        return {
            ok: false,
            motivo: "contexto_remoto_no_preparado"
        };
    }

    const comandoNombre =
        String(preparado.comando || "")
            .trim()
            .toLowerCase();

    if (!comandoNombre) {
        return {
            ok: false,
            motivo: "comando_invalido"
        };
    }

    const comando =
        obtenerComando(comandoNombre);

    if (!comando) {
        return {
            ok: false,
            motivo: "comando_no_encontrado",
            comando: comandoNombre
        };
    }

    const from =
        preparado.destino?.groupId;

    const msg =
        preparado.mensajeVirtual;

    if (!from || !msg) {
        return {
            ok: false,
            motivo: "contexto_ejecucion_incompleto"
        };
    }

    const args =
        obtenerArgumentosParaEjecucion(
            preparado
        );

    return {
        ok: true,
        motivo: "invocacion_remota_preparada",

        comando: comandoNombre,

        instancia: comando,

        from,

        args,

        msg
    };
}

/**
 * C-10.11.40-G.3-A
 *
 * Invoca el comando original utilizando exactamente
 * la interfaz estándar de TitansB:
 *
 * comando.ejecutar(sock, from, args, msg)
 *
 * Esta función NO:
 * - cambia el actor;
 * - cambia el destino;
 * - modifica argumentos;
 * - resuelve menciones;
 * - aplica permisos adicionales.
 */
async function invocarComandoRemoto(
    instancia,
    sock,
    from,
    args,
    msg
) {
    if (!instancia || typeof instancia.ejecutar !== "function") {
        return {
            ok: false,
            motivo: "instancia_comando_invalida"
        };
    }

    if (!from || !msg) {
        return {
            ok: false,
            motivo: "contexto_ejecucion_incompleto"
        };
    }

    const argumentos =
        Array.isArray(args)
            ? args
            : [];

    try {
        const resultado =
            await instancia.ejecutar(
                sock,
                from,
                argumentos,
                msg
            );

        return {
            ok: true,
            motivo: "invocacion_comando_completada",
            resultado
        };

    } catch (error) {
        return {
            ok: false,
            motivo: "error_ejecutando_comando_remoto",
            error: error?.message || String(error)
        };
    }
}

async function ejecutarComandoRemoto(
    sock,
    preparado
) {
    const invocacion =
        prepararInvocacionComandoRemoto(
            preparado
        );

    if (!invocacion.ok) {
        return invocacion;
    }

    const resultado =
        await invocarComandoRemoto(
            invocacion.instancia,
            sock,
            invocacion.from,
            invocacion.args,
            invocacion.msg
        );

    if (!resultado.ok) {
        return {
            ...resultado,
            comando: invocacion.comando,
            from: invocacion.from
        };
    }

    return {
        ok: true,
        motivo: "comando_remoto_ejecutado",
        comando: invocacion.comando,
        from: invocacion.from,
        resultado: resultado.resultado
    };
}
module.exports = {
    obtenerArgumentosParaEjecucion,
    prepararInvocacionComandoRemoto,
    invocarComandoRemoto,
    ejecutarComandoRemoto
};
