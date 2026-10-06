import "dotenv/config";
import express from "express";
import compression from "compression";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initCronScheduler } from "./cronService";
import { processWhatsAppMessage } from "./janIA";
import multer from "multer";
import fs from "fs";
import path from "path";
import { transcribeAudioBuffer } from "./voiceTranscription";
import { invokeLLM } from "./llm";
import { textToSpeechMedia } from "./whatsapp-utils";
import { janiaMatchBot as whatsappBot, janiaMatchBot } from "./whatsapp-match";
import "./notification";
import { executeIdentityVerification, identityJobs, AUTHORITATIVE_FAMILY_IDENTITIES, processAndSaveSolicitud } from "../routers/agenda";

process.on("uncaughtException", (error) => {
  console.error("[SYSTEM-CRITICAL] Uncaught Exception detectada:", error);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("[SYSTEM-CRITICAL] Unhandled Rejection detectada en:", promise, "razón:", reason);
});

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Enable gzip compression for lightning-fast API responses
  app.use(compression());

  // Allow Cross-Origin Requests (CORS) & Handle Preflight OPTIONS
  app.use((req, res, next) => {
    const origin = (req.headers.origin as string) || "*";
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, trpc-accept");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // 🩺 Endpoint de salud ultra-liviano (0ms, 0 overhead de BD) para watchdog y supervisores
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() });
  });

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
    } catch (err: any) {
      console.error("[WEBHOOK-ERROR] Exception in webhook endpoint:", err);
    }
  };

  // Rutas del webhook — ambas apuntan al mismo handler para cubrir cualquier URL configurada en Meta
  app.get("/webhook", webhookGetHandler);
  app.post("/webhook", webhookPostHandler);
  app.get("/api/whatsapp/webhook", webhookGetHandler);
  app.post("/api/whatsapp/webhook", webhookPostHandler);

  // 🛡️ Endpoint REST Directo de Verificación de Identidad (Vecy Agenda Pro + Integraciones)
  app.post("/api/verify-identity", async (req, res) => {
    try {
      const { tipoDocumento, numeroDocumento, nombreIngresado } = req.body || {};
      const cleanDoc = (numeroDocumento || "").replace(/[^0-9a-zA-Z]/g, "");
      if (!cleanDoc || cleanDoc.length < 5) {
        return res.status(200).json({
          valid: false,
          match: false,
          error: "El número de documento debe tener al menos 5 dígitos.",
        });
      }

      const tDocLower = (tipoDocumento || "").toLowerCase();
      const isNit = tDocLower.includes("nit") || tDocLower.includes("rut");
      const isExtranjeria = tDocLower.includes("extranjer") || tDocLower === "ce" || tDocLower === "cx";
      const isPasaporte = tDocLower.includes("pasaporte") || tDocLower === "pa";
      const isPep = tDocLower.includes("pep");
      const isPpt = tDocLower.includes("ppt") || tDocLower.includes("temporal");
      const isCedula = !isNit && !isExtranjeria && !isPasaporte && !isPep && !isPpt && (tDocLower.includes("cédula") || tDocLower.includes("cedula") || tDocLower === "" || tDocLower.includes("ciudadan") || tDocLower === "cc");
      const normName = (nombreIngresado || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const isKnownFamilyName = normName.length >= 4 && (
        (normName.includes("daniel") && (normName.includes("rivera") || normName.includes("noguera") || normName.trim() === "daniel")) ||
        (normName.includes("natalia") && (normName.includes("rivera") || normName.includes("noguera") || normName.trim() === "natalia")) ||
        (normName.includes("eduardo") && (normName.includes("rivera") || normName.includes("arturo"))) ||
        normName.includes("vecy") ||
        (normName.includes("jani") && normName.includes("alves"))
      );

      // Fast-path (0ms): familia VECY, errores estructurales colombianos (ej. 9 dígitos o CE de 8+ dígitos), reverse checks o NIT
      if (
        isNit ||
        (isCedula && (cleanDoc.length === 9 || cleanDoc.length < 6 || cleanDoc.length > 10 || (cleanDoc.length === 10 && !cleanDoc.startsWith("1")))) ||
        (isExtranjeria && (cleanDoc.length < 4 || cleanDoc.length > 7)) ||
        (isPep && cleanDoc.length !== 15) ||
        (isPpt && (cleanDoc.length < 5 || cleanDoc.length > 10)) ||
        AUTHORITATIVE_FAMILY_IDENTITIES[cleanDoc] ||
        isKnownFamilyName
      ) {
        const quick = await executeIdentityVerification(tipoDocumento || "Cédula de ciudadanía", cleanDoc, nombreIngresado);
        return res.status(200).json(quick);
      }

      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      identityJobs.set(jobId, {
        id: jobId,
        status: "processing",
        tipoDocumento: tipoDocumento || "Cédula de ciudadanía",
        numeroDocumento: cleanDoc,
        nombreIngresado,
        createdAt: Date.now(),
      });

      executeIdentityVerification(tipoDocumento || "Cédula de ciudadanía", cleanDoc, nombreIngresado)
        .then((result) => {
          const j = identityJobs.get(jobId);
          if (j) {
            j.status = "completed";
            j.result = result;
          }
        })
        .catch((err) => {
          const j = identityJobs.get(jobId);
          if (j) {
            j.status = "error";
            j.result = {
              valid: false,
              match: false,
              error: err?.message || "Error validando documento",
            };
          }
        });

      return res.status(200).json({
        status: "processing",
        jobId,
        message: "Verificando autenticidad del documento en tiempo real...",
      });
    } catch (e: any) {
      return res.status(500).json({ valid: false, match: false, error: e.message });
    }
  });

  app.get("/api/verify-identity", (req, res) => {
    const jobId = (req.query.jobId as string) || "";
    if (!jobId) return res.status(400).json({ error: "jobId requerido" });
    const job = identityJobs.get(jobId);
    if (!job) return res.status(200).json({ status: "error", error: "Job no encontrado o expirado" });
    return res.status(200).json(job);
  });

  // 📋 Endpoint REST Directo para Registrar Solicitudes de Agenda (Vecy Agenda Pro + Integraciones)
  const handleAgendaSubmit = async (req: express.Request, res: express.Response) => {
    try {
      const payload = req.body || {};
      if (!payload.solicitante_nombre) {
        return res.status(400).json({ success: false, error: "solicitante_nombre es obligatorio" });
      }
      const result = await processAndSaveSolicitud(payload);
      return res.status(200).json(result);
    } catch (e: any) {
      console.error("[AGENDA-REST-ERROR]", e?.message);
      return res.status(e?.code === "BAD_REQUEST" ? 400 : 500).json({
        success: false,
        error: e?.message || "Error procesando solicitud de agenda",
      });
    }
  };

  app.post("/api/agenda/submit", handleAgendaSubmit);
  app.post("/api/solicitudes/submit", handleAgendaSubmit);
  app.post("/api/submit", handleAgendaSubmit);

  app.get("/api/list-chats", async (req, res) => {
    try {
      if (!janiaMatchBot.isReady) {
        return res.status(503).send("El bot de WhatsApp (Baileys) no está listo todavía. Intenta en unos segundos.");
      }
      res.json({ isReady: true, status: "online" });
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  app.get("/api/inspect-groups", async (req, res) => {
    try {
      if (!janiaMatchBot.isReady || !janiaMatchBot.sock) {
        return res.status(503).json({ error: "El bot de WhatsApp (Baileys) no está listo todavía." });
      }
      const participating = await janiaMatchBot.sock.groupFetchAllParticipating();
      const groups = Object.values(participating).map((g: any) => ({
        id: g.id,
        subject: g.subject,
        creation: g.creation,
        owner: g.owner,
        participantsCount: g.participants?.length || 0,
        admins: g.participants
          ?.filter((p: any) => p.admin === "admin" || p.admin === "superadmin")
          .map((p: any) => p.id.split("@")[0]) || []
      }));
      // Ordenar alfabéticamente por nombre del grupo
      groups.sort((a: any, b: any) => a.subject.localeCompare(b.subject));
      res.json({ total: groups.length, groups });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/screenshot-chat", async (req, res) => {
    try {
      if (!janiaMatchBot.isReady) {
        return res.status(503).send("El bot de WhatsApp (Baileys) no está listo todavía.");
      }
      return res.json({ isReady: true, status: "Baileys WebSocket activo" });
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  app.get("/qr-match.png", (req, res) => {
    try {
      const qrPath = path.join(process.cwd(), 'qr-match.png');
      const distQrPath = path.join(process.cwd(), 'dist', 'qr-match.png');
      const activePath = fs.existsSync(qrPath) ? qrPath : distQrPath;

      if (fs.existsSync(activePath)) {
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        return res.sendFile(activePath);
      }
      res.status(404).send("QR no disponible todavía.");
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  app.get("/api/match-qr-screenshot", async (req, res) => {
    try {
      const { janiaMatchBot } = await import("./whatsapp-match");
      if (janiaMatchBot && !janiaMatchBot.sock) {
        console.log("[ADMIN] Inicializando bot bajo demanda para generar QR...");
        await janiaMatchBot.initialize();
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      const qrPath = path.join(process.cwd(), 'qr-match.png');
      const distQrPath = path.join(process.cwd(), 'dist', 'qr-match.png');
      const activePath = fs.existsSync(qrPath) ? qrPath : distQrPath;

      if (fs.existsSync(activePath)) {
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        return res.sendFile(activePath);
      }
      res.status(404).send("QR no disponible todavía. Por favor vincula o refresca.");
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  app.get("/api/match-qr-refresh", async (req, res) => {
    try {
      const { janiaMatchBot } = await import("./whatsapp-match");
      if (!janiaMatchBot) {
        return res.status(503).send("El bot de Match no está inicializado.");
      }
      console.log("[ADMIN] Re-inicializando sesión de Baileys para refrescar QR...");
      await janiaMatchBot.initialize();
      await new Promise(resolve => setTimeout(resolve, 4000));

      const qrPath = path.join(process.cwd(), 'qr-match.png');
      const distQrPath = path.join(process.cwd(), 'dist', 'qr-match.png');
      const activePath = fs.existsSync(qrPath) ? qrPath : distQrPath;

      if (fs.existsSync(activePath)) {
        res.setHeader("Content-Type", "image/png");
        return res.sendFile(activePath);
      }
      res.status(404).send("QR no disponible todavía.");
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  app.get("/api/match-pairing-code", async (req, res) => {
    try {
      const { phone } = req.query;
      if (!phone || typeof phone !== "string") {
        return res.status(400).send("Debe proporcionar un parámetro de teléfono válido. Ejemplo: ?phone=573192919978");
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

  // --- BOT CAPTADOR WORKER 2 (+573192919978) ENDPOINTS ---
  app.get("/qr-captador.png", (req, res) => {
    try {
      const qrPath = path.join(process.cwd(), 'qr-captador.png');
      const distQrPath = path.join(process.cwd(), 'dist', 'qr-captador.png');
      const activePath = fs.existsSync(qrPath) ? qrPath : distQrPath;

      if (fs.existsSync(activePath)) {
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        return res.sendFile(activePath);
      }
      res.status(404).send("QR Captador no disponible todavía. Solicita el código de vinculación o refresca.");
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  app.get("/api/captador-pairing-code", async (req, res) => {
    try {
      const targetPhone = (req.query.phone as string) || "573192919978";
      const { janiaCaptadorBot } = await import("./whatsapp-match");
      if (!janiaCaptadorBot) {
        return res.status(503).send("El bot captador no está inicializado.");
      }
      const code = await janiaCaptadorBot.getPairingCode(targetPhone);
      res.json({ ok: true, phone: targetPhone, code });
    } catch (err: any) {
      res.status(500).send(err.message || err);
    }
  });

  app.post("/api/send-whatsapp-notification", async (req, res) => {
    try {
      const { text, token, phone, mentions, document, fileName, mimetype, caption } = req.body;
      const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN || "vecy_network_secret_token";

      if (token !== verifyToken) {
        return res.status(401).json({ error: "Unauthorized. Invalid token." });
      }

      if ((!text || typeof text !== "string") && !document) {
        return res.status(400).json({ error: "Falta el parámetro 'text' o 'document'." });
      }

      const defaultAdminPhone = "573192919978";
      const rawPhone = phone || defaultAdminPhone;
      let targetPhone = "";
      if (typeof rawPhone === "string" && (rawPhone.endsWith("@g.us") || rawPhone.endsWith("@newsletter") || rawPhone.endsWith("@s.whatsapp.net") || rawPhone.endsWith("@lid"))) {
        targetPhone = rawPhone;
      } else {
        const cleanPhone = typeof rawPhone === "string" ? rawPhone.replace(/\D/g, "") : String(rawPhone).replace(/\D/g, "");
        targetPhone = cleanPhone.endsWith("@s.whatsapp.net") ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;
      }

      const matchBot = (global as any).janiaMatchBotInstance;
      if (matchBot && matchBot.isReady) {
        if (document) {
          console.log(`[NOTIFICACIÓN-API] Enviando documento adjunto a ${targetPhone} vía JanIA Match Bot (Baileys)...`);
          let docBuffer: Buffer;
          if (Buffer.isBuffer(document)) {
            docBuffer = document;
          } else if (typeof document === "string" && fs.existsSync(document)) {
            docBuffer = fs.readFileSync(document);
          } else if (typeof document === "string") {
            const cleanBase64 = document.includes(",") ? document.split(",")[1] : document;
            docBuffer = Buffer.from(cleanBase64, "base64");
          } else {
            throw new Error("Formato de documento no soportado (debe ser buffer, ruta de archivo o base64).");
          }

          if (matchBot.sock) {
            const sentDoc = await matchBot.sock.sendMessage(targetPhone, {
              document: docBuffer,
              mimetype: mimetype || "application/pdf",
              fileName: fileName || "documento.pdf",
              caption: caption || text || ""
            });
            if (sentDoc?.key?.id && sentDoc.message && typeof matchBot.saveMessageToStore === 'function') {
              matchBot.saveMessageToStore(sentDoc.key.id, sentDoc.message);
            }
          }
        } else if (req.body.isAudio || req.body.sendAudio || req.body.isVoiceNote) {
          console.log(`[NOTIFICACIÓN-API] Sintetizando y enviando nota de voz de estudio a ${targetPhone} vía JanIA Match Bot (Baileys)...`);
          const { textToSpeechMedia } = await import("./whatsapp-utils");
          const media = await textToSpeechMedia(text);
          if (media && media.data) {
            const audioBuffer = Buffer.from(media.data, 'base64');
            await matchBot.queuedSend(targetPhone, {
              audio: audioBuffer,
              mimetype: media.mimetype || 'audio/ogg; codecs=opus',
              ptt: true
            }, { allowDirectMessage: true, skipDelay: true });
          } else {
            throw new Error("No se pudo sintetizar el audio de la nota de voz.");
          }
        } else {
          console.log(`[NOTIFICACIÓN-API] Retransmitiendo mensaje a ${targetPhone} vía JanIA Match Bot (Baileys)...`);
          const options: any = {};
          if (mentions && Array.isArray(mentions)) {
            options.mentions = mentions;
          }
          await matchBot.queuedSend(targetPhone, text, { ...options, allowDirectMessage: true });
        }
      }

      res.json({ ok: true, message: "Notification sent successfully." });
    } catch (err: any) {
      console.error("[NOTIFICACIÓN-API] Error enviando mensaje:", err);
      res.status(500).json({ error: err.message || err });
    }
  });

  app.get("/api/match-click-cancel", async (req, res) => {
    try {
      res.send("Baileys no requiere bypass de botón Cancel.");
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  app.get("/api/match-click-continue", async (req, res) => {
    try {
      res.send("Baileys no requiere bypass de botón Continue.");
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

  app.get("/api/moderar-grupo-2", async (req, res) => {
    try {
      if (!whatsappBot.isReady) {
        return res.status(503).send("El bot de WhatsApp no está listo todavía.");
      }
      const warningText =
        `Hola @573132547441 (Maria Claudia) 👋🏻, espero te encuentres muy bien.\n\n` +
        `🚫 *Has publicado esta oferta en el grupo equivocado.* Este canal es exclusivo para consultas de **Soporte Legal, Tributario, Avalúos y Marketing Inmobiliario**.\n\n` +
        `Te invitamos cordialmente a **eliminarla de este grupo** y publicarla en nuestro canal oficial de corretaje:\n` +
        `👉 **VECY INMUEBLES NETWORK**: https://chat.whatsapp.com/GzMbjNs1P2tHI7D0V4h8wZ\n\n` +
        `¡Allí todos los corredores de la red podrán verla y cruzaremos tu inmueble con las demandas activas! 🏠✨`;

      await whatsappBot.sendToGroup(warningText, undefined, ['573132547441@s.whatsapp.net'], whatsappBot.buzonGroupId);
      res.send("Mensaje de moderación enviado a Grupo 2 exitosamente.");
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  app.post("/api/admin/broadcast-service-promo", async (req, res) => {
    try {
      if (!whatsappBot.isReady) {
        return res.status(503).json({ error: "El bot de WhatsApp no está listo todavía." });
      }

      const serviceType = req.body?.service || 'identity';

      const imgInfo = serviceType === 'predial'
        ? resolveBroadcastImagePath(["jania_predial_comercial.jpg", "jania_tributario.jpg"])
        : resolveBroadcastImagePath(["jania_verificacion_servicio.jpg", "jania_cedulas_comercial.jpg"]);

      const imgPath = imgInfo.path;
      const hasImage = imgInfo.exists;

      const defaultPromoIdentity = (
        `🪪 *¿SABES A QUIÉN LE ESTÁS VENDIENDO, ARRENDANDO O AGENDANDO UNA VISITA?* 🇨🇴\n\n` +
        `Antes de mostrar un inmueble o reunirte con un cliente nuevo, verifica su identidad con *JanIA* — la IA de *VECY BIENES RAÍCES*:\n\n` +
        `✅ Valida nombres y apellidos completos oficiales\n` +
        `✅ Consulta antecedentes ante la Policía Nacional\n` +
        `🔐 _100% oficial y gratuito para nuestra comunidad inmobiliaria_\n\n` +
        `━━━━━━━━━━━━━━━\n` +
        `⚡ *¿Cómo usarlo? (En 1 solo mensaje):*\n\n` +
        `1️⃣ Guarda a JanIA en tus contactos:\n` +
        `👤 *JanIA Agente IA de VECY*\n` +
        `📲 *+57 319 291 9978* (o toca aquí: https://wa.me/573192919978)\n\n` +
        `2️⃣ Escríbele por privado:\n` +
        `👉 \`JanIA, verificar CC: 12.345.678\`\n` +
        `_(También acepta CE o Pasaporte)_\n\n` +
        `3️⃣ En segundos te entrega el nombre oficial y antecedentes ✅\n\n` +
        `━━━━━━━━━━━━━━━\n` +
        `📢 *Canal oficial:* https://whatsapp.com/channel/0029Vb5iYUYCMY0A94zqti1b\n` +
        `🌐 *Web oficial:* https://vecy-network.vercel.app/\n\n` +
        `*VECY BIENES RAÍCES 🏘️*`
      );

      const defaultPromoPredial = (
        `🏠 *¿TIENES PREDIO EN BOGOTÁ?* 🇨🇴\n\n` +
        `Con *JanIA* — la IA de *VECY BIENES RAÍCES* — obtén el enlace oficial de la Secretaría de Hacienda para descargar tu *factura del Impuesto Predial 2026* en PDF con código de barras para bancos y Efecty.\n\n` +
        `🎯 _Gratis, rápido y sin filas ni registros complicados._\n\n` +
        `━━━━━━━━━━━━━━━\n` +
        `⚡ *¿Cómo solicitarla? (En 1 solo mensaje):*\n\n` +
        `1️⃣ Escríbele a JanIA por privado a su WhatsApp:\n` +
        `📲 *+57 319 291 9978* (o toca aquí: https://wa.me/573192919978)\n\n` +
        `2️⃣ Envíale el CHIP y documento en un solo mensaje:\n` +
        `👉 \`JanIA, predial: CHIP AAA0205AYFZ y CC 12345678\`\n` +
        `_(Si es empresa, usa NIT en vez de CC)_\n\n` +
        `3️⃣ JanIA te entrega de inmediato el enlace directo y los pasos exactos para descargar tu PDF oficial ✅\n\n` +
        `━━━━━━━━━━━━━━━\n` +
        `ℹ️ *¿Dónde está el CHIP?* En cualquier factura o recibo predial anterior.\n` +
        `📢 *Canal oficial:* https://whatsapp.com/channel/0029Vb5iYUYCMY0A94zqti1b\n` +
        `🌐 *Web oficial:* https://vecy-network.vercel.app/\n\n` +
        `*VECY BIENES RAÍCES 🏘️*`
      );

      const baseDefaultPromo = serviceType === 'predial' ? defaultPromoPredial : defaultPromoIdentity;
      const promoTextGroups = req.body?.textGroups || req.body?.text || baseDefaultPromo;
      const promoTextChannel = req.body?.textChannel || req.body?.text || baseDefaultPromo;

      console.log(`[BROADCAST-PROMO] Despachando (${serviceType}) a Grupo 2, Grupo 3 y Canal (Imagen: ${hasImage ? imgPath : 'Ninguna'})...`);

      const results: any = {};

      // 1. Grupo 2: VECY: SOPORTE LEGAL, CONTRATOS Y AVALÚOS
      try {
        await whatsappBot.sendToGroup(promoTextGroups, hasImage ? imgPath : undefined, [], whatsappBot.buzonGroupId);
        results.grupo2 = "Despachado a Grupo 2 exitosamente";
        console.log("[BROADCAST-PROMO] ✓ Despachado a Grupo 2");
      } catch (err2: any) {
        results.grupo2 = `Error: ${err2.message}`;
        console.error("[BROADCAST-PROMO] Error en Grupo 2:", err2);
      }

      // 2. Grupo 3: PROYECTO "Vecy Network" 👌
      try {
        await whatsappBot.sendToGroup(promoTextGroups, hasImage ? imgPath : undefined, [], whatsappBot.circuloGroupId);
        results.grupo3 = "Despachado a Grupo 3 exitosamente";
        console.log("[BROADCAST-PROMO] ✓ Despachado a Grupo 3");
      } catch (err3: any) {
        results.grupo3 = `Error: ${err3.message}`;
        console.error("[BROADCAST-PROMO] Error en Grupo 3:", err3);
      }

      // 3. Canal de WhatsApp (Newsletter)
      const channelJid = whatsappBot.channelNewsletterId || "120363399889853806@newsletter";
      try {
        await whatsappBot.sendToGroup(promoTextChannel, hasImage ? imgPath : undefined, [], channelJid);
        results.canal = `Despachado a Canal ${channelJid} exitosamente`;
        console.log(`[BROADCAST-PROMO] ✓ Despachado a Canal (${channelJid})`);
      } catch (errNl: any) {
        results.canal = `Error: ${errNl.message}`;
        console.error("[BROADCAST-PROMO] Error en Canal:", errNl);
      }

      return res.status(200).json({ success: true, results });
    } catch (err: any) {
      console.error("[BROADCAST-PROMO] Error general:", err);
      return res.status(500).json({ error: err.message });
    }
  });


  function resolveBroadcastImagePath(filenames: string[]): { path: string; exists: boolean } {
    const searchDirs = [
      path.join(process.cwd(), "client/public/assets/jania"),
      path.join(process.cwd(), "client/public/images"),
      path.join(process.cwd(), "client/public"),
      process.cwd(),
      path.join(process.cwd(), "dist/assets/jania"),
      path.join(process.cwd(), "dist/images"),
      path.join(process.cwd(), "dist"),
    ];

    for (const name of filenames) {
      for (const dir of searchDirs) {
        const fullPath = path.join(dir, name);
        if (fs.existsSync(fullPath)) {
          return { path: fullPath, exists: true };
        }
      }
    }
    return { path: path.join(process.cwd(), filenames[0]), exists: false };
  }

  // ─── COMERCIAL: VERIFICACIÓN DE IDENTIDAD v2 ────────────────────────────────
  app.post("/api/admin/broadcast-identity-v2", async (req, res) => {
    try {
      if (!whatsappBot.isReady) {
        return res.status(503).json({ error: "El bot de WhatsApp no está listo todavía." });
      }

      const identityImg = resolveBroadcastImagePath(["jania_verificacion_servicio.jpg", "jania_cedulas_comercial.jpg"]);
      const imgPath = identityImg.path;
      const hasImage = identityImg.exists;

      const promoText =
        `🪪 *¿SABES A QUIÉN LE ESTÁS VENDIENDO, ARRENDANDO O AGENDANDO UNA VISITA?* 🇨🇴\n\n` +
        `Antes de mostrar un inmueble o reunirte con un cliente nuevo, verifica su identidad con *JanIA* — la IA de *VECY BIENES RAÍCES*:\n\n` +
        `✅ Valida nombres y apellidos completos oficiales\n` +
        `✅ Consulta antecedentes ante la Policía Nacional\n` +
        `🔐 _100% oficial y gratuito para nuestra comunidad inmobiliaria_\n\n` +
        `━━━━━━━━━━━━━━━\n` +
        `⚡ *¿Cómo usarlo? (En 1 solo mensaje):*\n\n` +
        `1️⃣ Guarda a JanIA en tus contactos:\n` +
        `👤 *JanIA Agente IA de VECY*\n` +
        `📲 *+57 319 291 9978* (o toca aquí: https://wa.me/573192919978)\n\n` +
        `2️⃣ Escríbele por privado:\n` +
        `👉 \`JanIA, verificar CC: 12.345.678\`\n` +
        `_(También acepta CE o Pasaporte)_\n\n` +
        `3️⃣ En segundos te entrega el nombre oficial y antecedentes ✅\n\n` +
        `━━━━━━━━━━━━━━━\n` +
        `🤝 _Tecnología gratuita para blindar tus ventas y captaciones en Colombia._\n\n` +
        `📞 *Atención Bróker VECY:* +57 316 656 9719 (https://wa.me/573166569719)\n` +
        `📢 *Canal oficial:* https://whatsapp.com/channel/0029Vb5iYUYCMY0A94zqti1b\n` +
        `🌐 *Web oficial:* https://vecy-network.vercel.app/\n\n` +
        `*VECY BIENES RAÍCES 🏘️*`;

      console.log(`[BROADCAST-IDENTITY-V2] Despachando a Grupo 2, Grupo 3 y Canal (Imagen: ${hasImage ? imgPath : 'Ninguna'})...`);
      const results: any = {};

      // Grupo 2: VECY SOPORTE LEGAL, TRIBUTARIO, AVALÚOS
      try {
        await whatsappBot.sendToGroup(promoText, hasImage ? imgPath : undefined, [], whatsappBot.buzonGroupId);
        results.grupo2 = "✓ Despachado";
        console.log("[BROADCAST-IDENTITY-V2] ✓ Grupo 2");
      } catch (e: any) { results.grupo2 = `Error: ${e.message}`; }

      await new Promise(r => setTimeout(r, 3000));

      // Grupo 3: PROYECTO Vecy Network
      try {
        await whatsappBot.sendToGroup(promoText, hasImage ? imgPath : undefined, [], whatsappBot.circuloGroupId);
        results.grupo3 = "✓ Despachado";
        console.log("[BROADCAST-IDENTITY-V2] ✓ Grupo 3");
      } catch (e: any) { results.grupo3 = `Error: ${e.message}`; }

      await new Promise(r => setTimeout(r, 3000));

      // Canal de WhatsApp
      const channelJid = whatsappBot.channelNewsletterId || "120363399889853806@newsletter";
      try {
        await whatsappBot.sendToGroup(promoText, hasImage ? imgPath : undefined, [], channelJid);
        results.canal = `✓ Despachado a ${channelJid}`;
        console.log(`[BROADCAST-IDENTITY-V2] ✓ Canal (${channelJid})`);
      } catch (e: any) { results.canal = `Error: ${e.message}`; }

      return res.status(200).json({ success: true, imageFound: hasImage, imagePath: imgPath, results });
    } catch (err: any) {
      console.error("[BROADCAST-IDENTITY-V2] Error general:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ─── COMERCIAL: PREDIAL BOGOTÁ ───────────────────────────────────────────────
  app.post("/api/admin/broadcast-predial-promo", async (req, res) => {
    try {
      if (!whatsappBot.isReady) {
        return res.status(503).json({ error: "El bot de WhatsApp no está listo todavía." });
      }

      const predialImg = resolveBroadcastImagePath(["jania_predial_comercial.jpg", "jania_tributario.jpg"]);
      const imgPath = predialImg.path;
      const hasImage = predialImg.exists;

      const promoText =
        `🏠📄 *¿VAS A VENDER UN INMUEBLE O NECESITAS LA FACTURA PREDIAL 2026?* 🇨🇴\n\n` +
        `En *VECY BIENES RAÍCES* le ahorramos filas y caídas de la página de Hacienda a propietarios y colegas inmobiliarios.\n\n` +
        `Con *JanIA* obtienes tu *Factura Oficial del Predial Bogotá 2026 en PDF* (con código de barras para bancos o Efecty) en 20 segundos por WhatsApp:\n\n` +
        `1️⃣ Escríbele al WhatsApp de JanIA: *+57 319 291 9978* (https://wa.me/573192919978)\n` +
        `2️⃣ Envíale: \`JanIA, predial: CHIP AAA... y CC 12345678\` (o NIT)\n` +
        `3️⃣ ¡Listo! Te entrega el archivo PDF oficial adjunto en tu chat. 📄✅\n\n` +
        `━━━━━━━━━━━━━━━\n` +
        `🤝 _Tecnología gratuita para impulsar el corretaje y dejar en el pasado los portales obsoletos._\n\n` +
        `📞 *Atención Bróker VECY:* +57 316 656 9719 (https://wa.me/573166569719)\n` +
        `📢 *Canal oficial:* https://whatsapp.com/channel/0029Vb5iYUYCMY0A94zqti1b\n` +
        `🌐 *Web oficial:* https://vecy-network.vercel.app/\n\n` +
        `*VECY BIENES RAÍCES 🏘️*`;

      console.log(`[BROADCAST-PREDIAL] Despachando a Grupo 2, Grupo 3 y Canal (Imagen: ${hasImage ? imgPath : 'Ninguna'})...`);
      const results: any = {};

      // Grupo 2
      try {
        await whatsappBot.sendToGroup(promoText, hasImage ? imgPath : undefined, [], whatsappBot.buzonGroupId);
        results.grupo2 = "✓ Despachado";
        console.log("[BROADCAST-PREDIAL] ✓ Grupo 2");
      } catch (e: any) { results.grupo2 = `Error: ${e.message}`; }

      await new Promise(r => setTimeout(r, 3000));

      // Grupo 3
      try {
        await whatsappBot.sendToGroup(promoText, hasImage ? imgPath : undefined, [], whatsappBot.circuloGroupId);
        results.grupo3 = "✓ Despachado";
        console.log("[BROADCAST-PREDIAL] ✓ Grupo 3");
      } catch (e: any) { results.grupo3 = `Error: ${e.message}`; }

      await new Promise(r => setTimeout(r, 3000));

      // Canal
      const channelJid = whatsappBot.channelNewsletterId || "120363399889853806@newsletter";
      try {
        await whatsappBot.sendToGroup(promoText, hasImage ? imgPath : undefined, [], channelJid);
        results.canal = `✓ Despachado a ${channelJid}`;
        console.log(`[BROADCAST-PREDIAL] ✓ Canal (${channelJid})`);
      } catch (e: any) { results.canal = `Error: ${e.message}`; }

      return res.status(200).json({ success: true, imageFound: hasImage, imagePath: imgPath, results });
    } catch (err: any) {
      console.error("[BROADCAST-PREDIAL] Error general:", err);
      return res.status(500).json({ error: err.message });
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
      // Retornar ruta relativa para evitar bloqueo de contenido mixto (Mixed Content HTTP vs HTTPS en Vercel)
      const fileUrl = `/uploads/${req.file.filename}`;
      console.log(`[UPLOAD-ROUTE] Archivo guardado localmente en: ${req.file.path} ➔ URL: ${fileUrl}`);
      res.json({ fileUrl, filename: req.file.filename });
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
        { name: process.env.GROUP_ZERO_NAME || 'PROYECTO "Vecy Network"', id: circuloGroupId }
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
  }); app.get("/api/trigger-nightly-rematch", async (req, res) => {
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

        const result = await processWhatsAppMessage(promptContext, senderId, realName, false, [], undefined, undefined, true, undefined, undefined, targetGroupId, chat.name);
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
        "Explicar de forma sencilla qué es VECY Bienes Raíces, el rol de JanIA como asistente de inteligencia artificial y cómo funciona el sistema de coincidencia (matching) en segundos.",
        "Compartir la historia de VECY Bienes Raíces, quiénes son nuestros fundadores Eduardo A. Rivera y Jani Alves y por qué crearon esta red colaborativa nacional.",
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
        nombreGrupo = "VECY: SOPORTE LEGAL, TRIBUTARIO, AVALÚOS Y MARKETING";
        promptExtra = "Enfócate en invitar a que consulten sobre temas jurídicos, liquidación tributaria, Marketing Digital Inmobiliario, contratos de corretaje o avalúos.";
      } else if (groupType === 'inmuebles') {
        targetId = whatsappBot.targetGroupId;
        nombreGrupo = "VECY INMUEBLES NETWORK";
        promptExtra = "Enfócate en la publicación activa de ofertas y demandas de inmuebles, el cruce comercial rápido, y la colaboración nacional sin pagar comisiones.";
      } else if (groupType === 'circulo') {
        targetId = whatsappBot.circuloGroupId;
        nombreGrupo = 'PROYECTO "Vecy Network"';
        promptExtra = "Enfócate en la comunidad, modelo de negocio, fintech inmobiliaria, sugerencias a los fundadores y el futuro de la red.";
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
          { role: 'system', content: 'Eres JanIA, la asistente de voz e inteligencia artificial de VECY Bienes Raíces. NUNCA digas que eres Jani Alves ni Eduardo Rivera; ellos son los fundadores que te crearon a ti, JanIA. Te expresas de manera natural, humana, cálida y profesional.' },
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

  // Admin endpoint: disparar Noticia Inmobiliaria Nacional o Primicia de Última Hora
  // Uso: POST /admin/trigger-noticia { token, headline, details, isUrgent, targetGroup, force }
  app.post('/admin/trigger-noticia', async (req: any, res: any) => {
    const { token, headline, details, isUrgent, targetGroup, force } = req.body;
    if (token !== 'vecy2025admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
      const { publishNoticiaNacionalNow } = await import('./cronService');
      const result = await publishNoticiaNacionalNow({
        headline,
        details,
        isUrgent: isUrgent ?? false,
        targetGroup: targetGroup || 'grupo2',
        force: force ?? true
      });
      res.json(result);
    } catch (err: any) {
      console.error('[ADMIN-TRIGGER-NOTICIA] Error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Admin endpoint: disparar Encuesta Interactiva Diaria (Grupo 2 y Canal)
  // Uso: POST /admin/trigger-poll { token, force }
  app.post('/admin/trigger-poll', async (req: any, res: any) => {
    const { token, force } = req.body || {};
    if (token !== 'vecy2025admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
      const { publishDailyPollNow } = await import('./cronService');
      const result = await publishDailyPollNow(force ?? true);
      res.json(result);
    } catch (err: any) {
      console.error('[ADMIN-TRIGGER-POLL] Error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // tRPC API
  app.use("/api/trpc", (req, res, next) => {
    console.log(`[TRPC-ROUTER] ${req.method} ${req.url}`);
    next();
  });
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

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port}/`);

    // NOTA PROTECCIÓN SUPABASE EGRESS: El recálculo y limpieza se ejecuta en el cron diario (08:00 AM)
    // para evitar descargar miles de registros en cada reinicio del servidor PM2.

    // Inicializar los Bots de WhatsApp de Vecy Network (Baileys)
    // Operación exclusiva del Bot Oficial JanIA (+573192919978).
    const isDev = process.env.NODE_ENV === "development";
    const shouldStartBot = isDev
      ? (process.env.ENABLE_LOCAL_WHATSAPP === "true" || process.env.ENABLE_WHATSAPP_BOT === "true")
      : (process.env.ENABLE_WHATSAPP_BOT !== "false" || process.env.ENABLE_JANIA_MATCH_BOT === "true");

    if (shouldStartBot) {
      console.log("Iniciando Bot Oficial JanIA (+573192919978) Baileys (.baileys_auth)...");
      import("./whatsapp-match").then(({ janiaMatchBot }) => {
        janiaMatchBot.initialize();
      }).catch(err => console.error("[WHATSAPP-MATCH] Error al iniciar bot oficial:", err));
    } else {
      if (isDev) {
        console.log("[WHATSAPP-BOT] 🛡️ Socket Baileys deshabilitado en desarrollo local para proteger el bot en producción VPS (use ENABLE_LOCAL_WHATSAPP=true para forzar conexión local).");
      } else {
        console.log("[WHATSAPP-BOT] Deshabilitado temporalmente mediante variables de entorno.");
      }
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
    if (janiaMatchBot) {
      console.log("[SYSTEM] Cerrando sesión de JanIA Match Bot (Baileys)...");
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
