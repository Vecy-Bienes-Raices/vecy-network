import * as dotenv from "dotenv";
dotenv.config();

import { fetchLatestBaileysVersion, useMultiFileAuthState, Browsers } from "@whiskeysockets/baileys";
import _baileys from "@whiskeysockets/baileys";
import path from "path";
import fs from "fs";

function getWASocket(): any {
  if (typeof _baileys === 'function') return _baileys;
  if ((_baileys as any)?.default && typeof (_baileys as any).default === 'function') return (_baileys as any).default;
  if ((_baileys as any)?.makeWASocket && typeof (_baileys as any).makeWASocket === 'function') return (_baileys as any).makeWASocket;
  return _baileys;
}

import pino from 'pino';

async function requestPairing() {
  const sessionDir = path.join(process.cwd(), ".baileys_auth_worker2");
  if (fs.existsSync(sessionDir)) {
    console.log("Limpiando carpeta de sesión anterior para refrescar claves de vincular...");
    fs.rmSync(sessionDir, { recursive: true, force: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();
  console.log("Usando versión actualizada de Baileys WA Web:", version);

  const makeWASocket = getWASocket();
  const sock = makeWASocket({
    auth: state,
    version,
    logger: pino({ level: 'silent' }) as any,
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update: any) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      console.log("\n✅ ¡VINCULACIÓN EXITOSA CON CÓDIGO! BOT CONECTADO CORRECTAMENTE.");
      process.exit(0);
    }
    if (connection === 'close') {
      console.log("Conexión cerrada en vincular:", lastDisconnect?.error);
    }
  });

  // Esperar 3 segundos para inicializar socket antes de pedir el código
  setTimeout(async () => {
    if (!sock.authState.creds.registered) {
      try {
        const phone = "573192919978";
        console.log(`Solicitando Código de Vinculación de 8 dígitos para +${phone}...`);
        const code = await sock.requestPairingCode(phone);
        console.log("\n=======================================================");
        console.log(`🔑 CÓDIGO DE VINCULACIÓN DE 8 DÍGITOS:  ${code}`);
        console.log("=======================================================\n");
      } catch (err: any) {
        console.error("Error pidiendo código de vinculación:", err.message || err);
      }
    } else {
      console.log("El bot ya se encuentra registrado/vinculado.");
    }
  }, 4000);
}

requestPairing();
