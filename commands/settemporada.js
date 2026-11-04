const { guardarTemporada } = require("../utils/torneoManager");
const { esAdmin } = require("../utils/admin");

module.exports = {

    nombre: "settemporada",

    categoria: "torneos",

    descripcion: "Crea o actualiza la temporada.",

    permisos: ["admin"],

    uso: "!settemporada <nombre>",

    async ejecutar(sock, from, args, msg) {

        const sender = msg.key.participant || msg.key.remoteJid;

        if (!(await esAdmin(sock, from, sender))) {
            return await sock.sendMessage(from, {
                text: "❌ Solo los administradores pueden usar este comando."
            });
        }

        const nombre = args.join(" ").trim();

        if (!nombre) {
            return await sock.sendMessage(from, {
                text: "❌ Uso: !settemporada Temporada 9"
            });
        }

        guardarTemporada({
            nombre,
            estado: "activa",
            fechaInicio: new Date().toLocaleDateString("es-CO"),
            fechaFin: ""
        });

        await sock.sendMessage(from, {
            text:
`🏆 TEMPORADA ACTUALIZADA

📖 ${nombre}

✅ La temporada ha sido iniciada correctamente.

🤖 TitansBot v3`
        });

    }

};
