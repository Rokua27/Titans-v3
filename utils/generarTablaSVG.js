const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { leerJSON } = require("./database");

async function generarTabla() {

    const tabla = leerJSON("tabla.json") || {
        equipos: []
    };

    const equipos = [...tabla.equipos]
        .sort((a, b) => {

            if (b.puntos !== a.puntos) {
                return b.puntos - a.puntos;
            }

            return b.victorias - a.victorias;

        })
        .slice(0, 10);

    let filas = "";

    equipos.forEach((e, i) => {

        const y = 220 + (i * 60);

        filas += `
<text x="60" y="${y}" fill="#00d9ff" font-size="24">${i + 1}</text>
<text x="120" y="${y}" fill="#ffffff" font-size="24">${e.nombre}</text>
<text x="720" y="${y}" fill="#ffffff" font-size="24">${e.pj}</text>
<text x="800" y="${y}" fill="#ffffff" font-size="24">${e.victorias}</text>
<text x="880" y="${y}" fill="#ffffff" font-size="24">${e.derrotas}</text>
<text x="960" y="${y}" fill="#00d9ff" font-size="24">${e.puntos}</text>
`;
    });

    const svg = `
<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg">

<rect width="1080" height="1350" fill="#0b1020"/>

<text
x="540"
y="100"
text-anchor="middle"
fill="#00d9ff"
font-size="48"
font-weight="bold">
LIGA TITANS TEAM
</text>

<text
x="540"
y="150"
text-anchor="middle"
fill="#9aa4c7"
font-size="24">
Tabla Oficial
</text>

<rect
x="40"
y="180"
width="1000"
height="50"
fill="#111a33"/>

<text x="60" y="212" fill="#00d9ff" font-size="24">#</text>
<text x="120" y="212" fill="#00d9ff" font-size="24">Equipo</text>
<text x="720" y="212" fill="#00d9ff" font-size="24">PJ</text>
<text x="800" y="212" fill="#00d9ff" font-size="24">PG</text>
<text x="880" y="212" fill="#00d9ff" font-size="24">PP</text>
<text x="960" y="212" fill="#00d9ff" font-size="24">PTS</text>

${filas}

</svg>
`;

    const mediaDir = path.join(__dirname, "../media");

    if (!fs.existsSync(mediaDir)) {
        fs.mkdirSync(mediaDir, {
            recursive: true
        });
    }

    const svgPath = path.join(mediaDir, "tabla.svg");
    const pngPath = path.join(mediaDir, "tabla.png");

    fs.writeFileSync(svgPath, svg);

    execSync(`convert "${svgPath}" "${pngPath}"`);

    return pngPath;

}

module.exports = generarTabla;
