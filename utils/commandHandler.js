const fs = require("fs");
const path = require("path");

const comandos = new Map();

function cargarCarpeta(carpeta) {

    const archivos = fs.readdirSync(carpeta);

    for (const archivo of archivos) {

        const ruta = path.join(carpeta, archivo);

        const stat = fs.statSync(ruta);

        if (stat.isDirectory()) {

            cargarCarpeta(ruta);
            continue;

        }

        if (!archivo.endsWith(".js")) continue;

        // Ignorar TODOS los archivos de respaldo
        if (
            archivo.includes("_backup") ||
            archivo.includes(".backup") ||
            archivo.includes("_pre_") ||
            archivo.endsWith(".bak.js")
        ) {
            console.log(`⏭️ Ignorado respaldo: ${archivo}`);
            continue;
        }

        const comandoRpgTitans = path.resolve(__dirname, "..", "commands", "rpg.js");
        if (path.resolve(ruta) === comandoRpgTitans) {
            console.log("⏭️ Excluido sistema independiente: rpg.js");
            continue;
        }

        try {

            delete require.cache[require.resolve(ruta)];

            const comando = require(ruta);

            if (!comando.nombre) {

                console.log(`⚠ ${archivo} no tiene nombre.`);
                continue;

            }

comando.categoria ??= "otros";
comando.descripcion ??= "Sin descripción.";
comando.permisos ??= ["usuario"];
comando.uso ??= `!${comando.nombre}`;
comando.alias ??= [];
            comandos.set(comando.nombre.toLowerCase(), comando);

            if (Array.isArray(comando.alias)) {

                for (const alias of comando.alias) {

                    comandos.set(alias.toLowerCase(), comando);

                }

            }

            console.log(`✅ ${comando.nombre}`);

        } catch (err) {

            console.error(`❌ ${archivo} -> ${err.message}`);

        }

    }

}

function cargarComandos() {

    comandos.clear();

    const carpetas = [
        path.join(__dirname, "..", "commands")
    ];

    for (const carpeta of carpetas) {

        if (fs.existsSync(carpeta)) {
            cargarCarpeta(carpeta);
        }

    }

    console.log(`🚀 Total cargados: ${comandos.size}`);

}

function obtenerComando(nombre) {

    return comandos.get(nombre.toLowerCase());

}

function obtenerTodosLosComandos() {

    const vistos = new Set();

    const lista = [];

    for (const comando of comandos.values()) {

        if (!comando || !comando.nombre) continue;

        if (vistos.has(comando.nombre)) continue;

        vistos.add(comando.nombre);

        lista.push({

            nombre: comando.nombre,

            alias: comando.alias || [],

            categoria: comando.categoria || "otros",

            descripcion: comando.descripcion || "Sin descripción.",

            permisos: comando.permisos || ["usuario"],

            uso: comando.uso || `!${comando.nombre}`

        });

    }

    return lista;

}

module.exports = {

    cargarComandos,

    obtenerComando,

    obtenerTodosLosComandos

};
