const monitor = require("../utils/monitor");
const { esAdmin } = require("../utils/admin");
const { leerJSON, guardarJSON } = require("../utils/database");
const { obtenerFixture, guardarFixture } = require("../utils/torneoManager");

function normalizar(texto) {
  return texto.toLowerCase().trim();
}

function generarBracket(bracket) {
  const g = bracket.octavos.map(m => m.ganador || "Pendiente");

  bracket.cuartos = [
    { a: g[0], b: g[1], ganador: null },
    { a: g[2], b: g[3], ganador: null }
  ];

  const c = bracket.cuartos.map(m => m.ganador || "Pendiente");

  bracket.semifinales = [
    { a: c[0], b: c[1], ganador: null }
  ];

  const s = bracket.semifinales.map(m => m.ganador || "Pendiente");

  bracket.final = [
    { a: s[0], b: "Pendiente", ganador: null }
  ];

  return bracket;
}

module.exports = {
  nombre: "game",

alias: [],

categoria: "admin",

descripcion: "Gestiona el estado de una partida.",

permisos: ["admin"],

uso: "!game",

  async ejecutar(sock, from, args, msg) {
    try {

      // ======================================
      // 🔐 SOLO ADMINISTRADORES
      // ======================================

      const sender = msg.key.participant || msg.key.remoteJid;

      if (!(await esAdmin(sock, from, sender))) {
        return await sock.sendMessage(from, {
          text:
`╔══════════════════════════════╗
║        🛡️ 𝗔𝗖𝗖𝗘𝗦𝗢 🛡️        ║
╚══════════════════════════════╝

❌ Solo los administradores pueden usar este comando.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯`
        });
      }

      // ======================================
      // 🎮 EQUIPO GANADOR DEL MAPA
      // ======================================

      const ganadorMapa = args.join(" ").trim();

      if (!ganadorMapa) {
        return await sock.sendMessage(from, {
          text: "❌ Usa: !game NombreDelEquipo"
        });
      }

      // ======================================
      // 🔴 SERIE EN VIVO
      // ======================================

      const live = leerJSON("liveMatches.json") || {};
      const match = live[from];

      // ========================================================
      // 🛠️ RECUPERACIÓN ADMINISTRATIVA — PARTIDO YA DISPUTADO
      // ========================================================
      // Uso:
      // !game Equipo 2-0
      // !game Equipo 2-1
      //
      // Se utiliza únicamente cuando no existe una serie LIVE.
      // No modifica tabla.json ni bracket.json.
      // ========================================================

      if (!match || match.estado !== "LIVE") {

        const recuperacion = ganadorMapa.match(/^(.*)\s+(2-[01])$/i);

        if (recuperacion) {

          const nombreEquipo = recuperacion[1].trim();
          const marcador = recuperacion[2];
          const [victorias, derrotas] = marcador.split("-").map(Number);

          const fixture = obtenerFixture();

          const normalizarEquipo = texto =>
            String(texto || "")
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .trim()
              .toLowerCase();

          const buscado = normalizarEquipo(nombreEquipo);

          const partidosPendientes = Array.isArray(fixture.enfrentamientos)
            ? fixture.enfrentamientos.filter(
                partido => partido.estado !== "finalizado"
              )
            : [];

          const coincidencias = partidosPendientes.filter(partido =>
            normalizarEquipo(partido.equipo1) === buscado ||
            normalizarEquipo(partido.equipo2) === buscado
          );

          if (coincidencias.length === 0) {
            return await sock.sendMessage(from, {
              text:
`❌ No encontré un partido oficial pendiente para:

🏆 ${nombreEquipo}

Verifica el nombre del equipo y que el partido continúe pendiente en el fixture.`
            });
          }

          if (coincidencias.length > 1) {
            return await sock.sendMessage(from, {
              text:
`⚠️ ${nombreEquipo} aparece en varios partidos pendientes.

No registraré el resultado automáticamente para evitar modificar el partido equivocado.`
            });
          }

          const partido = coincidencias[0];

          const esEquipo1 =
            normalizarEquipo(partido.equipo1) === buscado;

          const marcadorEquipo1 = esEquipo1
            ? victorias
            : derrotas;

          const marcadorEquipo2 = esEquipo1
            ? derrotas
            : victorias;

          const ganadorReal = esEquipo1
            ? partido.equipo1
            : partido.equipo2;

          partido.ganador = ganadorReal;
          partido.estado = "finalizado";
          partido.marcador = {
            equipo1: marcadorEquipo1,
            equipo2: marcadorEquipo2
          };

          const partidosPride = fixture.enfrentamientos;

          const buscarPartidoPride = numero =>
            partidosPride.find(
              p => Number(p.numero) === Number(numero)
            );

          const crearSiguienteRonda = (
            numero,
            jornada,
            equipo1,
            equipo2
          ) => {

            if (buscarPartidoPride(numero)) {
              return false;
            }

            partidosPride.push({
              numero,
              jornada,
              fecha: null,
              hora: null,
              equipo1,
              equipo2,
              estado: "pendiente",
              ganador: null
            });

            return true;
          };

          // Cuartos #1 + #2 → Semifinal #5
          const q1 = buscarPartidoPride(1);
          const q2 = buscarPartidoPride(2);

          if (
            q1 &&
            q2 &&
            q1.estado === "finalizado" &&
            q2.estado === "finalizado" &&
            q1.ganador &&
            q2.ganador
          ) {
            crearSiguienteRonda(
              5,
              "Semifinal",
              q1.ganador,
              q2.ganador
            );
          }

          // Cuartos #3 + #4 → Semifinal #6
          const q3 = buscarPartidoPride(3);
          const q4 = buscarPartidoPride(4);

          if (
            q3 &&
            q4 &&
            q3.estado === "finalizado" &&
            q4.estado === "finalizado" &&
            q3.ganador &&
            q4.ganador
          ) {
            crearSiguienteRonda(
              6,
              "Semifinal",
              q3.ganador,
              q4.ganador
            );
          }

          // Semifinal #5 + #6 → Final #7
          const sf5 = buscarPartidoPride(5);
          const sf6 = buscarPartidoPride(6);

          if (
            sf5 &&
            sf6 &&
            sf5.estado === "finalizado" &&
            sf6.estado === "finalizado" &&
            sf5.ganador &&
            sf6.ganador
          ) {
            crearSiguienteRonda(
              7,
              "Final",
              sf5.ganador,
              sf6.ganador
            );
          }

          guardarFixture(fixture);

          return await sock.sendMessage(from, {
            text:
`╔══════════════════════════════╗
║   🛠️ RESULTADO RECUPERADO   ║
╚══════════════════════════════╝

🏆 TITANS PRIDE CUP 5Q

⚔️ Partido #${partido.numero}

🔵 ${partido.equipo1} ${marcadorEquipo1}
🟣 ${partido.equipo2} ${marcadorEquipo2}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👑 GANADOR
🏆 ${ganadorReal}

🎮 Formato: BO3
📊 Estado: FINALIZADO
🛠️ Registro administrativo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 Se revisó automáticamente el avance de ronda.`
          });
        }

        return await sock.sendMessage(from, {
          text: "❌ No hay una serie en vivo en este grupo."
        });
      }

      if (!match || match.estado !== "LIVE") {
        return await sock.sendMessage(from, {
          text: "❌ No hay una serie en vivo en este grupo."
        });
      }

      // ======================================
      // 📊 ACTUALIZAR MARCADOR
      // ======================================

      if (normalizar(ganadorMapa) === normalizar(match.equipoA)) {
        match.scoreA++;
      } else if (normalizar(ganadorMapa) === normalizar(match.equipoB)) {
        match.scoreB++;
      } else {
        return await sock.sendMessage(from, {
          text: "❌ El equipo no coincide con la serie actual."
        });
      }

      // ======================================
      // 🏆 ¿TERMINÓ LA SERIE?
      // ======================================

      if (match.scoreA >= 2 || match.scoreB >= 2) {

        const campeon =
          match.scoreA > match.scoreB
            ? match.equipoA
            : match.equipoB;

          const esFixtureOficial = Number.isInteger(match.partidoNumero);

          // ========================================================
          // 🏆 TITANS PRIDE CUP — RESULTADO OFICIAL DEL FIXTURE
          // ========================================================
          if (esFixtureOficial) {
            const fixture = obtenerFixture();
            const partido = fixture.enfrentamientos.find(
              p => Number(p.numero) === Number(match.partidoNumero)
            );

            if (!partido) {
              console.error(
                "❌ PRIDE CUP | No se encontró el partido oficial:",
                match.partidoNumero
              );
              return;
            }

            partido.ganador = campeon;
            partido.estado = "finalizado";

            guardarFixture(fixture);

            const resultados = leerJSON("resultados.json") || {
              resultados: []
            };

            if (!Array.isArray(resultados.resultados)) {
              resultados.resultados = [];
            }

            resultados.resultados.push({
              partidoNumero: Number(partido.numero),
              texto:
                `🏆 Titans Pride Cup 5Q — ${partido.jornada || "Partido oficial"}\n` +
                `⚔️ ${match.equipoA} ${match.scoreA} - ${match.scoreB} ${match.equipoB}\n` +
                `👑 Ganador: ${campeon}\n` +
                `🎮 BO3`,
              fecha: partido.fecha || new Date().toLocaleDateString("es-CO")
            });

            guardarJSON("resultados.json", resultados);

            await sock.sendMessage(from, {
              text:
`╔══════════════════════════════╗
║      🏆 𝗦𝗘𝗥𝗜𝗘 𝗙𝗜𝗡𝗔𝗟 🏆      ║
╚══════════════════════════════╝

⚔️ 𝗧𝗜𝗧𝗔𝗡𝗦 𝗣𝗥𝗜𝗗𝗘 𝗖𝗨𝗣 𝟱𝗤

🔵 ${match.equipoA} ┃ ${match.scoreA}
🟣 ${match.equipoB} ┃ ${match.scoreB}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👑 𝗚𝗔𝗡𝗔𝗗𝗢𝗥
🏆 ${campeon}

🎮 Formato: BO3
📊 Estado: FINALIZADO

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
⚔️ Competimos para jugar, jugamos para ser leyendas.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
            });

            delete live[from];
            guardarJSON("liveMatches.json", live);
            // ========================================================
            // 🏆 TITANS PRIDE CUP — AVANCE AUTOMÁTICO DE RONDA
            // ========================================================
            const partidosPride = fixture.enfrentamientos;

            const buscarPartidoPride = numero =>
              partidosPride.find(
                p => Number(p.numero) === Number(numero)
              );

            const crearSiguienteRonda = (
              numero,
              jornada,
              equipo1,
              equipo2
            ) => {
              const existente = buscarPartidoPride(numero);

              if (existente) {
                return false;
              }

              partidosPride.push({
                numero,
                jornada,
                fecha: null,
                hora: null,
                equipo1,
                equipo2,
                estado: "pendiente",
                ganador: null
              });

              return true;
            };

            // Cuartos #1 + #2 → Semifinal #5
            const q1 = buscarPartidoPride(1);
            const q2 = buscarPartidoPride(2);

            if (
              q1 &&
              q2 &&
              q1.estado === "finalizado" &&
              q2.estado === "finalizado" &&
              q1.ganador &&
              q2.ganador
            ) {
              crearSiguienteRonda(
                5,
                "Semifinal",
                q1.ganador,
                q2.ganador
              );
            }

            // Cuartos #3 + #4 → Semifinal #6
            const q3 = buscarPartidoPride(3);
            const q4 = buscarPartidoPride(4);

            if (
              q3 &&
              q4 &&
              q3.estado === "finalizado" &&
              q4.estado === "finalizado" &&
              q3.ganador &&
              q4.ganador
            ) {
              crearSiguienteRonda(
                6,
                "Semifinal",
                q3.ganador,
                q4.ganador
              );
            }

            // Semifinal #5 + #6 → Final #7
            const sf5 = buscarPartidoPride(5);
            const sf6 = buscarPartidoPride(6);

            if (
              sf5 &&
              sf6 &&
              sf5.estado === "finalizado" &&
              sf6.estado === "finalizado" &&
              sf5.ganador &&
              sf6.ganador
            ) {
              crearSiguienteRonda(
                7,
                "Final",
                sf5.ganador,
                sf6.ganador
              );
            }

            guardarFixture(fixture);

            return;
          }

        // ======================================
        // 📢 RESULTADO OFICIAL PREMIUM ESPORTS
        // ======================================

        await sock.sendMessage(from, {
          text:
`╔══════════════════════════════╗
║      🏆 𝗦𝗘𝗥𝗜𝗘 𝗙𝗜𝗡𝗔𝗟 🏆      ║
╚══════════════════════════════╝

⚔️ 𝗥𝗘𝗦𝗨𝗟𝗧𝗔𝗗𝗢 𝗢𝗙𝗜𝗖𝗜𝗔𝗟

🔵 ${match.equipoA} ┃ ${match.scoreA}
🟣 ${match.equipoB} ┃ ${match.scoreB}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👑 𝗚𝗔𝗡𝗔𝗗𝗢𝗥
🏆 ${campeon}

🎮 Formato: BO3
📊 Estado: FINALIZADO

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
⚔️ Competimos para jugar, jugamos para ser leyendas.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        });

        // ======================================
        // 📈 ACTUALIZAR ESTADÍSTICAS
        // ======================================

        const stats = leerJSON("stats.json") || {};

        if (!stats[match.equipoA]) {
          stats[match.equipoA] = { ganadas: 0, perdidas: 0 };
        }

        if (!stats[match.equipoB]) {
          stats[match.equipoB] = { ganadas: 0, perdidas: 0 };
        }

        if (campeon === match.equipoA) {
          stats[match.equipoA].ganadas++;
          stats[match.equipoB].perdidas++;
        } else {
          stats[match.equipoB].ganadas++;
          stats[match.equipoA].perdidas++;
        }

        guardarJSON("stats.json", stats);

        // ======================================
        // ⚔️ BRACKET AUTOMÁTICO
        // ======================================
        // 🏆 TITANS PRIDE CUP: este flujo usa fixture.json.
        // El bracket antiguo no debe ejecutarse en partidos oficiales.
        if (!esFixtureOficial) {

        let bracket = leerJSON("bracket.json") || {};

        if (Array.isArray(bracket.octavos)) {

          // Buscar enfrentamiento en OCTAVOS
          const idxOctavos = bracket.octavos.findIndex(m => {
            const a = normalizar(m.a);
            const b = normalizar(m.b);
            const x = normalizar(match.equipoA);
            const y = normalizar(match.equipoB);

            return (
              (a === x && b === y) ||
              (a === y && b === x)
            );
          });

          // Guardar ganador en OCTAVOS
          if (idxOctavos !== -1) {
            bracket.octavos[idxOctavos].ganador = campeon;
          }

          // ======================================
          // 🧩 REGENERAR CUARTOS EN TIEMPO REAL
          // ======================================

          bracket = generarBracket(bracket);

          // Guardar cambios
          guardarJSON("bracket.json", bracket);

          // Obtener cruces actualizados
          const q1a = bracket.cuartos[0].a;
          const q1b = bracket.cuartos[0].b;
          const q2a = bracket.cuartos[1].a;
          const q2b = bracket.cuartos[1].b;

          // ======================================
          // 📢 ANUNCIO PREMIUM DE CUARTOS
          // ======================================

          await sock.sendMessage(from, {
            text:
`╔══════════════════════════════╗
║   ⚔️ 𝗕𝗥𝗔𝗖𝗞𝗘𝗧 𝗔𝗖𝗧𝗨𝗔𝗟𝗜𝗭𝗔𝗗𝗢 ⚔️   ║
╚══════════════════════════════╝

🏆 ${campeon} AVANZA AUTOMÁTICAMENTE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 𝗖𝗨𝗔𝗥𝗧𝗢𝗦 𝗗𝗘 𝗙𝗜𝗡𝗔𝗟
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

① 🔵 ${q1a}
   🆚
   🟣 ${q1b}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

② 🔵 ${q2a}
   🆚
   🟣 ${q2b}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯 • 𝗣𝗹𝗮𝘆𝗼𝗳𝗳𝘀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
          });
        }

        }
        
        // ======================================
        // 🧹 CERRAR SERIE
        // ======================================

        delete live[from];
        guardarJSON("liveMatches.json", live);

        return;
      }

      // ======================================
      // 🔴 MARCADOR EN VIVO PREMIUM ESPORTS
      // ======================================

      live[from] = match;
      guardarJSON("liveMatches.json", live);

      await sock.sendMessage(from, {
        text:
`╔══════════════════════════════╗
║        🔴 𝗘𝗡 𝗩𝗜𝗩𝗢 🔴        ║
╚══════════════════════════════╝

📊 𝗠𝗔𝗥𝗖𝗔𝗗𝗢𝗥 𝗢𝗙𝗜𝗖𝗜𝗔𝗟

🔵 ${match.equipoA} ┃ ${match.scoreA}
🟣 ${match.equipoB} ┃ ${match.scoreB}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎮 Serie BO3 en curso
⚔️ Playoffs oficiales

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 𝗟𝗜𝗚𝗔 𝗧𝗜𝗧𝗔𝗡𝗦 𝗧𝗘𝗔𝗠
🔴 Cobertura en tiempo real
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      });

    } catch (error) {

      console.error("❌ Error game:", error);
    monitor.registrarEvento("ERROR_SISTEMA",{estado:"ERROR",componente:"GAME",codigo:"SYSTEM_ERROR",descripcion:error.message});

      // ======================================
      // ❌ ERROR PREMIUM
      // ======================================

      await sock.sendMessage(from, {
        text:
`╔══════════════════════════════╗
║       ❌ 𝗘𝗥𝗥𝗢𝗥 ❌        ║
╚══════════════════════════════╝

Ocurrió un problema al actualizar la serie.

🔧 Revisa la consola del bot para más detalles.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 𝗧𝗶𝘁𝗮𝗻𝘀𝗕𝗼𝘁 𝘃𝟯`
      });
    }
  }
};
