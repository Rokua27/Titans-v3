module.exports = {

    // =========================
    // JUGADOR
    // =========================

    perfil: {
        categoria: "jugador",
        descripcion: "Muestra tu perfil.",
        permisos: ["usuario"]
    },

    inventario: {
        categoria: "jugador",
        descripcion: "Muestra tu inventario.",
        permisos: ["usuario"]
    },

    logros: {
        categoria: "jugador",
        descripcion: "Muestra tus logros.",
        permisos: ["usuario"]
    },

    ranking: {
        categoria: "jugador",
        descripcion: "Ranking de jugadores.",
        permisos: ["usuario"]
    },

    ping: {
        categoria: "utilidades",
        descripcion: "Muestra la latencia del bot.",
        permisos: ["usuario"]
    },

    ia: {
        categoria: "ia",
        descripcion: "Asistente de inteligencia artificial.",
        permisos: ["usuario"]
    },

    // =========================
    // EQUIPOS
    // =========================

    equipo: {
        categoria: "equipo",
        descripcion: "Información del equipo.",
        permisos: ["usuario"]
    },

    miembros: {
        categoria: "equipo",
        descripcion: "Lista de miembros.",
        permisos: ["usuario"]
    },

    fondos: {
        categoria: "equipo",
        descripcion: "Fondos del equipo.",
        permisos: ["miembro"]
    },

    mejoras: {
        categoria: "equipo",
        descripcion: "Mejoras disponibles.",
        permisos: ["miembro"]
    },

    mejorar: {
        categoria: "equipo",
        descripcion: "Mejora una instalación.",
        permisos: ["lider"]
    },

    depositar: {
        categoria: "equipo",
        descripcion: "Deposita fondos.",
        permisos: ["miembro"]
    },

    retirar: {
        categoria: "equipo",
        descripcion: "Retira fondos.",
        permisos: ["lider"]
    },

    movimientos: {
        categoria: "equipo",
        descripcion: "Historial del banco.",
        permisos: ["miembro"]
    },

    invitar: {
        categoria: "equipo",
        descripcion: "Invita un jugador.",
        permisos: ["lider"]
    },

    expulsar: {
        categoria: "equipo",
        descripcion: "Expulsa un miembro.",
        permisos: ["lider"]
    },

    // =========================
    // LIGAS
    // =========================

    temporada: {
        categoria: "ligas",
        descripcion: "Información de temporada.",
        permisos: ["usuario"]
    },

    tabla: {
        categoria: "ligas",
        descripcion: "Tabla de posiciones.",
        permisos: ["usuario"]
    },

    fixture: {
        categoria: "ligas",
        descripcion: "Calendario.",
        permisos: ["usuario"]
    },

    resultado: {
        categoria: "ligas",
        descripcion: "Resultados.",
        permisos: ["usuario"]
    },

    jornada: {
        categoria: "ligas",
        descripcion: "Información de la jornada.",
        permisos: ["usuario"]
    },

    // =========================
    // TORNEOS
    // =========================

    torneo: {
        categoria: "torneos",
        descripcion: "Información del torneo.",
        permisos: ["usuario"]
    },

    match: {
        categoria: "torneos",
        descripcion: "Información del enfrentamiento.",
        permisos: ["usuario"]
    },

    matchlive: {
        categoria: "torneos",
        descripcion: "Partida en vivo.",
        permisos: ["usuario"]
    },

    bracket: {
        categoria: "torneos",
        descripcion: "Llaves del torneo.",
        permisos: ["usuario"]
    },

    // =========================
    // ADMIN
    // =========================

    anuncio: {
        categoria: "admin",
        descripcion: "Publica anuncios.",
        permisos: ["admin"]
    },

    mute: {
        categoria: "admin",
        descripcion: "Silencia usuarios.",
        permisos: ["admin"]
    },

    kick: {
        categoria: "admin",
        descripcion: "Expulsa usuarios.",
        permisos: ["admin"]
    },

    modlogs: {
        categoria: "admin",
        descripcion: "Registros de moderación.",
        permisos: ["admin"]
    }

};
