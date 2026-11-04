const {
    kickUsuario: ejecutarKick
} = (() => {
    async function kickUsuario(sock, grupo, usuario, motivo = "Sin motivo") {
        try {
            await sock.groupParticipantsUpdate(
                grupo,
                [usuario],
                "remove"
            );

            return {
                ok: true,
                motivo
            };

        } catch (error) {

            return {
                ok: false,
                error
            };
        }
    }

    return { kickUsuario };
})();

// ==========================================
// 🆔 NORMALIZACIÓN DE IDs
// ==========================================

function normalizarID(id) {

    if (!id || typeof id !== "string") {
        return id;
    }

    return id
        .replace("@s.whatsapp.net", "@lid")
        .replace("@g.us", "");
}

// ==========================================
// 🚪 KICK
// ==========================================

async function kickUsuario(
    sock,
    grupo,
    usuario,
    motivo = "Sin motivo"
) {

    try {

        await sock.groupParticipantsUpdate(
            grupo,
            [usuario],
            "remove"
        );

        return {
            ok: true,
            motivo
        };

    } catch (error) {

        return {
            ok: false,
            error
        };
    }
}

// ==========================================
// 🚫 BAN GLOBAL
// ==========================================

async function banUsuario(usuario) {

    const {
        obtenerDatos,
        guardarDatos
    } = require("./moderacion");

    const datos = obtenerDatos();

    datos.baneados ??= [];

    const idNormalizado = normalizarID(usuario);

    if (!datos.baneados.some(
        id => normalizarID(id) === idNormalizado
    )) {

        datos.baneados.push(idNormalizado);

        guardarDatos(datos);
    }

    return true;
}

// ==========================================
// ✅ DESBAN GLOBAL
// ==========================================

async function desbanearUsuario(usuario) {

    const {
        obtenerDatos,
        guardarDatos
    } = require("./moderacion");

    const datos = obtenerDatos();

    datos.baneados ??= [];

    const idNormalizado = normalizarID(usuario);

    datos.baneados = datos.baneados.filter(
        id => normalizarID(id) !== idNormalizado
    );

    guardarDatos(datos);

    return true;
}

// ==========================================
// 📤 EXPORTS
// ==========================================

module.exports = {
    kickUsuario,
    banUsuario,
    desbanearUsuario
};
