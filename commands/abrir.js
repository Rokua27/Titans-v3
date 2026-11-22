"use strict";

const monitor = require("../utils/monitor");
const { abrirCaja } = require("../utils/cajasEconomia");
const { anuncioGlobal } = require("../utils/anuncios");

const RAREZAS = {
    comun: "comun",
    común: "comun",
    rara: "rara",
    epica: "epica",
    épica: "epica",
    legendaria: "legendaria",
    especial: "especial"
};

const NOMBRES = {
    comun: "Común",
    rara: "Rara",
    epica: "Épica",
    legendaria: "Legendaria",
    especial: "Especial"
};

module.exports = {
    nombre: "abrir",
    alias: [],
    categoria: "jugador",
    descripcion: "Abre una caja de tu inventario.",
    permisos: ["usuario"],
    uso: "!abrir [comun|rara|epica|legendaria|especial]",

    async ejecutar(sock, from, args, msg) {
        try {
            console.log("📦 Ejecutando comando abrir");

            const sender = msg.key.participant || msg.key.remoteJid;
            const messageId = msg.key.id;

            const entrada = String(args?.[0] || "")
                .trim()
                .toLowerCase();

            const generica = entrada === "";
            const rareza = generica ? null : RAREZAS[entrada];

            if (!generica && !rareza) {
                return await enviarMensajeTitans(sock, from, {
                    text:
`📢 *TITANS TEAM · CENTRO DE APERTURA*

╔══════════════════════════════╗
║       ⚠️ OPCIÓN NO VÁLIDA    ║
╚══════════════════════════════╝

La rareza indicada no existe.

🎁 *TIPOS DE CAJAS DISPONIBLES*
⚪ Común: !abrir comun
🟢 Rara: !abrir rara
🔵 Épica: !abrir epica
🟣 Legendaria: !abrir legendaria
🟡 Especial: !abrir especial

📦 También puedes usar *!abrir* sin argumentos para las cajas genéricas antiguas.

🎁 *¡PREMIOS SORPRENDENTES TE ESPERAN!*
💎 50 o 86 diamantes
🎟️ Pase semanal de diamantes
👑 Pase semanal Elite`
                });
            }

            const apertura = generica
                ? await abrirCaja(sender, messageId, Math.random())
                : await abrirCaja(
                    sender,
                    messageId,
                    rareza,
                    Math.random()
                );

            if (apertura.duplicada) {
                console.log("ℹ️ Apertura repetida: no se vuelve a entregar ni anunciar.");
                return;
            }

            if (!apertura.ok && apertura.motivo === "limite") {
                return await enviarMensajeTitans(sock, from, {
                    text:
`📢 *TITANS TEAM · CONTROL DE APERTURAS*

╔══════════════════════════════╗
║       🚫 CUPO AGOTADO        ║
╚══════════════════════════════╝

Ya utilizaste tus 3 aperturas permitidas por hoy.

📦 El límite es compartido entre todas las rarezas.

🕛 Podrás abrir más cajas después del reinicio diario, a las 00:00 de Colombia.

🏆 *LIGA TITANS TEAM*`
                });
            }

            if (!apertura.ok && apertura.motivo === "inventario_invalido") {
                return await enviarMensajeTitans(sock, from, {
                    text:
`⚠️ *TITANS TEAM · VALIDACIÓN DE SEGURIDAD*

No fue posible validar tu inventario de forma segura.

🔐 La apertura fue detenida.
📦 No se consumió ninguna caja.

Si el problema continúa, contacta a administración.

🏆 *LIGA TITANS TEAM*`
                });
            }

            if (!apertura.ok && apertura.motivo === "sin_cajas") {
                const nombre = generica ? "genéricas" : NOMBRES[rareza];

                return await enviarMensajeTitans(sock, from, {
                    text:
                        `📢 *TITANS TEAM · ALMACENAMIENTO*

╔══════════════════════════════╗
║       📦 SIN CAJAS           ║
╚══════════════════════════════╝

No tienes cajas *${nombre}* disponibles.

${generica
    ? "🎒 Consulta tus existencias con: *!inventario*"
    : `🛒 Puedes adquirir una con: *!caja ${rareza}*`}

🏆 *LIGA TITANS TEAM*`
                });
            }

            if (!apertura.ok || !apertura.resultado) {
                throw new Error("No se pudo confirmar la apertura de la caja.");
            }

            const resultado = apertura.resultado;

            const premioRealValido =
                resultado.premioReal &&
                resultado.premioReal.premio &&
                typeof resultado.premioReal.premio.nombre === "string" &&
                resultado.premioReal.premio.nombre.trim().length > 0;

            const textoPremioReal = premioRealValido
                ? `🎁 𝗣𝗥𝗘𝗠𝗜𝗢 𝗥𝗘𝗔𝗟 𝗢𝗕𝗧𝗘𝗡𝗜𝗗𝗢

🏆 Premio: ${resultado.premioReal.premio.nombre}
📩 La entrega continuará por privado. Estado: pendiente de datos para continuar con la entrega.`
                : "";

            if (resultado.mitica) {
                await anuncioGlobal(sock, from, "mitica", {
                    nombre: resultado.nombre,
                    objeto: resultado.objeto
                });
            }

            const cajasRestantes = generica
                ? resultado.cajas
                : resultado.cajasPorRareza[rareza];

            const nombreCaja = generica
                ? "Genérica"
                : NOMBRES[rareza];

            const mensaje =
`📢 *TITANS TEAM · RECOMPENSA DESBLOQUEADA*

╔══════════════════════════════╗
║       🎉 CAJA ABIERTA        ║
╚══════════════════════════════╝

👤 Titán: *${resultado.nombre}*

📦 Caja utilizada: *${nombreCaja}*
🏆 Rareza obtenida: *${resultado.rareza}*
🎁 Recompensa: *${resultado.objeto}*
${textoPremioReal ? `\n${textoPremioReal}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ *RECOMPENSAS*
⭐ Experiencia: *+${resultado.xp} XP*
💰 Monedas: *+${resultado.coins}*
${resultado.nivelesGanados > 0
    ? `🎊 ¡Subiste de nivel! Ahora eres nivel *${resultado.nivel}*\n🪙 Bonificación: *+${resultado.monedasNivel} monedas*`
    : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎒 *ESTADO DE TU INVENTARIO*
📦 Cajas ${nombreCaja} restantes: *${cajasRestantes}*
🧰 Objetos almacenados: *${resultado.objetos}*

🏆 *LIGA TITANS TEAM*`;

            await enviarMensajeTitans(sock, from, { text: mensaje });

            console.log("✅ Caja abierta correctamente");

        } catch (error) {
            console.error("❌ Error abrir:", error);

            monitor.registrarEvento("ERROR_SISTEMA", {
                estado: "ERROR",
                componente: "ABRIR",
                codigo: "SYSTEM_ERROR",
                descripcion: error.message
            });

            await enviarMensajeTitans(sock, from, {
                text:
`❌ *TITANS TEAM · APERTURA NO CONFIRMADA*

No fue posible confirmar el resultado de la apertura.

⚠️ No repitas el comando todavía.
🔎 Verifica tu inventario antes de intentarlo nuevamente.

Si necesitas ayuda, contacta a administración.

🏆 *LIGA TITANS TEAM*`
            });
        }
    }
};

const PIE_TITANS = "🏆LIGA TITANS TEAM - TITANSB MIEMBRO VIRTUAL 🤖";

async function enviarMensajeTitans(sock, from, contenido) {
    if (contenido && typeof contenido.text === "string") {
        contenido.text = contenido.text.includes(PIE_TITANS)
            ? contenido.text
            : `${contenido.text.trimEnd()}\n\n${PIE_TITANS}`;
    }
    return sock.sendMessage(from, contenido);
}
