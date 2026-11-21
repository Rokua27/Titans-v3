"use strict";

const LIMITE_DIARIO = 3;
const ZONA_HORARIA = "America/Bogota";

function fechaColombia(ahora) {
    if (!Number.isSafeInteger(ahora) || ahora < 0) {
        throw new Error("FECHA_LIMITE_INVALIDA");
    }

    const partes = new Intl.DateTimeFormat("en-CA", {
        timeZone: ZONA_HORARIA,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date(ahora));

    const valores = Object.fromEntries(
        partes.map(parte => [parte.type, parte.value])
    );

    return `${valores.year}-${valores.month}-${valores.day}`;
}

function prepararLimite(
    limites,
    clave,
    identidad,
    comando,
    ahora
) {
    if (
        !limites ||
        typeof limites !== "object" ||
        Array.isArray(limites) ||
        typeof clave !== "string" ||
        !clave ||
        typeof identidad !== "string" ||
        !identidad ||
        typeof comando !== "string" ||
        !comando
    ) {
        throw new Error("DATOS_LIMITE_INVALIDOS");
    }

    const fechaActual = fechaColombia(ahora);

    if (
        !limites[clave] ||
        typeof limites[clave] !== "object" ||
        Array.isArray(limites[clave])
    ) {
        limites[clave] = {};
    }

    let usosActuales = 0;

    const registroActual = limites[clave][comando];

    if (registroActual !== undefined) {
        if (
            !registroActual ||
            typeof registroActual !== "object" ||
            Array.isArray(registroActual)
        ) {
            throw new Error("REGISTRO_LIMITE_INVALIDO");
        }

        if (registroActual.fecha === fechaActual) {
            usosActuales = Number(registroActual.usos);

            if (
                !Number.isSafeInteger(usosActuales) ||
                usosActuales < 0
            ) {
                throw new Error("REGISTRO_LIMITE_INVALIDO");
            }
        }
    }

    // Migración conservadora de contadores guardados bajo el remitente.
    // Solo se conserva un contador si coincide con el día colombiano actual.
    if (identidad !== clave) {
        const anterior = limites[identidad]?.[comando];

        if (anterior !== undefined) {
            if (
                !anterior ||
                typeof anterior !== "object" ||
                Array.isArray(anterior)
            ) {
                throw new Error("REGISTRO_LIMITE_ANTERIOR_INVALIDO");
            }

            if (anterior.fecha === fechaActual) {
                const usosAnteriores = Number(anterior.usos);

                if (
                    !Number.isSafeInteger(usosAnteriores) ||
                    usosAnteriores < 0
                ) {
                    throw new Error("REGISTRO_LIMITE_ANTERIOR_INVALIDO");
                }

                usosActuales = Math.max(
                    usosActuales,
                    usosAnteriores
                );
            }
        }
    }

    if (usosActuales >= LIMITE_DIARIO) {
        const error = new Error("LIMITE_DIARIO");
        error.usados = usosActuales;
        error.limite = LIMITE_DIARIO;
        throw error;
    }

    const usos = usosActuales + 1;

    limites[clave][comando] = {
        fecha: fechaActual,
        usos
    };

    return usos;
}

module.exports = {
    LIMITE_DIARIO,
    ZONA_HORARIA,
    fechaColombia,
    prepararLimite
};
