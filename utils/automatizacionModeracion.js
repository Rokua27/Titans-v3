const { leerJSON } = require("./database");

function obtenerConfiguracion() {

    return leerJSON("configModeracion.json") || {

        warnMute: 3,

        warnKick: 5,

        warnBan: 7

    };

}

function obtenerAccion(warns) {

    const config = obtenerConfiguracion();

    if (warns >= config.warnBan)
        return "ban";

    if (warns >= config.warnKick)
        return "kick";

    if (warns >= config.warnMute)
        return "mute";

    return null;

}

module.exports = {

    obtenerConfiguracion,

    obtenerAccion

};
