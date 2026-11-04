const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { leerJSON } = require("./database");

async function generarTabla() {

    const tabla = leerJSON("tabla.json") || {
        equipos: []
    };

    const equipos = [...tabla.equipos]
        .sort((a, b) => {

            if (b.puntos !== a.puntos)
                return b.puntos - a.puntos;

            return b.victorias - a.victorias;

        })
        .slice(0, 10);

    const filas = equipos.map((e, i) => `
<tr>
<td>${i + 1}</td>
<td>${e.nombre}</td>
<td>${e.pj}</td>
<td>${e.victorias}</td>
<td>${e.derrotas}</td>
<td>${e.puntos}</td>
</tr>
`).join("");

    const html = `
<html>
<body style="
width:1080px;
height:1350px;
margin:0;
background:#0b1020;
color:white;
font-family:Arial;
">

<div style="padding:60px">

<h1 style="
color:#00d9ff;
text-align:center;
font-size:56px;
">
LIGA TITANS TEAM
</h1>

<p style="
text-align:center;
color:#9aa4c7;
font-size:24px;
">
Tabla Oficial
</p>

<table style="
width:100%;
border-collapse:collapse;
margin-top:40px;
font-size:26px;
">

<tr style="
background:#111a33;
color:#00d9ff;
height:60px;
">

<th>#</th>
<th>Equipo</th>
<th>PJ</th>
<th>PG</th>
<th>PP</th>
<th>PTS</th>

</tr>

${filas}

</table>

<div style="
position:absolute;
bottom:40px;
left:0;
right:0;
text-align:center;
color:#7f8bb3;
font-size:22px;
">

Competimos para jugar • Jugamos para ser leyendas

</div>

</div>

</body>
</html>
`;

    const response = await axios.post(
        "https://hcti.io/v1/image",
        { html },
        {
            auth: {
                username: "demo",
                password: "demo"
            },
            responseType: "arraybuffer",
            timeout: 20000
        }
    );

    const output = path.join(
        __dirname,
        "../media/tabla-dinamica.png"
    );

    fs.writeFileSync(output, response.data);

    return output;

}

module.exports = generarTabla;
