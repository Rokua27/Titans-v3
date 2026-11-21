"use strict";

const monitor = require("../utils/monitor");
const {
    comprarCaja,
    PRECIOS_CAJAS
} = require("../utils/cajasEconomia");

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
    nombre: "caja",
    alias: [],
    categoria: "jugador",
    descripcion: "Compra una caja misteriosa por rareza.",
    permisos: ["usuario"],
    uso: "!caja [comun|rara|epica|legendaria|especial]",

    async ejecutar(sock, from, args, msg) {
        try {
            const sender = msg.key.participant || msg.key.remoteJid;
            const messageId = msg.key.id;

            const entrada = String(args?.[0] || "comun")
                .trim()
                .toLowerCase();

            const rareza = RAREZAS[entrada];

            if (!rareza) {
                return await sock.sendMessage(from, {
                    text:
`📢 *TITANS TEAM · TIENDA DE CAJAS*

❌ Rareza no válida.

📦 Disponibles:
⚪ Común: 1.500 monedas
🟢 Rara: 3.500 monedas
🔵 Épica: 7.500 monedas
🟣 Legendaria: 15.000 monedas
🟡 Especial: 30.000 monedas

Usa: *!caja rareza*

🛡️ *Sistema de Economía Titans Team*
🤖 *TitansB  Miembro Virtual*`
                });
            }

            const compra = await comprarCaja(
                sender,
                messageId,
                rareza
            );

            if (compra.duplicada) {
                console.log("ℹ️ Compra repetida: no se vuelve a confirmar.");
                return;
            }

            if (!compra.ok && compra.motivo === "limite") {
                return await sock.sendMessage(from, {
                    text:
`📢 *TITANS TEAM · TIENDA DE CAJAS*

╔══════════════════════════════╗
║     🚫 LÍMITE ALCANZADO      ║
╚══════════════════════════════╝

Ya realizaste las 3 compras permitidas hoy.
El límite es compartido entre todas las rarezas.

📅 Podrás comprar nuevamente mañana.

🛡️ *Sistema de Economía Titans Team*
🤖 *TitansB  Miembro Virtual*`
                });
            }

            if (!compra.ok && compra.motivo === "almacenamiento_lleno") {
                return await sock.sendMessage(from, {
                    text:
`📢 *TITANS TEAM · ALMACENAMIENTO*

📦 Tu almacenamiento de cajas ${NOMBRES[rareza]} está lleno.

Límite: 10 cajas por rareza.
No se descontaron monedas.

🛡️ *Sistema de Economía Titans Team*
🤖 *TitansB  Miembro Virtual*`
                });
            }

            if (!compra.ok && compra.motivo === "saldo_insuficiente") {
                return await sock.sendMessage(from, {
                    text:
`📢 *TITANS TEAM · TIENDA DE CAJAS*

╔══════════════════════════════╗
║       💰 SALDO INSUFICIENTE  ║
╚══════════════════════════════╝

📦 Caja: *${NOMBRES[rareza]}*
💵 Precio: *${PRECIOS_CAJAS[rareza].toLocaleString("es-CO")} monedas*
💰 Saldo disponible: *${compra.saldo.toLocaleString("es-CO")} monedas*

No se realizó ningún descuento.

🛡️ *Sistema de Economía Titans Team*
🤖 *TitansB  Miembro Virtual*`
                });
            }

            if (!compra.ok && compra.motivo === "inventario_invalido") {
                return await sock.sendMessage(from, {
                    text:
                        "⚠️ No pude validar tu inventario de forma segura. " +
                        "No se descontaron monedas. Contacta a administración."
                });
            }

            if (!compra.ok || !compra.resultado) {
                throw new Error("No se pudo confirmar la compra de la caja.");
            }

            const resultado = compra.resultado;

            const mensaje =
`📢 *TITANS TEAM · TIENDA DE CAJAS*

╔══════════════════════════════╗
║       📦 COMPRA CONFIRMADA   ║
╚══════════════════════════════╝

👤 *${resultado.nombre}*

🎁 Caja adquirida: *${NOMBRES[rareza]}*
💰 Costo: *${resultado.costo.toLocaleString("es-CO")} monedas*
💳 Saldo restante: *${resultado.saldoFinal.toLocaleString("es-CO")} monedas*

📦 Cajas ${NOMBRES[rareza]} disponibles:
*${resultado.cajasPorRareza[rareza]} / 10*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📖 Usa *!abrir ${rareza}* para descubrir tu recompensa.

🛡️ *Sistema de Economía Titans Team*
🤖 *TitansB  Miembro Virtual*`;

            await sock.sendMessage(from, { text: mensaje });

        } catch (error) {
            console.error("❌ Error caja:", error);

            monitor.registrarEvento("ERROR_SISTEMA", {
                estado: "ERROR",
                componente: "CAJA",
                codigo: "SYSTEM_ERROR",
                descripcion: error.message
            });

            await sock.sendMessage(from, {
                text: "❌ No pude comprar la caja. No repitas el comando hasta verificar el resultado."
            });
        }
    }
};
