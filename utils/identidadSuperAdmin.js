"use strict";

const SUPER_ADMINS = require("../config/superadmins");

const esLidValido = id =>
  typeof id === "string" &&
  /^\d{5,20}@lid$/.test(id);

const esPnValido = id =>
  typeof id === "string" &&
  /^\d{5,20}@(s\.whatsapp\.net|c\.us)$/.test(id);

const SUPER_ADMINS_VALIDOS = new Set(
  Array.isArray(SUPER_ADMINS)
    ? SUPER_ADMINS.filter(esLidValido)
    : []
);

/**
 * Resuelve únicamente identidades verificables para autorización SuperAdmin.
 * No convierte PN en LID ni intenta inferir correspondencias.
 */
function obtenerIdentidadSuperAdmin(msg) {
  const key = msg?.key;

  if (!key || typeof key !== "object") return null;

  const remoteJid = key.remoteJid;
  const participant = key.participant;
  const participantLid = key.participantLid;

  // Mensajes de grupo: el LID explícito de participante tiene prioridad.
  if (typeof remoteJid === "string" && remoteJid.endsWith("@g.us")) {
    if (participantLid !== undefined && participantLid !== null) {
      if (!esLidValido(participantLid)) return null;

      if (participant !== undefined && participant !== null) {
        if (!esLidValido(participant) && !esPnValido(participant)) {
          return null;
        }

        // Dos LID distintos representan una identidad contradictoria.
        if (esLidValido(participant) && participant !== participantLid) {
          return null;
        }
      }

      return SUPER_ADMINS_VALIDOS.has(participantLid)
        ? participantLid
        : null;
    }

    // Sin participantLid, solo se acepta un participant que ya sea LID.
    if (!esLidValido(participant)) return null;

    return SUPER_ADMINS_VALIDOS.has(participant)
      ? participant
      : null;
  }

  // Chat privado: no inferir identidad a partir de senderPn/senderLid.
  if (!esLidValido(remoteJid)) return null;

  return SUPER_ADMINS_VALIDOS.has(remoteJid)
    ? remoteJid
    : null;
}

module.exports = { obtenerIdentidadSuperAdmin };
