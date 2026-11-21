const crypto = require("crypto");

const COOLDOWN = 24 * 60 * 60 * 1000;
const VENTANA_RACHA = 26 * 60 * 60 * 1000;

function crearServicioDaily(dependencias) {
    const { gestor, resolverClaveUsuario } = dependencias;

    if (
        !gestor ||
        typeof gestor.ejecutar !== "function" ||
        typeof resolverClaveUsuario !== "function"
    ) {
        throw new Error("Dependencias del servicio daily inválidas.");
    }

    function calcularXP(usuario, cantidad) {
        usuario.xp = Math.max(0, Number(usuario.xp) || 0);
        usuario.nivel = Math.max(1, Math.floor(Number(usuario.nivel) || 1));
        usuario.coins = Math.max(0, Number(usuario.coins) || 0);

        usuario.xp += cantidad;

        let nivelesGanados = 0;

        while (usuario.xp >= usuario.nivel * 100) {
            usuario.xp -= usuario.nivel * 100;
            usuario.nivel++;
            usuario.coins += 50;
            nivelesGanados++;
        }

        return {
            xpOtorgada: cantidad,
            nivelesGanados,
            monedasNivel: nivelesGanados * 50
        };
    }

    async function reclamar(identidad, ahora = Date.now()) {
        if (
            typeof identidad !== "string" ||
            !identidad.trim() ||
            !Number.isSafeInteger(ahora) ||
            ahora < 0
        ) {
            throw new Error("Identidad o fecha de reclamo inválida.");
        }

        const hashIdentidad = crypto
            .createHash("sha256")
            .update(identidad.trim())
            .digest("hex")
            .slice(0, 40);

        const periodo = Math.floor(ahora / COOLDOWN);
        const idOperacion = `daily-${hashIdentidad}-${periodo}`;

        try {
            const transaccion = await gestor.ejecutar(
                idOperacion,
                async leer => {
                    const usuarios = leer("usuarios.json") || {};
                    const clave = resolverClaveUsuario(
                        identidad.trim(),
                        usuarios
                    );

                    if (!clave) {
                        throw new Error(
                            "No se pudo resolver el perfil del jugador."
                        );
                    }

                    const usuario = usuarios[clave] || {
                        xp: 0,
                        nivel: 1,
                        coins: 0,
                        mensajes: 0,
                        daily: 0,
                        racha: 0,
                        nombre: ""
                    };

                    const ultimoDaily = Math.max(
                        0,
                        Number(usuario.daily) || 0
                    );

                    const restante = COOLDOWN - (ahora - ultimoDaily);

                    if (ultimoDaily && restante > 0) {
                        const error = new Error("DAILY_COOLDOWN");
                        error.restante = restante;
                        error.racha = Math.max(
                            0,
                            Number(usuario.racha) || 0
                        );
                        throw error;
                    }

                    usuario.racha =
                        ultimoDaily && ahora - ultimoDaily <= VENTANA_RACHA
                            ? Math.max(0, Number(usuario.racha) || 0) + 1
                            : 1;

                    const bonusRacha =
                        usuario.racha >= 14 ? 75 :
                        usuario.racha >= 7 ? 50 :
                        usuario.racha >= 4 ? 25 : 0;

                    const recompensaCoins = 300 + bonusRacha;
                    const recompensaXP = 25;

                    const resultadoXP = calcularXP(
                        usuario,
                        recompensaXP
                    );

                    usuario.coins += recompensaCoins;
                    usuario.daily = ahora;
                    usuarios[clave] = usuario;

                    return {
                        cambios: {
                            "usuarios.json": usuarios
                        },
                        resultado: {
                            identidad: clave,
                            recompensaCoins,
                            recompensaXP,
                            racha: usuario.racha,
                            nivelesGanados: resultadoXP.nivelesGanados,
                            monedasNivel: resultadoXP.monedasNivel,
                            coinsFinales: usuario.coins,
                            nivelFinal: usuario.nivel,
                            xpFinal: usuario.xp,
                            daily: ahora
                        }
                    };
                }
            );

            if (transaccion.duplicada) {
                const ultimoDaily = Number(transaccion.resultado?.daily) || 0;
                const restante = COOLDOWN - (ahora - ultimoDaily);

                if (ultimoDaily && restante > 0) {
                    return {
                        ok: false,
                        motivo: "cooldown",
                        restante,
                        racha: transaccion.resultado.racha
                    };
                }

                throw new Error(
                    "La transacción daily está duplicada fuera de su periodo válido."
                );
            }

            return {
                ok: true,
                duplicada: false,
                resultado: transaccion.resultado
            };
        } catch (error) {
            if (error.message === "DAILY_COOLDOWN") {
                return {
                    ok: false,
                    motivo: "cooldown",
                    restante: error.restante,
                    racha: error.racha
                };
            }

            throw error;
        }
    }

    return { reclamar };
}

module.exports = { crearServicioDaily };
