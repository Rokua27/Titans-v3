const { crearEquipo, obtenerEquipoUsuario } = require("../../utils/equipos");
const { equipo, error } = require("../../utils/embeds");
const { obtenerRol } = require("../../utils/roles");
const { tienePermiso } = require("../../utils/permisos");
const { obtenerNombreUsuario } = require("../../utils/comunidad");
const { obtenerUsuario, guardarUsuario } = require("../../utils/comunidad");
const monitor = require("../../utils/monitor");

module.exports = {
  nombre: "crearequipo",

  async ejecutar(sock, from, args, msg) {
    try {
      const sender = msg.key.participant || msg.key.remoteJid;

const rol = await obtenerRol(sock, from, sender);

if (!tienePermiso(rol.nombre, ["admin"])) {

    return await sock.sendMessage(from, {
        text: error(
            "Permisos",
            "Solo los administradores pueden crear equipos oficiales."
        )
    });

}

      if (!args.length) {
        return sock.sendMessage(from, {
          text: error(
            "Crear Equipo",
            "Uso:\n!crearequipo Nombre del Equipo | TAG"
          )
        });
      }

      const texto = args.join(" ");
      const partes = texto.split("|");

      if (partes.length !== 2) {
        return sock.sendMessage(from, {
          text: error(
            "Formato inválido",
            "Ejemplo:\n!crearequipo Titans Wolves | TW"
          )
        });
      }

      const nombre = partes[0].trim();
      const tag = partes[1].trim().toUpperCase();

      if (obtenerEquipoUsuario(sender)) {
        return sock.sendMessage(from, {
          text: error(
            "Operación cancelada",
            "Ya perteneces a un equipo."
          )
        });
      }

const usuario = obtenerUsuario(sender);

if (!usuario) {
    return sock.sendMessage(from, {
        text: error(
            "Perfil",
            "No se encontró tu perfil."
        )
    });
}

       if (usuario.nivel < CONFIG.NIVEL_MINIMO) {
        return sock.sendMessage(from, {
          text: error(
            "Nivel insuficiente",
            `Necesitas nivel ${CONFIG.NIVEL_MINIMO}.`
          )
        });
      }

       if (usuario.monedas < CONFIG.COSTO_CREAR) {
        return sock.sendMessage(from, {
          text: error(
            "Fondos insuficientes",
            `Necesitas ${CONFIG.COSTO_CREAR} monedas.`
          )
        });
      }

usuario.monedas -= CONFIG.COSTO_CREAR;
await guardarUsuario(sender, usuario);

      const resultado = crearEquipo({
        nombre,
        tag,
        lider: sender
      });

      if (!resultado.ok) {
        return sock.sendMessage(from, {
          text: error("Equipo", resultado.mensaje)
        });
      }

      await sock.sendMessage(from, {
        text: equipo(
          "Equipo Creado",
`🛡️ Equipo
${nombre}

🏷️ Tag
${tag}

👑 Líder
${obtenerNombreUsuario(sender)}

👥 Miembros
1 / 10

⭐ Nivel
1

🏅 Liga
Bronce

💰 Fondos
0

🎉 ¡Bienvenido a la Liga Titans!`
        )
      });

    } catch (e) {
      console.error(e);
      monitor.registrarEvento("ERROR_SISTEMA", {
        estado: "ERROR",
        componente: "CREAREQUIPO",
        codigo: "SYSTEM_ERROR",
        descripcion: e.message
      });

      sock.sendMessage(from, {
        text: error(
          "Sistema",
          "Ocurrió un error al crear el equipo."
        )
      });
    }
  }
};
