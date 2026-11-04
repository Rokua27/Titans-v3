const crear = require("./equipoadminCrear");
module.exports = {

    nombre: "equipoadmin",

    alias: ["ea"],

    categoria: "superadmin",

    descripcion: "Panel de administración de equipos.",

    permisos: ["superadmin"],

    uso: "!equipoadmin",

    async ejecutar(sock, from, args, msg) {

        const accion = (args[0] || "").toLowerCase();

        switch (accion) {

            case "crear":
                return crear.ejecutar(sock, from, args.slice(1), msg);

case "listar": {

    const listar = require("./equipoadminListar");

    return listar.ejecutar(sock, from);

}

case "info": {

    const info = require("./equipoadminInfo");

    return info.ejecutar(sock, from, args.slice(1));

}

case "lider": {

    const lider = require("./equipoadminLider");

    return lider.ejecutar(sock, from, args.slice(1));

}

case "renombrar": {

    const renombrar = require("./equipoadminRenombrar");

    return renombrar.ejecutar(sock, from, args.slice(1));

}

case "eliminar": {

    const eliminar = require("./equipoadminEliminar");

    return eliminar.ejecutar(sock, from, args.slice(1));

}

case "info": {

    const info = require("./equipoadminInfo");

    return info.ejecutar(sock, from, args.slice(1));

}

            default:

                return await sock.sendMessage(from, {
                    text:
`╔══════════════════════════════╗
║      ⚙️ EQUIPO ADMIN ⚙️      ║
╚══════════════════════════════╝

👑 Panel exclusivo para Super Admin

━━━━━━━━━━━━━━━━━━━━━━

➕ !equipoadmin crear NombreEquipo @lider

👑 !equipoadmin lider

📋 !equipoadmin listar

ℹ️ !equipoadmin info

✏️ !equipoadmin renombrar

🗑️ !equipoadmin eliminar

━━━━━━━━━━━━━━━━━━━━━━

🤖 TitansBot v3`
                });

        }

    }

};
