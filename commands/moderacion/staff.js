const { obtenerDatos } = require("../../utils/moderacion");
const { obtenerNombreUsuario } = require("../../utils/comunidad");

module.exports = {

    nombre: "staff",

    alias: ["stafflist"],

    permisos: ["moderador"],

    descripcion: "Muestra el equipo de moderación.",

    async ejecutar(sock, from) {

        const datos = obtenerDatos();

const fundador =
    datos.fundador
        ? obtenerNombreUsuario(datos.fundador)
        : "No asignado";

const admins =
    datos.admins.length
        ? datos.admins.map(obtenerNombreUsuario).join("\n")
        : "Ninguno";

const supermods =
    datos.supermods.length
        ? datos.supermods.map(obtenerNombreUsuario).join("\n")
        : "Ninguno";

const moderadores =
    datos.moderadores.length
        ? datos.moderadores.map(obtenerNombreUsuario).join("\n")
        : "Ninguno";

const ayudantes =
    datos.ayudantes.length
        ? datos.ayudantes.map(obtenerNombreUsuario).join("\n")
        : "Ninguno";

        await sock.sendMessage(from, {

            text:
`╔════════════════════════════╗
║      👑 STAFF TITANS 👑     ║
╚════════════════════════════╝

👑 Fundador
${fundador}

━━━━━━━━━━━━━━━━━━━━

🛡️ Administradores Globales
${admins}

⚔️ Super Moderadores
${supermods}

🛠️ Moderadores
${moderadores}

⭐ Ayudantes
${ayudantes}

━━━━━━━━━━━━━━━━━━━━
🤖 TitansBot v3`

        });

    }

};
