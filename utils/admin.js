const SUPER_ADMINS = require("../config/superadmins");

    // Agrega aquí más Super Admin si los necesitas.

async function esAdmin(sock, from, sender) {

    // En chat privado siempre permitir.
    if (!from.endsWith("@g.us")) return true;

    try {

        const metadata = await sock.groupMetadata(from);

        const participante = metadata.participants.find(
            p => p.id === sender
        );

        return participante?.admin != null;

    } catch (error) {

        console.error("Error verificando admin:", error);

        return false;

    }

}

function esSuperAdmin(sender) {

    return SUPER_ADMINS.includes(sender);

}

module.exports = {

    esAdmin,

    esSuperAdmin

};
