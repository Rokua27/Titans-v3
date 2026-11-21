"use strict";

const crypto = require("crypto");

const ARCHIVO = "colaEntregasPremios.json";

const ESTADOS = Object.freeze({
  PENDIENTE: "PENDIENTE",
  ENVIANDO: "ENVIANDO",
  ENVIADO: "ENVIADO",
  FALLIDO: "FALLIDO",
  INCIERTO: "INCIERTO"
});

function crearColaEntregasPremios(opciones = {}) {
  const db = opciones.database;
  const gestor = opciones.gestor;
  const ahora = opciones.ahora || (() => Date.now());

  if (
    !db ||
    typeof db.leerJSONEstricto !== "function" ||
    !gestor ||
    typeof gestor.ejecutar !== "function" ||
    typeof ahora !== "function"
  ) {
    throw new Error("Dependencias inválidas para la cola de premios.");
  }

  let socketActivo = null;
  let procesando = false;
  let recuperacionAplicada = false;
  let programacionPendiente = false;
  let programacionEnCurso = false;

  const GRUPO_ENTREGAS = "120363412275379586@g.us";
  const GRUPO_PRINCIPAL = "120363179556270758@g.us";

  const GRUPOS_AUTORIZADOS = new Set([
    GRUPO_ENTREGAS,
    GRUPO_PRINCIPAL
  ]);

  function validarTexto(valor, campo, max = 200) {
    if (
      typeof valor !== "string" ||
      !valor.trim() ||
      valor !== valor.trim() ||
      valor.length > max
    ) {
      throw new Error(`Campo inválido: ${campo}.`);
    }
    return valor;
  }

  function validarDestino(destino, tipo, etapa) {
    validarTexto(destino, "destino", 150);
    validarTexto(tipo, "tipo", 60);
    validarTexto(etapa, "etapa", 60);

    if (tipo === "privado") {
      if (!/^\d{5,20}@(s\.whatsapp\.net|lid)$/.test(destino)) {
        throw new Error("JID privado no válido.");
      }

      if (etapa !== "confirmacion-privada") {
        throw new Error("Etapa privada no autorizada.");
      }

      return destino;
    }

    if (tipo === "grupo") {
      if (!GRUPOS_AUTORIZADOS.has(destino)) {
        throw new Error("Grupo de destino no autorizado.");
      }

      if (etapa === "datos-entregas" && destino !== GRUPO_ENTREGAS) {
        throw new Error("Los datos del jugador solo pueden ir al grupo interno.");
      }

      if (etapa === "anuncio-publico" && destino !== GRUPO_PRINCIPAL) {
        throw new Error("Los anuncios públicos solo pueden ir al grupo principal.");
      }

      if (!["datos-entregas", "anuncio-publico"].includes(etapa)) {
        throw new Error("Etapa de grupo no autorizada.");
      }

      return destino;
    }

    throw new Error("Tipo de destino no autorizado.");
  }

  function validarEstado(estado) {
    if (estado === null || estado === undefined) {
      return { version: 1, operaciones: [] };
    }

    if (
      !estado ||
      estado.version !== 1 ||
      !Array.isArray(estado.operaciones)
    ) {
      throw new Error("Archivo de cola de premios inválido.");
    }

    return estado;
  }

  function leerEstado() {
    return validarEstado(db.leerJSONEstricto(ARCHIVO));
  }

  /*
   * Todas las mutaciones pasan por la misma instancia del gestor
   * compartido con el servicio de premios.
   *
   * La lectura y modificación ocurren dentro de preparar(leer).
   * No existe escritura directa ni fallback a guardarJSON.
   */
  async function mutarEstado(id, mutador) {
    const transaccion = await gestor.ejecutar(id, async leer => {
      const estado = validarEstado(leer(ARCHIVO));
      const resultado = await mutador(estado);

      return {
        cambios: {
          [ARCHIVO]: estado
        },
        resultado
      };
    });

    if (!transaccion || transaccion.ok !== true) {
      throw new Error("No se pudo confirmar la transacción de la cola.");
    }

    return transaccion.resultado;
  }

  function crearIdTransaccion(prefijo) {
    return `${prefijo}-${crypto.randomUUID()}`;
  }

  function programarProcesamiento() {
    if (!socketActivo) return;

    programacionPendiente = true;

    if (procesando || programacionEnCurso) return;

    programacionEnCurso = true;

    Promise.resolve().then(async () => {
      while (socketActivo && programacionPendiente) {
        programacionPendiente = false;
        await procesarPendientes();
      }
    }).catch(error => {
      if (typeof opciones.alError === "function") {
        opciones.alError(error);
      }
    }).finally(() => {
      programacionEnCurso = false;

      if (socketActivo && programacionPendiente) {
        programarProcesamiento();
      }
    });
  }

  function obtenerEstado() {
    return leerEstado();
  }

  async function registrar(datos) {
    if (!datos || typeof datos !== "object") {
      throw new Error("Datos de operación obligatorios.");
    }

    const id = validarTexto(datos.id, "id", 300);
    const premioId = validarTexto(datos.premioId, "premioId", 120);
    const etapa = validarTexto(datos.etapa, "etapa", 60);
    const tipo = validarTexto(datos.tipo, "tipo", 60);
    const destino = validarDestino(datos.destino, tipo, etapa);

    const permitidas = new Set([
      "id", "premioId", "etapa", "destino", "tipo"
    ]);

    for (const clave of Object.keys(datos)) {
      if (!permitidas.has(clave)) {
        throw new Error(`Campo no permitido en la cola: ${clave}.`);
      }
    }

    const firma = crypto.createHash("sha256")
      .update(JSON.stringify({ id, premioId, etapa, destino, tipo }))
      .digest("hex");

    const resultado = await mutarEstado(
      `cola-premios-registrar-${firma}`,
      estado => {
        const existente = estado.operaciones.find(item => item.id === id);

        if (existente) {
          if (
            existente.premioId !== premioId ||
            existente.etapa !== etapa ||
            existente.destino !== destino ||
            existente.tipo !== tipo
          ) {
            throw new Error("El ID de operación ya existe con otros datos.");
          }

          return { nuevo: false, operacion: existente };
        }

        const momento = ahora();

        const operacion = {
          id,
          premioId,
          etapa,
          destino,
          tipo,
          estado: ESTADOS.PENDIENTE,
          intentos: 0,
          creadaEn: momento,
          actualizadaEn: momento,
          enviadaEn: null,
          ultimoError: null
        };

        estado.operaciones.push(operacion);

        return { nuevo: true, operacion };
      }
    );

    if (resultado?.nuevo) {
      programarProcesamiento();
    }

    return resultado;
  }

  async function recuperarTrasReinicio() {
    if (recuperacionAplicada) return;

    await mutarEstado(
      crearIdTransaccion("cola-premios-recuperacion"),
      estado => {
        let cambios = 0;

        for (const operacion of estado.operaciones) {
          if (operacion.estado === ESTADOS.ENVIANDO) {
            operacion.estado = ESTADOS.INCIERTO;
            operacion.ultimoError =
              "Interrupción durante el envío. Revisión manual necesaria.";
            operacion.actualizadaEn = ahora();
            cambios++;
          }
        }

        return { recuperadas: cambios };
      }
    );

    recuperacionAplicada = true;
  }

  async function reservarSiguiente() {
    return mutarEstado(
      crearIdTransaccion("cola-premios-reservar"),
      estado => {
        const operacion = estado.operaciones.find(
          item => item.estado === ESTADOS.PENDIENTE
        );

        if (!operacion) return null;

        operacion.estado = ESTADOS.ENVIANDO;
        operacion.intentos += 1;
        operacion.actualizadaEn = ahora();

        return { ...operacion };
      }
    );
  }

  async function registrarErrorEnvio(operacion, error) {
    return mutarEstado(
      `cola-premios-error-${crypto.createHash("sha256")
        .update(`${operacion.id}:${operacion.intentos}`)
        .digest("hex")}`,
      estado => {
        const registro = estado.operaciones.find(
          item => item.id === operacion.id
        );

        if (!registro || registro.estado !== ESTADOS.ENVIANDO) {
          return { actualizado: false };
        }

        const definitivo =
          error && error.envioDefinitivamenteFallido === true;

        registro.estado = definitivo
          ? ESTADOS.FALLIDO
          : ESTADOS.INCIERTO;

        registro.ultimoError = String(
          error?.message || error
        ).slice(0, 500);

        registro.actualizadaEn = ahora();

        return { actualizado: true, estado: registro.estado };
      }
    );
  }

  async function registrarEnvioConfirmado(operacion, mensajeSalidaId) {
    return mutarEstado(
      `cola-premios-enviado-${crypto.createHash("sha256")
        .update(`${operacion.id}:${operacion.intentos}`)
        .digest("hex")}`,
      estado => {
        const registro = estado.operaciones.find(
          item => item.id === operacion.id
        );

        if (!registro || registro.estado !== ESTADOS.ENVIANDO) {
          return { actualizado: false };
        }

        registro.mensajeSalidaId = mensajeSalidaId;
        registro.estado = ESTADOS.ENVIADO;
        registro.enviadaEn = ahora();
        registro.actualizadaEn = ahora();
        registro.ultimoError = null;

        return { actualizado: true, operacion: { ...registro } };
      }
    );
  }

  async function procesarPendientes() {
    if (!socketActivo || procesando) return;

    procesando = true;
    const socket = socketActivo;

    try {
      await recuperarTrasReinicio();

      while (socketActivo === socket) {
        const operacion = await reservarSiguiente();

        if (!operacion) break;

        let mensajeSalidaId;

        try {
          if (typeof opciones.enviar !== "function") {
            throw new Error("No se configuró el emisor de mensajes.");
          }

          const resultadoEnvio = await opciones.enviar(
            socket,
            { ...operacion }
          );

          if (
            !resultadoEnvio ||
            typeof resultadoEnvio.mensajeSalidaId !== "string" ||
            !resultadoEnvio.mensajeSalidaId.trim() ||
            resultadoEnvio.mensajeSalidaId !==
              resultadoEnvio.mensajeSalidaId.trim() ||
            resultadoEnvio.mensajeSalidaId.length > 300
          ) {
            throw new Error(
              "Envío sin ID real de WhatsApp. Revisión manual necesaria."
            );
          }

          mensajeSalidaId = resultadoEnvio.mensajeSalidaId;
        } catch (error) {
          await registrarErrorEnvio(operacion, error);
          break;
        }

        const resultado = await registrarEnvioConfirmado(
          operacion,
          mensajeSalidaId
        );

        if (
          resultado?.actualizado &&
          typeof opciones.alEnviarConfirmado === "function"
        ) {
          try {
            await opciones.alEnviarConfirmado(resultado.operacion);
          } catch (error) {
            if (typeof opciones.alError === "function") {
              try {
                opciones.alError(error);
              } catch (_) {
                // Un fallo del registrador no detiene la cola.
              }
            }
          }
        }
      }
    } finally {
      procesando = false;

      if (socketActivo && socketActivo !== socket) {
        programacionPendiente = true;
      }

      if (socketActivo && programacionPendiente && !programacionEnCurso) {
        programarProcesamiento();
      }
    }
  }

  async function activar(sock) {
    if (!sock) throw new Error("Socket requerido.");

    const socketPrevio = socketActivo;
    socketActivo = sock;

    try {
      await recuperarTrasReinicio();
      await procesarPendientes();
    } catch (error) {
      if (socketActivo === sock) {
        socketActivo = socketPrevio;
      }

      throw error;
    }
  }

  function desactivar(sock) {
    if (socketActivo === sock) socketActivo = null;
  }

  async function reintentar(id) {
    validarTexto(id, "id", 300);

    const resultado = await mutarEstado(
      crearIdTransaccion("cola-premios-reintentar"),
      estado => {
        const operacion = estado.operaciones.find(item => item.id === id);

        if (!operacion) {
          throw new Error("Operación no encontrada.");
        }

        if (operacion.estado !== ESTADOS.FALLIDO) {
          throw new Error("Solo se puede reintentar una operación FALLIDA.");
        }

        operacion.estado = ESTADOS.PENDIENTE;
        operacion.ultimoError = null;
        operacion.actualizadaEn = ahora();

        return { ok: true, operacion: { ...operacion } };
      }
    );

    programarProcesamiento();

    return resultado;
  }

  return Object.freeze({
    registrar,
    despertar: programarProcesamiento,
    obtenerEstado,
    recuperarTrasReinicio,
    procesarPendientes,
    activar,
    desactivar,
    reintentar,
    validarDestino,
    ESTADOS
  });
}

module.exports = { crearColaEntregasPremios, ESTADOS };
