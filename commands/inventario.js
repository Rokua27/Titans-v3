"use strict";

const { leerJSON } = require("../utils/database");
const { resolverClaveUsuario } = require("../utils/comunidad");
const { resolverInventario } = require("../utils/inventarioTitansB");

module.exports = {
    nombre: "inventario",
    categoria: "jugador",
    descripcion: "Muestra tu inventario.",
    uso: "!inventario",
    permisos: ["usuario"],
    alias: [],

    async ejecutar(sock, from, args, msg) {
        try {
            const sender = msg.key.participant || msg.key.remoteJid;

            const usuarios = leerJSON("usuarios.json") || {};
            const inventarios = leerJSON("inventarios.json") || {};

            const claveUsuario = resolverClaveUsuario(sender, usuarios);
            const usuario = claveUsuario ? usuarios[claveUsuario] : null;

            const resuelto = resolverInventario(sender, inventarios);

            if (!resuelto.ok) {
                return await enviarMensajeTitans(sock, from, {
                    text:
`⚠️ *TITANS TEAM · VALIDACIÓN DE INVENTARIO*

No fue posible identificar tu inventario de forma segura.

🔐 No se realizó ningún cambio en tus objetos ni cajas.

Si el problema continúa, contacta a administración.

🏆 *LIGA TITANS TEAM*`
                });
            }

            const inv = resuelto.inventario;
            const cantidades = inv.cajasPorRareza;

            const ultimos = inv.objetos.slice(-5).reverse();

            const lista = ultimos.length === 0
                ? "📭 No tienes objetos todavía."
                : ultimos.map((obj, i) =>
                    `${i + 1}. ${obj.nombre || "Objeto"}${obj.rareza ? ` — ${obj.rareza}` : ""}`
                ).join("\n");

            const mensaje =
`📢 *TITANS TEAM · CENTRO DE INVENTARIO*

╔══════════════════════════════╗
║       🎒 MI ALMACENAMIENTO   ║
╚══════════════════════════════╝

👤 Titán: *${usuario?.nombre || "Titán"}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 *RESERVA DE CAJAS GENÉRICAS*
🎁 Cantidad disponible: *${inv.cajas}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎁 *CAJAS POR RAREZA*
⚪ Comunes: *${cantidades.comun} / 10*
🟢 Raras: *${cantidades.rara} / 10*
🔵 Épicas: *${cantidades.epica} / 10*
🟣 Legendarias: *${cantidades.legendaria} / 10*
🟡 Especiales: *${cantidades.especial} / 10*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏆 *COLECCIÓN DE OBJETOS*
🎖️ Total registrado: *${inv.objetos.length}*

📜 *TUS ÚLTIMOS 5 OBJETOS*
${lista}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔎 Consulta tus existencias cuando quieras con *!inventario*.

🏆 *LIGA TITANS TEAM*`;

            await enviarMensajeTitans(sock, from, { text: mensaje });

        } catch (error) {
            console.error("❌ Error inventario:", error);

            await enviarMensajeTitans(sock, from, {
                text:
`❌ *TITANS TEAM · INVENTARIO NO DISPONIBLE*

No fue posible mostrar tu inventario en este momento.

🔐 Tus datos no se modificaron.
Inténtalo nuevamente más tarde o contacta a administración.

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
