function generarConfirmacion(plan, torneoActual = {}) {
    if (!plan || plan.accion !== "crear_torneo") {
        return {
            valido: false,
            texto: "No hay un plan de torneo válido para confirmar."
        };
    }

    const cambios = plan.cambios || {};
    const pendientes = Array.isArray(plan.pendientes)
        ? plan.pendientes
        : [];

    const nombre =
        cambios.nombre ||
        torneoActual.nombre ||
        "Sin nombre";

    const premio =
        cambios.premio ||
        torneoActual.premio ||
        "Sin premio definido";

    const fecha =
        cambios.proximaFecha ||
        torneoActual.proximaFecha ||
        "Sin fecha definida";

    const hora =
        cambios.horaInicio ||
        torneoActual.horaInicio ||
        "Sin hora definida";

    const maxEquipos =
        cambios.maxEquipos ??
        torneoActual.maxEquipos ??
        "Sin límite definido";

    const formato =
        cambios.formato ||
        torneoActual.formato ||
        "Sin formato definido";

    const seriePendiente = pendientes.find(
        pendiente =>
            pendiente &&
            pendiente.campo === "serie"
    );

    const serie = seriePendiente
        ? seriePendiente.valor
        : "No especificada";

    const lineas = [
        "🏆 PROPUESTA DE TORNEO",
        "",
        `📌 Nombre: ${nombre}`,
        `💎 Premio: ${premio}`,
        `📅 Fecha: ${fecha}`,
        `⏰ Hora: ${hora}`,
        `👥 Equipos: ${maxEquipos}`,
        `🎮 Formato: ${formato}`,
        `⚔️ Serie: ${serie}`
    ];

    if (Array.isArray(plan.advertencias)) {
        for (const advertencia of plan.advertencias) {
            if (advertencia) {
                lineas.push(`⚠️ ${advertencia}`);
            }
        }
    }

    lineas.push("");
    lineas.push("✅ ¿Confirmas esta configuración?");

    return {
        valido: true,
        texto: lineas.join("\n")
    };
}

module.exports = {
    generarConfirmacion
};
