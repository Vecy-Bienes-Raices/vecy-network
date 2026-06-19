import "dotenv/config";
import fs from 'fs';
import path from 'path';
import { publishToFacebookGroup } from './facebookService';

async function triggerImmediatePublish() {
    console.log("🚀 [TEST-FACEBOOK] Iniciando disparo forzado de publicación...");

    const testContent =
        `🎯 ¡SISTEMA OPERATIVO VECY NETWORK ACTIVO! 🎯\n\n` +
        `JanIA v2.5 ejecutando la automatización multicanal con éxito. Inteligencia Artificial PropTech para el norte de Bogotá.\n\n` +
        `💼 ¿Eres bróker, asesor o inversionista?\n` +
        `👉 Únete a la red: https://chat.whatsapp.com/K36KrHeB9nMEKJ56s8XFcM`;

    const videoPath = './client/public/vecy_inmuebles_network.mp4';
    const resolvedPath = path.resolve(videoPath);

    if (!fs.existsSync(resolvedPath)) {
        console.error(`❌ [Error] El video institucional no se encuentra en la ruta: ${resolvedPath}`);
        return;
    }

    console.log("📦 Leyendo buffer de video binario...");
    const videoBuffer = fs.readFileSync(resolvedPath);

    console.log("🌐 Invocando a Puppeteer para interactuar con Meta...");
    const success = await publishToFacebookGroup(testContent, videoBuffer);

    if (success) {
        console.log("\n✅ ¡ÉXITO ROTUNDO! Entra ya mismo a tu grupo de Facebook, el video ya debe estar arriba.");
    } else {
        console.log("\n❌ [Fallo] No se pudo publicar. Si ya aplicaste la v11.75, revisa el archivo 'error_facebook.png' en la raíz de tu proyecto para ver la captura exacta de qué lo bloqueó.");
    }
}

triggerImmediatePublish();