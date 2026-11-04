const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = process.cwd();
const dataRoot = "/var/data";

if (!fs.existsSync(dataRoot)) {
  throw new Error("No se encuentra el disco persistente /var/data");
}

const dbDir = path.join(dataRoot, "database");
const sessionsDir = path.join(dataRoot, "sessions");

fs.mkdirSync(dbDir, { recursive: true });
fs.mkdirSync(sessionsDir, { recursive: true });

const seedB64 = "/etc/secrets/database-seed.tar.gz.b64";
const seedTar = path.join(dataRoot, "database-seed.tar.gz");

if (!fs.existsSync(seedB64)) {
  throw new Error("Falta el secreto database-seed.tar.gz.b64");
}

if (fs.readdirSync(dbDir).length === 0) {
  const encoded = fs.readFileSync(seedB64, "utf8").replace(/\s/g, "");

  if (!encoded || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
    throw new Error("El archivo Base64 no es válido");
  }

  const archive = Buffer.from(encoded, "base64");
  if (archive.length < 100) {
    throw new Error("El archivo de base de datos está incompleto");
  }

  fs.writeFileSync(seedTar, archive);
  execFileSync("tar", ["-xzf", seedTar, "-C", dbDir]);
}

const adminSecret = "/etc/secrets/superadmins.js";

if (!fs.existsSync(adminSecret)) {
  throw new Error("Falta el archivo secreto superadmins.js");
}

fs.copyFileSync(adminSecret, path.join(root, "config", "superadmins.js"));

for (const [name, target] of [
  ["database", dbDir],
  ["sessions", sessionsDir]
]) {
  const link = path.join(root, name);

  try {
    const stat = fs.lstatSync(link);

    if (stat.isSymbolicLink() && fs.readlinkSync(link) === target) {
      continue;
    }

    throw new Error("Existe " + name + " y no se reemplazará automáticamente");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  fs.symlinkSync(target, link, "dir");
}

console.log("Almacenamiento persistente preparado correctamente.");
