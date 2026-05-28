import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { whatsappBot } from "./_core/whatsapp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));
  app.use(express.json());

  // Admin endpoint: enviar mensaje a cualquier chat desde la sesión activa
  // Uso: POST /admin/send-message { chatId, message, token }
  app.post('/admin/send-message', async (req: any, res: any) => {
    const { chatId, message, token } = req.body;
    if (token !== 'vecy2025admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (!chatId || !message) {
      return res.status(400).json({ error: 'chatId y message son requeridos' });
    }
    try {
      const client = (whatsappBot as any).client;
      if (!client || !whatsappBot.isReady) {
        return res.status(503).json({ error: 'Bot no está listo aún' });
      }
      await client.sendMessage(chatId, message);
      console.log(`[ADMIN] Mensaje enviado a ${chatId}`);
      res.json({ ok: true, chatId, preview: message.substring(0, 80) });
    } catch (err: any) {
      console.error('[ADMIN] Error al enviar:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });


  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    
    // Inicializar el Bot de WhatsApp de Vecy Network
    console.log("Iniciando WhatsApp Bot...");
    whatsappBot.initialize();
  });
}

startServer().catch(console.error);
