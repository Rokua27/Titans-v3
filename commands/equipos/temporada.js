const { cargarTemporada } = require("../../utils/temporadas");
const { equipo } = require("../../utils/embeds");

module.exports = {

    nombre: "temporada",

categoria: "equipo",

descripcion: "Consulta la temporada de equipos.",

uso: "!temporada",

permisos: ["usuario"],

alias: [],

    async ejecutar(sock, from) {

        const datos = cargarTemporada();

        await sock.sendMessage(from,{
            text:equipo(
                "TEMPORADA ACTUAL",
`🏆 Temporada
${datos.temporadaActual}

📌 Estado
${datos.estado}

👥 Equipos inscritos
${Object.keys(datos.equipos).length}`
            )
        });

    }

};
