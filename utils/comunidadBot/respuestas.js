const respuestas = {

    // ========================================================
    // ☀️ MAÑANA
    // ========================================================

    mañana: [
        "☀️ ¡Buenos días, familia! Que hoy vengan buenas partidas y mejores momentos. 🔥",
        "☀️ Buenos días, Titanes. ¿Listos para otro día de batalla? ⚔️",
        "🌅 ¡Buenos días! Que hoy sobren las victorias y falten las excusas. 😂",
        "☀️ Arrancamos el día, familia. ¡Que tengan un excelente día! 🏆"
    ],

    // ========================================================
    // 🌤️ TARDE
    // ========================================================

    tarde: [
        "🌤️ Buenas tardes, familia. ¿Cómo va ese día? 🔥",
        "😂 Buenas tardes, Titanes. Ya es hora de darle un poco de vida al grupo.",
        "⚔️ Buenas tardes, gente. La arena sigue abierta. 🏆",
        "🌤️ Pasando a saludar en la tarde. ¡Que siga la buena vibra! 🔥"
    ],

    // ========================================================
    // 🌙 NOCHE
    // ========================================================

    noche: [
        "🌙 Buenas noches, familia. Que descansen y recarguen energía. ⚔️",
        "🌙 Se va acabando el día, Titanes. ¡Buenas noches para todos! 🏆",
        "🌌 Buenas noches, gente. Mañana seguimos dando guerra. 🔥",
        "🌙 La arena descansa por hoy. ¡Que tengan una excelente noche! 😴"
    ],

    // ========================================================
    // 😂 CHISTES
    // ========================================================

    chiste: [
        "😂 Chiste del día: ¿Qué hace un jugador cuando pierde? Culpa al lag. ¿Y cuando gana? Dice que fue habilidad. 💀",
        "🤣 ¿Cuál es el animal favorito de un jugador? El pingüino... porque siempre tiene ping. 💀",
        "😂 Mi equipo dijo que hoy iba a jugar serio... duró exactamente tres minutos. 💀",
        "🤣 ¿Qué dijo el soporte cuando nadie lo ayudó? 'Yo no estoy aquí para sufrir' 😂",
        "😂 Dicen que el dinero no compra la felicidad... pero unas buenas monedas en TitansB ayudan bastante. 💰",
        "🤣 Un jugador entra al grupo y dice: 'Hoy no voy a discutir'. El grupo: 'JAJAJAJAJA'. 💀",
        "😂 ¿Cuál es la peor derrota? Perder y que alguien diga: 'fácil'. 💀"
    ],

    // ========================================================
    // 😂 RESPUESTA A RISAS
    // ========================================================

    risa: [
        "😂 JAJAJA, sabía que alguien iba a caer.",
        "🤣 No se puede con este grupo.",
        "😂 Bueno, por lo menos alguien se está divirtiendo.",
        "🤣 JAJAJA, esa era precisamente la intención.",
        "😂 Me alegra que haya servido para algo. 💀",
        "🤣 Este grupo nunca decepciona."
    ]
};

function elegir(lista) {
    return lista[
        Math.floor(Math.random() * lista.length)
    ];
}

function obtenerRespuesta(tipo) {

    // Una franja también recibe un chiste.
    if (
        tipo === "mañana" ||
        tipo === "tarde" ||
        tipo === "noche"
    ) {
        return `${elegir(respuestas[tipo])}\n\n😂 ${elegir(respuestas.chiste)}`;
    }

    return elegir(
        respuestas[tipo] || respuestas.chiste
    );
}

module.exports = {
    obtenerRespuesta
};
