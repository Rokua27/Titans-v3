"use strict";

const fs = require("fs");
const path = require("path");
const registro = require("../community/registration");

const RUTA_PERFILES = path.join(
  __dirname,
  "../database/perfiles_miembros.json"
);

function validarIdentidadRemitente(id) {
  return (
    typeof id === "string" &&
    id === id.trim() &&
    id.length > 0 &&
    (id.endsWith("@lid") || id.endsWith("@s.whatsapp.net"))
  );
}

function obtenerBaseIdentidad(id) {
  return String(id)
    .replace(/@s\.whatsapp\.net$/i, "")
    .replace(/@lid$/i, "")
    .replace(/@c\.us$/i, "");
}

function revisarPerfilExistente(identidad) {
  if (!fs.existsSync(RUTA_PERFILES)) {
    return { seguro: false, motivo: "almacenamiento_no_disponible" };
  }

  let perfiles;

  try {
    perfiles = JSON.parse(fs.readFileSync(RUTA_PERFILES, "utf8"));
  } catch {
    return { seguro: false, motivo: "almacenamiento_no_disponible" };
  }

  if (!perfiles || typeof perfiles !== "object" || Array.isArray(perfiles)) {
    return { seguro: false, motivo: "almacenamiento_no_disponible" };
  }

  if (Object.prototype.hasOwnProperty.call(perfiles, identidad)) {
    return { seguro: false, motivo: "perfil_existente" };
  }

  const baseBuscada = obtenerBaseIdentidad(identidad);
  const coincidencias = Object.keys(perfiles).filter(
    clave => obtenerBaseIdentidad(clave) === baseBuscada
  );

  if (coincidencias.length > 0) {
    return { seguro: false, motivo: "identidad_ambigua" };
  }

  return { seguro: true };
}

function mensajeGrupo(texto) {
  return (
    "📢 *TITANSB · REGISTRO COMPETITIVO*\n\n" +
    texto +
    "\n\n🛡️ *Sistema de Moderación Titans Team*"
  );
}

module.exports = {
  nombre: "registro",
  alias: ["registrarme"],
  categoria: "jugador",
  descripcion: "Inicia el registro competitivo por mensaje privado.",
  permisos: ["usuario"],
  uso: "!registro",

  async ejecutar(sock, from, args, msg) {
    if (typeof from !== "string" || !from.endsWith("@g.us")) {
      return sock.sendMessage(from, {
        text: mensajeGrupo(
          "Usa este comando dentro del grupo de la comunidad para iniciar tu registro privado."
        )
      });
    }

    const remitente = msg && msg.key
      ? (msg.key.participant || msg.key.remoteJid)
      : null;

    if (!validarIdentidadRemitente(remitente)) {
      return sock.sendMessage(from, {
        text: mensajeGrupo(
          "No pude verificar tu identidad de forma segura. Solicita ayuda a la administración."
        )
      });
    }

    const revision = revisarPerfilExistente(remitente);

    if (!revision.seguro) {
      const textos = {
        perfil_existente:
          "Ya existe un perfil competitivo asociado a tu identidad. Contacta con la administración si necesitas corregirlo.",
        identidad_ambigua:
          "No puedo confirmar de forma segura qué perfil te corresponde. La administración debe verificar tu identidad antes de continuar.",
        almacenamiento_no_disponible:
          "No pude verificar los perfiles oficiales de forma segura. El registro no se ha iniciado; inténtalo más tarde o contacta con la administración."
      };

      return sock.sendMessage(from, {
        text: mensajeGrupo(
          textos[revision.motivo] || textos.almacenamiento_no_disponible
        )
      });
    }

    let resultado;

    try {
      resultado = registro.iniciarRegistro(remitente, {
        chatPrivado: remitente
      });
    } catch {
      return sock.sendMessage(from, {
        text: mensajeGrupo(
          "No pude iniciar el registro de forma segura. Inténtalo más tarde."
        )
      });
    }

    const pregunta = resultado.pregunta;

    if (!pregunta) {
      if (resultado.iniciado) {
        registro.cancelarRegistro(remitente);
      }

      return sock.sendMessage(from, {
        text: mensajeGrupo(
          "El registro pendiente tiene un estado inválido. Contacta con la administración."
        )
      });
    }

    const textoPrivado =
      "📢 *TITANSB · REGISTRO COMPETITIVO*\n\n" +
      pregunta.mensaje +
      "\n\nEscribe *cancelar* si deseas detener el proceso.";

    try {
      await sock.sendMessage(remitente, { text: textoPrivado });
    } catch {
      if (resultado.iniciado) {
        try {
          registro.cancelarRegistro(remitente);
        } catch {
          // No se exponen detalles internos ni identificadores.
        }
      }

      return sock.sendMessage(from, {
        text: mensajeGrupo(
          "No pude enviarte el mensaje privado. Revisa que puedas recibir mensajes y vuelve a intentarlo. No se modificó tu perfil competitivo."
        )
      });
    }

    const aviso = resultado.iniciado
      ? "Te envié la primera pregunta por mensaje privado. Continúa allí para completar tu registro."
      : "Ya tienes un registro pendiente. Te envié por privado la pregunta que debes responder.";

    return sock.sendMessage(from, {
      text: mensajeGrupo(aviso)
    });
  }
};
