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
                return await sock.sendMessage(from, {
                    text:
                        "⚠️ No puedo determinar tu inventario con seguridad. " +
                        "No se realizó ningún cambio. Contacta a administración."
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
`📢 *TITANS TEAM · INVENTARIO*

╔══════════════════════════════╗
║        🎒 INVENTARIO        ║
╚══════════════════════════════╝

👤 *${usuario?.nombre || "Titán"}*

📦 *CAJAS GENÉRICAS*
${inv.cajas}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎁 *CAJAS POR RAREZA*

⚪ Comunes: *${cantidades.comun} / 10*
🟢 Raras: *${cantidades.rara} / 10*
🔵 Épicas: *${cantidades.epica} / 10*
🟣 Legendarias: *${cantidades.legendaria} / 10*
🟡 Especiales: *${cantidades.especial} / 10*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎖️ Objetos registrados: *${inv.objetos.length}*

📜 *Últimos objetos*
${lista}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛡️ *Sistema de Inventario Titans Team*
🤖 *TitansB  Miembro Virtual*`;

            await sock.sendMessage(from, { text: mensaje });

        } catch (error) {
            console.error("❌ Error inventario:", error);

            await sock.sendMessage(from, {
                text: "❌ No pude mostrar el inventario."
            });
        }
    }
};
