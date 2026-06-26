import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { whatsappBot } from "./_core/whatsapp";
import { invokeLLM } from "./_core/llm";

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
        nombreGrupo = "CONSULTORÍA JURÍDICA INMOBILIARIA";
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
