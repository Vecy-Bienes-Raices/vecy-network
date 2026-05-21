import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { whatsappBot } from "./whatsapp";
import { initCronScheduler } from "./cronService";

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  app.get("/api/list-chats", async (req, res) => {
    try {
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

  app.get("/api/screenshot-chat", async (req, res) => {
    try {
      const client = (whatsappBot as any).client;
      if (!client || !client.pupPage) {
        return res.status(400).send("No pupPage available");
      }
      const page = client.pupPage;
      // Click chat by title
      await page.evaluate(() => {
        const span = Array.from(document.querySelectorAll('span')).find(el => el.textContent === 'VECY INMUEBLES NETWORK');
        if (span) {
          const parent = span.closest('div[role="row"]') || span.closest('div');
          if (parent) {
            (parent as any).click();
          }
        }
      });
      // Wait for chat to open
      await new Promise(resolve => setTimeout(resolve, 2000));
      const screenshot = await page.screenshot({ type: "png" });
      res.setHeader("Content-Type", "image/png");
      res.send(screenshot);
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  app.get("/api/find-active-group", async (req, res) => {
    try {
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
    
    // Inicializar el Bot de WhatsApp de Vecy Network
    console.log("Iniciando WhatsApp Bot...");
    whatsappBot.initialize();

    // Inicializar el orquestador de agendas automatizadas (Cron)
    initCronScheduler();
  });
}

startServer().catch(console.error);
