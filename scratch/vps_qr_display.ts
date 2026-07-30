import * as dotenv from "dotenv";
dotenv.config();

import { janiaCaptadorBot } from "../server/_core/whatsapp-match";

console.log("=== INICIANDO CAPTADOR OFICIAL DE BAILEYS PARA CÓDIGO QR ===");
console.log("Número objetivo: +573192919978");

janiaCaptadorBot.initialize();
