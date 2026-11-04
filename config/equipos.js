module.exports = {

    //=========================================
    // CONFIGURACIÓN GENERAL
    //=========================================

    NIVEL_MINIMO: 5,

    COSTO_CREAR: 10000,

    MAX_SUBLIDERES: 2,

    MAX_RECLUTAS: 10,

    //=========================================
    // MEJORAS DEL EQUIPO
    //=========================================

    MEJORAS: {

        banco: {
            nombre: "🏦 Banco",
            costo: 50000,
            max: 10
        },

        academia: {
            nombre: "📚 Academia",
            costo: 75000,
            max: 10
        },

        cuartel: {
            nombre: "⚔️ Cuartel",
            costo: 100000,
            max: 10
        },

        defensa: {
            nombre: "🛡️ Defensa",
            costo: 120000,
            max: 10
        },

        reclutamiento: {
            nombre: "👥 Reclutamiento",
            costo: 150000,
            max: 10
        },

        salaTrofeos: {
            nombre: "🏆 Sala de Trofeos",
            costo: 200000,
            max: 10
        }

    },

    //=========================================
    // LIGAS ESPORTS
    //=========================================

    LIGAS: [

        {
            id: 1,
            nombre: "🥉 Bronce III",
            minimo: 0
        },

        {
            id: 2,
            nombre: "🥉 Bronce II",
            minimo: 100
        },

        {
            id: 3,
            nombre: "🥉 Bronce I",
            minimo: 250
        },

        {
            id: 4,
            nombre: "🥈 Plata III",
            minimo: 500
        },

        {
            id: 5,
            nombre: "🥈 Plata II",
            minimo: 800
        },

        {
            id: 6,
            nombre: "🥈 Plata I",
            minimo: 1200
        },

        {
            id: 7,
            nombre: "🥇 Oro III",
            minimo: 1800
        },

        {
            id: 8,
            nombre: "🥇 Oro II",
            minimo: 2500
        },

        {
            id: 9,
            nombre: "🥇 Oro I",
            minimo: 3500
        },

        {
            id: 10,
            nombre: "💎 Diamante",
            minimo: 5000
        },

        {
            id: 11,
            nombre: "👑 Maestro",
            minimo: 7000
        },

        {
            id: 12,
            nombre: "🔥 Titans",
            minimo: 10000
        }

    ],

    //=========================================
    // CONFIGURACIÓN DE GUERRAS
    //=========================================

    GUERRAS: {

        DURACION: 24 * 60 * 60 * 1000,

        PUNTOS_VICTORIA: 100,

        PREMIO_MONEDAS: 50000,

        PREMIO_XP: 1000,

        PRESTIGIO: 25

    },

    //=========================================
    // LÍMITES DEL EQUIPO
    //=========================================

    LIMITES: {

        miembrosBase: 10,

        miembrosPorNivelCuartel: 2,

        fondosMaximos: 1000000000

    }

};
