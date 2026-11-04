const { leerJSON, guardarJSON } = require("./database");

// ======================================
// 🎖️ DEFINICIÓN DE LOGROS
// ======================================

const LOGROS = {
  primer_jackpot: {
    nombre: "Primer Jackpot",
    emoji: "🎰",
    titulo: "Afortunado Supremo"
  },

  cien_cajas: {
    nombre: "Coleccionista Épico",
    emoji: "📦",
    titulo: "Maestro del Loot"
  },

  raid_10k: {
    nombre: "Destructor de Titanes",
    emoji: "🐉",
    titulo: "Cazador de Titanes"
  },

  nivel_10: {
    nombre: "Ascenso Legendario",
    emoji: "⭐",
    titulo: "Guerrero Legendario"
  },

  nivel_25: {
    nombre: "Mito Viviente",
    emoji: "👑",
    titulo: "Titán Supremo"
  }
};

// ======================================
// 🎖️ DESBLOQUEAR LOGRO
// ======================================

function desbloquearLogro(userId, clave) {
  const logrosDB = leerJSON("logros.json") || {};

  if (!logrosDB[userId]) {
    logrosDB[userId] = {
      logros: [],
      titulo: "Aspirante Titán"
    };
  }

  // Ya lo tiene
  if (logrosDB[userId].logros.includes(clave)) {
    return { nuevo: false };
  }

  // Desbloquear
  logrosDB[userId].logros.push(clave);

  // Actualizar título
  const logro = LOGROS[clave];

  if (logro?.titulo) {
    logrosDB[userId].titulo = logro.titulo;
  }

  guardarJSON("logros.json", logrosDB);

  return {
    nuevo: true,
    logro
  };
}

// ======================================
// 👑 OBTENER TÍTULO
// ======================================

function obtenerTitulo(userId) {
  const logrosDB = leerJSON("logros.json") || {};

  return (
    logrosDB[userId]?.titulo ||
    "Aspirante Titán"
  );
}

// ======================================
// 📜 OBTENER LOGROS
// ======================================

function obtenerLogros(userId) {
  const logrosDB = leerJSON("logros.json") || {};

  const claves = logrosDB[userId]?.logros || [];

  return claves.map(c => ({
    clave: c,
    ...LOGROS[c]
  }));
}

module.exports = {
  LOGROS,
  desbloquearLogro,
  obtenerTitulo,
  obtenerLogros
};
