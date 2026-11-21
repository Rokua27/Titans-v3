"use strict";

const crypto = require("crypto");

const {
  ESTADOS,
  PREMIOS,
  generarAnuncioLegendario
} = require("./premiosReales");

const ARCHIVO_LEDGER = "premiosReales.json";

function crearServicioEntregaPremios(dependencias) {
  const {
    gestor,
    leerJSON,
    obtenerEstadoCola,
    reloj = () => new Date()
  } = dependencias || {};

  if (
    !gestor ||
    typeof gestor.ejecutar !== "function" ||
    typeof leerJSON !== "function" ||
    typeof reloj !== "function"
  ) {
    throw new Error("Dependencias del servicio de entrega inválidas.");
  }

  function ahora() {
    const fecha = reloj();

    if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
      throw new Error("El reloj del servicio devolvió una fecha inválida.");
    }

    return fecha.toISOString();
  }

  function validarId(id) {
    if (
      typeof id !== "string" ||
      !id.trim() ||
      id !== id.trim() ||
      id.length > 120 ||
      !/^[a-zA-Z0-9._:-]+$/.test(id)
    ) {
      throw new Error("Identificador de premio inválido.");
    }
  }

  function validarIdentidad(identidad) {
    if (
      typeof identidad !== "string" ||
      identidad !== identidad.trim() ||
      !/^\d{5,20}@(s\.whatsapp\.net|lid)$/.test(identidad)
    ) {
      throw new Error("Identidad privada no válida.");
    }
  }

  function validarRegistro(registro) {
    if (!registro || typeof registro !== "object") {
      throw new Error("Premio no encontrado.");
    }

    if (
      !registro.id ||
      !registro.ganadorId ||
      !registro.premio ||
      !PREMIOS[registro.premio.id] ||
      !Object.values(ESTADOS).includes(registro.estado)
    ) {
      throw new Error("El registro del premio tiene datos inválidos.");
    }

    return registro;
  }

  async function transicionar(id, estadoEsperado, construir, accion) {
    validarId(id);

    const operacionId = `premio-${accion}-${id}`
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    return gestor.ejecutar(operacionId, async leer => {
      const ledger = leer(ARCHIVO_LEDGER);

      if (
        !ledger ||
        ledger.version !== 1 ||
        !ledger.registros ||
        typeof ledger.registros !== "object" ||
        Array.isArray(ledger.registros)
      ) {
        throw new Error("Registro de premios inválido.");
      }

      const actual = validarRegistro(ledger.registros[id]);

      if (actual.estado !== estadoEsperado) {
        throw new Error(
          `Estado incorrecto. Se esperaba ${estadoEsperado} y se encontró ${actual.estado}.`
        );
      }

      const actualizado = construir(actual);

      return {
        cambios: {
          [ARCHIVO_LEDGER]: {
            ...ledger,
            registros: {
              ...ledger.registros,
              [id]: actualizado
            }
          }
        },
        resultado: actualizado
      };
    });
  }

  function obtenerPremio(id) {
    validarId(id);

    const ledger = leerJSON(ARCHIVO_LEDGER);

    if (
      !ledger ||
      ledger.version !== 1 ||
      !ledger.registros ||
      typeof ledger.registros !== "object" ||
      Array.isArray(ledger.registros)
    ) {
      throw new Error("El registro de premios reales no existe o es inválido.");
    }

    return validarRegistro(ledger.registros[id]);
  }


  function obtenerCapturaCompletadaPorMensaje(identidad, mensajeId) {
    validarIdentidad(identidad);

    if (
      typeof mensajeId !== "string" ||
      !mensajeId.trim() ||
      mensajeId.length > 200
    ) {
      return null;
    }

    const ledger = leerJSON(ARCHIVO_LEDGER);

    if (
      !ledger ||
      ledger.version !== 1 ||
      !ledger.registros ||
      typeof ledger.registros !== "object" ||
      Array.isArray(ledger.registros)
    ) {
      throw new Error("El registro de premios reales no existe o es inválido.");
    }

    const coincidencias = [];

    for (const [id, registro] of Object.entries(ledger.registros)) {
      if (
        registro &&
        registro.ganadorId === identidad &&
        registro.chatPrivado === identidad &&
        registro.estado === ESTADOS.DATOS_RECIBIDOS &&
        registro.capturaDatos &&
        registro.capturaDatos.paso === "COMPLETADO" &&
        registro.capturaDatos.ultimoMensajeId === mensajeId
      ) {
        coincidencias.push(id);
      }
    }

    if (coincidencias.length > 1) {
      throw new Error("Mensaje asociado a más de una captura completada.");
    }

    return coincidencias.length === 1
      ? { id: coincidencias[0], duplicado: true }
      : null;
  }

  function hashCodigo(codigo) {
    return crypto.createHash("sha256").update(codigo, "utf8").digest("hex");
  }

  async function prepararCodigoVerificacion(id, identidad, mensajeId) {
    validarId(id);
    validarIdentidad(identidad);
    const codigo = String(crypto.randomInt(0, 100000000)).padStart(8, "0");
    const codigoHash = hashCodigo(codigo);
    const idDesafio = crypto.randomUUID();
    const operacionId = crearIdCaptura("preparar-codigo", id, mensajeId);

    const tx = await gestor.ejecutar(operacionId, async leer => {
      const ledger = leer(ARCHIVO_LEDGER);
      if (!ledger || ledger.version !== 1 || !ledger.registros ||
          typeof ledger.registros !== "object" || Array.isArray(ledger.registros)) {
        throw new Error("Registro de premios inválido.");
      }
      const actual = validarRegistro(ledger.registros[id]);
      if (actual.ganadorId !== identidad) throw new Error("La identidad no corresponde al ganador.");
      if (actual.estado !== ESTADOS.PENDIENTE_DATOS) throw new Error("El premio no está pendiente de datos.");

      const ahoraMs = reloj().getTime();
      const desafioActivo = Object.values(ledger.registros).some(registro => {
        if (!registro || registro.ganadorId !== identidad || registro.id === id) return false;
        const v = registro.verificacionCodigo;
        if (
          registro.estado !== ESTADOS.PENDIENTE_DATOS ||
          !v || !v.hash || v.consumido || v.invalidado
        ) return false;

        const uuidValido = typeof v.idDesafio === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.idDesafio);

        if (!uuidValido || v.estadoEnvio === "INCIERTO") return true;

        return (
          Number.isFinite(Date.parse(v.expiraEn)) &&
          Date.parse(v.expiraEn) > ahoraMs &&
          v.intentos < v.maxIntentos
        );
      });

      const verificacionActual = actual.verificacionCodigo;
      if (
        verificacionActual &&
        verificacionActual.hash &&
        !verificacionActual.consumido &&
        !verificacionActual.invalidado &&
        (
          typeof verificacionActual.idDesafio !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(verificacionActual.idDesafio) ||
          verificacionActual.estadoEnvio === "INCIERTO" ||
          (
            Number.isFinite(Date.parse(verificacionActual.expiraEn)) &&
            Date.parse(verificacionActual.expiraEn) > ahoraMs &&
            verificacionActual.intentos < verificacionActual.maxIntentos
          )
        )
      ) {
        throw new Error("Este premio ya tiene un código activo.");
      }

      if (desafioActivo) {
        throw new Error("El ganador ya tiene otro código de verificación activo.");
      }

      const actualizado = {
        ...actual,
        verificacionCodigo: {
          idDesafio,
          hash: codigoHash,
          estadoEnvio: "PENDIENTE_ENVIO",
          creadoEn: ahora(),
          expiraEn: new Date(reloj().getTime() + 600000).toISOString(),
          intentos: 0,
          maxIntentos: 5,
          consumido: false,
          invalidado: false,
          mensajeId
        },
        actualizadoEn: ahora()
      };
      return {
        cambios: {
          [ARCHIVO_LEDGER]: {
            ...ledger,
            registros: { ...ledger.registros, [id]: actualizado }
          }
        },
        resultado: { preparado: true, premioId: id, idDesafio }
      };
    });

    return tx.duplicada
      ? { ok: true, duplicada: true, codigo: null }
      : { ok: true, duplicada: false, codigo, idDesafio };
  }

  async function validarCodigoVerificacion(id, identidad, codigo, mensajeId) {
    validarId(id);
    validarIdentidad(identidad);
    if (typeof codigo !== "string" || !/^\d{8}$/.test(codigo)) {
      throw new Error("El código debe contener exactamente 8 dígitos.");
    }

    const operacionId = crearIdCaptura("validar-codigo", id, mensajeId);
    const recibidoHash = Buffer.from(hashCodigo(codigo), "hex");

    return gestor.ejecutar(operacionId, async leer => {
      const ledger = leer(ARCHIVO_LEDGER);
      if (!ledger || ledger.version !== 1 || !ledger.registros ||
          typeof ledger.registros !== "object" || Array.isArray(ledger.registros)) {
        throw new Error("Registro de premios inválido.");
      }
      const actual = validarRegistro(ledger.registros[id]);
      if (actual.ganadorId !== identidad) throw new Error("La identidad no corresponde al ganador.");
      if (actual.estado !== ESTADOS.PENDIENTE_DATOS) throw new Error("El premio no está pendiente de datos.");

      const v = actual.verificacionCodigo;
      const uuidValido = typeof v?.idDesafio === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.idDesafio);

      if (
        !v ||
        !uuidValido ||
        v.estadoEnvio !== "ENVIADO" ||
        v.invalidado ||
        v.consumido ||
        !Number.isInteger(v.intentos) ||
        !Number.isInteger(v.maxIntentos) ||
        v.intentos >= v.maxIntentos ||
        typeof v.hash !== "string" ||
        !/^[0-9a-f]{64}$/i.test(v.hash) ||
        !Number.isFinite(Date.parse(v.expiraEn))
      ) {
        throw new Error("El código no está disponible o su envío no está confirmado.");
      }

      const expiro = reloj().getTime() >= new Date(v.expiraEn).getTime();
      const almacenadoHash = Buffer.from(v.hash, "hex");
      const coincide = !expiro &&
        almacenadoHash.length === recibidoHash.length &&
        crypto.timingSafeEqual(almacenadoHash, recibidoHash);

      let actualizado;
      let resultado;

      if (coincide) {
        actualizado = {
          ...actual,
          chatPrivado: identidad,
          verificacionCodigo: { ...v, hash: null, consumido: true, consumidoEn: ahora() },
          capturaDatos: {
            paso: "PLAYER_ID",
            iniciadaEn: ahora(),
            playerId: null,
            ultimoMensajeId: mensajeId
          },
          actualizadoEn: ahora()
        };
        resultado = { valido: true, premioId: id };
      } else {
        const intentos = expiro ? v.intentos : v.intentos + 1;
        actualizado = {
          ...actual,
          verificacionCodigo: {
            ...v,
            intentos,
            invalidado: expiro || intentos >= v.maxIntentos,
            ...(expiro ? { hash: null, estadoEnvio: "INVALIDADO" } : {}),
            ...(intentos >= v.maxIntentos ? { estadoEnvio: "INVALIDADO" } : {})
          },
          actualizadoEn: ahora()
        };
        resultado = {
          valido: false,
          motivo: expiro ? "expirado" : intentos >= v.maxIntentos ? "bloqueado" : "incorrecto",
          intentosRestantes: Math.max(0, v.maxIntentos - intentos)
        };
      }

      return {
        cambios: {
          [ARCHIVO_LEDGER]: {
            ...ledger,
            registros: { ...ledger.registros, [id]: actualizado }
          }
        },
        resultado
      };
    });
  }

  async function validarCodigoPendiente(identidad, codigo, mensajeId) {
    validarIdentidad(identidad);

    if (typeof codigo !== "string" || !/^\d{8}$/.test(codigo)) {
      throw new Error("El código debe contener exactamente 8 dígitos.");
    }

    if (typeof mensajeId !== "string" || !mensajeId.trim() || mensajeId.length > 200) {
      throw new Error("Identificador de mensaje inválido.");
    }

    // La operación se identifica antes de buscar el premio, para que
    // los mensajes repetidos sean idempotentes dentro del gestor.
    const huellaIdentidad = crypto.createHash("sha256")
      .update(identidad, "utf8").digest("hex").slice(0, 32);
    const huellaMensaje = crypto.createHash("sha256")
      .update(mensajeId, "utf8").digest("hex").slice(0, 32);
    const operacionId = `premio-validar-pendiente-${huellaIdentidad}-${huellaMensaje}`;
    const recibidoHash = Buffer.from(hashCodigo(codigo), "hex");

    const transaccion = await gestor.ejecutar(operacionId, async leer => {
      const ledger = leer(ARCHIVO_LEDGER);

      if (
        !ledger ||
        ledger.version !== 1 ||
        !ledger.registros ||
        typeof ledger.registros !== "object" ||
        Array.isArray(ledger.registros)
      ) {
        throw new Error("Registro de premios inválido.");
      }

      const candidatos = Object.values(ledger.registros).filter(registro => {
        if (
          !registro ||
          registro.ganadorId !== identidad ||
          registro.estado !== ESTADOS.PENDIENTE_DATOS
        ) return false;

        const v = registro.verificacionCodigo;
        return Boolean(
          v &&
          typeof v.idDesafio === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.idDesafio) &&
          typeof v.hash === "string" &&
          /^[a-f0-9]{64}$/.test(v.hash) &&
          v.estadoEnvio === "ENVIADO" &&
          !v.consumido &&
          !v.invalidado &&
          Number.isInteger(v.intentos) &&
          Number.isInteger(v.maxIntentos) &&
          v.intentos < v.maxIntentos &&
          Number.isFinite(Date.parse(v.expiraEn))
        );
      });

      if (candidatos.length !== 1) {
        throw new Error(
          candidatos.length === 0
            ? "No tienes un código de verificación activo."
            : "Hay varios códigos activos. Se bloqueó la validación por seguridad."
        );
      }

      const actual = validarRegistro(candidatos[0]);
      const id = actual.id;
      validarId(id);

      if (actual.ganadorId !== identidad) {
        throw new Error("La identidad no corresponde al ganador.");
      }

      const v = actual.verificacionCodigo;
      const expiro = reloj().getTime() >= Date.parse(v.expiraEn);
      const almacenadoHash = Buffer.from(v.hash, "hex");
      const coincide = !expiro &&
        almacenadoHash.length === recibidoHash.length &&
        crypto.timingSafeEqual(almacenadoHash, recibidoHash);

      let actualizado;
      let resultado;

      if (coincide) {
        actualizado = {
          ...actual,
          chatPrivado: identidad,
          verificacionCodigo: {
            ...v,
            hash: null,
            consumido: true,
            consumidoEn: ahora()
          },
          capturaDatos: {
            paso: "PLAYER_ID",
            iniciadaEn: ahora(),
            playerId: null,
            ultimoMensajeId: mensajeId
          },
          actualizadoEn: ahora()
        };

        resultado = { valido: true, premioId: id };
      } else {
        const intentos = expiro ? v.intentos : v.intentos + 1;
        const invalidado = expiro || intentos >= v.maxIntentos;

        actualizado = {
          ...actual,
          verificacionCodigo: {
            ...v,
            intentos,
            invalidado,
            ...(invalidado ? { hash: null } : {})
          },
          actualizadoEn: ahora()
        };

        resultado = {
          valido: false,
          motivo: expiro
            ? "expirado"
            : intentos >= v.maxIntentos
              ? "bloqueado"
              : "incorrecto",
          intentosRestantes: Math.max(0, v.maxIntentos - intentos)
        };
      }

      return {
        cambios: {
          [ARCHIVO_LEDGER]: {
            ...ledger,
            registros: {
              ...ledger.registros,
              [id]: actualizado
            }
          }
        },
        resultado
      };
    });

    if (transaccion?.resultado?.motivo === "expirado") {
      throw new Error("El código de verificación ha expirado.");
    }

    return transaccion;
  }


  async function marcarCodigoEnviando(id, mensajeId, idDesafio) {
    validarId(id);

    if (
      typeof mensajeId !== "string" ||
      !mensajeId.trim() ||
      mensajeId.length > 200
    ) {
      throw new Error("Identificador de mensaje inválido.");
    }

    if (typeof idDesafio !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idDesafio)) {
      throw new Error("Identificador de desafío inválido.");
    }

    const operacionId = crearIdCaptura("marcar-enviando-codigo", id, `${mensajeId}:${idDesafio}`);

    return gestor.ejecutar(operacionId, async leer => {
      const ledger = leer(ARCHIVO_LEDGER);

      if (
        !ledger ||
        ledger.version !== 1 ||
        !ledger.registros ||
        typeof ledger.registros !== "object" ||
        Array.isArray(ledger.registros)
      ) {
        throw new Error("Registro de premios inválido.");
      }

      const actual = validarRegistro(ledger.registros[id]);
      const v = actual.verificacionCodigo;

      if (!v || v.mensajeId !== mensajeId || v.idDesafio !== idDesafio) {
        throw new Error("El desafío no coincide con la operación solicitada.");
      }

      if (v.estadoEnvio === "ENVIANDO") {
        return {
          cambios: { [ARCHIVO_LEDGER]: ledger },
          resultado: { enviando: true, yaEnviando: true, premioId: id }
        };
      }

      if (
        v.estadoEnvio !== "PENDIENTE_ENVIO" ||
        v.invalidado ||
        v.consumido ||
        !v.hash
      ) {
        throw new Error("El desafío no está disponible para iniciar el envío.");
      }

      const actualizado = {
        ...actual,
        verificacionCodigo: {
          ...v,
          estadoEnvio: "ENVIANDO",
          iniciadoEnvioEn: ahora()
        },
        actualizadoEn: ahora()
      };

      return {
        cambios: {
          [ARCHIVO_LEDGER]: {
            ...ledger,
            registros: { ...ledger.registros, [id]: actualizado }
          }
        },
        resultado: { enviando: true, yaEnviando: false, premioId: id }
      };
    });
  }

  async function confirmarEnvioCodigoVerificacion(
    id,
    mensajeId,
    mensajeSalidaId,
    idDesafio
  ) {
    validarId(id);

    if (
      typeof mensajeId !== "string" ||
      !mensajeId.trim() ||
      mensajeId.length > 200 ||
      typeof mensajeSalidaId !== "string" ||
      !mensajeSalidaId.trim() ||
      mensajeSalidaId.length > 200 ||
      typeof idDesafio !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idDesafio)
    ) {
      throw new Error("Identificadores de mensaje inválidos.");
    }

    const operacionId = crearIdCaptura(
      "confirmar-envio-codigo",
      id,
      `${mensajeId}:${mensajeSalidaId}:${idDesafio}`
    );

    return gestor.ejecutar(operacionId, async leer => {
      const ledger = leer(ARCHIVO_LEDGER);

      if (
        !ledger ||
        ledger.version !== 1 ||
        !ledger.registros ||
        typeof ledger.registros !== "object" ||
        Array.isArray(ledger.registros)
      ) {
        throw new Error("Registro de premios inválido.");
      }

      const actual = validarRegistro(ledger.registros[id]);
      const v = actual.verificacionCodigo;

      if (!v || v.mensajeId !== mensajeId || v.idDesafio !== idDesafio) {
        throw new Error("El desafío no coincide con la operación solicitada.");
      }

      if (v.estadoEnvio === "ENVIADO") {
        if (v.mensajeSalidaId !== mensajeSalidaId) {
          throw new Error("El ID del mensaje saliente no coincide con el envío registrado.");
        }

        return {
          cambios: { [ARCHIVO_LEDGER]: ledger },
          resultado: { confirmado: true, yaConfirmado: true, premioId: id }
        };
      }

      if (
        v.estadoEnvio !== "ENVIANDO" ||
        v.invalidado ||
        v.consumido ||
        !v.hash
      ) {
        throw new Error("El desafío no está en estado ENVIANDO.");
      }

      const actualizado = {
        ...actual,
        verificacionCodigo: {
          ...v,
          estadoEnvio: "ENVIADO",
          mensajeSalidaId,
          enviadoEn: ahora()
        },
        actualizadoEn: ahora()
      };

      return {
        cambios: {
          [ARCHIVO_LEDGER]: {
            ...ledger,
            registros: { ...ledger.registros, [id]: actualizado }
          }
        },
        resultado: { confirmado: true, yaConfirmado: false, premioId: id }
      };
    });
  }

  async function marcarCodigoIncierto(id, mensajeId, idDesafio) {
    validarId(id);

    if (
      typeof mensajeId !== "string" ||
      !mensajeId.trim() ||
      mensajeId.length > 200
    ) {
      throw new Error("Identificador de mensaje inválido.");
    }

    if (typeof idDesafio !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idDesafio)) {
      throw new Error("Identificador de desafío inválido.");
    }

    const operacionId = crearIdCaptura("marcar-codigo-incierto", id, `${mensajeId}:${idDesafio}`);

    return gestor.ejecutar(operacionId, async leer => {
      const ledger = leer(ARCHIVO_LEDGER);

      if (
        !ledger ||
        ledger.version !== 1 ||
        !ledger.registros ||
        typeof ledger.registros !== "object" ||
        Array.isArray(ledger.registros)
      ) {
        throw new Error("Registro de premios inválido.");
      }

      const actual = validarRegistro(ledger.registros[id]);
      const v = actual.verificacionCodigo;

      if (!v || v.mensajeId !== mensajeId || v.idDesafio !== idDesafio) {
        throw new Error("El desafío no coincide con la operación solicitada.");
      }

      if (v.estadoEnvio === "INCIERTO") {
        return {
          cambios: { [ARCHIVO_LEDGER]: ledger },
          resultado: { incierto: true, yaIncierto: true, premioId: id }
        };
      }

      if (
        !["PENDIENTE_ENVIO", "ENVIANDO"].includes(v.estadoEnvio) ||
        v.invalidado ||
        v.consumido ||
        !v.hash
      ) {
        throw new Error("El desafío no puede pasar a INCIERTO.");
      }

      const actualizado = {
        ...actual,
        verificacionCodigo: {
          ...v,
          estadoEnvio: "INCIERTO",
          inciertoEn: ahora()
        },
        actualizadoEn: ahora()
      };

      return {
        cambios: {
          [ARCHIVO_LEDGER]: {
            ...ledger,
            registros: { ...ledger.registros, [id]: actualizado }
          }
        },
        resultado: { incierto: true, yaIncierto: false, premioId: id }
      };
    });
  }

  async function recuperarCodigosPendientesEnvio() {
    const ledger = leerJSON(ARCHIVO_LEDGER);

    if (
      !ledger ||
      ledger.version !== 1 ||
      !ledger.registros ||
      typeof ledger.registros !== "object" ||
      Array.isArray(ledger.registros)
    ) {
      throw new Error("Registro de premios inválido.");
    }

    const pendientes = Object.values(ledger.registros).filter(registro => {
      const v = registro && registro.verificacionCodigo;
      return Boolean(
        registro &&
        registro.estado === ESTADOS.PENDIENTE_DATOS &&
        v &&
        ["PENDIENTE_ENVIO", "ENVIANDO"].includes(v.estadoEnvio) &&
        v.hash &&
        !v.invalidado &&
        !v.consumido &&
        typeof v.mensajeId === "string"
      );
    });

    const esUuidValido = idDesafio =>
      typeof idDesafio === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idDesafio);

    const antiguosSinIdentidad = pendientes.filter(
      registro => !esUuidValido(registro.verificacionCodigo.idDesafio)
    );

    const pendientesNuevos = pendientes.filter(
      registro => esUuidValido(registro.verificacionCodigo.idDesafio)
    );

    const resultados = [];

    for (const registro of pendientesNuevos) {
      resultados.push(
        await marcarCodigoIncierto(
          registro.id,
          registro.verificacionCodigo.mensajeId,
          registro.verificacionCodigo.idDesafio
        )
      );
    }

    return {
      revisados: pendientes.length,
      inciertos: resultados.filter(r => r?.resultado?.incierto === true).length,
      revisionManual: antiguosSinIdentidad.length,
      resultados
    };
  }

  async function invalidarCodigoVerificacion(id, mensajeId) {
    validarId(id);

    if (
      typeof mensajeId !== "string" ||
      !mensajeId.trim() ||
      mensajeId.length > 200
    ) {
      throw new Error("Identificador de mensaje inválido.");
    }

    const operacionId = crearIdCaptura("invalidar-codigo", id, mensajeId);

    return gestor.ejecutar(operacionId, async leer => {
      const ledger = leer(ARCHIVO_LEDGER);

      if (
        !ledger ||
        ledger.version !== 1 ||
        !ledger.registros ||
        typeof ledger.registros !== "object" ||
        Array.isArray(ledger.registros)
      ) {
        throw new Error("Registro de premios inválido.");
      }

      const actual = validarRegistro(ledger.registros[id]);
      const v = actual.verificacionCodigo;

      if (
        !v ||
        v.consumido ||
        v.invalidado ||
        !v.hash
      ) {
        return {
          cambios: {
            [ARCHIVO_LEDGER]: ledger
          },
          resultado: {
            invalidado: false,
            motivo: "sin_codigo_activo",
            premioId: id
          }
        };
      }

      // Una falla de envío antigua nunca debe invalidar un código nuevo.
      if (v.mensajeId !== mensajeId) {
        return {
          cambios: {
            [ARCHIVO_LEDGER]: ledger
          },
          resultado: {
            invalidado: false,
            motivo: "mensaje_distinto",
            premioId: id
          }
        };
      }

      const actualizado = {
        ...actual,
        verificacionCodigo: {
          ...v,
          hash: null,
          estadoEnvio: "INVALIDADO",
          invalidado: true,
          invalidadoEn: ahora()
        },
        actualizadoEn: ahora()
      };

      return {
        cambios: {
          [ARCHIVO_LEDGER]: {
            ...ledger,
            registros: {
              ...ledger.registros,
              [id]: actualizado
            }
          }
        },
        resultado: {
          invalidado: true,
          premioId: id
        }
      };
    });
  }

  async function reconciliarCodigoAntiguoSinIdentidad(id, mensajeId, superAdmin) {
    validarId(id);

    if (
      typeof mensajeId !== "string" ||
      !mensajeId.trim() ||
      mensajeId.length > 200
    ) {
      throw new Error("Identificador de mensaje inválido.");
    }

    if (
      typeof superAdmin !== "string" ||
      !/^\d{5,20}@(s\.whatsapp\.net|lid)$/.test(superAdmin)
    ) {
      throw new Error("Identidad administrativa no válida.");
    }

    const operacionId = crearIdCaptura(
      "reconciliar-codigo-legacy",
      id,
      `${mensajeId}:${superAdmin}`
    );

    return gestor.ejecutar(operacionId, async leer => {
      const ledger = leer(ARCHIVO_LEDGER);

      if (
        !ledger ||
        ledger.version !== 1 ||
        !ledger.registros ||
        typeof ledger.registros !== "object" ||
        Array.isArray(ledger.registros)
      ) {
        throw new Error("Registro de premios inválido.");
      }

      const actual = validarRegistro(ledger.registros[id]);
      const v = actual.verificacionCodigo;

      const uuidValido = typeof v?.idDesafio === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.idDesafio);

      if (
        !v ||
        v.mensajeId !== mensajeId ||
        uuidValido ||
        !["PENDIENTE_ENVIO", "ENVIANDO"].includes(v.estadoEnvio) ||
        v.invalidado ||
        v.consumido ||
        typeof v.hash !== "string" ||
        !/^[0-9a-f]{64}$/i.test(v.hash)
      ) {
        throw new Error("El registro no corresponde a un desafío antiguo activo sin UUID.");
      }

      const resueltoEn = ahora();

      const actualizado = {
        ...actual,
        verificacionCodigo: {
          ...v,
          hash: null,
          estadoEnvio: "INVALIDADO",
          invalidado: true,
          invalidadoEn: resueltoEn,
          resueltoPor: superAdmin,
          resueltoEn,
          resolucion: "INVALIDACION_MANUAL_LEGACY_SIN_UUID"
        },
        actualizadoEn: resueltoEn
      };

      return {
        cambios: {
          [ARCHIVO_LEDGER]: {
            ...ledger,
            registros: {
              ...ledger.registros,
              [id]: actualizado
            }
          }
        },
        resultado: {
          ok: true,
          reconciliado: true,
          legacy: true,
          premioId: id,
          resueltoPor: superAdmin,
          resueltoEn
        }
      };
    });
  }

  async function registrarDatosJugador(id, identidad, datos) {
    validarIdentidad(identidad);

    if (
      !datos ||
      typeof datos !== "object" ||
      typeof datos.playerId !== "string" ||
      !/^\d{5,20}$/.test(datos.playerId.trim()) ||
      typeof datos.servidor !== "string" ||
      !/^\d{1,10}$/.test(datos.servidor.trim())
    ) {
      throw new Error("ID de jugador o servidor inválido.");
    }

    return transicionar(
      id,
      ESTADOS.PENDIENTE_DATOS,
      registro => {
        if (registro.chatPrivado !== identidad) {
          throw new Error("El chat privado no ha sido verificado.");
        }

        return {
          ...registro,
          estado: ESTADOS.DATOS_RECIBIDOS,
          datosJugador: {
            playerId: datos.playerId.trim(),
            servidor: datos.servidor.trim()
          },
          actualizadoEn: ahora()
        };
      },
      "datos"
    );
  }

  async function marcarEnviadoEntregas(id) {
    return transicionar(
      id,
      ESTADOS.DATOS_RECIBIDOS,
      registro => ({
        ...registro,
        estado: ESTADOS.ENVIADO_A_ENTREGAS,
        actualizadoEn: ahora()
      }),
      "envio-entregas"
    );
  }

  async function marcarPendienteConfirmacion(id) {
    return transicionar(
      id,
      ESTADOS.ENVIADO_A_ENTREGAS,
      registro => ({
        ...registro,
        estado: ESTADOS.PENDIENTE_CONFIRMACION,
        actualizadoEn: ahora()
      }),
      "pendiente-confirmacion"
    );
  }

  async function confirmarEntrega(id, superAdmin) {
    validarId(id);
    validarIdentidad(superAdmin);

    const operacionId = `premio-entrega-confirmada-${id}`
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    return gestor.ejecutar(operacionId, async leer => {
      const ledger = leer(ARCHIVO_LEDGER);

      if (
        !ledger ||
        ledger.version !== 1 ||
        !ledger.registros ||
        typeof ledger.registros !== "object" ||
        Array.isArray(ledger.registros)
      ) {
        throw new Error("Registro de premios inválido.");
      }

      const actual = validarRegistro(ledger.registros[id]);

      if (actual.estado !== ESTADOS.PENDIENTE_CONFIRMACION) {
        throw new Error("El premio no está pendiente de confirmación.");
      }

      if (
        typeof actual.ganadorId !== "string" ||
        actual.chatPrivado !== actual.ganadorId ||
        !/^\d{5,20}@(s\.whatsapp\.net|lid)$/.test(actual.ganadorId)
      ) {
        throw new Error("La identidad privada del ganador no es válida.");
      }

      const actualizado = {
        ...actual,
        estado: ESTADOS.ENTREGADO,
        entregadoEn: ahora(),
        confirmadoPor: superAdmin,
        notificaciones: {
          privada: { estado: "PENDIENTE", enviadaEn: null },
          publica: { estado: "PENDIENTE", enviadaEn: null }
        },
        actualizadoEn: ahora()
      };

      const cola = leerColaEntregas(leer);
      const hashId = crypto.createHash("sha256")
        .update(id, "utf8").digest("hex").slice(0, 32);

      let nuevaCola = agregarOperacionCola(cola, {
        id: `premio-${hashId}-confirmacion-privada`,
        premioId: id,
        etapa: "confirmacion-privada",
        destino: actualizado.ganadorId,
        tipo: "privado"
      });

      nuevaCola = agregarOperacionCola(nuevaCola, {
        id: `premio-${hashId}-anuncio-publico`,
        premioId: id,
        etapa: "anuncio-publico",
        destino: "120363179556270758@g.us",
        tipo: "grupo"
      });

      return {
        cambios: {
          [ARCHIVO_LEDGER]: {
            ...ledger,
            registros: {
              ...ledger.registros,
              [id]: actualizado
            }
          },
          [ARCHIVO_COLA_ENTREGAS]: nuevaCola
        },
        resultado: actualizado
      };
    });
  }

  async function marcarNotificacionEnviada(id, etapa) {
    validarId(id);

    const claves = {
      "confirmacion-privada": "privada",
      "anuncio-publico": "publica"
    };
    const clave = claves[etapa];

    if (!clave) {
      throw new Error("Etapa de notificación no válida.");
    }

    const operacionId = `premio-notificacion-${clave}-${id}`
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    return gestor.ejecutar(operacionId, async leer => {
      const ledger = leer(ARCHIVO_LEDGER);

      if (
        !ledger ||
        ledger.version !== 1 ||
        !ledger.registros ||
        typeof ledger.registros !== "object" ||
        Array.isArray(ledger.registros)
      ) {
        throw new Error("Registro de premios inválido.");
      }

      const actual = validarRegistro(ledger.registros[id]);

      if (
        actual.estado !== ESTADOS.ENTREGADO &&
        actual.estado !== ESTADOS.NOTIFICADO
      ) {
        throw new Error("El premio no está en estado entregado.");
      }

      const notificaciones = actual.notificaciones || {
        privada: { estado: "PENDIENTE", enviadaEn: null },
        publica: { estado: "PENDIENTE", enviadaEn: null }
      };

      for (const tipo of ["privada", "publica"]) {
        const item = notificaciones[tipo];
        if (
          !item ||
          !["PENDIENTE", "ENVIADO"].includes(item.estado) ||
          !(item.enviadaEn === null || typeof item.enviadaEn === "string")
        ) {
          throw new Error("Estado de notificaciones inválido.");
        }
      }

      const actualizado = {
        ...actual,
        notificaciones: {
          ...notificaciones,
          [clave]: {
            estado: "ENVIADO",
            enviadaEn: notificaciones[clave].enviadaEn || ahora()
          }
        },
        actualizadoEn: ahora()
      };

      const ambasEnviadas =
        actualizado.notificaciones.privada.estado === "ENVIADO" &&
        actualizado.notificaciones.publica.estado === "ENVIADO";

      if (ambasEnviadas) {
        actualizado.estado = ESTADOS.NOTIFICADO;
        actualizado.notificadoEn = actualizado.notificadoEn || ahora();
      }

      return {
        cambios: {
          [ARCHIVO_LEDGER]: {
            ...ledger,
            registros: {
              ...ledger.registros,
              [id]: actualizado
            }
          }
        },
        resultado: actualizado
      };
    });
  }

  async function reconciliarEnvioEntregas(id, superAdmin) {
    validarId(id);
    validarIdentidad(superAdmin);

    if (typeof obtenerEstadoCola !== "function") {
      throw new Error("La consulta de la cola no está disponible.");
    }

    const hashId = crypto.createHash("sha256")
      .update(id, "utf8").digest("hex").slice(0, 32);

    const operacionIdCola = `premio-${hashId}-datos-entregas`;
    const estadoCola = obtenerEstadoCola();

    if (
      !estadoCola ||
      estadoCola.version !== 1 ||
      !Array.isArray(estadoCola.operaciones)
    ) {
      throw new Error("Estado de la cola inválido.");
    }

    const operacion = estadoCola.operaciones.find(
      item => item.id === operacionIdCola
    );

    if (
      !operacion ||
      operacion.estado !== "ENVIADO" ||
      typeof operacion.mensajeSalidaId !== "string" ||
      !operacion.mensajeSalidaId.trim() ||
      operacion.mensajeSalidaId !== operacion.mensajeSalidaId.trim() ||
      operacion.mensajeSalidaId.length > 300
    ) {
      throw new Error(
        "No existe un envío confirmado con ID real de WhatsApp."
      );
    }

    if (
      operacion.premioId !== id ||
      operacion.etapa !== "datos-entregas" ||
      operacion.destino !== "120363412275379586@g.us" ||
      operacion.tipo !== "grupo"
    ) {
      throw new Error(
        "La operación enviada no coincide con el premio y el grupo interno."
      );
    }

    const ledgerActual = leerJSON(ARCHIVO_LEDGER);
    const premioActual = validarRegistro(ledgerActual?.registros?.[id]);

    if (premioActual.id !== id) {
      throw new Error("El ID del registro no coincide con el premio solicitado.");
    }

    if (premioActual.estado === ESTADOS.PENDIENTE_CONFIRMACION) {
      return {
        ok: true,
        duplicada: true,
        resultado: premioActual,
        operacionCola: operacionIdCola,
        mensajeSalidaId: operacion.mensajeSalidaId
      };
    }

    if (
      premioActual.estado !== ESTADOS.DATOS_RECIBIDOS &&
      premioActual.estado !== ESTADOS.ENVIADO_A_ENTREGAS
    ) {
      throw new Error(
        "El estado del premio no permite reconciliar el envío interno."
      );
    }

    if (premioActual.estado === ESTADOS.DATOS_RECIBIDOS) {
      await marcarEnviadoEntregas(id);
    }

    const estadoIntermedio = validarRegistro(
      leerJSON(ARCHIVO_LEDGER)?.registros?.[id]
    );

    if (estadoIntermedio.estado === ESTADOS.ENVIADO_A_ENTREGAS) {
      await marcarPendienteConfirmacion(id);
    }

    const resultadoFinal = validarRegistro(
      leerJSON(ARCHIVO_LEDGER)?.registros?.[id]
    );

    if (resultadoFinal.estado !== ESTADOS.PENDIENTE_CONFIRMACION) {
      throw new Error(
        "La reconciliación no alcanzó el estado pendiente de confirmación."
      );
    }

    return {
      ok: true,
      duplicada: false,
      resultado: resultadoFinal,
      operacionCola: operacionIdCola,
      mensajeSalidaId: operacion.mensajeSalidaId
    };
  }

  async function reconciliarNotificacion(id, etapa, superAdmin) {
    validarId(id);

    if (
      typeof superAdmin !== "string" ||
      !/^\d{5,20}@(s\.whatsapp\.net|lid)$/.test(superAdmin)
    ) {
      throw new Error("Identidad administrativa no válida.");
    }

    const claves = {
      "confirmacion-privada": "privada",
      "anuncio-publico": "publica"
    };
    const clave = claves[etapa];

    if (!clave) {
      throw new Error("Etapa de notificación no válida.");
    }

    if (typeof obtenerEstadoCola !== "function") {
      throw new Error("La consulta de la cola no está disponible.");
    }

    const hashId = crypto.createHash("sha256")
      .update(id, "utf8").digest("hex").slice(0, 32);

    const operacionIdCola = `premio-${hashId}-${etapa}`;
    const estadoCola = obtenerEstadoCola();

    if (
      !estadoCola ||
      estadoCola.version !== 1 ||
      !Array.isArray(estadoCola.operaciones)
    ) {
      throw new Error("Estado de la cola inválido.");
    }

    const operacion = estadoCola.operaciones.find(
      item => item.id === operacionIdCola
    );

    if (!operacion || operacion.estado !== "ENVIADO") {
      throw new Error("La operación de cola no está confirmada como ENVIADO.");
    }

    if (
      typeof operacion.mensajeSalidaId !== "string" ||
      !operacion.mensajeSalidaId.trim() ||
      operacion.mensajeSalidaId.length > 300
    ) {
      throw new Error("La operación enviada no tiene un ID de mensaje válido.");
    }

    const ledgerActual = leerJSON(ARCHIVO_LEDGER);
    const premioActual = validarRegistro(ledgerActual?.registros?.[id]);

    const destinoEsperado = etapa === "confirmacion-privada"
      ? premioActual.ganadorId
      : "120363179556270758@g.us";

    const tipoEsperado = etapa === "confirmacion-privada"
      ? "privado"
      : "grupo";

    if (
      operacion.premioId !== id ||
      operacion.etapa !== etapa ||
      operacion.destino !== destinoEsperado ||
      operacion.tipo !== tipoEsperado
    ) {
      throw new Error("La operación enviada no coincide con el premio y destino.");
    }

    if (
      premioActual.notificaciones?.[clave]?.estado === "ENVIADO"
    ) {
      return {
        ok: true,
        duplicada: true,
        resultado: premioActual
      };
    }

    const hashTransaccion = crypto.createHash("sha256")
      .update(id, "utf8").digest("hex").slice(0, 32);
    const transaccionId = `premio-reconciliar-${clave}-${hashTransaccion}`;

    return gestor.ejecutar(transaccionId, async leer => {
      const ledger = leer(ARCHIVO_LEDGER);

      if (
        !ledger ||
        ledger.version !== 1 ||
        !ledger.registros ||
        typeof ledger.registros !== "object" ||
        Array.isArray(ledger.registros)
      ) {
        throw new Error("Registro de premios inválido.");
      }

      const actual = validarRegistro(ledger.registros[id]);

      if (
        actual.estado !== ESTADOS.ENTREGADO &&
        actual.estado !== ESTADOS.NOTIFICADO
      ) {
        throw new Error("El premio no está entregado.");
      }

      const notificaciones = actual.notificaciones || {
        privada: { estado: "PENDIENTE", enviadaEn: null },
        publica: { estado: "PENDIENTE", enviadaEn: null }
      };

      if (
        !notificaciones[clave] ||
        !["PENDIENTE", "ENVIADO"].includes(notificaciones[clave].estado)
      ) {
        throw new Error("Estado de notificación inválido.");
      }

      const actualizado = {
        ...actual,
        notificaciones: {
          ...notificaciones,
          [clave]: {
            estado: "ENVIADO",
            enviadaEn: notificaciones[clave].enviadaEn || ahora()
          }
        },
        reconciliacion: {
          ...(actual.reconciliacion || {}),
          [clave]: {
            por: superAdmin,
            en: ahora(),
            operacionCola: operacionIdCola
          }
        },
        actualizadoEn: ahora()
      };

      const ambasEnviadas =
        actualizado.notificaciones.privada.estado === "ENVIADO" &&
        actualizado.notificaciones.publica.estado === "ENVIADO";

      if (ambasEnviadas) {
        actualizado.estado = ESTADOS.NOTIFICADO;
        actualizado.notificadoEn = actualizado.notificadoEn || ahora();
      }

      return {
        cambios: {
          [ARCHIVO_LEDGER]: {
            ...ledger,
            registros: {
              ...ledger.registros,
              [id]: actualizado
            }
          }
        },
        resultado: actualizado
      };
    });
  }


  async function reconciliarCodigoIncierto(id, mensajeId, idDesafio, superAdmin) {
    validarId(id);

    if (
      typeof mensajeId !== "string" ||
      !mensajeId.trim() ||
      mensajeId.length > 200
    ) {
      throw new Error("Identificador de mensaje inválido.");
    }

    if (
      typeof idDesafio !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idDesafio)
    ) {
      throw new Error("Identificador de desafío inválido.");
    }

    if (
      typeof superAdmin !== "string" ||
      !/^\d{5,20}@(s\.whatsapp\.net|lid)$/.test(superAdmin)
    ) {
      throw new Error("Identidad administrativa no válida.");
    }

    const operacionId = crearIdCaptura(
      "reconciliar-codigo-incierto",
      id,
      `${mensajeId}:${idDesafio}:${superAdmin}`
    );

    return gestor.ejecutar(operacionId, async leer => {
      const ledger = leer(ARCHIVO_LEDGER);

      if (
        !ledger ||
        ledger.version !== 1 ||
        !ledger.registros ||
        typeof ledger.registros !== "object" ||
        Array.isArray(ledger.registros)
      ) {
        throw new Error("Registro de premios inválido.");
      }

      const actual = validarRegistro(ledger.registros[id]);
      const v = actual.verificacionCodigo;

      if (!v || v.mensajeId !== mensajeId || v.idDesafio !== idDesafio) {
        throw new Error("El desafío no coincide con la operación solicitada.");
      }

      if (
        v.estadoEnvio !== "INCIERTO" ||
        v.invalidado ||
        v.consumido ||
        !v.hash
      ) {
        throw new Error("Solo se puede reconciliar un código INCIERTO activo.");
      }

      const resueltoEn = ahora();

      const actualizado = {
        ...actual,
        verificacionCodigo: {
          ...v,
          hash: null,
          estadoEnvio: "INVALIDADO",
          invalidado: true,
          invalidadoEn: resueltoEn,
          idDesafio,
          resueltoPor: superAdmin,
          resueltoEn,
          resolucion: "INVALIDACION_MANUAL_SUPERADMIN"
        },
        actualizadoEn: resueltoEn
      };

      return {
        cambios: {
          [ARCHIVO_LEDGER]: {
            ...ledger,
            registros: {
              ...ledger.registros,
              [id]: actualizado
            }
          }
        },
        resultado: {
          ok: true,
          reconciliado: true,
          premioId: id,
          resueltoPor: superAdmin,
          resueltoEn
        }
      };
    });
  }

  async function marcarNotificado(id) {
    const registro = obtenerPremio(id);
    if (
      registro.estado === ESTADOS.NOTIFICADO &&
      registro.notificaciones?.privada?.estado === "ENVIADO" &&
      registro.notificaciones?.publica?.estado === "ENVIADO"
    ) {
      return { ok: true, resultado: registro, duplicado: true };
    }
    throw new Error(
      "No se puede marcar NOTIFICADO sin confirmar ambos envíos."
    );
  }

  function generarAnuncio(id) {
    const registro = obtenerPremio(id);

    if (
      registro.estado !== ESTADOS.ENTREGADO &&
      registro.estado !== ESTADOS.NOTIFICADO
    ) {
      throw new Error("No se puede anunciar un premio no entregado.");
    }

    return generarAnuncioLegendario(registro);
  }


  function obtenerPremiosPendientesDatos(identidad) {
    validarIdentidad(identidad);

    const ledger = leerJSON(ARCHIVO_LEDGER);

    if (
      !ledger ||
      ledger.version !== 1 ||
      !ledger.registros ||
      typeof ledger.registros !== "object" ||
      Array.isArray(ledger.registros)
    ) {
      throw new Error("El registro de premios reales no existe o es inválido.");
    }

    return Object.values(ledger.registros)
      .filter(registro =>
        registro &&
        registro.ganadorId === identidad &&
        registro.estado === ESTADOS.PENDIENTE_DATOS
      )
      .map(registro => {
        validarRegistro(registro);
        return {
          id: registro.id,
          fuente: registro.fuente,
          premio: registro.premio.nombre,
          creadoEn: registro.creadoEn,
          capturaActiva: Boolean(registro.capturaDatos)
        };
      });
  }

  function crearIdCaptura(accion, id, mensajeId) {
    validarId(id);

    if (
      typeof mensajeId !== "string" ||
      !mensajeId.trim() ||
      mensajeId.length > 200
    ) {
      throw new Error("Identificador de mensaje inválido.");
    }

    const huella = crypto
      .createHash("sha256")
      .update(mensajeId, "utf8")
      .digest("hex")
      .slice(0, 32);

    const premio = crypto
      .createHash("sha256")
      .update(id, "utf8")
      .digest("hex")
      .slice(0, 32);

    return `premio-${accion}-${premio}-${huella}`;
  }

  const ARCHIVO_COLA_ENTREGAS = "colaEntregasPremios.json";
  const GRUPO_ENTREGAS_PREMIOS = "120363412275379586@g.us";

  function leerColaEntregas(leer) {
    const cola = leer(ARCHIVO_COLA_ENTREGAS);

    if (cola === null) {
      return { version: 1, operaciones: [] };
    }

    if (
      !cola ||
      cola.version !== 1 ||
      !Array.isArray(cola.operaciones)
    ) {
      throw new Error("La cola de entregas está dañada o tiene un formato inválido.");
    }

    return cola;
  }

  function agregarOperacionCola(cola, operacion) {
    const existente = cola.operaciones.find(item => item.id === operacion.id);

    if (existente) {
      if (
        existente.premioId !== operacion.premioId ||
        existente.etapa !== operacion.etapa ||
        existente.destino !== operacion.destino ||
        existente.tipo !== operacion.tipo
      ) {
        throw new Error("Conflicto de idempotencia en la cola de entregas.");
      }
      return cola;
    }

    return {
      ...cola,
      operaciones: [
        ...cola.operaciones,
        {
          ...operacion,
          estado: "PENDIENTE",
          intentos: 0,
          creadaEn: Date.now(),
          actualizadaEn: Date.now(),
          enviadaEn: null,
          ultimoError: null
        }
      ]
    };
  }

  async function ejecutarCaptura(id, identidad, accion, mensajeId, construir) {
    validarId(id);
    validarIdentidad(identidad);

    const operacionId = crearIdCaptura(accion, id, mensajeId);

    return gestor.ejecutar(operacionId, async leer => {
      const ledger = leer(ARCHIVO_LEDGER);

      if (
        !ledger ||
        ledger.version !== 1 ||
        !ledger.registros ||
        typeof ledger.registros !== "object" ||
        Array.isArray(ledger.registros)
      ) {
        throw new Error("Registro de premios inválido.");
      }

      const actual = validarRegistro(ledger.registros[id]);

      if (actual.chatPrivado !== identidad) {
        throw new Error("El chat privado no ha sido verificado.");
      }

      if (actual.estado !== ESTADOS.PENDIENTE_DATOS) {
        throw new Error("El premio ya no está pendiente de datos.");
      }

      const actualizado = construir(actual);
      const cambios = {
        [ARCHIVO_LEDGER]: {
          ...ledger,
          registros: {
            ...ledger.registros,
            [id]: actualizado
          }
        }
      };

      // La captura del servidor y la creación del envío interno
      // se confirman juntas. La cola nunca almacena Player ID ni servidor.
      if (
        accion === "captura-servidor" &&
        actualizado.estado === ESTADOS.DATOS_RECIBIDOS
      ) {
        const cola = leerColaEntregas(leer);
        const hashId = crypto.createHash("sha256")
          .update(id, "utf8").digest("hex").slice(0, 32);

        cambios[ARCHIVO_COLA_ENTREGAS] = agregarOperacionCola(
          cola,
          {
            id: `premio-${hashId}-datos-entregas`,
            premioId: id,
            etapa: "datos-entregas",
            destino: GRUPO_ENTREGAS_PREMIOS,
            tipo: "grupo"
          }
        );
      }

      return {
        cambios,
        resultado: actualizado
      };
    });
  }

  async function iniciarCapturaDatos(id, identidad, mensajeId) {
    return ejecutarCaptura(
      id,
      identidad,
      "inicio-captura",
      mensajeId,
      registro => {
        if (registro.capturaDatos) {
          throw new Error("La captura de datos ya está iniciada.");
        }

        return {
          ...registro,
          capturaDatos: {
            paso: "PLAYER_ID",
            iniciadaEn: ahora(),
            playerId: null,
            ultimoMensajeId: mensajeId
          },
          actualizadoEn: ahora()
        };
      }
    );
  }

  async function registrarPlayerId(id, identidad, playerId, mensajeId) {
    if (
      typeof playerId !== "string" ||
      !/^\d{5,20}$/.test(playerId.trim())
    ) {
      throw new Error("El ID de jugador debe contener entre 5 y 20 dígitos.");
    }

    return ejecutarCaptura(
      id,
      identidad,
      "captura-player",
      mensajeId,
      registro => {
        if (
          !registro.capturaDatos ||
          registro.capturaDatos.paso !== "PLAYER_ID"
        ) {
          throw new Error("El premio no está esperando el ID de jugador.");
        }

        return {
          ...registro,
          capturaDatos: {
            ...registro.capturaDatos,
            paso: "SERVIDOR",
            playerId: playerId.trim(),
            playerIdRecibidoEn: ahora(),
            ultimoMensajeId: mensajeId
          },
          actualizadoEn: ahora()
        };
      }
    );
  }

  async function registrarServidor(id, identidad, servidor, mensajeId) {
    if (
      typeof servidor !== "string" ||
      !/^\d{1,10}$/.test(servidor.trim())
    ) {
      throw new Error("El servidor debe contener entre 1 y 10 dígitos.");
    }

    return ejecutarCaptura(
      id,
      identidad,
      "captura-servidor",
      mensajeId,
      registro => {
        if (
          !registro.capturaDatos ||
          registro.capturaDatos.paso !== "SERVIDOR" ||
          !registro.capturaDatos.playerId
        ) {
          throw new Error("El premio no está esperando el servidor.");
        }

        return {
          ...registro,
          estado: ESTADOS.DATOS_RECIBIDOS,
          datosJugador: {
            playerId: registro.capturaDatos.playerId,
            servidor: servidor.trim()
          },
          capturaDatos: {
            ...registro.capturaDatos,
            paso: "COMPLETADO",
            completadaEn: ahora(),
            ultimoMensajeId: mensajeId
          },
          actualizadoEn: ahora()
        };
      }
    );
  }

  return Object.freeze({
    obtenerPremio,
    obtenerPremiosPendientesDatos,
    obtenerCapturaCompletadaPorMensaje,
    prepararCodigoVerificacion,
    marcarCodigoEnviando,
    confirmarEnvioCodigoVerificacion,
    marcarCodigoIncierto,
    recuperarCodigosPendientesEnvio,
    validarCodigoVerificacion,
    validarCodigoPendiente,
    invalidarCodigoVerificacion,
    iniciarCapturaDatos,
    registrarPlayerId,
    registrarServidor,
    registrarDatosJugador,
    marcarEnviadoEntregas,
    marcarPendienteConfirmacion,
    reconciliarEnvioEntregas,
    confirmarEntrega,
    marcarNotificacionEnviada,
    reconciliarNotificacion,
    marcarNotificado,
    reconciliarCodigoIncierto,
    reconciliarCodigoAntiguoSinIdentidad,
    generarAnuncio
  });
}

module.exports = { crearServicioEntregaPremios };
