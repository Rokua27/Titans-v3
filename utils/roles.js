const permisos = require("./permisos");
const {
    esFundador,
    esAdmin: esAdminGlobal,
    esSuperMod,
    esModerador,
    esAyudante,
    esJusticia
} = require("./moderacion");

const { obtenerEquipoUsuario } = require("./equipos");

/**
 * Normaliza IDs de WhatsApp.
 *
 * Conservamos el @lid como identificador principal porque
 * moderadores.json y el sistema actual utilizan @lid.
 */
function normalizarID(id) {
    if (!id || typeof id !== "string") return id;

    return id
        .replace("@s.whatsapp.net", "@lid")
        .replace("@g.us", "");
}

/**
 * Obtiene el rol real del usuario.
 *
 * Prioridad:
 *
 * 1. SuperAdmin
 * 2. Admin de WhatsApp
 * 3. Líder
 * 4. Sublíder
 * 5. Miembro
 * 6. Fundador
 * 7. Administrador Global
 * 8. Super Moderador
 * 9. Moderador
 * 10. Ayudante
 * 11. Usuario
 *
 * Los rangos de staff se consultan desde moderadores.json.
 */
async function obtenerRol(sock, from, sender) {

    const senderNormalizado = normalizarID(sender);

    console.log("🔍 Sender recibido:", sender);
    console.log("🔍 Sender normalizado:", senderNormalizado);

    // ==========================================
    // 👑 SUPER ADMIN
    // ==========================================

    if (
        permisos.esSuperAdmin(sender) ||
        permisos.esSuperAdmin(senderNormalizado)
    ) {
        return {
            nombre: "superadmin",
            titulo: "⚙️ Super Admin"
        };
    }


    // ==========================================
    // 🏆 RANGOS DEL SISTEMA DE MODERACIÓN
    // ==========================================

    if (
        esFundador(sender) ||
        esFundador(senderNormalizado)
    ) {
        return {
            nombre: "fundador",
            titulo: "👑 Fundador"
        };
    }

    if (
        esAdminGlobal(sender) ||
        esAdminGlobal(senderNormalizado)
    ) {
        return {
            nombre: "adminglobal",
            titulo: "🛡️ Administrador Global"
        };
    }

    if (
        esSuperMod(sender) ||
        esSuperMod(senderNormalizado)
    ) {
        return {
            nombre: "supermoderador",
            titulo: "⚔️ Super Moderador"
        };
    }

    if (
        esModerador(sender) ||
        esModerador(senderNormalizado)
    ) {
        return {
            nombre: "moderador",
            titulo: "🛡️ Moderador"
        };
    }

    if (
        esAyudante(sender) ||
        esAyudante(senderNormalizado)
    ) {
        return {
            nombre: "ayudante",
            titulo: "🎖️ Ayudante"
        };
    }

    // ==========================================
    // ⚖️ SISTEMA DE JUSTICIA
    // ==========================================

    if (
        esJusticia(sender) ||
        esJusticia(senderNormalizado)
    ) {
        return {
            nombre: "justicia",
            titulo: "⚖️ Juez de Justicia"
        };
    }

    // ==========================================
    // 🛡️ ADMINISTRADOR NATIVO DE WHATSAPP
    // ==========================================

    if (from && from.endsWith("@g.us")) {

        try {

            const metadata = await sock.groupMetadata(from);

            const participante = metadata.participants.find(
                p =>
                    p.id === sender ||
                    p.id === senderNormalizado ||
                    normalizarID(p.id) === senderNormalizado
            );

            if (participante && participante.admin) {

                return {
                    nombre: "admin",
                    titulo: "🛠️ Administrador"
                };

            }

        } catch (error) {

            console.log(
                "⚠️ No se pudo consultar el administrador de WhatsApp:",
                error.message
            );

        }

    }

    // ==========================================
    // 👑 SISTEMA DE EQUIPOS
    // ==========================================

    const equipo = obtenerEquipoUsuario(senderNormalizado);

    if (equipo) {

        console.log("👑 Equipo encontrado:", equipo.nombre);
        console.log("👑 Líder guardado:", equipo.lider);

        if (
            permisos.esLider(
                equipo,
                senderNormalizado
            )
        ) {

            return {
                nombre: "lider",
                titulo: "👑 Líder"
            };

        }

        if (
            permisos.esSubLider(
                equipo,
                senderNormalizado
            )
        ) {

            return {
                nombre: "sublider",
                titulo: "⭐ Sublíder"
            };

        }

        if (
            permisos.esMiembro(
                equipo,
                senderNormalizado
            )
        ) {

            return {
                nombre: "miembro",
                titulo: "👤 Miembro"
            };

        }

    }

    // ==========================================
    // 🙋 USUARIO NORMAL
    // ==========================================

    return {
        nombre: "usuario",
        titulo: "🙋 Usuario"
    };
}

module.exports = {
    obtenerRol
};
