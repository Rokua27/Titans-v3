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
                return await sock.sendMessage(from, {
                    text:
`📢 *TITANS TEAM · APERTURA DE CAJAS*

❌ Rareza no válida.

Usa:
• !abrir comun
• !abrir rara
• !abrir epica
• !abrir legendaria
• !abrir especial

El comando *!abrir* sin argumentos conserva las cajas genéricas antiguas.

🛡️ *Sistema de Economía Titans Team*
🤖 *TitansB  Miembro Virtual*`
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
                return await sock.sendMessage(from, {
                    text:
`📢 *TITANS TEAM · APERTURA DE CAJAS*

╔══════════════════════════════╗
║     🚫 LÍMITE ALCANZADO      ║
╚══════════════════════════════╝

Ya abriste las 3 cajas permitidas hoy.
El límite es compartido entre todas las rarezas.

📅 Vuelve mañana para seguir obteniendo recompensas.

🛡️ *Sistema de Economía Titans Team*
🤖 *TitansB  Miembro Virtual*`
                });
            }

            if (!apertura.ok && apertura.motivo === "inventario_invalido") {
                return await sock.sendMessage(from, {
                    text:
                        "⚠️ No pude validar tu inventario de forma segura. " +
                        "No se consumió ninguna caja. Contacta a administración."
                });
            }

            if (!apertura.ok && apertura.motivo === "sin_cajas") {
                const nombre = generica ? "genéricas" : NOMBRES[rareza];

                return await sock.sendMessage(from, {
                    text:
                        `📦 No tienes cajas ${nombre} disponibles. ` +
                        (generica
                            ? "Usa !inventario para consultar tus cajas."
                            : `Usa !caja ${rareza} para comprar una.`)
                });
            }

            if (!apertura.ok || !apertura.resultado) {
                throw new Error("No se pudo confirmar la apertura de la caja.");
            }

            const resultado = apertura.resultado;

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
`📢 *TITANS TEAM · APERTURA DE CAJAS*

╔══════════════════════════════╗
║       🎁 CAJA ABIERTA        ║
╚══════════════════════════════╝

👤 *${resultado.nombre}*

📦 Caja utilizada: *${nombreCaja}*
🏆 Rareza del objeto: *${resultado.rareza}*
🎖️ Objeto obtenido: *${resultado.objeto}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⭐ XP: *+${resultado.xp}*
💰 Monedas: *+${resultado.coins}*
${resultado.nivelesGanados > 0
    ? `🎉 Nivel alcanzado: *${resultado.nivel}*\n🪙 Bonificación por nivel: *+${resultado.monedasNivel} monedas*`
    : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Cajas ${nombreCaja} restantes: *${cajasRestantes}*
🎒 Objetos en inventario: *${resultado.objetos}*

🛡️ *Sistema de Economía Titans Team*
🤖 *TitansB  Miembro Virtual*`;

            await sock.sendMessage(from, { text: mensaje });

            console.log("✅ Caja abierta correctamente");

        } catch (error) {
            console.error("❌ Error abrir:", error);

            monitor.registrarEvento("ERROR_SISTEMA", {
                estado: "ERROR",
                componente: "ABRIR",
                codigo: "SYSTEM_ERROR",
                descripcion: error.message
            });

            await sock.sendMessage(from, {
                text: "❌ Ocurrió un error al abrir la caja. Verifica el inventario antes de repetir el comando."
            });
        }
    }
};
