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
                return await enviarMensajeTitans(sock, from, {
                    text:
`📢 *TITANS TEAM · MERCADO DE CAJAS*

╔══════════════════════════════╗
║       📦 CATÁLOGO TITANS     ║
╚══════════════════════════════╝

❌ La rareza indicada no es válida.

Elige una de las siguientes opciones:

⚪ *COMÚN*
   💰 1.500 monedas

🟢 *RARA*
   💰 3.500 monedas

🔵 *ÉPICA*
   💰 7.500 monedas

🟣 *LEGENDARIA*
   💰 15.000 monedas

🟡 *ESPECIAL*
   💰 30.000 monedas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛒 Comando: *!caja rareza*
🎒 Capacidad: 10 cajas por rareza

🎁 *¡PREMIOS SORPRENDENTES TE ESPERAN!*
💎 50 o 86 diamantes
🎟️ Pase semanal de diamantes
👑 Pase semanal Elite`
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
                return await enviarMensajeTitans(sock, from, {
                    text:
`📢 *TITANS TEAM · MERCADO DE CAJAS*

╔══════════════════════════════╗
║       🚫 CUPO AGOTADO        ║
╚══════════════════════════════╝

Ya utilizaste tus 3 compras permitidas para hoy.

📦 El límite es compartido entre todas las rarezas.

🕛 Podrás volver a comprar después del reinicio diario, a las 00:00 de Colombia.

🏆 *LIGA TITANS TEAM*`
                });
            }

            if (!compra.ok && compra.motivo === "almacenamiento_lleno") {
                return await enviarMensajeTitans(sock, from, {
                    text:
`📢 *TITANS TEAM · ALMACENAMIENTO*

╔══════════════════════════════╗
║      🎒 ESPACIO COMPLETO     ║
╚══════════════════════════════╝

📦 Rareza: *${NOMBRES[rareza]}*
🔒 Capacidad máxima: *10 cajas*

No puedes guardar más cajas de esta rareza por ahora.

💰 No se descontaron monedas.
🏆 *LIGA TITANS TEAM*`
                });
            }

            if (!compra.ok && compra.motivo === "saldo_insuficiente") {
                return await enviarMensajeTitans(sock, from, {
                    text:
`📢 *TITANS TEAM · MERCADO DE CAJAS*

╔══════════════════════════════╗
║      💰 SALDO INSUFICIENTE   ║
╚══════════════════════════════╝

📦 Caja seleccionada: *${NOMBRES[rareza]}*
💵 Precio: *${PRECIOS_CAJAS[rareza].toLocaleString("es-CO")} monedas*
👛 Tu saldo: *${compra.saldo.toLocaleString("es-CO")} monedas*

Te faltan monedas para completar esta compra.

🔐 No se realizó ningún descuento.
🏆 *LIGA TITANS TEAM*`
                });
            }

            if (!compra.ok && compra.motivo === "inventario_invalido") {
                return await enviarMensajeTitans(sock, from, {
                    text:
`⚠️ *TITANS TEAM · VALIDACIÓN DE SEGURIDAD*

No fue posible validar tu inventario de forma segura.

🔐 La compra fue detenida.
💰 No se descontaron monedas.

Si el problema continúa, contacta a administración.

🏆 *LIGA TITANS TEAM*`
                });
            }

            if (!compra.ok || !compra.resultado) {
                throw new Error("No se pudo confirmar la compra de la caja.");
            }

            const resultado = compra.resultado;

            const mensaje =
`📢 *TITANS TEAM · MERCADO DE CAJAS*

╔══════════════════════════════╗
║       ✅ COMPRA EXITOSA      ║
╚══════════════════════════════╝

👤 Titán: *${resultado.nombre}*

🎁 *CAJA ADQUIRIDA*
${NOMBRES[rareza]}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 Costo pagado: *${resultado.costo.toLocaleString("es-CO")} monedas*
👛 Saldo disponible: *${resultado.saldoFinal.toLocaleString("es-CO")} monedas*

🎒 *TU ALMACENAMIENTO*
📦 Cajas ${NOMBRES[rareza]}: *${resultado.cajasPorRareza[rareza]} / 10*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔓 ¿Listo para descubrir tu recompensa?
📖 Abre tu caja con: *!abrir ${rareza}*

🎁 *¡PREMIOS SORPRENDENTES TE ESPERAN!*
💎 50 o 86 diamantes
🎟️ Pase semanal de diamantes
👑 Pase semanal Elite`;

            await enviarMensajeTitans(sock, from, { text: mensaje });

        } catch (error) {
            console.error("❌ Error caja:", error);

            monitor.registrarEvento("ERROR_SISTEMA", {
                estado: "ERROR",
                componente: "CAJA",
                codigo: "SYSTEM_ERROR",
                descripcion: error.message
            });

            await enviarMensajeTitans(sock, from, {
                text:
`❌ *TITANS TEAM · COMPRA NO VERIFICADA*

No pude confirmar el resultado de la operación.

⚠️ Por seguridad, no repitas el comando todavía.
🔎 Verifica tu saldo y almacenamiento antes de intentarlo nuevamente.

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
