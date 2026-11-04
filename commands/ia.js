const {
    generarRespuesta
} = require("../utils/titansb/motor");

const monitor = require("../utils/monitor");

module.exports = {

    nombre: "titansb",

    alias: [
        "tb",
        "ia",
        "chatgpt"
    ],

    categoria: "ia",

    descripcion:
        "TitansB responde preguntas generales y consulta información actual.",

    permisos: ["usuario"],

    uso: "!titansb <pregunta>",

    async ejecutar(sock, from, args, msg) {

        // ============================================================
        // 👤 IDENTIDAD DEL AUTOR ACTUAL
        // ============================================================
        // El autor es quien realmente escribió el mensaje.
        // No debe confundirse con el referente conversacional.
        const autorId =
            msg?.key?.participant ||
            msg?.key?.remoteJid ||
            from;

        const autorNombre =
            msg?.pushName ||
            "Jugador";

        const pregunta = args
            .join(" ")
            .trim();

        if (!pregunta) {

            return await sock.sendMessage(from, {
                text:
`🤖 *TitansB • Sistema Automático*

Pregúntame lo que quieras.

🌎 Cultura general
📚 Educación
🎮 Mobile Legends
📰 Noticias
🎬 Farándula
⚽ Deportes
💻 Tecnología
🧠 Información general

Ejemplo:

!titansb ¿qué es un agujero negro?

O:

!titansb últimas noticias de Mobile Legends

⚔️ Liga Titans Team`
            });

        }

        try {

            const resultado =
                await generarRespuesta(
                    pregunta,
                    from,
                    {
                        autorId,
                        autorNombre
                    }
                );

            // ============================================================
            if (!resultado || !String(resultado.texto || "").trim()) {
                console.log("🤖 TitansB | sin respuesta local; no se envía mensaje.");
                return;
            }

            // 🛡️ MONITOR — TRAZABILIDAD DE RESPUESTA TITANSB
            // ============================================================
            try {
                monitor.registrarEvento("RESPUESTA_TITANSB", {
                    estado: "OK",
                    componente: "TITANSB",
                    codigo: "RESPONSE_GENERATED",
                    descripcion: "Respuesta generada por TitansB.",
                    fuente: resultado?.fuente || "desconocida",
                    grupo: from,
                    autorId: autorId || null,
                    autorNombre: autorNombre || null,
                    busco: !!resultado?.busco
                });
            } catch (errorMonitor) {
                console.error(
                    "⚠️ TitansB | Error registrando respuesta en Monitor:",
                    errorMonitor.message
                );
            }

            let mensaje =
`🤖 *TitansB • Sistema Automático*

${resultado.texto}`;

            if (resultado.busco &&
                resultado.fuentes.length) {

                mensaje +=
`
━━━━━━━━━━━━━━━━━━━━
🔎 *Fuentes consultadas*
`;

                resultado.fuentes
                    .slice(0, 3)
                    .forEach((fuente, index) => {

                        mensaje +=
`\n${index + 1}. ${fuente.titulo}`;

                    });

            }

            mensaje +=
`
━━━━━━━━━━━━━━━━━━━━
🤖 TitansB • Sistema Automático
⚔️ Liga Titans Team`;

            await sock.sendMessage(from, {
                text: mensaje
            });

        } catch (error) {
            console.error(
                "❌ Error ejecutando TitansB:",
                error.message
            );
        }

    }
};
