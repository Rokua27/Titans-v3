// ==========================================
// C-10 — Extraer menciones explícitas
// ==========================================

function extraerMencionesExplicitas(texto = "") {
    const textoOriginal = String(texto || "");

    /*
     * Solo consideramos menciones escritas explícitamente
     * con @.
     *
     * Ejemplos válidos:
     *   @Carlos Pérez
     *   @José Álvarez
     *
     * No intentamos descubrir nombres dentro de texto libre.
     * La resolución del nombre → JID se realizará posteriormente
     * en utils/asistenteTorneos/menciones.js.
     */

    const coincidencias =
        textoOriginal.match(
            /@([A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9][A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 ._-]*?)(?=\s+(?:@|que|debe|deben|y|para|del|la|el|los|las|al|a|en|con|se|es|son|revisa|revisar|revisen|revisar|recuerden|recuerda|mañana|hoy|esta|este|estos|estas|será|sera|tendremos|habrá|habra|puede|pueden|deberá|debera|deberán|deberan|vamos|vayan|inicia|inician|empieza|empiezan|comienza|comienzan|$)|[,:;.!?]|$)/gi
        ) || [];

    const menciones = [];

    for (const coincidencia of coincidencias) {
        const nombre =
            coincidencia
                .slice(1)
                .trim()
                .replace(/[,:;.!?]+$/g, "")
                .trim();

        if (!nombre) continue;

        /*
         * Evitar interpretar números/JID como nombres.
         */
        if (/^\d+(?:@[\w.-]+)?$/.test(nombre)) {
            continue;
        }

        if (
            !menciones.some(
                existente =>
                    normalizarTexto(existente) ===
                    normalizarTexto(nombre)
            )
        ) {
            menciones.push(nombre);
        }
    }

    return menciones;
}

function normalizarTexto(texto = "") {
    return texto
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function extraerPeriodoProgramacion(pregunta = "") {
    const dias = [
        "domingo",
        "lunes",
        "martes",
        "miercoles",
        "jueves",
        "viernes",
        "sabado"
    ];

    for (const dia of dias) {
        if (pregunta.includes(dia)) {
            return dia;
        }
    }

    if (pregunta.includes("pasado manana")) {
        return "pasado manana";
    }

    if (pregunta.includes("manana")) {
        return "manana";
    }

    if (pregunta.includes("hoy")) {
        return "hoy";
    }

    const coincidenciaFecha =
        pregunta.match(/\b(\d{1,2})\s*(?:de\s*)?([a-z]+)\b/);

    if (coincidenciaFecha) {
        return `${coincidenciaFecha[1]} de ${coincidenciaFecha[2]}`;
    }

    const coincidenciaNumerica =
        pregunta.match(
            /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/
        );

    if (coincidenciaNumerica) {
        return coincidenciaNumerica[0];
    }

    return null;
}


function interpretarTorneo(texto) {
    if (typeof texto !== "string" || !texto.trim()) {
        return {
            accion: "desconocida",
            datos: {},
            faltantes: []
        };
    }

    const textoOriginal = texto.trim();
    const pregunta = normalizarTexto(textoOriginal);

    const indicadoresCrear = [
        "crear",
        "crea",
        "creame",
        "organizar",
        "organizame",
        "organiza",
        "montar",
        "montemos",
        "armar",
        "arma",
        "preparar",
        "prepara",
        "hacer",
        "haz"
    ];

    const objetivosTorneo = [
        "torneo",
        "competencia",
        "campeonato",
        "liga"
    ];

    const tieneAccionCrear = indicadoresCrear.some(indicador =>
        pregunta.includes(indicador)
    );

    const tieneObjetivoTorneo = objetivosTorneo.some(objetivo =>
        pregunta.includes(objetivo)
    );

    const esCrear = tieneAccionCrear && tieneObjetivoTorneo;

    // ========================================================
    // 📢 COMUNICACIÓN GENERAL — G-08.11.13-B
    // ========================================================
    //
    // Comunicación general de la comunidad.
    //
    // La estructura distingue:
    //   generar → el usuario entrega una idea/información.
    //   mejorar → el usuario entrega un texto ya redactado.
    //
    // Las acciones específicas del sistema de torneos permanecen
    // debajo de este bloque para conservar compatibilidad.
    // ========================================================

    const indicadoresComunicacionGeneral = [
        "comunica",
        "comunicar",
        "comunicame",
        "comunicarme",
        "informa",
        "informar",
        "informame",
        "informarme"
    ];

    const esMejoraComunicado =
        pregunta.includes("mejora este comunicado") ||
        pregunta.includes("mejora el comunicado") ||
        pregunta.includes("mejorar este comunicado") ||
        pregunta.includes("mejorar el comunicado") ||
        pregunta.includes("mejora este mensaje") ||
        pregunta.includes("mejorar este mensaje");

    /*
     * Un texto después de ":" representa explícitamente el mensaje.
     * Esto tiene prioridad frente a palabras internas como
     * "programación", "partidos", "torneo", etc.
     */
    const tieneMensajeExplicito =
        /:\s*\S+/s.test(textoOriginal);

    const tieneIndicadorGeneral =
        indicadoresComunicacionGeneral.some(indicador =>
            pregunta.includes(indicador)
        ) ||
        esMejoraComunicado ||
        (
            tieneMensajeExplicito &&
            (
                pregunta.includes("este mensaje") ||
                pregunta.includes("este comunicado") ||
                pregunta.includes("un mensaje")
            )
        );

    /*
     * Destinos conocidos por el intérprete.
     *
     * "comite" se utiliza sin tilde internamente para mantener
     * la misma normalización que el resto del intérprete.
     */
    const destinosGenerales = [];

    if (
        /\b(?:al|a|en|para)\s+(?:el\s+)?grupo\s+principal\b/i.test(pregunta) ||
        /\b(?:al|a|en|para)\s+principal\b/i.test(pregunta)
    ) {
        destinosGenerales.push("principal");
    }

    if (
        /\b(?:al|a|en|para)\s+(?:el\s+)?grupo\s+(?:de\s+)?capitanes\b/i.test(pregunta) ||
        /\b(?:al|a|en|para)\s+capitanes\b/i.test(pregunta)
    ) {
        destinosGenerales.push("capitanes");
    }

    if (
        /\b(?:al|a|en|para)\s+(?:el\s+)?grupo\s+(?:de\s+)?pruebas\b/i.test(pregunta) ||
        /\b(?:al|a|en|para)\s+pruebas\b/i.test(pregunta)
    ) {
        destinosGenerales.push("pruebas");
    }

    if (
        /\b(?:al|a|en|para)\s+(?:el\s+)?grupo\s+(?:de\s+)?comit(?:e|é)\b/i.test(pregunta) ||
        /\b(?:al|a|en|para)\s+comit(?:e|é)\b/i.test(pregunta)
    ) {
        destinosGenerales.push("comite");
    }

    if (
        /\b(?:al|a|en|para)\s+(?:el\s+)?(?:grupo\s+(?:de\s+)?)?justicia\b/i.test(pregunta) ||
        /\b(?:al|a|en|para)\s+(?:el\s+)?direcci[oó]n\s+de\s+justicia(?:\s+competitiva)?\b/i.test(pregunta)
    ) {
        destinosGenerales.push("justicia");
    }

    /*
     * C-10.8.7-R3 — detectar destinos múltiples de forma robusta.
     *
     * Se analiza únicamente el encabezado de la comunicación,
     * es decir, la parte anterior a "que".
     *
     * Ejemplos:
     *   grupo principal y capitanes
     *   grupo principal, capitanes y pruebas
     *   grupo principal y grupo de capitanes
     *   principal y capitanes
     */
    const encabezadoDestinos =
        pregunta.split(/\s+que\s+/i)[0];

    const nombresDestinos = [
        ["principal", /\bprincipal\b/i],
        ["capitanes", /\bcapitanes\b/i],
        ["pruebas", /\bpruebas\b/i],
        ["comite", /\bcomit(?:e|é)\b/i],
        ["justicia", /\bjusticia\b/i]
    ];

    for (const [nombreDestino, patron] of nombresDestinos) {
        if (patron.test(encabezadoDestinos)) {
            destinosGenerales.push(nombreDestino);
        }
    }

    const destinosUnicosGenerales =
        [...new Set(destinosGenerales)];

    /*
     * Las acciones específicas del torneo solo deben conservar
     * prioridad cuando NO estamos ante un mensaje explícitamente
     * proporcionado por el usuario.
     */
    const esAccionTorneoEspecifica =
        pregunta.includes("resultado del partido") ||
        pregunta.includes("resultado partido") ||
        pregunta.includes("resultado del encuentro") ||
        pregunta.includes("equipos clasificados") ||
        pregunta.includes("clasificados del torneo") ||
        pregunta.includes("fixture") ||
        pregunta.includes("tabla de posiciones") ||
        pregunta.includes("iniciamos los cuartos de final") ||
        pregunta.includes("iniciar los cuartos de final") ||
        pregunta.includes("iniciaremos los cuartos de final") ||
        pregunta.includes("inicio de los cuartos de final") ||
        pregunta.includes("torneo vigente") ||
        pregunta.includes("torneo actual");

    /*
     * "programacion" y "horarios" no se consideran aquí como
     * acciones específicas cuando forman parte del texto que
     * el usuario está proporcionando.
     */
    if (
        tieneIndicadorGeneral &&
        destinosUnicosGenerales.length > 0 &&
        (
            !esAccionTorneoEspecifica ||
            tieneMensajeExplicito ||
            esMejoraComunicado
        )
    ) {
        let mensajeGeneral = "";

        /*
         * CASO 1:
         * Mensaje explícito después de ":".
         *
         * Ejemplo:
         * Titans envía este mensaje al grupo de pruebas: Hola equipo
         */
        const coincidenciaDosPuntos =
            textoOriginal.match(/:\s*(.+)$/s);

        if (coincidenciaDosPuntos) {
            mensajeGeneral =
                coincidenciaDosPuntos[1].trim();
        } else {
            /*
             * CASO 2:
             * Comunicación natural.
             *
             * Ejemplo:
             * Titans comunica al grupo de capitanes que el sábado...
             */
            /*
             * C-10.8.7 — Comunicación a uno o múltiples destinos.
             *
             * Ejemplos:
             * Titans comunica al grupo principal que...
             * Titans comunica al grupo principal y capitanes que...
             * Titans informa al grupo principal y grupo de capitanes que...
             * Titans comunica al grupo principal, capitanes y pruebas que...
             */
            const patronDestinoGeneral =
                String.raw`(?:(?:grupo\s+(?:de\s+)?)?(?:principal|capitanes|pruebas|comite|comité|justicia)|direcci[oó]n\s+de\s+justicia(?:\s+competitiva)?)`;

            const coincidenciaNatural =
                textoOriginal.match(
                    new RegExp(
                        String.raw`\b(?:comunica|comunicar|informa|informar)\s+(?:al|a|en|para)\s+(?:el\s+)?` +
                        patronDestinoGeneral +
                        String.raw`(?:\s*(?:,|y)\s*(?:(?:al|a|en|para)\s+)?(?:el\s+)?` +
                        patronDestinoGeneral +
                        String.raw`)*(?:\s+que\s+)(.+)$`,
                        "is"
                    )
                );

            if (coincidenciaNatural) {
                mensajeGeneral =
                    coincidenciaNatural[1].trim();
            }
        }

        /*
         * El modo "mejorar" se activa cuando el usuario entrega
         * expresamente un mensaje/comunicado para trabajar.
         */
        const modo =
            esMejoraComunicado ||
            (
                tieneMensajeExplicito &&
                (
                    pregunta.includes("este mensaje") ||
                    pregunta.includes("este comunicado") ||
                    pregunta.includes("un mensaje")
                )
            )
                ? "mejorar"
                : "generar";

        const menciones =
            extraerMencionesExplicitas(
                mensajeGeneral
            );

        return {
            accion: "comunicacion",
            datos: {
                modo,
                destinos: destinosUnicosGenerales,
                mensaje: mensajeGeneral,
                menciones
            },
            faltantes: mensajeGeneral
                ? []
                : ["mensaje"]
        };
    }

    // ========================================================
    // 📢 COMUNICACIÓN ENTRE GRUPOS
    // ========================================================

    const indicadoresEnviar = [
        "enviar",
        "envia",
        "manda",
        "mandar",
        "publica",
        "publicar",
        "anuncia",
        "anunciar"
    ];

    const quiereEnviar =
        indicadoresEnviar.some(indicador =>
            pregunta.includes(indicador)
        ) ||
        pregunta.includes("genera un anuncio") ||
        pregunta.includes("generame un anuncio") ||
        pregunta.includes("generame un comunicado") ||
        pregunta.includes("genera un comunicado") ||
        pregunta.includes("anuncio oficial") ||
        pregunta.includes("comunicado oficial") ||
        pregunta.includes("iniciamos los cuartos de final") ||
        pregunta.includes("iniciar los cuartos de final") ||
        pregunta.includes("iniciaremos los cuartos de final") ||
        pregunta.includes("inicio de los cuartos de final") ||
        pregunta.includes("informa que") ||
        pregunta.includes("informando") ||
        /\binforma\s+(?:al|a)\s+(?:grupo\s+(?:principal|capitanes|pruebas)|grupo\s+de\s+(?:principal|capitanes|pruebas))\s+que\b/i.test(pregunta);

    if (quiereEnviar) {
        const destinos = [];

        if (
            pregunta.includes("todos los grupos") ||
            pregunta.includes("a todos los grupos") ||
            pregunta.includes("todos grupos") ||
            pregunta.includes("a todos grupos")
        ) {
            destinos.push(
                "principal",
                "capitanes",
                "pruebas"
            );
        }

        if (
            /\b(?:al|a)\s+(?:grupo\s+)?principal\b/i.test(pregunta)
        ) {
            destinos.push("principal");
        }

        if (
            /\b(?:al|a)\s+(?:grupo\s+de\s+|grupo\s+)?capitanes\b/i.test(pregunta)
        ) {
            destinos.push("capitanes");
        }

        if (
            /\b(?:al|a)\s+(?:grupo\s+de\s+|grupo\s+)?pruebas\b/i.test(pregunta)
        ) {
            destinos.push("pruebas");
        }

        if (
            pregunta.includes("iniciamos los cuartos de final") ||
            pregunta.includes("iniciar los cuartos de final") ||
            pregunta.includes("iniciaremos los cuartos de final") ||
            pregunta.includes("inicio de los cuartos de final")
        ) {
            if (/\ben el grupo principal\b/i.test(pregunta)) {
                destinos.push("principal");
            } else if (/\ben el grupo de capitanes\b/i.test(pregunta)) {
                destinos.push("capitanes");
            } else if (/\ben el grupo de pruebas\b/i.test(pregunta)) {
                destinos.push("pruebas");
            }
        }

        const destinosUnicos = [...new Set(destinos)];

        if (destinosUnicos.length > 0) {
            if (
                pregunta.includes("mensaje:") ||
                pregunta.includes("envia mensaje") ||
                pregunta.includes("enviar mensaje") ||
                pregunta.includes("manda mensaje") ||
                pregunta.includes("mandar mensaje") ||
                pregunta.includes("envia un mensaje") ||
                pregunta.includes("enviar un mensaje") ||
                pregunta.includes("manda un mensaje") ||
                pregunta.includes("mandar un mensaje") ||
                pregunta.includes("informa que") ||
                pregunta.includes("informando") ||
                  /\binforma\s+(?:al|a)\s+(?:grupo\s+(?:principal|capitanes|pruebas)|grupo\s+de\s+(?:principal|capitanes|pruebas))\s+que\b/i.test(pregunta)
            ) {
                let mensaje = "";

                /*
                 * FORMATO CON DOS PUNTOS
                 *
                 * Ejemplo:
                 * Titans envía mensaje al grupo principal: Hola equipo
                 *
                 * Todo lo que esté después de ":" es el contenido.
                 */
                const coincidenciaConDosPuntos =
                    textoOriginal.match(/:\s*(.+)$/);

                if (coincidenciaConDosPuntos) {
                    mensaje =
                        coincidenciaConDosPuntos[1].trim();
                } else {
                    /*
                     * FORMATO NATURAL
                     *
                     * Ejemplo:
                     * Titans envía un mensaje informando el proceso al grupo principal
                     */
                    const coincidenciaNatural =
                        textoOriginal.match(
                            /(?:envia|enviar|manda|mandar)\s+(?:un\s+)?mensaje\s+(.+)$/i
                        );

                    if (coincidenciaNatural) {
                        mensaje =
                            coincidenciaNatural[1].trim();
                    } else {
                        const coincidenciaInformaDestino =
                            textoOriginal.match(
                                /\binforma\s+(?:al|a)\s+(?:grupo\s+(?:principal|capitanes|pruebas)|grupo\s+de\s+(?:principal|capitanes|pruebas))\s+que\s+(.+)$/i
                            );

                        const coincidenciaInforma =
                            textoOriginal.match(
                                /(?:informa|informar|informando)\s+(?:que\s+)?(.+)$/i
                            );

                        if (coincidenciaInformaDestino) {
                            mensaje =
                                coincidenciaInformaDestino[1].trim();
                        } else if (coincidenciaInforma) {
                            mensaje =
                                coincidenciaInforma[1].trim();
                        }
                    }

                    /*
                     * Eliminamos el destino del final del contenido
                     * cuando aparece en una orden natural.
                     */
                    if (mensaje) {
                        mensaje = mensaje
                            .replace(
                                /\s+(?:al|a)\s+(?:(?:grupo\s+de\s+)?(?:principal|capitanes|pruebas)|grupo\s+(?:principal|capitanes|pruebas)|todos\s+los\s+grupos|todos\s+grupos)\s*$/i,
                                ""
                            )
                            .trim();
                    }
                }

                const menciones =
                    extraerMencionesExplicitas(mensaje);

                if (
                    pregunta.includes("informa que") ||
                    pregunta.includes("informando") ||
                    /\binforma\s+(?:al|a)\s+(?:grupo\s+(?:principal|capitanes|pruebas)|grupo\s+de\s+(?:principal|capitanes|pruebas))\s+que\b/i.test(pregunta)
                ) {
                    return {
                        accion: "comunicacion_mensaje_ia",
                        datos: {
                            destinos: destinosUnicos,
                            mensaje,
                            menciones
                        },
                        faltantes: mensaje
                            ? []
                            : ["mensaje"]
                    };
                }

                return {
                    accion: "comunicacion_mensaje",
                    datos: {
                        destinos: destinosUnicos,
                        mensaje,
                        menciones
                    },
                    faltantes: mensaje
                        ? []
                        : ["mensaje"]
                };
            }

            if (
                pregunta.includes("equipos clasificados") ||
                pregunta.includes("equipos clasificados del torneo") ||
                pregunta.includes("clasificados del torneo")
            ) {
                return {
                    accion: "comunicacion_equipos",
                    datos: {
                        destinos: destinosUnicos,
                        contenido: "equipos_clasificados"
                    },
                    faltantes: []
                };
            }

            if (
                pregunta.includes("iniciamos los cuartos de final") ||
                pregunta.includes("iniciar los cuartos de final") ||
                pregunta.includes("iniciaremos los cuartos de final") ||
                pregunta.includes("inicio de los cuartos de final")
            ) {
                const destinosCuartos = [...destinosUnicos];

                if (destinosCuartos.length === 0) {
                    if (/\ben el grupo principal\b/i.test(pregunta)) {
                        destinosCuartos.push("principal");
                    } else if (/\ben el grupo de capitanes\b/i.test(pregunta)) {
                        destinosCuartos.push("capitanes");
                    } else if (/\ben el grupo de pruebas\b/i.test(pregunta)) {
                        destinosCuartos.push("pruebas");
                    }
                }

                return {
                    accion: "comunicacion_inicio_cuartos",
                    datos: {
                        destinos: destinosCuartos,
                        contenido: "inicio_cuartos"
                    },
                    faltantes: []
                };
            }

            if (
                pregunta.includes("resultado del partido") ||
                pregunta.includes("resultado partido") ||
                pregunta.includes("resultado del encuentro")
            ) {
                const coincidenciaPartido =
                    pregunta.match(/\bpartido\s+(\d+)\b/);

                return {
                    accion: "comunicacion_resultado",
                    datos: {
                        destinos: destinosUnicos,
                        partidoNumero: coincidenciaPartido
                            ? Number(coincidenciaPartido[1])
                            : null
                    },
                    faltantes: coincidenciaPartido
                        ? []
                        : ["partidoNumero"]
                };
            }

              if (
                pregunta.includes("anuncio oficial") ||
                pregunta.includes("comunicado oficial") ||
                pregunta.includes("genera un anuncio oficial") ||
                pregunta.includes("generame un anuncio oficial") ||
                pregunta.includes("genera un comunicado oficial") ||
                pregunta.includes("generame un comunicado oficial")
            ) {
                return {
                    accion: "comunicacion_anuncio_oficial",
                    datos: {
                        destinos: destinosUnicos
                    },
                    faltantes: []
                };
            }

              if (
                pregunta.includes("anuncio") ||
                pregunta.includes("anunciar") ||
                pregunta.includes("publica un anuncio") ||
                pregunta.includes("publicar un anuncio")
            ) {
                return {
                    accion: "comunicacion_anuncio",
                    datos: {
                        destinos: destinosUnicos,
                        tipo: pregunta.includes("cuartos")
                            ? "cuartos"
                            : "torneo"
                    },
                    faltantes: []
                };
            }

            if (
                pregunta.includes("torneo vigente") ||
                pregunta.includes("torneo actual") ||
                pregunta.includes("informacion del torneo") ||
                pregunta.includes("informacion de la liga")
            ) {
                return {
                    accion: "comunicacion_torneo",
                    datos: {
                        destinos: destinosUnicos,
                        contenido: "torneo_vigente"
                    },
                    faltantes: []
                };
            }

            if (
                pregunta.includes("programacion") ||
                pregunta.includes("programacion de los enfrentamientos") ||
                pregunta.includes("horarios") ||
                pregunta.includes("partidos")
            ) {
                let fecha = null;

                if (pregunta.includes("sabado")) {
                    fecha = "sabado";
                } else if (pregunta.includes("domingo")) {
                    fecha = "domingo";
                }

                return {
                    accion: "comunicacion_programacion",
                    datos: {
                        destinos: destinosUnicos,
                        fecha
                    },
                    faltantes: fecha ? [] : ["fecha"]
                };
            }

            const coincidenciaMensaje =
                textoOriginal.match(/:\s*(.+)$/);

            const mensaje =
                coincidenciaMensaje
                    ? coincidenciaMensaje[1].trim()
                    : "";

            return {
                accion: "comunicacion_mensaje",
                datos: {
                    destinos: destinosUnicos,
                    mensaje
                },
                faltantes: mensaje
                    ? []
                    : ["mensaje"]
            };
        }
    }

    // ========================================================
    // 🔎 CONSULTAS DEL TORNEO
    // ========================================================
    //
    // A8 — Una palabra relacionada con el torneo no constituye
    // por sí sola una consulta.
    //
    // Ejemplos que NO deben activar una consulta:
    //   "La programación quedó muy bien."
    //   "El resultado de ayer estuvo increíble."
    //
    // Ejemplos que SÍ deben activar una consulta:
    //   "¿Cuál es la programación?"
    //   "¿Qué equipos juegan mañana?"
    //   "Dime la programación."
    //
    // La intención explícita tiene prioridad sobre la simple
    // coincidencia de palabras.
    // ========================================================

    const indicadoresConsultaExplicita = [
        "dime ",
        "dime la ",
        "dime los ",
        "dime que ",
        "dime qué ",
        "muestrame ",
        "muéstrame ",
        "muestra ",
        "quiero saber ",
        "me puedes decir ",
        "puedes decirme ",
        "puedes mostrarme ",
        "necesito saber "
    ];

    const iniciosConsultaExplicita = [
        "quien ",
        "quienes ",
        "cuando ",
        "donde ",
        "como ",
        "cual ",
        "cuales ",
        "por que ",
        "cuanto ",
        "cuantos ",
        "cuanta ",
        "cuantas ",
        "hay ",
        "ya ",
        "que "
    ];

    const tieneSignosPregunta =
        /[¿?]/.test(textoOriginal);

    const empiezaConsultaExplicita =
        iniciosConsultaExplicita.some(
            inicio => pregunta.startsWith(inicio)
        );

    const tieneIndicadorConsultaExplicita =
        indicadoresConsultaExplicita.some(
            indicador => pregunta.includes(indicador)
        );

    // A8.2/A8.3 — Normalizamos únicamente los signos iniciales
    // para poder reconocer correctamente estructuras conversacionales.
    const preguntaSinSignosIniciales =
        pregunta.replace(/^[¿?]+/, "").trim();

    const indicadoresPreguntaConversacional = [
        "viste que ",
        "viste el ",
        "viste la ",
        "recuerdas que ",
        "te acuerdas que ",
        "crees que ",
        "piensas que ",
        "te gusto ",
        "te parecio ",
        "que opinas de ",
        "te parece ",
        "como viste "
    ];

    const indicadoresConsultaConversacional = [
        "sabes que ",
        "sabes qué ",
        "sabes cual ",
        "sabes cuál ",
        "sabes cuando ",
        "sabes cuándo ",
        "sabes quien ",
        "sabes quién "
    ];

    const esPreguntaConversacional =
        tieneSignosPregunta &&
        indicadoresPreguntaConversacional.some(
            indicador =>
                preguntaSinSignosIniciales.startsWith(indicador)
        );

    const tieneConsultaConversacional =
        indicadoresConsultaConversacional.some(
            indicador =>
                preguntaSinSignosIniciales.startsWith(indicador)
        );

    const tieneIntencionConsulta =
        tieneIndicadorConsultaExplicita ||
        tieneConsultaConversacional ||
        empiezaConsultaExplicita ||
        (
            tieneSignosPregunta &&
            !esPreguntaConversacional
        );

    if (!esCrear && tieneIntencionConsulta) {
        if (
            pregunta.includes("equipos inscritos") ||
            pregunta.includes("equipos registrados") ||
            pregunta.includes("quienes estan inscritos") ||
            pregunta.includes("quienes estan registrados") ||
            pregunta.includes("que equipos estan inscritos") ||
            pregunta.includes("que equipos estan registrados")
        ) {
            return {
                accion: "ver_equipos",
                datos: {},
                faltantes: []
            };
        }

        if (
            pregunta.includes("tabla") ||
            pregunta.includes("clasificacion") ||
            pregunta.includes("posiciones")
        ) {
            return {
                accion: "ver_tabla",
                datos: {},
                faltantes: []
            };
        }

       if (
    pregunta.includes("programacion") ||
    pregunta.includes("horarios") ||
    pregunta.includes("que partidos hay") ||
    pregunta.includes("que equipos se enfrentan") ||
    pregunta.includes("que equipos juegan") ||
    pregunta.includes("a que hora juegan") ||
    pregunta.includes("quien juega") ||
    pregunta.includes("quienes juegan")
) {
    const fecha = extraerPeriodoProgramacion(pregunta);

    return {
        accion: "ver_programacion",
        datos: {
            fecha
        },
        faltantes: fecha ? [] : ["fecha"]
    };
}

        if (
            pregunta.includes("fixture") ||
            pregunta.includes("calendario") ||
            pregunta.includes("partidos programados") ||
            pregunta.includes("proximo partido") ||
            pregunta.includes("proximo encuentro")
        ) {
            return {
                accion: "ver_fixture",
                datos: {},
                faltantes: []
            };
        }

        if (
            pregunta.includes("resultados") ||
            pregunta.includes("resultado") ||
            pregunta.includes("partidos jugados")
        ) {
            return {
                accion: "ver_resultados",
                datos: {},
                faltantes: []
            };
        }

        if (
            pregunta.includes("jornada") ||
            pregunta.includes("jornadas")
        ) {
            const coincidenciaJornada = pregunta.match(
                /\bjornada\s+(\d+)\b/
            );

            return {
                accion: "ver_jornada",
                datos: coincidenciaJornada
                    ? { numero: Number(coincidenciaJornada[1]) }
                    : {},
                faltantes: coincidenciaJornada ? [] : ["numero_jornada"]
            };
        }

        if (
            pregunta.includes("como va el torneo") ||
            pregunta.includes("como va la liga") ||
            pregunta.includes("estado del torneo") ||
            pregunta.includes("estado de la liga") ||
            pregunta.includes("informacion del torneo") ||
            pregunta.includes("informacion de la liga") ||
            pregunta.includes("que torneo tenemos") ||
            pregunta.includes("torneo tenemos ahora") ||
            pregunta.includes("que torneo hay ahora") ||
            pregunta.includes("cual es el torneo actual") ||
            pregunta.includes("dime cual es el torneo actual") ||
            pregunta.includes("muestrame el torneo actual") ||
            pregunta.includes("muestra el torneo actual") ||
            pregunta.includes("quiero saber cual es el torneo actual") ||
            pregunta.includes("necesito saber cual es el torneo actual") ||
            pregunta.includes("que torneo esta activo") ||
            pregunta.includes("cual es el torneo vigente")
        ) {
            return {
                accion: "ver_torneo",
                datos: {},
                faltantes: []
            };
        }
    }

    if (esCrear) {
        const datos = {};

        const coincidenciaNombre = textoOriginal.match(
            /\b(?:llamado|llamada|de nombre)\s+(.+?)(?=\s+(?:\bcon\b|premio|formato|para\s+el\b|el\s+\d{1,2}[\/\-]\d{1,2}\b|a\s+las\b|bo\s*[35]\b|\d{1,3}\s*(?:equipos?|teams?)\b)|$)/i
        );

        if (coincidenciaNombre) {
            const nombre = coincidenciaNombre[1].trim();
            if (nombre) {
                datos.nombre = nombre;
            }
        }

        const coincidenciaPremio = textoOriginal.match(
            /\bpremio\s*(?:de|:)?\s*(.+?)(?=\s+(?:y\s+)?(?:con formato|formato|para(?:\s+el)?\b|el\s+\d{1,2}[\/\-]\d{1,2}\b|a\s+las\b|bo\s*[35]\b|\d{1,3}\s*(?:equipos?|teams?)\b)|$)/i
        );

        if (coincidenciaPremio) {
            const premio = coincidenciaPremio[1].trim();
            if (premio) {
                datos.premio = premio;
            }
        }

        const coincidenciaFechaNumerica = textoOriginal.match(
            /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\b/
        );

        const coincidenciaFechaTexto = textoOriginal.match(
            /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i
        );

        if (coincidenciaFechaNumerica) {
            datos.fecha = coincidenciaFechaNumerica[1];
        } else if (coincidenciaFechaTexto) {
            datos.fecha = `${coincidenciaFechaTexto[1]} de ${coincidenciaFechaTexto[2]}`;
        }

        const coincidenciaHora = textoOriginal.match(
            /\b(?:a\s+las\s+)?(\d{1,2}(?::\d{2})?\s*(?:a\.?\s*m\.?|p\.?\s*m\.?|am|pm))\b/i
        );

        const coincidenciaHora24 = textoOriginal.match(
            /\b(?:a\s+las\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/
        );

        if (coincidenciaHora) {
            datos.hora = coincidenciaHora[1]
                .replace(/\s+/g, " ")
                .trim();
        } else if (coincidenciaHora24) {
            datos.hora = `${coincidenciaHora24[1]}:${coincidenciaHora24[2]}`;
        }

        const coincidenciaEquipos = pregunta.match(
            /\b(\d{1,3})\s*(?:equipos?|teams?)\b/
        );

        if (coincidenciaEquipos) {
            datos.maxEquipos = Number(coincidenciaEquipos[1]);
        }

        if (
            pregunta.includes("eliminacion directa") ||
            pregunta.includes("eliminatoria")
        ) {
            datos.formato = "eliminacion_directa";
        } else if (
            pregunta.includes("todos contra todos") ||
            pregunta.includes("round robin")
        ) {
            datos.formato = "todos_contra_todos";
        } else if (
            pregunta.includes("fase de grupos") ||
            pregunta.includes("fase grupos")
        ) {
            datos.formato = "fase_de_grupos";
        } else if (pregunta.includes("suizo")) {
            datos.formato = "suizo";
        }

        const coincidenciaSerie = pregunta.match(
            /\bbo\s*([35])\b/
        );

        if (coincidenciaSerie) {
            datos.serie = `BO${coincidenciaSerie[1]}`;
        }

        return {
            accion: "crear_torneo",
            datos,
            faltantes: []
        };
    }

    return {
        accion: "desconocida",
        datos: {},
        faltantes: []
    };
}

module.exports = {
    interpretarTorneo,
    normalizarTexto,
    extraerPeriodoProgramacion
};
