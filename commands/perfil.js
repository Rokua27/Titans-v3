"use strict";

const fs = require("fs");
const path = require("path");
const { leerJSON } = require("../utils/database");
const { obtenerTitulo, obtenerLogros } = require("../utils/logros");
const { obtenerRol } = require("../utils/roles");
const {
    identidadAdmitida,
    resolverPerfilExacto
} = require("../community/profile-edit-handler");

const RUTA_MIEMBROS_NUEVO = path.join(
    __dirname,
    "..",
    "..",
    "Titans-v3-nuevo",
    "data",
    "miembros.json"
);

function textoSeguro(valor, defecto = "No registrado") {
    if (
        valor === null ||
        valor === undefined ||
        String(valor).trim() === ""
    ) {
        return defecto;
    }

    return String(valor)
        .replace(/[\r\n]+/g, " ")
        .trim();
}

function numeroSeguro(valor, defecto = 0) {
    const numero = Number(valor);
    return Number.isFinite(numero) && numero >= 0
        ? numero
        : defecto;
}

function formatearFecha(fecha) {
    if (
        typeof fecha !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
    ) {
        return "";
    }

    const [anio, mes, dia] = fecha.split("-");
    return `${dia}/${mes}/${anio}`;
}

function obtenerMiembroTitansNuevo(identidad) {
    try {
        if (!fs.existsSync(RUTA_MIEMBROS_NUEVO)) return null;

        const base = JSON.parse(
            fs.readFileSync(RUTA_MIEMBROS_NUEVO, "utf8")
        );

        if (
            !base ||
            typeof base !== "object" ||
            !base.miembros ||
            typeof base.miembros !== "object" ||
            Array.isArray(base.miembros)
        ) {
            return null;
        }

        const miembro = base.miembros[identidad];

        if (
            !miembro ||
            typeof miembro !== "object" ||
            miembro.whatsappId !== identidad ||
            typeof miembro.id !== "string" ||
            !/^LT-\d{3,}$/.test(miembro.id)
        ) {
            return null;
        }

        return miembro;
    } catch (error) {
        console.error(
            "TitansB | No se pudo consultar el ID compartido:",
            error.message
        );
        return null;
    }
}

function buscarEquipoExacto(identidad) {
    const equipos = leerJSON("equipos.json");

    if (
        !equipos ||
        typeof equipos !== "object" ||
        Array.isArray(equipos)
    ) {
        return null;
    }

    for (const [nombre, equipo] of Object.entries(equipos)) {
        if (
            equipo &&
            typeof equipo === "object" &&
            Array.isArray(equipo.miembros) &&
            equipo.miembros.includes(identidad)
        ) {
            return textoSeguro(equipo.nombre, nombre);
        }
    }

    return null;
}

function crearPerfilPendiente(nombre) {
    return [
        "╔════════════════════════════════╗",
        "║          👑 PERFIL TITANS      ║",
        "╠════════════════════════════════╣",
        `║ 👤 ${nombre}`,
        "║",
        "║ 📝 Aún no tienes un perfil",
        "║    competitivo registrado.",
        "║",
        "║ 🏆 ¡Únete oficialmente a",
        "║    la comunidad Titans!",
        "║",
        "║ 📲 Escribe: !registro",
        "║",
        "║ Regístrate para obtener tu",
        "║ perfil competitivo e ID.",
        "╠════════════════════════════════╣",
        "║       🏆 LIGA TITANS TEAM      ║",
        "║   🤖 TITANSB · MIEMBRO VIRTUAL ║",
        "╚════════════════════════════════╝"
    ].join("\n");
}

function crearPerfilRegistrado(datos) {
    const {
        nombre,
        id,
        pais,
        cargo,
        distincion,
        estado,
        alias,
        rolJuego,
        rango,
        equipo,
        reputacion,
        logros,
        fecha,
        nivel,
        xpActual,
        xpNecesaria,
        progreso,
        barra,
        coins,
        mensajes,
        racha,
        titulo
    } = datos;

    const lineas = [
        "╔════════════════════════════════╗",
        "║          👑 PERFIL TITANS      ║",
        "╠════════════════════════════════╣",
        `║ 👤 ${nombre}`
    ];

    if (id) lineas.push(`║ 🆔 ID: ${id}`);

    lineas.push(
        `║ 🌎 ${pais}`,
        "║",
        `║ 🏛️ Cargo: ${cargo}`,
        `║ 🏅 Distinción: ${distincion}`,
        `║ 🟢 Estado: ${estado}`,
        "║",
        "║ ─────── COMPETITIVO ─────────",
        `║ 🎮 Alias: ${alias}`,
        `║ ⚔️ Rol: ${rolJuego}`,
        `║ 🏆 Rango: ${rango}`,
        `║ 🏟️ Equipo: ${equipo}`
    );

    if (fecha) lineas.push(`║ 📅 Miembro desde: ${fecha}`);

    lineas.push(
        "╠════════════════════════════════╣",
        "║       📈 PROGRESO TITANS       ║",
        `║ 🏅 Nivel: ${nivel}`,
        `║ ⭐ XP: ${xpActual} / ${xpNecesaria}`,
        `║ 📊 Progreso: ${progreso}%`,
        `║ ${barra}`,
        `║ 💰 Monedas: ${coins}`,
        `║ 💬 Mensajes: ${mensajes}`,
        `║ 🔥 Racha diaria: ${racha}`,
        "║",
        `║ 👑 Título: ${titulo}`,
        `║ ⭐ Reputación: ${reputacion}`,
        `║ 🏅 Logros: ${logros}`,
        "╠════════════════════════════════╣",
        "║       🏆 LIGA TITANS TEAM      ║",
        "║   🤖 TITANSB · MIEMBRO VIRTUAL ║",
        "╚════════════════════════════════╝"
    );

    return lineas.join("\n");
}

module.exports = {
    nombre: "perfil",
    categoria: "jugador",
    descripcion: "Muestra el perfil Titans y el progreso competitivo.",
    uso: "!perfil",
    permisos: ["usuario"],
    alias: [],

    async ejecutar(sock, from, args, msg) {
        try {
            const identidad =
                msg?.key?.participant ||
                msg?.key?.remoteJid;

            if (!identidadAdmitida(identidad)) {
                return await sock.sendMessage(from, {
                    text:
                        "❌ No pude verificar tu identidad de WhatsApp. " +
                        "No se consultó ningún perfil alternativo."
                });
            }

            const perfiles = leerJSON("perfiles_miembros.json");
            let perfilCompetitivo = null;

            if (
                perfiles &&
                typeof perfiles === "object" &&
                !Array.isArray(perfiles)
            ) {
                const resultado = resolverPerfilExacto(
                    identidad,
                    perfiles
                );

                if (resultado.valido) {
                    perfilCompetitivo = resultado.perfil;
                } else if (resultado.motivo === "identidad_ambigua") {
                    return await sock.sendMessage(from, {
                        text:
                            "⚠️ Tu identidad tiene una coincidencia " +
                            "ambigua. Solicita una revisión a la administración."
                    });
                }
            }

            const usuarios = leerJSON("usuarios.json") || {};
            const usuario = usuarios[identidad];

            if (!perfilCompetitivo) {
                const nombrePendiente = textoSeguro(
                    msg?.pushName || usuario?.nombre,
                    "Titán"
                );

                return await sock.sendMessage(from, {
                    text: crearPerfilPendiente(nombrePendiente)
                });
            }

            const datosUsuario =
                usuario &&
                typeof usuario === "object" &&
                !Array.isArray(usuario)
                    ? usuario
                    : {};

            const miembroNuevo = obtenerMiembroTitansNuevo(identidad);
            const fecha = miembroNuevo
                ? formatearFecha(miembroNuevo.miembroDesde)
                : "";

            let cargo = "🙋 Usuario";

            try {
                const rol = await obtenerRol(sock, from, identidad);
                cargo = textoSeguro(rol?.titulo, cargo);
            } catch (error) {
                console.error(
                    "TitansB | No se pudo consultar el cargo:",
                    error.message
                );
            }

            const nombre = textoSeguro(
                datosUsuario.nombre || perfilCompetitivo.nombre,
                "Titán"
            );

            const nivel = numeroSeguro(datosUsuario.nivel, 1) || 1;
            const xpActual = numeroSeguro(datosUsuario.xp);
            const xpNecesaria = nivel * 100;
            const progreso = Math.min(
                100,
                Math.floor((xpActual / xpNecesaria) * 100)
            );

            const barra =
                "█".repeat(Math.floor(progreso / 10)) +
                "░".repeat(10 - Math.floor(progreso / 10));

            const logrosUsuario = obtenerLogros(identidad);
            const listaLogros = logrosUsuario.length
                ? logrosUsuario.map(logro =>
                    `${logro?.emoji || "🏅"} ${textoSeguro(
                        logro?.nombre || logro?.clave
                    )}`
                ).join(", ")
                : "Sin logros registrados";

            const rolesVisuales = perfilCompetitivo.rolJuego
                ? (
                    Array.isArray(perfilCompetitivo.rolJuego)
                        ? perfilCompetitivo.rolJuego
                        : String(perfilCompetitivo.rolJuego).split(",")
                )
                    .map(rol => String(rol).trim())
                    .filter(Boolean)
                    .join(" · ")
                : "No registrado";

            const equipo = buscarEquipoExacto(identidad) ||
                textoSeguro(perfilCompetitivo.equipo, "Sin equipo");

            const mensaje = crearPerfilRegistrado({
                nombre,
                id: miembroNuevo?.id || "",
                pais: textoSeguro(perfilCompetitivo.pais),
                cargo,
                distincion: "Sin distinción registrada",
                estado: "Registrado",
                alias: textoSeguro(perfilCompetitivo.nombreJuego),
                rolJuego: rolesVisuales,
                rango: textoSeguro(perfilCompetitivo.rango),
                equipo,
                reputacion: "No disponible",
                logros: listaLogros,
                fecha,
                nivel,
                xpActual,
                xpNecesaria,
                progreso,
                barra,
                coins: numeroSeguro(datosUsuario.coins),
                mensajes: numeroSeguro(datosUsuario.mensajes),
                racha: numeroSeguro(datosUsuario.racha),
                titulo: textoSeguro(obtenerTitulo(identidad))
            });

            await sock.sendMessage(from, { text: mensaje });

        } catch (error) {
            console.error(
                "TitansB | Error al mostrar perfil:",
                error.message
            );

            await sock.sendMessage(from, {
                text:
                    "❌ No pude mostrar tu perfil. " +
                    "No se modificaron tus datos."
            });
        }
    }
};
