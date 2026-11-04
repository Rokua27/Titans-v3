// utils/adminCache.js

const cache = new Map();

const TTL = 5 * 60 * 1000; // 5 minutos

async function obtenerAdmins(sock, groupId) {
    const ahora = Date.now();

    const guardado = cache.get(groupId);

    // Usar caché si sigue vigente
    if (guardado && (ahora - guardado.timestamp) < TTL) {
        return guardado.admins;
    }

    try {
        const metadata = await sock.groupMetadata(groupId);

        const admins = metadata.participants
            .filter(p => p.admin)
            .map(p => p.id);

        cache.set(groupId, {
            admins,
            timestamp: ahora
        });

        return admins;

    } catch (err) {

        console.error("⚠️ Error obteniendo administradores:", err.message);

        // Si existe una caché anterior, usarla
        if (guardado) {
            console.log("📦 Usando caché anterior de administradores.");
            return guardado.admins;
        }

        // Si no existe caché devolver vacío
        return [];
    }
}

module.exports = {
    obtenerAdmins
};
