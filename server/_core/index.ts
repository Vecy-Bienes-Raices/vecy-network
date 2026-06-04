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

  // Webhook for WhatsApp Cloud API (Meta)
  app.get("/api/whatsapp/webhook", (req, res) => {
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
  });

  app.post("/api/whatsapp/webhook", async (req, res) => {
    try {
      // Respond to Meta immediately to avoid timeouts/re-sends (Meta expects 200 OK within 3 seconds)
      res.status(200).send("EVENT_RECEIVED");

      // Process webhook asynchronously
      handleIncomingWebhook(req.body).catch((err) => {
        console.error("[WEBHOOK-ERROR] Error handling incoming webhook:", err);
      });
    } catch (err: any) {
      console.error("[WEBHOOK-ERROR] Exception in webhook endpoint:", err);
    }
  });

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

      const media = await textToSpeechMedia(text);
      if (!media) {
        return res.status(500).send("No se pudo generar el audio");
      }

      const buffer = Buffer.from(media.data, "base64");
      // Si el mimetype contiene codecs, algunos clientes Express fallan al hacer setHeader. 
      // Limpiamos o seteamos el mimetype básico
      let cleanMime = media.mimetype.split(';')[0].trim();
      res.setHeader("Content-Type", cleanMime);
      res.send(buffer);
    } catch (err: any) {
      res.status(500).send(err.message);
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
        { name: "Buzón de Consultoría", id: buzonGroupId },
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
        if (m.fromMe && m.body && m.body.includes("RESUMEN: ¡JANIA V2.0 ACTIVA EN LA RED!")) {
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
    
    // Inicializar el Bot de WhatsApp de Vecy Network solo si no está deshabilitado
    if (process.env.ENABLE_WHATSAPP_BOT !== "false") {
      console.log("Iniciando WhatsApp Bot...");
      whatsappBot.initialize();
    } else {
      console.log("[WHATSAPP-BOT] Deshabilitado temporalmente mediante ENABLE_WHATSAPP_BOT=false.");
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
    console.error("[SYSTEM] Error al cerrar el cliente de WhatsApp:", err);
  }

  console.log("[SYSTEM] Suite finalizada exitosamente. Hasta pronto.");
  process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

startServer().catch(console.error);
