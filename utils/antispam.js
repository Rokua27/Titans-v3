// utils/antispam.js

const mensajes = new Map();
const muteados = new Map();

// Configuración
const LIMITE_MENSAJES = 8;
const VENTANA_MS = 5000; // 5 segundos
const MUTE_MS = 1 * 60 * 1000; // 1 minuto

function registrarMensaje(userId) {
  const ahora = Date.now();

  if (!mensajes.has(userId)) {
    mensajes.set(userId, []);
  }

  const historial = mensajes.get(userId);

  // Mantener solo mensajes dentro de la ventana
  const recientes = historial.filter(
    tiempo => ahora - tiempo <= VENTANA_MS
  );

  recientes.push(ahora);

  mensajes.set(userId, recientes);

  return recientes.length;
}

function esSpam(userId) {
  const cantidad = registrarMensaje(userId);
  return cantidad >= LIMITE_MENSAJES;
}

function mutear(userId) {
  muteados.set(userId, Date.now() + MUTE_MS);
}

function estaMuteado(userId) {
  const hasta = muteados.get(userId);

  if (!hasta) return false;

  if (Date.now() > hasta) {
    muteados.delete(userId);
    return false;
  }

  return true;
}

function tiempoRestante(userId) {
  const hasta = muteados.get(userId);
  if (!hasta) return 0;

  return Math.max(0, hasta - Date.now());
}

module.exports = {
  esSpam,
  mutear,
  estaMuteado,
  tiempoRestante,
  LIMITE_MENSAJES,
  VENTANA_MS
};
