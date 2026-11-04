const {
    obtenerTodosLosComandos,
    obtenerComando
} = require("../utils/commandHandler");

module.exports = {

    nombre: "ayuda",

    alias: ["help"],

    categoria: "utilidades",

    descripcion: "Centro de ayuda del bot.",

    permisos: ["usuario"],

    uso: "!ayuda [categoría|comando]",

    async ejecutar(sock, from, args) {

        const lista = obtenerTodosLosComandos();

        // ============================
        // SIN ARGUMENTOS
        // ============================

        if (!args.length) {

            const categorias = {};

            for (const cmd of lista) {

                if (!categorias[cmd.categoria]) {
                    categorias[cmd.categoria] = 0;
                }

                categorias[cmd.categoria]++;

            }

            let texto = `╔══════════════════════╗
║      📚 CENTRO DE AYUDA
╚══════════════════════╝

Escribe:

• !ayuda jugador
• !ayuda equipo
• !ayuda torneo
• !ayuda perfil

━━━━━━━━━━━━━━━━━━

`;

            for (const categoria of Object.keys(categorias).sort()) {

                texto += `📂 ${categoria} (${categorias[categoria]})\n`;

            }

            texto += `
━━━━━━━━━━━━━━━━━━

💡 También puedes consultar un comando específico.

Ejemplo:

!ayuda perfil`;

            return await sock.sendMessage(from, {
                text: texto
            });

        }

        const consulta = args.join(" ").toLowerCase();

        // ============================
        // BUSCAR COMANDO
        // ============================

        const comando = obtenerComando(consulta);

        if (comando) {

            return await sock.sendMessage(from, {

                text:
`╔══════════════════════╗
║ 📘 ${comando.nombre.toUpperCase()}
╚══════════════════════╝

📝 Descripción:
${comando.descripcion}

⚙ Uso:
${comando.uso}

🔒 Permisos:
${comando.permisos.join(", ")}

🏷 Categoría:
${comando.categoria}

🔁 Alias:
${comando.alias.length ? comando.alias.join(", ") : "Ninguno"}`
            });

        }

        // ============================
        // BUSCAR CATEGORÍA
        // ============================

        const categoria = lista.filter(
            c => c.categoria.toLowerCase() === consulta
        );

        if (categoria.length) {

            let texto =
`╔══════════════════════╗
║ 📂 ${consulta.toUpperCase()}
╚══════════════════════╝

`;

            for (const cmd of categoria) {

                texto += `• ${cmd.uso}\n`;
                texto += `  ${cmd.descripcion}\n\n`;

            }

            return await sock.sendMessage(from, {
                text: texto
            });

        }

        // ============================
        // NO ENCONTRADO
        // ============================

        await sock.sendMessage(from, {

            text:
`❌ No existe ningún comando o categoría llamada:

${consulta}

Usa:

!ayuda`

        });

    }

};
