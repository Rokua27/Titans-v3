const {
    resolverGruposDeMiembro
} = require("./resolucionRemota");


const {
    puedeSancionar,
    puedeSancionarJusticia
} = require("../../utils/jerarquia");

const {
    esFundador,
    esAdmin,
    esSuperMod,
    esModerador,
    esAyudante,
    esJusticia
} = require("../../utils/moderacion");

const {
    esSuperAdmin,
    tienePermiso
} = require("../../utils/permisos");

const {
    obtenerComando
} = require("../commandHandler");

const GESTIONES_TITANSB =
    "120363429976095850@g.us";

const CAPACIDADES_REMOTAS = {
    warn: {
        requiereGrupo: true,
        permiteMultiplesObjetivos: false
    },

    mute: {
        requiereGrupo: true,
        permiteMultiplesObjetivos: false
    },

    unmute: {
        requiereGrupo: true,
        permiteMultiplesObjetivos: false
    },

    kick: {
        requiereGrupo: true,
        permiteMultiplesObjetivos: false
    },
    ban: {
        requiereGrupo: false,
        permiteMultiplesObjetivos: false
    },
    unban: {
        requiereGrupo: false,
        permiteMultiplesObjetivos: false
    },
    warnings: {
        requiereGrupo: false,
        permiteMultiplesObjetivos: false
    },
    clearwarns: {
        requiereGrupo: false,
        permiteMultiplesObjetivos: false
    }
};

function normalizarID(id) {
    if (!id || typeof id !== "string") {
        return id;
    }

    return id
        .replace("@s.whatsapp.net", "@lid")
        .replace(/:\d+(?=@lid$)/, "")
        .replace("@g.us", "");
}

function mismosIDs(a, b) {
    return normalizarID(a) === normalizarID(b);
}

function validarOrigenRemoto(origen) {
    return origen === GESTIONES_TITANSB;
}

function obtenerCapacidadRemota(comando) {
    if (!comando || typeof comando !== "string") {
        return null;
    }

    return CAPACIDADES_REMOTAS[
        comando.toLowerCase()
    ] || null;
}


/**
 * C-10.11.38-A
 *
 * Valida si el actor tiene autorización jerárquica
 * para sancionar al objetivo.
 *
 * NO ejecuta comandos.
 * NO modifica grupos.
 * NO envía mensajes.
 */
/**
 * C-10.11-GLOBAL-PERM
 *
 * Valida el permiso declarado por el comando original
 * para una ejecución remota GLOBAL.
 *
 * No crea una jerarquía nueva.
 * Reutiliza tienePermiso() y los permisos declarados
 * por el propio comando.
 */
function validarPermisoComandoGlobal(actorJid, comandoNombre) {
    if (!actorJid || !comandoNombre) {
        return {
            ok: false,
            motivo: "datos_permiso_global_invalidos"
        };
    }

    const comando = obtenerComando(
        String(comandoNombre).toLowerCase()
    );

    if (!comando) {
        return {
            ok: false,
            motivo: "comando_no_encontrado",
            comando: comandoNombre
        };
    }

    const tipoActor = obtenerTipoActorRemoto(actorJid);

    if (tipoActor === "desconocido") {
        return {
            ok: false,
            motivo: "actor_sin_identidad",
            tipo: tipoActor
        };
    }

    const autorizado = tienePermiso(
        tipoActor,
        comando.permisos || ["usuario"]
    );

    return {
        ok: autorizado,
        tipo: tipoActor,
        permisos: comando.permisos || ["usuario"],
        motivo: autorizado
            ? "permiso_comando_global_autorizado"
            : "permiso_comando_global_denegado"
    };
}

function obtenerTipoActorRemoto(actorJid) {
    if (!actorJid) {
        return "desconocido";
    }

    if (esSuperAdmin(actorJid)) {
        return "superadmin";
    }

    if (esFundador(actorJid)) {
        return "fundador";
    }

    if (esAdmin(actorJid)) {
        return "admin";
    }

    if (esSuperMod(actorJid)) {
        return "supermoderador";
    }

    if (esJusticia(actorJid)) {
        return "justicia";
    }

    if (esModerador(actorJid)) {
        return "moderador";
    }

    if (esAyudante(actorJid)) {
        return "ayudante";
    }

    return "usuario";
}

/**
 * C-10.11.38-D
 *
 * Clasifica al actor utilizando las funciones de
 * autorización existentes y valida si puede sancionar
 * al objetivo.
 *
 * NO crea una jerarquía nueva.
 */
function validarAutorizacionRemota(
    actorJid,
    objetivoJid
) {
    if (!actorJid || !objetivoJid) {
        return {
            ok: false,
            motivo: "datos_autorizacion_invalidos"
        };
    }

    const tipoActor =
        obtenerTipoActorRemoto(actorJid);

    if (tipoActor === "desconocido") {
        return {
            ok: false,
            tipo: tipoActor,
            motivo: "actor_sin_identidad"
        };
    }

    if (tipoActor === "usuario") {
        return {
            ok: false,
            tipo: tipoActor,
            motivo: "actor_sin_rango"
        };
    }

    if (tipoActor === "justicia") {
        const autorizado =
            puedeSancionarJusticia(
                actorJid,
                objetivoJid
            );

        return {
            ok: autorizado,
            tipo: tipoActor,
            motivo: autorizado
                ? "justicia_puede_sancionar"
                : "justicia_no_puede_sancionar"
        };
    }

    const autorizado =
        puedeSancionar(
            actorJid,
            objetivoJid
        );

    return {
        ok: autorizado,
        tipo: tipoActor,
        motivo: autorizado
            ? "actor_puede_sancionar"
            : "actor_no_puede_sancionar"
    };
}

async function validarAdminTitansB(sock, grupoId) {
    if (
        !sock ||
        !grupoId ||
        !grupoId.endsWith("@g.us")
    ) {
        return {
            ok: false,
            motivo: "grupo_invalido"
        };
    }

    const botId = sock.user?.lid;

    if (!botId) {
        return {
            ok: false,
            motivo: "identidad_bot_no_disponible"
        };
    }

    try {
        const metadata =
            await sock.groupMetadata(grupoId);

        const participanteBot =
            Array.isArray(metadata?.participants)
                ? metadata.participants.find(
                    participante =>
                        mismosIDs(
                            participante?.id,
                            botId
                        )
                )
                : null;

        if (!participanteBot) {
            return {
                ok: false,
                motivo: "bot_no_es_miembro"
            };
        }

        if (participanteBot.admin == null) {
            return {
                ok: false,
                motivo: "bot_no_es_admin"
            };
        }

        return {
            ok: true,
            motivo: "bot_es_admin",
            botJid: participanteBot.id
        };

    } catch (error) {
        return {
            ok: false,
            motivo: "error_validando_admin",
            error: error.message
        };
    }
}

async function resolverDestinoRemoto(
    sock,
    objetivoJid
) {
    const resultado =
        await resolverGruposDeMiembro(
            sock,
            objetivoJid
        );

    if (!resultado.ok) {
        return resultado;
    }

    if (resultado.grupos.length === 0) {
        return {
            ok: false,
            motivo: "miembro_no_encontrado",
            grupos: []
        };
    }

    if (resultado.grupos.length > 1) {
        return {
            ok: false,
            motivo: "miembro_en_multiples_grupos",
            grupos: resultado.grupos
        };
    }

    return {
        ok: true,
        motivo: "grupo_unico",
        grupo: resultado.grupos[0]
    };
}

/**
 * C-10.11.36-D
 *
 * Construye los argumentos que esperan los comandos
 * existentes cuando son ejecutados mediante el flujo
 * clásico de TitansB.
 *
 * NO ejecuta el comando.
 */
function construirArgumentosCompatibles(
    comando,
    objetivoJid,
    argumentos = []
) {
    const nombreComando =
        String(comando || "").toLowerCase();

    const lista =
        Array.isArray(argumentos)
            ? argumentos.filter(Boolean)
            : [];

    /*
     * El objetivo ya viaja por mentionedJid.
     *
     * Aun así colocamos un marcador textual en args
     * porque los comandos existentes esperan que el
     * objetivo ocupe esa posición.
     */
    const marcadorObjetivo =
        objetivoJid
            ? `@${objetivoJid.split("@")[0]}`
            : "@usuario";

    return [
        nombreComando,
        marcadorObjetivo,
        ...lista
    ];
}

/**
 * Construye el mensaje mínimo compatible con los
 * comandos existentes.
 *
 * El actor permanece como participant real.
 * El destino pasa a ser remoteJid.
 */
function construirMensajeVirtual(
    contexto
) {
    if (!contexto?.actor?.jid) {
        return {
            ok: false,
            motivo: "actor_invalido"
        };
    }

    if (!contexto?.destino?.groupId) {
        return {
            ok: false,
            motivo: "destino_invalido"
        };
    }

    if (!contexto?.objetivo?.jid) {
        return {
            ok: false,
            motivo: "objetivo_invalido"
        };
    }

    const textoInterno =
        Array.isArray(contexto.argumentosCompatibles)
            ? contexto.argumentosCompatibles.join(" ")
            : "";

    return {
        ok: true,

        mensaje: {
            key: {
                remoteJid:
                    contexto.destino.groupId,

                participant:
                    contexto.actor.jid,

                fromMe: false
            },

            pushName:
                contexto.actor.nombre ||
                contexto.actor.jid,

            message: {
                extendedTextMessage: {
                    text: textoInterno,

                    contextInfo: {
                        participant:
                            contexto.actor.jid,

                        mentionedJid: [
                            contexto.objetivo.jid
                        ]
                    }
                }
            }
        }
    };
}

/**
 * Prepara toda la información necesaria para una
 * futura ejecución remota.
 *
 * NO ejecuta comandos.
 * NO envía mensajes.
 */

/**
 * Prepara el contexto final de una ejecución remota
 * utilizando un destino previamente resuelto.
 *
 * NO resuelve grupos.
 * NO modifica grupos.
 * NO ejecuta comandos.
 * NO envía mensajes.
 */
function prepararContextoRemotoConDestino(
    solicitud,
    destino,
    capacidad,
    validacionBot
) {
    const {
        actor,
        origen,
        comando,
        objetivo,
        argumentos = []
    } = solicitud;

    if (!solicitud?.remoto) {
        return {
            ok: false,
            motivo: "orden_no_remota"
        };
    }

    if (
        !destino?.grupo?.groupId ||
        !String(destino.grupo.groupId).endsWith("@g.us")
    ) {
        return {
            ok: false,
            motivo: "destino_invalido"
        };
    }

    if (!validacionBot?.ok) {
        return {
            ok: false,
            motivo:
                validacionBot?.motivo ||
                "bot_no_validado",
            grupo: destino.grupo,
            detalle:
                validacionBot?.error ||
                null
        };
    }

    const objetivoFinal = {
        jid: objetivo.jid,
        nombre:
            objetivo.nombre ||
            objetivo.jid
    };

    const argumentosCompatibles =
        construirArgumentosCompatibles(
            comando,
            objetivoFinal.jid,
            argumentos
        );

    const contextoBase = {
        remoto: true,

        actor: {
            jid: actor.jid,
            nombre:
                actor.nombre ||
                actor.jid
        },

        origen,

        comando:
            String(comando).toLowerCase(),

        objetivo: objetivoFinal,

        argumentos:
            Array.isArray(argumentos)
                ? argumentos
                : [],

        argumentosCompatibles,

        destino: {
            tipo:
                capacidad.requiereGrupo === false
                    ? "global"
                    : "grupo",
            groupId:
                destino.grupo.groupId,
            nombreGrupo:
                destino.grupo.nombreGrupo ||
                destino.grupo.nombre ||
                destino.grupo.groupId
        },
        capacidad,

        bot: {
            jid:
                validacionBot.botJid,

            esAdmin: true
        }
    };

    const mensajeVirtual =
        construirMensajeVirtual(
            contextoBase
        );

    if (!mensajeVirtual.ok) {
        return mensajeVirtual;
    }

    return {
        ok: true,
        motivo:
            "contexto_remoto_preparado",
        ...contextoBase,
        mensajeVirtual:
            mensajeVirtual.mensaje
    };
}

async function prepararEjecucionRemota(
    sock,
    solicitud
) {
    if (
        !solicitud ||
        typeof solicitud !== "object"
    ) {
        return {
            ok: false,
            motivo: "solicitud_invalida"
        };
    }

    const {
        actor,
        origen,
        comando,
        objetivo,
        argumentos = []
    } = solicitud;

    if (!validarOrigenRemoto(origen)) {
        return {
            ok: false,
            motivo: "origen_no_autorizado"
        };
    }

    if (!actor?.jid) {
        return {
            ok: false,
            motivo: "actor_invalido"
        };
    }

    if (!objetivo?.jid) {
        return {
            ok: false,
            motivo: "objetivo_invalido"
        };
    }

    const capacidad =
        obtenerCapacidadRemota(comando);

    if (!capacidad) {
        return {
            ok: false,
            motivo: "comando_no_permitido_remotamente"
        };
    }

    /*
     * Los comandos GLOBAL reutilizan los permisos declarados
     * por el comando original.
     *
     * Los comandos que requieren grupo conservan la autorización
     * jerárquica remota existente porque necesitan validar al actor
     * frente al objetivo antes de resolver el grupo destino.
     */
    if (capacidad.requiereGrupo === false) {
        const autorizacionGlobal =
            validarPermisoComandoGlobal(
                actor.jid,
                comando
            );

        if (!autorizacionGlobal.ok) {
            return {
                ok: false,
                motivo: autorizacionGlobal.motivo,
                tipoActor:
                    autorizacionGlobal.tipo || null,
                permisos:
                    autorizacionGlobal.permisos || []
            };
        }
    } else {
        const autorizacion =
            validarAutorizacionRemota(
                actor.jid,
                objetivo.jid
            );

        if (!autorizacion.ok) {
            return {
                ok: false,
                motivo: autorizacion.motivo,
                tipoActor:
                    autorizacion.tipo || null
            };
        }
    }

    if (!capacidad) {
        return {
            ok: false,
            motivo: "comando_no_permitido_remotamente"
        };
    }

    /*
     * C-10.11.XX
     *
     * Los comandos globales no necesitan localizar un grupo
     * del objetivo ni validar a TitansB como administrador
     * de un grupo destino.
     *
     * La autorización específica continúa siendo responsabilidad
     * del comando original al momento de ejecutarse mediante
     * el adaptador.
     */
    if (capacidad.requiereGrupo === false) {
        const destinoGlobal = {
            grupo: {
                groupId: GESTIONES_TITANSB,
                nombreGrupo: "Gestiones TitansB",
                tipo: "global"
            }
        };

        const validacionBotGlobal = {
            ok: true,
            motivo: "contexto_global_autorizado",
            botJid: sock?.user?.lid || null
        };

        return prepararContextoRemotoConDestino(
            solicitud,
            destinoGlobal,
            capacidad,
            validacionBotGlobal
        );
    }

    const destino =
        await resolverDestinoRemoto(
            sock,
            objetivo.jid
        );

    if (!destino.ok) {
        return destino;
    }

    const validacionBot =
        await validarAdminTitansB(
            sock,
            destino.grupo.groupId
        );

    if (!validacionBot.ok) {
        return {
            ok: false,
            motivo: validacionBot.motivo,
            grupo: destino.grupo,
            detalle:
                validacionBot.error || null
        };
    }

    return prepararContextoRemotoConDestino(
        solicitud,
        destino,
        capacidad,
        validacionBot
    );
}

module.exports = {
    GESTIONES_TITANSB,
    CAPACIDADES_REMOTAS,

    normalizarID,
    validarOrigenRemoto,
    obtenerCapacidadRemota,
    obtenerTipoActorRemoto,
    validarAutorizacionRemota,
    validarPermisoComandoGlobal,

    validarAdminTitansB,
    resolverDestinoRemoto,

    construirArgumentosCompatibles,
    construirMensajeVirtual,
    prepararContextoRemotoConDestino,

    prepararEjecucionRemota
};
