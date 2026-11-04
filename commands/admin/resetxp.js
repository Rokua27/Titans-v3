const { leerJSON, guardarJSON } = require("../../utils/database");
const { esFundador } = require("../../utils/moderacion");

module.exports = {

    nombre: "resetxp",

    alias: ["resetniveles"],

    categoria: "admin",

    descripcion: "Reinicia el XP, nivel y mensajes de todos los usuarios.",

    permisos: ["fundador"],

    async ejecutar(sock, from, args, msg) {

        const sender = msg.key.participant || msg.key.remoteJid;

        if (!esFundador(sender)) {

            return sock.sendMessage(from, {

                text: "❌ Solo el Fundador puede ejecutar este comando."

            });

        }

        const usuarios = leerJSON("usuarios.json") || {};
       guardarJSON("usuarios.json", usuarios);

        let total = 0;

        for (const id of Object.keys(usuarios)) {

            usuarios[id].xp = 0;
            usuarios[id].nivel = 1;
            usuarios[id].mensajes = 0;

            total++;

        }

        guardarJSON("usuarios.json", usuarios);

        await sock.sendMessage(from, {

            text:
`╔══════════════════════╗
║   🏆 NUEVA TEMPORADA  ║
╚══════════════════════╝

✅ XP reiniciado correctamente.

📊 Usuarios reiniciados:
${total}

🔄 Se conservaron:
💰 Monedas
🎒 Inventario
🏅 Logros
🔥 Rachas
👤 Datos de usuario

⚔️ TitansBot v3`

        });

    }

};
