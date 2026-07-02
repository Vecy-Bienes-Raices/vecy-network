import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { whatsappBot, textToSpeechMedia } from "./whatsapp";
import { initCronScheduler } from "./cronService";
import { processWhatsAppMessage } from "./janIA";
import { handleIncomingWebhook } from "./whatsapp-cloud";
import multer from "multer";
import fs from "fs";
import path from "path";
import { transcribeAudioBuffer } from "./voiceTranscription";
import { invokeLLM } from "./llm";

process.on("uncaughtException", (error) => {
  console.error("[SYSTEM-CRITICAL] Uncaught Exception detectada:", error);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("[SYSTEM-CRITICAL] Unhandled Rejection detectada en:", promise, "razón:", reason);
});

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Webhook handler compartido (Meta espera recibir en la URL exacta configurada)
  const webhookGetHandler = (req: any, res: any) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
      console.log("[WEBHOOK] Webhook verified successfully.");
      return res.status(200).send(challenge);
    } else {
      console.warn("[WEBHOOK] Webhook verification failed.");
      return res.sendStatus(403);
    }
  };

  const webhookPostHandler = async (req: any, res: any) => {
    try {
      res.status(200).send("EVENT_RECEIVED");
      handleIncomingWebhook(req.body).catch((err: any) => {
        console.error("[WEBHOOK-ERROR] Error handling incoming webhook:", err);
      });
    } catch (err: any) {
      console.error("[WEBHOOK-ERROR] Exception in webhook endpoint:", err);
    }
  };

  // Rutas del webhook — ambas apuntan al mismo handler para cubrir cualquier URL configurada en Meta
  app.get("/webhook", webhookGetHandler);
  app.post("/webhook", webhookPostHandler);
  app.get("/api/whatsapp/webhook", webhookGetHandler);
  app.post("/api/whatsapp/webhook", webhookPostHandler);

  app.get("/api/list-chats", async (req, res) => {
    try {
      if (!whatsappBot.isReady) {
        return res.status(503).send("El bot de WhatsApp no está listo todavía. Intenta en unos segundos.");
      }
      const client = (whatsappBot as any).client;
      if (!client) {
        return res.status(400).send("Client not available");
      }
      const chats = await client.getChats();
      const groups = chats
        .filter((c: any) => c.isGroup)
        .map((c: any) => ({ id: c.id._serialized, name: c.name, unreadCount: c.unreadCount }));
      res.json(groups);
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  app.get("/api/inspect-groups", async (req, res) => {
    try {
      if (!whatsappBot.isReady) {
        return res.status(503).send("El bot de WhatsApp no está listo todavía.");
      }
      const client = (whatsappBot as any).client;
      if (!client) {
        return res.status(400).send("Client not available");
      }
      const chats = await client.getChats();
      const list = [];
      for (const chat of chats) {
        if (chat.isGroup) {
          const groupChat = chat as any;
          list.push({
            id: groupChat.id._serialized,
            name: groupChat.name,
            isReadOnly: groupChat.isReadOnly,
            participantsCount: groupChat.participants ? groupChat.participants.length : 0
          });
        }
      }
      res.json(list);
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  app.get("/api/screenshot-chat", async (req, res) => {
    try {
      if (!whatsappBot.isReady) {
        return res.status(503).send("El bot de WhatsApp no está listo todavía. Intenta en unos segundos.");
      }
      const client = (whatsappBot as any).client;
      const targetGroupId = (whatsappBot as any).targetGroupId;

      if (!client || !client.pupPage) {
        return res.status(503).send("El navegador de WhatsApp aún no está listo. Intenta en unos segundos.");
      }

      const page = client.pupPage;

      // Intentar obtener el nombre dinámico del grupo por su ID para evitar hardcoding
      let chatTitle = "VECY INMUEBLES NETWORK";
      try {
        const chat = await client.getChatById(targetGroupId);
        if (chat && chat.name) chatTitle = chat.name;
      } catch (e) {}

      // Seleccionar el chat correcto forzando el ID (más estable que selectores CSS)
      await page.evaluate((id: any, title: any) => {
        // Intentar encontrar el elemento por el atributo de ID de WhatsApp Web
        const row = document.querySelector(`div[data-id*="${id}"]`) || 
                    Array.from(document.querySelectorAll('div')).find(el => el.getAttribute('data-id')?.includes(id));
        
        if (row) {
          (row as any).click();
        } else {
          // Fallback: Buscar por el título dinámico si el ID no está expuesto directamente
          const span = Array.from(document.querySelectorAll('span')).find(el => el.textContent === title);
          if (span) {
            const parent = span.closest('div[role="row"]') || span.closest('div[data-testid="cell-frame-container"]') || span.closest('div');
            if (parent) (parent as any).click();
          }
        }
      }, targetGroupId, chatTitle);

      // Esperar brevemente a que el chat se renderice
      await new Promise(resolve => setTimeout(resolve, 2500));
      const screenshot = await page.screenshot({ type: "png" });
      res.setHeader("Content-Type", "image/png");
      res.send(screenshot);
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  app.get("/api/match-qr-screenshot", async (req, res) => {
    try {
      const { janiaMatchBot } = await import("./whatsapp-match");
      if (!janiaMatchBot || !(janiaMatchBot as any).client) {
        return res.status(503).send("El bot de Match no está inicializado.");
      }
      const page = (janiaMatchBot as any).client.pupPage;
      if (!page) {
        return res.status(503).send("La página de Puppeteer del bot de Match no está lista.");
      }
      const screenshot = await page.screenshot({ type: "png" });
      res.setHeader("Content-Type", "image/png");
      res.send(screenshot);
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  app.get("/api/match-qr-refresh", async (req, res) => {
    try {
      const { janiaMatchBot } = await import("./whatsapp-match");
      if (!janiaMatchBot || !(janiaMatchBot as any).client) {
        return res.status(503).send("El bot de Match no está inicializado.");
      }
      const page = (janiaMatchBot as any).client.pupPage;
      if (!page) {
        return res.status(503).send("La página de Puppeteer del bot de Match no está lista.");
      }
      console.log("[ADMIN] Recargando página de WhatsApp Web...");
      await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
      // Esperar a que se renderice el nuevo QR
      await new Promise(resolve => setTimeout(resolve, 8000));
      const screenshot = await page.screenshot({ type: "png" });
      res.setHeader("Content-Type", "image/png");
      res.send(screenshot);
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  app.get("/api/match-pairing-code", async (req, res) => {
    try {
      const { phone } = req.query;
      if (!phone || typeof phone !== "string") {
        return res.status(400).send("Debe proporcionar un parámetro de teléfono válido. Ejemplo: ?phone=573166569719");
      }
      const { janiaMatchBot } = await import("./whatsapp-match");
      if (!janiaMatchBot) {
        return res.status(503).send("El bot de Match no está inicializado.");
      }
      const code = await janiaMatchBot.getPairingCode(phone);
      res.json({ ok: true, phone, code });
    } catch (err: any) {
      res.status(500).send(err.message || err);
    }
  });

  app.post("/api/send-whatsapp-notification", async (req, res) => {
    try {
      const { text, token } = req.body;
      const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN || "vecy_network_secret_token";
      
      if (token !== verifyToken) {
        return res.status(401).json({ error: "Unauthorized. Invalid token." });
      }

      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Falta el parámetro 'text' o no es válido." });
      }

      const { sendCloudMessage } = await import("./whatsapp-cloud");
      const targetPhone = "573166569719@c.us"; // Número por defecto del usuario
      
      console.log(`[NOTIFICACIÓN-API] Retransmitiendo mensaje a ${targetPhone} por WhatsApp Cloud API...`);
      await sendCloudMessage(targetPhone, text);
      
      res.json({ ok: true, message: "Notification sent successfully." });
    } catch (err: any) {
      console.error("[NOTIFICACIÓN-API] Error enviando mensaje:", err);
      res.status(500).json({ error: err.message || err });
    }
  });

  app.get("/api/match-click-cancel", async (req, res) => {
    try {
      const { janiaMatchBot } = await import("./whatsapp-match");
      if (!janiaMatchBot || !(janiaMatchBot as any).client) {
        return res.status(503).send("El bot de Match no está inicializado.");
      }
      const page = (janiaMatchBot as any).client.pupPage;
      if (!page) {
        return res.status(503).send("La página de Puppeteer del bot de Match no está lista.");
      }
      const result = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('a, button, span, div'));
        const cancelEl = elements.find(el => el.textContent?.trim().toLowerCase() === 'cancel');
        if (cancelEl) {
          (cancelEl as any).click();
          return "Clicked Cancel";
        }
        return "Cancel button not found";
      });
      console.log(`[ADMIN] Click Cancel result: ${result}`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      const screenshot = await page.screenshot({ type: "png" });
      res.setHeader("Content-Type", "image/png");
      res.send(screenshot);
    } catch (err: any) {
      res.status(500).send(err.message || err);
    }
  });

  app.get("/api/match-click-continue", async (req, res) => {
    try {
      const { janiaMatchBot } = await import("./whatsapp-match");
      if (!janiaMatchBot || !(janiaMatchBot as any).client) {
        return res.status(503).send("El bot de Match no está inicializado.");
      }
      const page = (janiaMatchBot as any).client.pupPage;
      if (!page) {
        return res.status(503).send("La página de Puppeteer del bot de Match no está lista.");
      }
      const result = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('a, button, span, div'));
        const continueEl = elements.find(el => el.textContent?.trim().toLowerCase().includes('continue'));
        if (continueEl) {
          (continueEl as any).click();
          return "Clicked Continue";
        }
        return "Continue button not found";
      });
      console.log(`[ADMIN] Click Continue result: ${result}`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      const screenshot = await page.screenshot({ type: "png" });
      res.setHeader("Content-Type", "image/png");
      res.send(screenshot);
    } catch (err: any) {
      res.status(500).send(err.message || err);
    }
  });

  app.get("/api/send-comeback", (req, res) => {
    try {
      if (!whatsappBot.isReady) {
        return res.status(503).send("El bot de WhatsApp no está listo todavía. Intenta en unos segundos.");
      }
      // Encolar el envío en segundo plano y responder inmediatamente para evitar timeouts y reintentos (doble mensaje)
      (whatsappBot as any).sendAnuncioRetorno().catch((err: any) => {
        console.error("Error al enviar anuncio de retorno:", err);
      });
      res.send("Anuncio de retorno encolado exitosamente.");
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  app.get("/api/send-closing-voice", (req, res) => {
    try {
      if (!whatsappBot.isReady) {
        return res.status(503).send("El bot de WhatsApp no está listo todavía. Intenta en unos segundos.");
      }
      whatsappBot.sendManualCierreAudios().catch((err: any) => {
        console.error("Error al enviar los audios de cierre manuales:", err);
      });
      res.send("Audios de cierre encolados exitosamente.");
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  app.get("/api/jania/tts", async (req, res) => {
    try {
      const text = req.query.text as string;
      if (!text) {
        return res.status(400).send("Falta el parámetro 'text'");
      }

      // Por defecto para la web pedimos MP3 para compatibilidad HTML5 universal
      const format = (req.query.format as string) === "ogg" ? "OGG_OPUS" : "MP3";
      const media = await textToSpeechMedia(text, format);
      if (!media) {
        return res.status(500).send("No se pudo generar el audio");
      }

      const buffer = Buffer.from(media.data, "base64");
      res.setHeader("Content-Type", media.mimetype);
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  // Configure multer memory storage for transcription uploads
  const upload = multer({
    limits: {
      fileSize: 16 * 1024 * 1024, // 16MB limit
    }
  });

  app.post("/api/janIA/transcribe", upload.single("audio"), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No se subió ningún archivo de audio" });
      }
      const buffer = req.file.buffer;
      const mimeType = req.file.mimetype || "audio/webm";
      console.log(`[TRANSCRIBE-ROUTE] Recibido archivo de audio de tipo: ${mimeType}, tamaño: ${buffer.length} bytes`);
      const text = await transcribeAudioBuffer(buffer, mimeType);
      res.json({ transcription: text });
    } catch (err: any) {
      console.error("[TRANSCRIBE-ROUTE] Error al transcribir:", err);
      res.status(500).json({ error: err.message || "Error al procesar la transcripción" });
    }
  });

  // Ensure uploads directory exists
  const uploadsDir = path.resolve(process.cwd(), "public/uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve the uploads statically
  app.use("/uploads", express.static(uploadsDir));

  // Configure multer storage for disk saving
  const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });

  const uploadDisk = multer({
    storage: diskStorage,
    limits: {
      fileSize: 50 * 1024 * 1024 // 50MB limit
    }
  });

  app.post("/api/janIA/upload", uploadDisk.single("file"), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No se subió ningún archivo" });
      }
      const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
      console.log(`[UPLOAD-ROUTE] Archivo guardado localmente en: ${req.file.path} ➔ URL: ${fileUrl}`);
      res.json({ fileUrl });
    } catch (err: any) {
      console.error("[UPLOAD-ROUTE] Error al guardar archivo:", err);
      res.status(500).json({ error: err.message || "Error al subir el archivo" });
    }
  });

  app.get("/api/find-active-group", async (req, res) => {
    try {
      if (!whatsappBot.isReady) {
        return res.status(503).send("El bot de WhatsApp no está listo todavía. Intenta en unos segundos.");
      }
      const client = (whatsappBot as any).client;
      if (!client) {
        return res.status(400).send("No client available");
      }
      const g1 = '120363259687769411@g.us';
      const g2 = '120363260445880355@g.us';
      const g3 = '120363260108880069@g.us';
      
      const results: any[] = [];
      for (const g of [g1, g2, g3]) {
        try {
          const chat = await client.getChatById(g);
          const msgs = await chat.fetchMessages({ limit: 5 });
          results.push({
            id: g,
            name: chat.name,
            messages: msgs.map((m: any) => ({
              fromMe: m.fromMe,
              author: m.author,
              body: m.body,
              timestamp: m.timestamp
            }))
          });
        } catch (err: any) {
          results.push({ id: g, error: err.message });
        }
      }
      res.json(results);
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  app.get("/api/check-ack", async (req, res) => {
    try {
      if (!whatsappBot.isReady) {
        return res.status(503).send("El bot de WhatsApp no está listo todavía. Intenta en unos segundos.");
      }
      const client = (whatsappBot as any).client;
      if (!client) {
        return res.status(400).send("No client available");
      }
      const targetGroupId = (whatsappBot as any).targetGroupId;
      const chat = await client.getChatById(targetGroupId);
      const msgs = await chat.fetchMessages({ limit: 5 });
      const simplified = msgs.map((m: any) => ({
        fromMe: m.fromMe,
        body: m.body.substring(0, 50),
        ack: m.ack,
        timestamp: m.timestamp
      }));
      res.json(simplified);
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  app.get("/api/inspect-recent-messages", async (req, res) => {
    try {
      if (!whatsappBot.isReady) {
        return res.status(503).send("El bot no está listo.");
      }
      const client = (whatsappBot as any).client;
      const targetGroupId = (whatsappBot as any).targetGroupId;
      const buzonGroupId = (whatsappBot as any).buzonGroupId;
      const circuloGroupId = (whatsappBot as any).circuloGroupId;

      const groups = [
        { name: "VECY INMUEBLES NETWORK", id: targetGroupId },
        { name: "VECY: SOPORTE LEGAL, CONTRATOS Y AVALÚOS", id: buzonGroupId },
        { name: "Círculo CERO", id: circuloGroupId }
      ];

      const results = [];
      for (const g of groups) {
        try {
          const chat = await client.getChatById(g.id);
          const limit = g.name.includes("NETWORK") ? 50 : 15;
          const msgs = await chat.fetchMessages({ limit });
          results.push({
            name: g.name,
            id: g.id,
            messages: msgs.map((m: any) => ({
              fromMe: m.fromMe,
              author: m.author || m.from,
              body: m.body,
              timestamp: m.timestamp,
              date: new Date(m.timestamp * 1000).toLocaleString('es-CO', { timeZone: 'America/Bogota' })
            }))
          });

        } catch (e: any) {
          results.push({ name: g.name, id: g.id, error: e.message });
        }
      }
      res.json(results);
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });  app.get("/api/trigger-nightly-rematch", async (req, res) => {
    try {
      const { runNightlyRematch } = await import("../jobs/nightlyRematch");
      console.log("[API-TRIGGER] Ejecutando cruce masivo manual desde endpoint...");
      await runNightlyRematch();
      res.send("Cruce masivo ejecutado con éxito.");
    } catch (err: any) {
      console.error("[API-TRIGGER] Error al ejecutar cruce manual:", err);
      res.status(500).send(err.message);
    }
  });

  app.get("/api/resend-today-matches", async (req, res) => {
    try {
      const { getDb } = await import("../db");
      const { propertyMatches, requirements, properties } = await import("../../drizzle/schema");
      const { eq, gte } = await import("drizzle-orm");
      const { handleDetectedMatches } = await import("./janIA");

      const db = await getDb();
      if (!db) return res.status(500).send("No DB connection");

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const matches = await db.select().from(propertyMatches).where(gte(propertyMatches.createdAt, today));
      console.log(`[API] Encontrados ${matches.length} matches creados hoy en la BD.`);

      const seen = new Set<string>();
      const uniqueMatches: typeof matches = [];
      for (const m of matches) {
        const key = `${m.requirementId}-${m.propertyId}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueMatches.push(m);
        }
      }

      console.log(`[API] Re-enviando ${uniqueMatches.length} matches únicos creados hoy...`);

      // Ejecutar en segundo plano para no bloquear el response HTTP
      (async () => {
        let count = 0;
        for (const match of uniqueMatches) {
          try {
            const [reqRec] = await db.select().from(requirements).where(eq(requirements.id, match.requirementId)).limit(1);
            const [propRec] = await db.select().from(properties).where(eq(properties.id, match.propertyId)).limit(1);

            if (reqRec && propRec) {
              const score = Number(match.matchScore);
              const matchedItem = {
                ...propRec,
                score: score,
                matchId: match.id,
                idUsuarioWhatsapp: propRec.idUsuarioWhatsapp
              };

              const matchDetails = await handleDetectedMatches(
                [matchedItem],
                false,
                reqRec,
                reqRec.idUsuarioWhatsapp || "",
                "Aliado VECY"
              );

              // Enviar al grupo (Omitido para no spamear ni saturar el grupo principal con alertas repetitivas)
              // if (matchDetails.response && whatsappBot.targetGroupId) {
              //   await whatsappBot.sendToGroup(matchDetails.response, undefined, matchDetails.mentions);
              // }

              // Enviar al admin
              if (matchDetails.extraDMs && matchDetails.extraDMs.length > 0) {
                for (const dm of matchDetails.extraDMs) {
                  await whatsappBot.queuedSend(dm.jid, dm.message);
                }
              }

              count++;
              console.log(`[API-RESEND] Match #${match.id} reenviado con éxito (${count}/${uniqueMatches.length}).`);
              await new Promise(resolve => setTimeout(resolve, 15000)); // Retardo de 15 segundos entre envíos
            }
          } catch (e: any) {
            console.error(`[API-RESEND] Error reenviando match #${match.id}:`, e.message || e);
          }
        }
        console.log(`[API-RESEND] Finalizado reenvío de ${count} matches.`);
      })().catch(console.error);

      res.send(`Iniciado reenvío en segundo plano de ${uniqueMatches.length} matches únicos.`);
    } catch (err: any) {
      console.error(err);
      res.status(500).send(err.message);
    }
  });


  app.get("/api/trigger-reaction-response", async (req, res) => {
    try {
      if (!whatsappBot.isReady) {
        return res.status(503).send("El bot no está listo.");
      }
      const client = (whatsappBot as any).client;
      const targetGroupId = (whatsappBot as any).targetGroupId || '120363260108880069@g.us';
      const chat = await client.getChatById(targetGroupId);
      const msgs = await chat.fetchMessages({ limit: 100 });
      
      let summaryMsg: any = null;
      for (const m of msgs) {
        if (m.fromMe && m.body && (m.body.includes("RESUMEN: ¡JANIA V2.0 ACTIVA EN LA RED!") || m.body.includes("RESUMEN: ¡JANIA V2.5 ACTIVA EN LA RED!"))) {
          summaryMsg = m;
          break;
        }
      }

      if (summaryMsg) {
        const senderId = '573118588254@c.us'; // ~ trato hecho Bienes raices
        const realName = 'trato hecho Bienes raices';
        
        const promptContext = 
          `[REACCIÓN DE BURLA/SARCASMO]: El usuario @573118588254 (${realName}) ha reaccionado con el emoji 😂 a tu mensaje: "${summaryMsg.body}". ` +
          `Genera una respuesta en el grupo dirigiéndote a este aliado/colega. Responde de manera profesional, sofisticada, ética y con sutil auto-defensa. ` +
          `Demuestra con altura y elegancia que la tecnología seria y la colaboración estructurada es el camino para cerrar negocios, debatiendo con ingenio pero con respeto. ` +
          `Usa emojis.`;
        
        const result = await processWhatsAppMessage(promptContext, senderId, realName, false, [], undefined, undefined, true);
        if (result && result.response && result.response.trim() !== "") {
          await (whatsappBot as any).queuedSend(targetGroupId, result.response, {
            mentions: [senderId],
            quotedMessageId: summaryMsg.id._serialized
          });
          res.json({ success: true, message: "Reaction response sent to group", responseText: result.response });
        } else {
          res.status(500).json({ success: false, error: "Failed to generate LLM response" });
        }
      } else {
        res.status(404).json({ success: false, error: "Summary announcement message not found in the last 100 messages" });
      }
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  // Admin endpoint: disparar la generación y envío del audio motivador a un grupo específico
  // Uso: POST /admin/trigger-motivador { groupType, themeIndex, token }
  app.post('/admin/trigger-motivador', async (req: any, res: any) => {
    const { groupType, themeIndex, token } = req.body;
    if (token !== 'vecy2025admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    try {
      if (!whatsappBot.isReady) {
        return res.status(503).json({ error: 'Bot no está listo aún' });
      }

      const tematicas = [
        "Incentivar a los asesores a interactuar con JanIA sin miedo, ya sea por texto o enviando notas de voz en el grupo, preguntándole sobre inmuebles, requerimientos, leyes o funcionamiento.",
        "Explicar de forma sencilla qué es VECY Network, el rol de JanIA como asistente de inteligencia artificial y cómo funciona el sistema de coincidencia (matching) en segundos.",
        "Compartir la historia de VECY Network, quiénes somos (Jani Alves y Eduardo A. Rivera) y por qué creamos esta red colaborativa nacional.",
        "Explicar los servicios que ofrecemos, cómo contactarnos y en qué redes sociales nos pueden encontrar.",
        "Recordar que actualmente todo el proyecto y las herramientas son 100% gratuitos por estar en fase de pruebas, y hablar con entusiasmo de las grandes cosas que están por venir.",
        "Preguntar a los colegas cómo ven el proyecto, qué les agrada más, qué les molesta, qué cambiarían o qué ideas/mejoras aportarían para que JanIA y el portal estén mejor a su servicio.",
        "Hablar sobre el lanzamiento al aire de la web oficial de VECY, aclarando honestamente que saldrá apenas veamos que la comunidad realmente necesita y valora la herramienta en su día a día."
      ];

      const idx = typeof themeIndex === 'number' ? themeIndex : 2;
      const tematicaSeleccionada = tematicas[idx] || tematicas[2];

      let targetId = '';
      let nombreGrupo = '';
      let promptExtra = '';

      if (groupType === 'consultoria') {
        targetId = whatsappBot.buzonGroupId;
        nombreGrupo = "VECY: SOPORTE LEGAL, CONTRATOS Y AVALÚOS";
        promptExtra = "Enfócate en invitar a que consulten sobre temas jurídicos, disputas de comisiones de puntas compartidas, contratos de corretaje o avalúos.";
      } else if (groupType === 'inmuebles') {
        targetId = whatsappBot.targetGroupId;
        nombreGrupo = "VECY INMUEBLES NETWORK";
        promptExtra = "Enfócate en la publicación activa de ofertas y demandas de inmuebles, el cruce comercial rápido, y la colaboración nacional sin pagar comisiones.";
      } else if (groupType === 'circulo') {
        targetId = whatsappBot.circuloGroupId;
        nombreGrupo = "CÍRCULO CERO";
        promptExtra = "Enfócate en la retroalimentación del sistema, sugerencias directas a los fundadores, ideas de mejora y el futuro del sector inmobiliario.";
      } else {
        return res.status(400).json({ error: 'groupType no válido. Debe ser consultoria, inmuebles o circulo.' });
      }

      if (!targetId) {
        return res.status(404).json({ error: `El JID del grupo ${nombreGrupo} no está configurado` });
      }

      const promptVoz = `Genera un mensaje corto, cercano y motivador en español para ser enviado como nota de voz al grupo de WhatsApp "${nombreGrupo}".
Dirección obligatoria:
- La temática del audio de hoy debe ser: "${tematicaSeleccionada}"
- ${promptExtra}
- IMPORTANTE: Debe sonar como un mensaje de voz natural de WhatsApp grabado de forma espontánea por una colega real. Evita introducciones corporativas como "Estimados miembros" o frases robóticas. Empieza de forma muy natural como: "Hola colegas, ¿cómo van?", "Buenas tardes a todos por aquí", "Hola a todos, paso por aquí un momento...".
- Mantén el texto relativamente corto y conciso (máximo 400 caracteres) para que la nota de voz generada dure aproximadamente de 30 a 40 segundos, lo cual es ideal para mantener la atención y optimizar recursos de voz. No uses viñetas ni formateo markdown complejo ya que se leerá como audio.
- CRÍTICO: Responde ÚNICAMENTE con el guion hablado de la nota de voz. NO agregues comentarios, preámbulos, explicaciones ni envuelvas el texto en comillas, llaves ({{ }}) o corchetes. Todo tu texto se convertirá directamente a audio.`;

      console.log(`[ADMIN-TRIGGER] Generando audio motivador para ${nombreGrupo} (Temática idx ${idx})...`);
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'Eres JanIA, la asistente de voz e inteligencia artificial de la red colaborativa VECY Network. Te expresas de manera natural, humana, cálida y profesional.' },
          { role: 'user', content: promptVoz }
        ]
      });

      const content = response.choices[0]?.message?.content;
      if (content && content.trim() !== "") {
        console.log(`[ADMIN-TRIGGER] Enviando audio motivador a ${nombreGrupo}...`);
        await whatsappBot.sendVoiceToGroup(content, targetId);
        res.json({ ok: true, group: nombreGrupo, theme: tematicaSeleccionada, textSent: content });
      } else {
        res.status(500).json({ error: 'El LLM retornó un contenido vacío' });
      }

    } catch (err: any) {
      console.error('[ADMIN-TRIGGER] Error al disparar audio motivador:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3000");

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    
    // Ejecutar recalculo y limpieza de matches obsoletos en la BD en segundo plano al iniciar
    import("../jobs/nightlyRematch").then(({ recalculateAndCleanupMatches }) => {
      recalculateAndCleanupMatches().catch(err => {
        console.error("[STARTUP-CLEANUP] Error ejecutando la limpieza de matches:", err);
      });
    }).catch(err => {
      console.error("[STARTUP-CLEANUP] Error importando función de limpieza:", err);
    });

    // Inicializar el Bot de WhatsApp de Vecy Network solo si no está deshabilitado
    if (process.env.ENABLE_WHATSAPP_BOT !== "false") {
      console.log("Iniciando WhatsApp Bot...");
      whatsappBot.initialize();
    } else {
      console.log("[WHATSAPP-BOT] Deshabilitado temporalmente mediante ENABLE_WHATSAPP_BOT=false.");
    }

    // Inicializar el Bot Match de WhatsApp (Ojos y Oídos) si está habilitado
    if (process.env.ENABLE_JANIA_MATCH_BOT === "true") {
      console.log("Iniciando WhatsApp Bot Match (Ojos y Oídos)...");
      import("./whatsapp-match").then((module) => {
        const bot = module?.janiaMatchBot || (module as any)?.default?.janiaMatchBot;
        if (bot && typeof bot.initialize === "function") {
          bot.initialize();
        } else {
          console.warn("[JANIA-MATCH] Advertencia: No se pudo obtener la instancia del Match Bot en esta recarga.");
        }
      }).catch(err => {
        console.error("Error al cargar JanIA Match Bot:", err);
      });
    }
    
    // Inicializar el orquestador de agendas automatizadas (Cron)
    initCronScheduler();
  });
}

/**
 * IMPLEMENTACIÓN DE SHUTDOWN LIMPIO (GRACEFUL SHUTDOWN)
 * Captura señales de apagado para liberar recursos y cerrar procesos de Puppeteer.
 */
const gracefulShutdown = async (signal: string) => {
  console.log(`\n[SYSTEM] Cerrando recursos de forma ordenada por señal: ${signal}`);
  
  try {
    const client = (whatsappBot as any).client;
    if (client) {
      console.log("[SYSTEM] Destruyendo sesión de WhatsApp y cerrando Puppeteer...");
      await client.destroy();
    }
  } catch (err) {
    console.error("[SYSTEM] Error al cerrar el cliente de WhatsApp principal:", err);
  }

  try {
    if (process.env.ENABLE_JANIA_MATCH_BOT === "true") {
      const { janiaMatchBot } = await import("./whatsapp-match");
      const matchClient = (janiaMatchBot as any).client;
      if (matchClient) {
        console.log("[SYSTEM] Destruyendo sesión de JanIA Match y cerrando Puppeteer...");
        await matchClient.destroy();
      }
    }
  } catch (err) {
    console.error("[SYSTEM] Error al cerrar el cliente de JanIA Match:", err);
  }

  console.log("[SYSTEM] Suite finalizada exitosamente. Hasta pronto.");
  process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

startServer().catch(console.error);
