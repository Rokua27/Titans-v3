const PREMIOS = Object.freeze({
  DIAMANTES_50: Object.freeze({
    id: 'DIAMANTES_50',
    nombre: '50 diamantes',
    anuncio: '💎 *50 DIAMANTES* 💎'
  }),
  DIAMANTES_86: Object.freeze({
    id: 'DIAMANTES_86',
    nombre: '86 diamantes',
    anuncio: '💎 *86 DIAMANTES* 💎'
  }),
  PASE_DIAMANTES: Object.freeze({
    id: 'PASE_DIAMANTES',
    nombre: 'Pase semanal de diamantes',
    anuncio: '🎟️ *PASE SEMANAL DE DIAMANTES* 💎'
  }),
  PASE_ELITE: Object.freeze({
    id: 'PASE_ELITE',
    nombre: 'Pase semanal Elite',
    anuncio: '🎟️ *PASE SEMANAL ELITE* 👑'
  })
});

const PROBABILIDADES = Object.freeze({
  caja_comun: 0.00005,
  caja_rara: 0.0001,
  caja_epica: 0.0002,
  caja_legendaria: 0.0004,
  caja_especial: 0.0008,
  ruleta: 0.00005,
  slots: 0.00005,
  raid_alto_rango: 0.0005,
  ruleta_especial: 1
});

const FUENTES = Object.freeze(Object.keys(PROBABILIDADES));

const ESTADOS = Object.freeze({
  PENDIENTE_DATOS: 'PENDIENTE_DATOS',
  DATOS_RECIBIDOS: 'DATOS_RECIBIDOS',
  ENVIADO_A_ENTREGAS: 'ENVIADO_A_ENTREGAS',
  PENDIENTE_CONFIRMACION: 'PENDIENTE_CONFIRMACION',
  ENTREGADO: 'ENTREGADO',
  NOTIFICADO: 'NOTIFICADO'
});

function validarAleatorio(valor, nombre) {
  if (
    typeof valor !== 'number' ||
    !Number.isFinite(valor) ||
    valor < 0 ||
    valor >= 1
  ) {
    throw new TypeError(`${nombre} debe ser un número entre 0 y 1.`);
  }
}

function seleccionarPremioReal(
  fuente,
  aleatorioProbabilidad,
  aleatorioPremio
) {
  if (!Object.hasOwn(PROBABILIDADES, fuente)) {
    throw new Error(`Fuente de premio real no reconocida: ${fuente}`);
  }

  validarAleatorio(aleatorioProbabilidad, 'aleatorioProbabilidad');
  validarAleatorio(aleatorioPremio, 'aleatorioPremio');

  if (aleatorioProbabilidad >= PROBABILIDADES[fuente]) {
    return null;
  }

  const premios = Object.values(PREMIOS);
  const indice = Math.floor(aleatorioPremio * premios.length);

  return premios[indice];
}

function crearRegistroPremio(datos) {
  if (!datos || typeof datos !== 'object') {
    throw new TypeError('Los datos del premio son obligatorios.');
  }

  const { fuente, ganadorId, ganadorNombre, premio, operacionId } = datos;

  if (!FUENTES.includes(fuente)) {
    throw new Error(`Fuente no válida: ${fuente}`);
  }

  if (!ganadorId || !ganadorNombre || !operacionId) {
    throw new Error('Faltan datos del ganador o de la operación.');
  }

  const premioCatalogo = PREMIOS[premio?.id];

  if (!premioCatalogo) {
    throw new Error('El premio no pertenece al catálogo autorizado.');
  }

  const id = `${fuente}:${operacionId}`;

  return {
    id,
    fuente,
    ganadorId: String(ganadorId),
    ganadorNombre: String(ganadorNombre),
    premio: { ...premioCatalogo },
    estado: ESTADOS.PENDIENTE_DATOS,
    datosJugador: null,
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
    entregadoEn: null,
    notificadoEn: null
  };
}

function registrarPremio(ledger, datos) {
  if (
    !ledger ||
    typeof ledger !== 'object' ||
    ledger.version !== 1 ||
    !ledger.registros ||
    typeof ledger.registros !== 'object' ||
    Array.isArray(ledger.registros)
  ) {
    throw new Error('El registro de premios tiene una estructura inválida.');
  }

  const registro = crearRegistroPremio(datos);
  const existente = ledger.registros[registro.id];

  if (existente) {
    return {
      ledger,
      registro: existente,
      duplicado: true
    };
  }

  return {
    ledger: {
      ...ledger,
      registros: {
        ...ledger.registros,
        [registro.id]: registro
      }
    },
    registro,
    duplicado: false
  };
}

function generarAnuncioLegendario(registro) {
  if (!registro?.ganadorNombre || !registro?.premio?.id) {
    throw new Error('No se puede anunciar un premio sin ganador y premio.');
  }

  const premio = PREMIOS[registro.premio.id];

  if (!premio) {
    throw new Error('El premio del registro no es válido.');
  }

  return `📢 *TITANS TEAM · VICTORIA LEGENDARIA* 📢

╔═ 👑 UN TITÁN HA TRIUNFADO 👑 ═╗

\`\`\`
      🏆 ${registro.ganadorNombre} 🏆
\`\`\`

╔══════════════════════════╗
       ✨ *PREMIO REAL* ✨

       ${premio.anuncio}
╚══════════════════════════╝

🌟 *¡LA FORTUNA HA RECONOCIDO TU VALOR!*

Has conseguido una recompensa real en Titans Team.

🔥 ¡Que esta victoria marque tu camino hacia la gloria!

📩 Revisa tu mensaje privado y sigue las indicaciones para reclamar tu premio.

━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *TitansB · Miembro virtual*
💎 *Sistema de Premios Titans Team*
━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

module.exports = {
  PREMIOS,
  PROBABILIDADES,
  FUENTES,
  ESTADOS,
  seleccionarPremioReal,
  crearRegistroPremio,
  registrarPremio,
  generarAnuncioLegendario
};
