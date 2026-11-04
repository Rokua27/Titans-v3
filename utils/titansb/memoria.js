const fs = require("fs");
const path = require("path");

const DATABASE = path.join(process.cwd(), "database");
const ARCHIVO = path.join(DATABASE, "titansb_memoria.json");

const MAX_MEMORIAS = 200;

// ============================================================
// 🧠 TITANSB — MEMORIA
// ============================================================

function asegurarArchivo() {

    if (!fs.existsSync(DATABASE)) {
        fs.mkdirSync(DATABASE, {
            recursive: true
        });
    }

    if (!fs.existsSync(ARCHIVO)) {

        fs.writeFileSync(
            ARCHIVO,
            JSON.stringify(
                {
                    memorias: []
                },
                null,
                2
            )
        );
    }
}

// ============================================================
// 📂 CARGAR
// ============================================================

function cargarMemorias() {

    asegurarArchivo();

    try {

        const datos = JSON.parse(
            fs.readFileSync(
                ARCHIVO,
                "utf8"
            )
        );

        if (
            datos &&
            Array.isArray(datos.memorias)
        ) {
            return datos.memorias;
        }

    } catch (error) {

        console.error(
            "⚠️ TitansB | Error leyendo memoria:",
            error.message
        );
    }

    return [];
}

// ============================================================
// 💾 GUARDAR ARCHIVO
// ============================================================

function guardarMemorias(memorias) {

    asegurarArchivo();

    fs.writeFileSync(
        ARCHIVO,
        JSON.stringify(
            {
                memorias
            },
            null,
            2
        )
    );
}

// ============================================================
// 🔤 NORMALIZAR TEXTO
// ============================================================

function normalizar(texto = "") {

    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// ============================================================
// ⚠️ DETECTAR POSIBLES CONTRADICCIONES
// ============================================================

function extraerDatosSensibles(texto = "") {

    /*
     * IMPORTANTE:
     * Primero trabajamos sobre el texto original para no perder
     * información como "/", ":" o "-" antes de detectar fechas,
     * horas y formatos.
     */

    const original = String(texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const normalizado = normalizar(texto);

    return {

        numeros:
            normalizado.match(
                /\b\d+(?:[.:]\d+)?\b/g
            ) || [],

        horas:
            original.match(
                /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/g
            ) || [],

        fechas:
            original.match(
                /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g
            ) || [],

        bo:
            original.match(
                /\bbo\s*\d+\b/g
            ) || [],

        /*
         * 👑 PERSONAS / RESPONSABLES
         *
         * Capturamos la parte posterior a expresiones
         * como "líder", "capitán", "capitana", etc.
         */

        lideres: [
            ...(original.match(
                /\b(?:lider|líder|capitan|capitán|capitana)\s+(?:del\s+equipo\s+)?(?:[a-záéíóúñü0-9_-]+\s+)?(?:es|es el|es la)\s+[a-záéíóúñü0-9_-]+/g
            ) || []),

            ...(original.match(
                /\b(?:lider|líder|capitan|capitán|capitana)\s+(?:del\s+equipo\s+)?[a-záéíóúñü0-9_-]+/g
            ) || [])
        ],

        /*
         * 🏳️ PERTENENCIA A EQUIPO
         */

        equipos:
            original.match(
                /\b(?:equipo|team|escuadra)\s+[a-záéíóúñü0-9_-]+/g
            ) || [],

        /*
         * ⚔️ RESULTADOS
         */

        resultados:
            original.match(
                /\b(?:gano|ganó|perdio|perdió|empato|empató|victoria|derrota)\b/g
            ) || [],

        /*
         * 📝 ESTADOS
         */

        estados:
            original.match(
                /\b(?:inscrito|inscrita|eliminado|eliminada|clasificado|clasificada|descalificado|descalificada|activo|activa|inactivo|inactiva|abierto|abierta|cerrado|cerrada)\b/g
            ) || [],

        /*
         * ⚔️ PALABRAS QUE REPRESENTAN CAMBIOS DE RIVAL
         */

        rivales:
            original.match(
                /\b(?:contra|vs|versus)\s+[a-záéíóúñü0-9_-]+/g
            ) || []
    };
}

function detectarContradicciones(
    grupo,
    tipo,
    contenido
) {

    if (
        !grupo ||
        !contenido ||
        !contenido.trim()
    ) {
        return [];
    }

    /*
     * 🛡️ PROTECCIÓN OFICIAL CRUZADA
     *
     * Las memorias oficiales siempre participan en la comparación,
     * aunque tengan una categoría distinta.
     */

    const memorias =
        cargarMemorias().filter(
            memoria =>
                memoria.grupo === grupo &&
                (
                    memoria.confianza === "oficial" ||
                    memoria.tipo === tipo
                )
        );

    if (!memorias.length) {
        return [];
    }

    const nuevo =
        normalizar(contenido);

    /*
     * ------------------------------------------------------------
     * 🔎 LIMPIAR TEMA
     * ------------------------------------------------------------
     *
     * Eliminamos solamente datos variables:
     *
     * - horas
     * - fechas
     * - números
     *
     * El resto del texto sirve para determinar si hablamos
     * del mismo hecho.
     */

    const limpiarTema = texto => {

        const original =
            String(texto || "")
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");

        return normalizar(original)
            .replace(
                /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/g,
                " "
            )
            .replace(
                /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g,
                " "
            )
            .replace(
                /\b\d+(?:[.:]\d+)?\b/g,
                " "
            )
            .replace(/\s+/g, " ")
            .trim();
    };

    const temaNuevo =
        limpiarTema(contenido);

    const palabras =
        temaNuevo
            .split(/\s+/)
            .filter(
                palabra =>
                    palabra.length >= 3
            );

    if (!palabras.length) {
        return [];
    }

    const datosNuevos =
        extraerDatosSensibles(contenido);

    const resultados = [];

    for (const memoria of memorias) {

        const temaAnterior =
            limpiarTema(
                memoria.contenido
            );

        let coincidencias = 0;

        for (const palabra of palabras) {

            if (
                temaAnterior.includes(palabra)
            ) {
                coincidencias++;
            }
        }

        const porcentaje =
            palabras.length
                ? coincidencias / palabras.length
                : 0;

        /*
         * --------------------------------------------------------
         * 🧠 MISMO HECHO
         * --------------------------------------------------------
         *
         * 60% sigue siendo suficiente para cambios simples.
         */

        if (porcentaje < 0.60) {
            continue;
        }

        const datosAnteriores =
            extraerDatosSensibles(
                memoria.contenido
            );

        const cambios = [];

        /*
         * ⏰ HORA
         */

        if (
            datosNuevos.horas.length &&
            datosAnteriores.horas.length &&
            datosNuevos.horas.join("|") !==
            datosAnteriores.horas.join("|")
        ) {
            cambios.push("hora");
        }

        /*
         * 📅 FECHA
         */

        if (
            datosNuevos.fechas.length &&
            datosAnteriores.fechas.length &&
            datosNuevos.fechas.join("|") !==
            datosAnteriores.fechas.join("|")
        ) {
            cambios.push("fecha");
        }

        /*
         * ⚔️ BO3 / BO5
         */

        if (
            datosNuevos.bo.length &&
            datosAnteriores.bo.length &&
            datosNuevos.bo.join("|") !==
            datosAnteriores.bo.join("|")
        ) {
            cambios.push("formato");
        }

        /*
         * 🔢 CANTIDADES
         *
         * Solo comparamos números si no representan una
         * fecha, hora o BO.
         */

        if (
            cambios.length === 0 &&
            datosNuevos.numeros.length &&
            datosAnteriores.numeros.length &&
            datosNuevos.numeros.join("|") !==
            datosAnteriores.numeros.join("|")
        ) {
            cambios.push("cantidad");
        }

        /*
         * 👑 LÍDER / CAPITÁN
         */

        if (
            datosNuevos.lideres.length &&
            datosAnteriores.lideres.length &&
            datosNuevos.lideres.join("|") !==
            datosAnteriores.lideres.join("|")
        ) {
            cambios.push("lider");
        }

        /*
         * 🏳️ EQUIPO
         */

        if (
            datosNuevos.equipos.length &&
            datosAnteriores.equipos.length &&
            datosNuevos.equipos.join("|") !==
            datosAnteriores.equipos.join("|")
        ) {
            cambios.push("equipo");
        }

        /*
         * ⚔️ RIVAL
         */

        if (
            datosNuevos.rivales.length &&
            datosAnteriores.rivales.length &&
            datosNuevos.rivales.join("|") !==
            datosAnteriores.rivales.join("|")
        ) {
            cambios.push("rival");
        }

        /*
         * 🏆 RESULTADO
         */

        if (
            datosNuevos.resultados.length &&
            datosAnteriores.resultados.length &&
            datosNuevos.resultados.join("|") !==
            datosAnteriores.resultados.join("|")
        ) {
            cambios.push("resultado");
        }

        /*
         * 📝 ESTADO
         */

        if (
            datosNuevos.estados.length &&
            datosAnteriores.estados.length &&
            datosNuevos.estados.join("|") !==
            datosAnteriores.estados.join("|")
        ) {
            cambios.push("estado");
        }

        /*
         * No hay ningún cambio sensible.
         */

        if (!cambios.length) {
            continue;
        }

        resultados.push({

            ...memoria,

            coincidencias,

            porcentaje:
                Math.round(
                    porcentaje * 100
                ),

            cambios,

            esOficial:
                memoria.confianza === "oficial"
        });
    }

    return resultados
        .sort(
            (a, b) => {

                /*
                 * 🏆 Las memorias oficiales siempre primero.
                 */

                if (
                    a.esOficial !==
                    b.esOficial
                ) {
                    return a.esOficial
                        ? -1
                        : 1;
                }

                return (
                    b.porcentaje -
                    a.porcentaje
                );
            }
        )
        .slice(0, 5);
}

// ============================================================
// 🧠 GUARDAR MEMORIA
// ============================================================

function guardarMemoria({

    grupo,
    tipo = "general",
    contenido,
    importancia = 1,
    confianza = "aprendido",
    origen = "comunidad",
    autor = null

}) {

    if (
        !contenido ||
        !contenido.trim()
    ) {
        return false;
    }

    const texto = contenido.trim();

    const memorias =
        cargarMemorias();

    const grupoFinal =
        grupo || "global";

    const tipoFinal =
        tipo || "general";

    // ========================================================
    // 🛡️ ANTI-DUPLICADOS
    // ========================================================

    const normalizadoNuevo =
        normalizar(texto);

    const duplicada =
        memorias.find(
            memoria =>
                memoria.grupo === grupoFinal &&
                memoria.tipo === tipoFinal &&
                normalizar(memoria.contenido) === normalizadoNuevo
        );

    if (duplicada) {

        console.log(
            "♻️ TitansB | memoria duplicada ignorada."
        );

        return {
            ...duplicada,
            duplicada: true
        };
    }

    // ========================================================
    // 🔐 NIVEL DE CONFIANZA
    // ========================================================

    const confianzasPermitidas = [
        "oficial",
        "aprendido",
        "no_confirmado"
    ];

    const origenesPermitidos = [
        "sistema",
        "comunidad"
    ];

    const confianzaFinal =
        confianzasPermitidas.includes(confianza)
            ? confianza
            : "aprendido";

    const origenFinal =
        origenesPermitidos.includes(origen)
            ? origen
            : "comunidad";

    // ========================================================
    // 🛡️ BLINDAJE DE MEMORIA OFICIAL
    // ========================================================
    //
    // Una memoria SOLO puede ser OFICIAL si procede
    // directamente del sistema.
    //
    // Esto constituye la última barrera de seguridad.
    // Aunque otro módulo intente escribir:
    //
    //     confianza: "oficial"
    //     origen: "comunidad"
    //
    // será degradada automáticamente a APRENDIDO.
    //
    const confianzaSegura =
        confianzaFinal === "oficial" &&
        origenFinal === "sistema"
            ? "oficial"
            : confianzaFinal === "oficial"
                ? "aprendido"
                : confianzaFinal;

    // ========================================================
    // 🆕 NUEVA MEMORIA
    // ========================================================

    const ahora = new Date().toISOString();

    const nueva = {

        id:
            Date.now().toString(),

        grupo:
            grupoFinal,

        tipo:
            tipoFinal,

        contenido:
            texto,

        importancia:
            Math.max(
                1,
                Math.min(
                    Number(importancia) || 1,
                    5
                )
            ),

        confianza:
            confianzaSegura,

        origen:
            origenFinal,

        autor:
            autor || null,

        fecha:
            ahora,

        actualizada:
            ahora
    };

    memorias.push(nueva);

    // ========================================================
    // 🧹 LÍMITE DE MEMORIA
    // ========================================================

    if (
        memorias.length >
        MAX_MEMORIAS
    ) {

        memorias.splice(
            0,
            memorias.length -
            MAX_MEMORIAS
        );
    }

    guardarMemorias(memorias);

    return nueva;
}

// ============================================================
// 🔎 OBTENER MEMORIAS
// ============================================================

function obtenerMemorias(

    grupo = null,
    limite = 10

) {

    const memorias =
        cargarMemorias();

    let resultado =
        memorias;

    if (grupo) {

        resultado =
            memorias.filter(
                memoria =>
                    memoria.grupo === grupo ||
                    memoria.grupo === "global"
            );
    }

    return resultado
        .sort(
            (a, b) =>
                new Date(b.fecha) -
                new Date(a.fecha)
        )
        .slice(
            0,
            limite
        );
}

// ============================================================
// 🔎 BUSCAR MEMORIA POR TEXTO
// ============================================================

function buscarMemorias(

    consulta,
    grupo = null,
    limite = 5

) {

    if (
        !consulta ||
        !consulta.trim()
    ) {
        return [];
    }

    const palabras =
        normalizar(consulta)
            .split(/\s+/)
            .filter(
                palabra =>
                    palabra.length >= 3
            );

    if (!palabras.length) {
        return [];
    }

    const memorias =
        obtenerMemorias(
            grupo,
            MAX_MEMORIAS
        );

    const resultados = [];

    for (const memoria of memorias) {

        const texto =
            normalizar(
                `${memoria.tipo} ${memoria.contenido}`
            );

        let puntos = 0;

        for (const palabra of palabras) {

            if (
                texto.includes(palabra)
            ) {
                puntos++;
            }
        }

        if (puntos > 0) {

            resultados.push({
                ...memoria,
                relevancia: puntos
            });
        }
    }

    return resultados
        .sort(
            (a, b) => {

                if (
                    b.relevancia !==
                    a.relevancia
                ) {
                    return (
                        b.relevancia -
                        a.relevancia
                    );
                }

                const confianzaPeso = {
                    oficial: 3,
                    aprendido: 2,
                    no_confirmado: 1
                };

                const pesoA =
                    confianzaPeso[a.confianza] || 1;

                const pesoB =
                    confianzaPeso[b.confianza] || 1;

                if (pesoB !== pesoA) {
                    return pesoB - pesoA;
                }

                return (
                    b.importancia -
                    a.importancia
                );
            }
        )
        .slice(
            0,
            limite
        );
}

// ============================================================
// 🧠 RESOLVER MEMORIA
// ============================================================

function resolverMemoria(
    grupo,
    tipo,
    contenido,
    opciones = {}
) {

    if (
        !grupo ||
        !tipo ||
        !contenido ||
        !contenido.trim()
    ) {
        return {
            actualizado: false,
            motivo: "datos_invalidos"
        };
    }

    const memorias = cargarMemorias();

    const contenidoNuevo =
        contenido.trim();

    const normalizadoNuevo =
        normalizar(contenidoNuevo);

    const confianzaNueva =
        opciones.confianza || "aprendido";

    const importanciaNueva =
        Math.max(
            1,
            Math.min(
                Number(opciones.importancia) || 1,
                5
            )
        );

    const pesos = {
        oficial: 3,
        aprendido: 2,
        no_confirmado: 1
    };

    const pesoNuevo =
        pesos[confianzaNueva] || 1;

    // ========================================================
    // 🔎 Buscar memoria relacionada
    // ========================================================

    const relacionadas =
        memorias.filter(
            memoria =>
                memoria.grupo === grupo &&
                memoria.tipo === tipo &&
                normalizar(memoria.contenido) !==
                    normalizadoNuevo
        );

    const contradicciones =
        detectarContradicciones(
            grupo,
            tipo,
            contenidoNuevo
        );

    // ========================================================
    // 🏆 PROTEGER INFORMACIÓN OFICIAL
    // ========================================================

    const oficial =
        contradicciones.find(
            memoria =>
                memoria.confianza === "oficial" ||
                memoria.esOficial === true
        );

    if (
        oficial &&
        confianzaNueva !== "oficial"
    ) {

        console.log(
            "🛡️ TitansB | resolver | oficial protegida."
        );

        const registro =
            guardarMemoria({
                grupo,
                tipo,
                contenido: contenidoNuevo,
                importancia:
                    Math.min(
                        importanciaNueva,
                        Math.max(
                            oficial.importancia - 1,
                            1
                        )
                    ),
                confianza: "no_confirmado",
                origen:
                    opciones.origen || "comunidad",
                autor:
                    opciones.autor || null
            });

        return {
            actualizado: !!registro,
            conflicto: true,
            oficialProtegida: true,
            oficial,
            memoria: registro
        };
    }

    // ========================================================
    // 🔄 Buscar memoria exacta existente
    // ========================================================

    const exacta =
        memorias.find(
            memoria =>
                memoria.grupo === grupo &&
                memoria.tipo === tipo &&
                normalizar(memoria.contenido) ===
                    normalizadoNuevo
        );

    if (exacta) {

        const pesoActual =
            pesos[exacta.confianza] || 1;

        const nuevaConfianza =
            pesoNuevo > pesoActual
                ? confianzaNueva
                : exacta.confianza;

        const nuevaImportancia =
            Math.max(
                exacta.importancia || 1,
                importanciaNueva
            );

        exacta.confianza =
            nuevaConfianza;

        exacta.importancia =
            Math.min(
                nuevaImportancia,
                5
            );

        exacta.actualizada =
            new Date().toISOString();

        if (opciones.origen) {
            exacta.origen =
                opciones.origen;
        }

        if (opciones.autor) {
            exacta.autor =
                opciones.autor;
        }

        guardarMemorias(memorias);

        console.log(
            "♻️ TitansB | resolver | memoria actualizada."
        );

        return {
            actualizado: true,
            conflicto: false,
            duplicada: true,
            memoria: exacta
        };
    }

    // ========================================================
    // 🧠 NUEVA MEMORIA
    // ========================================================

    const registro =
        guardarMemoria({
            grupo,
            tipo,
            contenido: contenidoNuevo,
            importancia: importanciaNueva,
            confianza: confianzaNueva,
            origen:
                opciones.origen || "comunidad",
            autor:
                opciones.autor || null
        });

    return {
        actualizado: !!registro,
        conflicto:
            contradicciones.length > 0,
        oficialProtegida: false,
        memoria: registro
    };
}

// ============================================================
// 🧹 LIMPIAR MEMORIA
// ============================================================

function limpiarMemoria(
    grupo = null
) {

    if (!grupo) {

        guardarMemorias([]);

        return true;
    }

    const memorias =
        cargarMemorias();

    const restantes =
        memorias.filter(
            memoria =>
                memoria.grupo !== grupo
        );

    guardarMemorias(
        restantes
    );

    return true;
}

// ============================================================
// 📊 ESTADÍSTICAS
// ============================================================

function estadisticasMemoria() {

    const memorias =
        cargarMemorias();

    const categorias = {};

    for (const memoria of memorias) {

        categorias[memoria.tipo] =
            (categorias[memoria.tipo] || 0) +
            1;
    }

    return {

        total:
            memorias.length,

        grupos:
            new Set(
                memorias.map(
                    memoria =>
                        memoria.grupo
                )
            ).size,

        categorias
    };
}

// ============================================================
// 📤 EXPORTAR
// ============================================================

module.exports = {

    guardarMemoria,

    obtenerMemorias,

    buscarMemorias,

    resolverMemoria,

    limpiarMemoria,

    estadisticasMemoria,

    normalizar,

    detectarContradicciones

};
