module.exports = {

    nombre: "ping",

    alias: ["pong"],

    categoria: "jugador",

    descripcion: "Comprueba que TitansBot v3 está funcionando correctamente.",

permisos: ["usuario"],

    uso: "!ping",

    async ejecutar(sock, from) {

        try {

            await sock.sendMessage(from, {

                text: "🏓 Pong!\n\n✅ TitansBot v3 está activo."

            });

            console.log("✅ Respuesta enviada correctamente");

        } catch (error) {

            console.error("❌ Error enviando respuesta:", error);

        }

    }

};
