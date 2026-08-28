import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { invokeLLM } from '../_core/llm';
import { getDb } from '../db';
import { conversations, messages, leads, propertyMatches, properties, requirements, propertyImages, propertyPublicationHistory, pendingSessions, inmobiliarioLexicon, matchFeedback } from '../../drizzle/schema';
import { eq, desc, sql, inArray, gte } from 'drizzle-orm';

import { scrapePropertyLink } from '../_core/scraper';
import { JANIA_PROMPT, processWhatsAppMessage, propagateBrokerPhoneAcrossAllListings } from '../_core/janIA';
import { liquidarImpuestosVenta } from '../_core/taxEngine';
import { explicarMatch, findMatchesForProperty, findMatchesForRequirement } from '../_core/matching';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { transcribeAudioBuffer } from '../_core/voiceTranscription';

// In-memory micro-cache for blazing fast admin responsiveness
let cachedAllMatchesData: any = null;
let cachedAllMatchesTime = 0;

let cachedBotStatusData: any = null;
let cachedBotStatusTime = 0;

export function invalidateAdminMatchesCache() {
  cachedAllMatchesTime = 0;
  cachedAllMatchesData = null;
}

export const janIARouter = router({
  // New: Extract property data from link
  extractFromLink: publicProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input }) => {
      try {
        const data = await scrapePropertyLink(input.url);
        return {
          success: true,
          data
        };
      } catch (error) {
        console.error('Error in extractFromLink:', error);
        throw new Error('No se pudo extraer la información del link. Verifica que sea un enlace válido de un inmueble.');
      }
    }),

  // Chat endpoint
  chat: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        message: z.string(),
        propertyId: z.number().optional(),
        leadId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        // Get or create conversation
        let conversation = await db
          .select()
          .from(conversations)
          .where(eq(conversations.sessionId, input.sessionId))
          .limit(1);

        let conversationId: number;

        if (conversation.length === 0) {
          // Create new conversation
          const insertData: any = {
            sessionId: input.sessionId,
            status: 'active',
          };
          if (ctx.user) {
            insertData.userId = String(ctx.user.id);
          }
          const result = await db.insert(conversations).values(insertData).returning();
          conversationId = result[0]?.id || 1;
        } else {
          conversationId = conversation[0].id;
          // Associate with user if not associated yet
          if (ctx.user && !conversation[0].userId) {
            await db
              .update(conversations)
              .set({ userId: String(ctx.user.id) })
              .where(eq(conversations.id, conversationId));
          }
        }

        const mockUserId = ctx.user ? `web-user-${ctx.user.id}` : `web-session-${input.sessionId}`;
        const mockUserName = ctx.user ? (ctx.user.name ?? undefined) : "Usuario Web";

        // Detect if the message is a raw property offer/demand listing vs a consultation question
        const lowerMsg = input.message.toLowerCase();
        const isListingData = (lowerMsg.includes("vendo") || lowerMsg.includes("busco") || lowerMsg.includes("ofrezco") || lowerMsg.includes("necesito")) &&
          (lowerMsg.includes("apto") || lowerMsg.includes("apartamento") || lowerMsg.includes("casa") || lowerMsg.includes("lote") || lowerMsg.includes("local") || lowerMsg.includes("bodega") || lowerMsg.includes("oficina") || lowerMsg.includes("finca"));

        let janIAResponse = "";
        let wantsVoice = false;
        let voiceResponse = "";

        if (isListingData) {
          // Extraction & database insertion pipeline for property listings
          const result = await processWhatsAppMessage(
            input.message,
            mockUserId,
            mockUserName,
            false,
            [],
            undefined,
            undefined,
            false
          );
          janIAResponse = (result.response && result.response.trim() !== "")
            ? result.response
            : (result.dmResponse || result.response || "¡Entendido! He registrado la información en VECY Network.");
          wantsVoice = result.wantsVoice || false;
          voiceResponse = result.voiceResponse || janIAResponse;
        } else {
          // Direct ultra-fast LLM reasoning for web consultation questions & natural chat with JanIA
          const { invokeLLM } = await import("../_core/llm");
          const { buildSystemPrompt, getLiveStats } = await import("../_core/janIA");
          const { getGreetingByTime } = await import("../_core/whatsapp-utils");
          const { resolveNameAndGender } = await import("../_core/nameAndGenderResolver");

          // Bogotá time calculation (Horario Oficial Bogotá: 01:00-11:59 Buenos días, 12:00-18:59 Buenas tardes, 19:00-00:59 Buenas noches)
          const timeGreeting = getGreetingByTime();
          const nowBogota = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
          const hour = nowBogota.getHours();

          const isRegistered = !!ctx.user;
          const rawName = ctx.user?.name || "";
          const nameInfo = resolveNameAndGender(rawName, timeGreeting);
          const resolvedName = nameInfo.displayName;
          const isFemale = nameInfo.isFemale;
          const genderTerm = rawName ? nameInfo.genderTerm : "estimado/a usuario/a";

          const liveStats = await getLiveStats();
          const userContextInstruction = isRegistered
            ? `\n\n[INFORMACIÓN DEL USUARIO REGISTRADO]:\n- Estado: REGISTRADO EN LA PLATAFORMA VECY NETWORK ✅\n- Nombre: "${rawName}" (Nombre/Apodo: "${resolvedName}")\n- Saludo de hora actual en Bogotá (${hour}:00): "${timeGreeting}"\n- Trato respetuoso: "${genderTerm}"\n- INSTRUCCIÓN: Si es el primer mensaje de la sesión, salúdalo con "${timeGreeting}, ${genderTerm}". Si ya están interactuando, integra su nombre "${resolvedName}" naturalmente sin repetir saludos repetitivos.`
            : `\n\n[INFORMACIÓN DEL USUARIO NO REGISTRADO / ANÓNIMO]:\n- Estado: NO REGISTRADO (Navegante anónimo)\n- Saludo de hora actual en Bogotá (${hour}:00): "${timeGreeting}"\n- INSTRUCCIÓN DE INTERACCIÓN:\n  1. Si no te ha dicho su nombre en los mensajes previos, salúdalo cordialmente con "${timeGreeting}" y pregúntale amablemente: "¿Con quién tengo el gusto de interactuar?" para recordarlo en la conversación.\n  2. Invítalo amablemente a registrarse gratuitamente en la plataforma VECY Network (https://vecy-network.vercel.app/) para guardar su nombre, asociar su cuenta y acceder a su propio historial completo de conversaciones.`;

          const systemPrompt = `${buildSystemPrompt('web')}\n\n${liveStats}${userContextInstruction}\n\n[INSTRUCCIÓN MAESTRA - CHAT WEB VECY 24/7]: Eres JanIA Match, la Inteligencia Artificial viva y consultora inmobiliaria senior de VECY Network. Tienes razonamiento lógico, amplio criterio jurídico, financiero y de mercado inmobiliario. Responde directamente a la consulta del usuario de forma elocuente, profesional, completa y estructurada. PROHIBIDO usar plantillas fijas o cierres/firmas con membretes. Responde en formato JSON estrictamente como: {"response": "tu respuesta viva y razonada"}`;

          // Fetch recent 6 messages for conversation context
          const recentHistory = await db
            .select({ role: messages.role, content: messages.content })
            .from(messages)
            .where(eq(messages.conversationId, conversationId))
            .orderBy(desc(messages.createdAt))
            .limit(6);

          const formattedHistory = recentHistory.reverse().map(m => ({
            role: m.role === "janIA" ? "assistant" : "user",
            content: m.content
          }));

          const llmMessages = [
            { role: "system", content: systemPrompt },
            ...formattedHistory,
            { role: "user", content: input.message }
          ];

          try {
            const llmRes = await invokeLLM({
              messages: llmMessages,
              responseFormat: { type: "json_object" }
            });

            const rawContent = (llmRes as any)?.choices?.[0]?.message?.content || "";
            try {
              const parsed = JSON.parse(rawContent);
              janIAResponse = parsed.response || parsed.respuesta || rawContent;
            } catch {
              janIAResponse = rawContent.replace(/^\{[\s\S]*"response"\s*:\s*"/, '').replace(/"\s*\}$/, '').trim();
            }
          } catch (llmErr: any) {
            console.warn("[JanIA-Chat] Fallback en LLM por congestión:", llmErr?.message);
            janIAResponse = `Hola, con gusto te asesoro. He recibido tu consulta: "${input.message.slice(0, 100)}". Nuestros servicios de inteligencia inmobiliaria están activos y cruzando oportunidades. ¿Deseas que busquemos detalles específicos en la base de datos nacional?`;
          }

          if (!janIAResponse || janIAResponse.trim() === "") {
            janIAResponse = `${timeGreeting}. ¡Bienvenido a VECY Network! ¿Con quién tengo el gusto de interactuar? Te invito a registrarte gratuitamente en nuestra plataforma para acceder a tu historial completo de conversaciones. ¿En qué consulta inmobiliaria puedo asesorarte hoy?`;
          }
        }

        // Save user message
        await db.insert(messages).values({
          conversationId: conversationId,
          role: 'user',
          content: input.message,
          messageType: 'text',
        });

        // Save JanIA response (clean text)
        await db.insert(messages).values({
          conversationId: conversationId,
          role: 'janIA',
          content: janIAResponse,
          messageType: 'text',
        });

        // Update conversation
        await db
          .update(conversations)
          .set({
            lastMessage: janIAResponse,
            updatedAt: new Date(),
          })
          .where(eq(conversations.id, conversationId));

        return {
          content: janIAResponse,
          wantsVoice,
          voiceResponse: voiceResponse || janIAResponse,
          conversationId,
        };

      } catch (error) {
        console.error('Error in JanIA chat:', error);
        throw error;
      }
    }),

  // Get all conversations for a user
  getUserConversations: publicProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) return [];
      const db = await getDb();
      if (!db) return [];

      try {
        return await db
          .select()
          .from(conversations)
          .where(eq(conversations.userId, String(ctx.user.id)))
          .orderBy(desc(conversations.updatedAt));
      } catch (error) {
        console.error('Error getting user conversations:', error);
        return [];
      }
    }),

  // Admin: Get all conversations in the system
  getAllConversations: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];
      try {
        return await db
          .select()
          .from(conversations)
          .orderBy(desc(conversations.updatedAt));
      } catch (error) {
        console.error('Error getting all conversations:', error);
        return [];
      }
    }),

  // Get messages for a conversation session
  getConversationMessages: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        const conv = await db
          .select()
          .from(conversations)
          .where(eq(conversations.sessionId, input.sessionId))
          .limit(1);

        if (conv.length === 0) return [];

        return await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conv[0].id))
          .orderBy(messages.createdAt);
      } catch (error) {
        console.error('Error getting conversation messages:', error);
        return [];
      }
    }),

  // Delete a conversation and its messages
  deleteConversation: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        const conv = await db
          .select()
          .from(conversations)
          .where(eq(conversations.sessionId, input.sessionId))
          .limit(1);

        if (conv.length > 0) {
          // Delete messages first to satisfy foreign key constraints
          await db.delete(messages).where(eq(messages.conversationId, conv[0].id));
          await db.delete(conversations).where(eq(conversations.id, conv[0].id));
        }

        return { success: true };
      } catch (error) {
        console.error('Error deleting conversation:', error);
        throw error;
      }
    }),

  // Analyze file endpoint
  analyzeFile: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        fileUrl: z.string(),
        fileType: z.string(),
        propertyId: z.number().optional(),
        leadId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        let imageBuffer: string | undefined;
        let pdfBuffer: string | undefined;
        let pdfMimeType: string | undefined;
        let audioTranscriptionText: string | undefined;

        try {
          console.log(`[JanIA-Router] Descargando archivo desde URL para análisis: ${input.fileUrl}`);
          const fileRes = await axios.get(input.fileUrl, { responseType: 'arraybuffer' });
          const rawBuffer = Buffer.from(fileRes.data);
          const base64Data = rawBuffer.toString('base64');
          const contentTypeHeader = fileRes.headers['content-type'];
          const contentType = typeof contentTypeHeader === 'string' ? contentTypeHeader : (input.fileType || '');

          if (contentType.includes('pdf') || input.fileUrl.toLowerCase().endsWith('.pdf')) {
            pdfBuffer = base64Data;
            pdfMimeType = contentType || 'application/pdf';
            console.log('[JanIA-Router] Archivo detectado como PDF.');
          } else if (contentType.includes('image') || input.fileUrl.toLowerCase().match(/\.(jpe?g|png|gif|webp)$/i)) {
            imageBuffer = base64Data;
            console.log('[JanIA-Router] Archivo detectado como Imagen.');
          } else if (contentType.includes('audio') || input.fileUrl.toLowerCase().match(/\.(ogg|mp3|wav|m4a|aac|webm)$/i)) {
            console.log('[JanIA-Router] Archivo detectado como Audio / Nota de voz. Transcribiendo...');
            const mime = contentType.includes('audio') ? contentType : (input.fileUrl.endsWith('.ogg') ? 'audio/ogg' : 'audio/mp3');
            try {
              const transcribed = await transcribeAudioBuffer(rawBuffer, mime);
              if (transcribed && transcribed.trim()) {
                audioTranscriptionText = transcribed.trim();
                console.log(`[JanIA-Router] Audio transcrito exitosamente: "${audioTranscriptionText.substring(0, 80)}..."`);
              }
            } catch (sttErr: any) {
              console.warn('[JanIA-Router] Error en transcripción de audio:', sttErr?.message || sttErr);
            }
          }
        } catch (downloadError: any) {
          console.error('[JanIA-Router] Error descargando archivo de análisis:', downloadError.message || downloadError);
        }

        const mockUserId = ctx.user ? `web-user-${ctx.user.id}` : `web-session-${input.sessionId}`;
        const mockUserName = ctx.user ? (ctx.user.name ?? undefined) : "Usuario Web";

        const messageText = audioTranscriptionText
          ? `[Nota de voz / Audio transcrito]: ${audioTranscriptionText}`
          : `[Archivo: ${input.fileType}]`;

        const result = await processWhatsAppMessage(
          messageText,
          mockUserId,
          mockUserName,
          true, // hasMedia
          [],   // scrapedData
          undefined, // audioUrl
          imageBuffer,
          false,     // isGroup
          pdfBuffer,
          pdfMimeType
        );

        const analysis = result.response && result.response.trim() !== ""
          ? (result.dmResponse ? result.dmResponse + "\n\n" : "") + result.response
          : (result.dmResponse || result.response);

        // Save conversation history in DB if it exists
        const conversation = await db
          .select()
          .from(conversations)
          .where(eq(conversations.sessionId, input.sessionId))
          .limit(1);

        if (conversation.length > 0) {
          const conversationId = conversation[0].id;

          // Save user message with attachment URL
          await db.insert(messages).values({
            conversationId: conversationId,
            role: 'user',
            content: `[Archivo: ${input.fileType}]`,
            messageType: imageBuffer ? 'image' : 'file',
            metadata: { attachments: [input.fileUrl] },
          });

          // Save JanIA response
          await db.insert(messages).values({
            conversationId: conversationId,
            role: 'janIA',
            content: analysis,
            messageType: 'text',
          });

          // Update conversation last message
          await db
            .update(conversations)
            .set({
              lastMessage: analysis,
              updatedAt: new Date(),
            })
            .where(eq(conversations.id, conversationId));
        }

        return {
          analysis,
        };
      } catch (error) {
        console.error('Error analyzing file:', error);
        throw error;
      }
    }),

  // Get property matches
  getPropertyMatches: publicProcedure
    .input(
      z.object({
        requirementId: z.number(),
        limit: z.number().default(5),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        const matches = await db
          .select()
          .from(propertyMatches)
          .where(eq(propertyMatches.requirementId, input.requirementId))
          .orderBy(desc(propertyMatches.matchScore))
          .limit(input.limit) as any[];

        return matches;
      } catch (error) {
        console.error('Error getting property matches:', error);
        throw error;
      }
    }),

  // Get all matches in the network
  getAllMatches: publicProcedure
    .query(async () => {
      const now = Date.now();
      if (cachedAllMatchesData && (now - cachedAllMatchesTime) < 30000) {
        return cachedAllMatchesData;
      }

      const db = await getDb();
      if (!db) {
        if (cachedAllMatchesData) return cachedAllMatchesData;
        throw new Error('Database not available');
      }

      try {
        const matches = await db
          .select({
            id: propertyMatches.id,
            matchScore: propertyMatches.matchScore,
            matchReason: propertyMatches.matchReason,
            matchExplanation: propertyMatches.matchExplanation,
            ipc: propertyMatches.ipc,
            status: propertyMatches.status,
            ownerConfirmed: propertyMatches.ownerConfirmed,
            seekerConfirmed: propertyMatches.seekerConfirmed,
            createdAt: propertyMatches.createdAt,
            property: {
              id: properties.id,
              name: properties.name,
              description: properties.description,
              price: properties.price,
              city: properties.city,
              zone: properties.zone,
              addressNeighborhood: properties.addressNeighborhood,
              idUsuarioWhatsapp: properties.idUsuarioWhatsapp,
              nombreUsuarioWhatsapp: properties.nombreUsuarioWhatsapp,
              origenNombre: properties.origenNombre,
              origenTipo: properties.origenTipo,
              origenId: properties.origenId,
              propertyType: properties.propertyType,
              transactionType: properties.transactionType,
              bedrooms: properties.bedrooms,
              bathrooms: properties.bathrooms,
              garages: properties.garages,
              stratum: properties.stratum,
              areaTotal: properties.areaTotal,
              areaPrivate: properties.areaPrivate,
              adminFee: properties.adminFee,
              isAmoblado: properties.isAmoblado,
              rawText: properties.rawText,
              externalUrl: properties.externalUrl,
              enlaceOrigen: properties.enlaceOrigen,
              portal: properties.portal,
              externalListingId: properties.externalListingId,
              canonicalExternalId: properties.canonicalExternalId,
              fechaPrimeraPublicacion: properties.fechaPrimeraPublicacion,
              fechaUltimaPublicacion: properties.fechaUltimaPublicacion,
              republicacionesCount: properties.republicacionesCount,
              estadoComercial: properties.estadoComercial,
              ultimaActividad: properties.ultimaActividad,
              vigenciaIa: properties.vigenciaIa,
              createdAt: properties.createdAt,
            },
            requirement: {
              id: requirements.id,
              name: requirements.name,
              presupuestoMin: requirements.presupuestoMin,
              presupuestoMax: requirements.presupuestoMax,
              ciudadDeseada: requirements.ciudadDeseada,
              zonaDeseada: requirements.zonaDeseada,
              addressNeighborhood: requirements.addressNeighborhood,
              idUsuarioWhatsapp: requirements.idUsuarioWhatsapp,
              nombreUsuarioWhatsapp: requirements.nombreUsuarioWhatsapp,
              origenNombre: requirements.origenNombre,
              origenTipo: requirements.origenTipo,
              origenId: requirements.origenId,
              tipoInmuebleDeseado: requirements.tipoInmuebleDeseado,
              tipoNegocioDeseado: requirements.tipoNegocioDeseado,
              habitacionesMin: requirements.habitacionesMin,
              banosMin: requirements.banosMin,
              parqueaderosMin: requirements.parqueaderosMin,
              areaMin: requirements.areaMin,
              estratoDeseado: requirements.estratoDeseado,
              amobladoDeseado: requirements.amobladoDeseado,
              rawText: requirements.rawText,
              enlaceOrigen: requirements.enlaceOrigen,
              createdAt: requirements.createdAt,
            }
          })
          .from(propertyMatches)
          .innerJoin(properties, eq(propertyMatches.propertyId, properties.id))
          .innerJoin(requirements, eq(propertyMatches.requirementId, requirements.id))
          .where(sql`CAST(${propertyMatches.matchScore} AS NUMERIC) >= 85`)
          .orderBy(desc(propertyMatches.id))
          .limit(150);

        // Obtener imágenes registradas para todas las propiedades resultantes
        const propIds = Array.from(new Set(matches.map(m => m.property.id)));
        const imagesMap: Record<number, string[]> = {};
        if (propIds.length > 0) {
          const imgs = await db.select({
            propertyId: propertyImages.propertyId,
            imageUrl: propertyImages.imageUrl
          }).from(propertyImages).where(inArray(propertyImages.propertyId, propIds));
          for (const img of imgs) {
            if (!imagesMap[img.propertyId]) imagesMap[img.propertyId] = [];
            imagesMap[img.propertyId].push(img.imageUrl);
          }
        }

        // Re-evaluación en tiempo real con Motor v20.0 y Deduplicación en Servidor
        const seenPairs = new Set<string>();
        const validEvaluatedMatches: any[] = [];

        for (const m of matches) {
          const key = `${m.property.id}-${m.requirement.id}`;
          if (seenPairs.has(key)) continue; // Eliminar duplicados

          // Re-evaluar en tiempo real con el motor de guillotinas estrictas (explicarMatch)
          const evaluation = explicarMatch(m.requirement, m.property);

          // Si el score recalculado en tiempo real es menor a 85% o falla cualquier filtro duro -> Descartar
          if (evaluation.score < 85) {
            continue;
          }

          const finalScore = evaluation.score;


          seenPairs.add(key);
          validEvaluatedMatches.push({
            ...m,
            property: {
              ...m.property,
              images: imagesMap[m.property.id] || []
            },
            matchScore: finalScore.toFixed(2),
            matchExplanation: evaluation as any
          });
        }

        let finalMatches = validEvaluatedMatches;
        const propertyIds = validEvaluatedMatches.map(m => m.property.id).filter(Boolean);
        if (propertyIds.length > 0) {
          const histories = await db
            .select()
            .from(propertyPublicationHistory)
            .where(inArray(propertyPublicationHistory.propertyId, propertyIds))
            .orderBy(desc(propertyPublicationHistory.fecha));

          finalMatches = validEvaluatedMatches.map(m => {
            const propertyHistory = histories.filter(h => h.propertyId === m.property.id);
            return {
              ...m,
              property: {
                ...m.property,
                publicationHistory: propertyHistory
              }
            };
          });
        }

        cachedAllMatchesData = finalMatches;
        cachedAllMatchesTime = Date.now();
        return finalMatches;
      } catch (error) {
        if (cachedAllMatchesData) return cachedAllMatchesData;
        console.error('Error getting all matches:', error);
        throw error;
      }
    }),

  // Actualizar datos prediales de un inmueble oferta directamente desde la Mesa de Cotejo
  updatePropertyDetails: publicProcedure
    .input(z.object({
      propertyId: z.number(),
      name: z.string().optional(),
      price: z.string().optional(),
      rentPrice: z.string().optional().nullable(),
      adminFee: z.string().optional().nullable(),
      bedrooms: z.number().optional().nullable(),
      bathrooms: z.number().optional().nullable(),
      garages: z.number().optional().nullable(),
      areaTotal: z.string().optional().nullable(),
      stratum: z.number().optional().nullable(),
      zone: z.string().optional().nullable(),
      addressNeighborhood: z.string().optional().nullable(),
      addressLocality: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
      propertyType: z.string().optional().nullable(),
      transactionType: z.string().optional().nullable(),
      idUsuarioWhatsapp: z.string().optional().nullable(),
      nombreUsuarioWhatsapp: z.string().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const existingProp = await db.select().from(properties).where(eq(properties.id, input.propertyId)).limit(1).then(r => r[0]);

      const { propertyId, ...updateFields } = input;
      const updateData: Record<string, any> = {};
      for (const [key, value] of Object.entries(updateFields)) {
        if (value !== undefined) updateData[key] = value;
      }
      updateData.updatedAt = new Date();

      await db.update(properties).set(updateData).where(eq(properties.id, propertyId));
      console.log(`[JanIA-UpdateProperty] Propiedad #${propertyId} actualizada directamente desde Mesa de Cotejo (incluyendo teléfono: ${input.idUsuarioWhatsapp || 'N/A'})`);

      // Propagar en cascada a todas las demás publicaciones del mismo broker (pasadas y futuras)
      if (input.idUsuarioWhatsapp || input.nombreUsuarioWhatsapp) {
        try {
          await propagateBrokerPhoneAcrossAllListings({
            rawPhoneOrText: input.idUsuarioWhatsapp || existingProp?.idUsuarioWhatsapp || '',
            brokerName: input.nombreUsuarioWhatsapp || existingProp?.nombreUsuarioWhatsapp,
            oldPhoneOrLid: existingProp?.idUsuarioWhatsapp
          });
        } catch (propErr: any) {
          console.warn(`[JanIA-UpdateProperty] Advertencia en propagación de teléfono:`, propErr?.message);
        }
      }

      // Invalidate in-memory matches cache for immediate fresh response
      invalidateAdminMatchesCache();

      return { success: true, message: "Propiedad actualizada y teléfono propagado con éxito" };
    }),

  // Actualizar datos prediales de un requerimiento demanda directamente desde la Mesa de Cotejo
  updateRequirementDetails: publicProcedure
    .input(z.object({
      requirementId: z.number(),
      name: z.string().optional(),
      presupuestoMax: z.string().optional(),
      presupuestoMin: z.string().optional().nullable(),
      adminFeeMax: z.string().optional().nullable(),
      habitacionesMin: z.number().optional().nullable(),
      banosMin: z.number().optional().nullable(),
      parqueaderosMin: z.number().optional().nullable(),
      areaMin: z.string().optional().nullable(),
      estratoDeseado: z.number().optional().nullable(),
      zonaDeseada: z.string().optional().nullable(),
      addressNeighborhood: z.string().optional().nullable(),
      ciudadDeseada: z.string().optional().nullable(),
      tipoInmuebleDeseado: z.string().optional().nullable(),
      tipoNegocioDeseado: z.string().optional().nullable(),
      idUsuarioWhatsapp: z.string().optional().nullable(),
      nombreUsuarioWhatsapp: z.string().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const existingReq = await db.select().from(requirements).where(eq(requirements.id, input.requirementId)).limit(1).then(r => r[0]);

      const { requirementId, ...updateFields } = input;
      const updateData: Record<string, any> = {};
      for (const [key, value] of Object.entries(updateFields)) {
        if (value !== undefined) updateData[key] = value;
      }
      updateData.updatedAt = new Date();

      await db.update(requirements).set(updateData).where(eq(requirements.id, requirementId));
      console.log(`[JanIA-UpdateRequirement] Requerimiento #${requirementId} actualizado directamente desde Mesa de Cotejo (incluyendo teléfono: ${input.idUsuarioWhatsapp || 'N/A'})`);

      // Propagar en cascada a todas las demás publicaciones del mismo broker (pasadas y futuras)
      if (input.idUsuarioWhatsapp || input.nombreUsuarioWhatsapp) {
        try {
          await propagateBrokerPhoneAcrossAllListings({
            rawPhoneOrText: input.idUsuarioWhatsapp || existingReq?.idUsuarioWhatsapp || '',
            brokerName: input.nombreUsuarioWhatsapp || existingReq?.nombreUsuarioWhatsapp,
            oldPhoneOrLid: existingReq?.idUsuarioWhatsapp
          });
        } catch (propErr: any) {
          console.warn(`[JanIA-UpdateRequirement] Advertencia en propagación de teléfono:`, propErr?.message);
        }
      }

      // Invalidate in-memory matches cache for immediate fresh response
      invalidateAdminMatchesCache();

      return { success: true, message: "Requerimiento actualizado y teléfono propagado con éxito" };
    }),

  // Recalcular cruces y afinidad predial para Oferta y/o Demanda tras edición en Mesa de Cotejo
  recalculateMatchForPair: publicProcedure
    .input(z.object({
      propertyId: z.number().optional().nullable(),
      requirementId: z.number().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      invalidateAdminMatchesCache();
      let propMatchesCount = 0;
      let reqMatchesCount = 0;

      if (input.propertyId) {
        try {
          const resProp = await findMatchesForProperty(input.propertyId);
          propMatchesCount = Array.isArray(resProp) ? resProp.length : 0;
        } catch (e: any) {
          console.error(`[RecalculateMatch] Error reculculando propiedad #${input.propertyId}:`, e?.message);
        }
      }

      if (input.requirementId) {
        try {
          const resReq = await findMatchesForRequirement(input.requirementId);
          reqMatchesCount = Array.isArray(resReq) ? resReq.length : 0;
        } catch (e: any) {
          console.error(`[RecalculateMatch] Error recalculando requerimiento #${input.requirementId}:`, e?.message);
        }
      }

      console.log(`[JanIA-RecalculateMatch] Recálculo completado -> Propiedad #${input.propertyId}: ${propMatchesCount} matches | Requerimiento #${input.requirementId}: ${reqMatchesCount} matches`);
      return {
        success: true,
        message: "Match recalculado exitosamente con datos actualizados.",
        propMatchesCount,
        reqMatchesCount,
      };
    }),

  // Registrar Retroalimentación de Match (Capa C - Feedback Loop)
  recordMatchFeedback: publicProcedure
    .input(z.object({
      matchId: z.number().optional().nullable(),
      propertyId: z.number().optional().nullable(),
      requirementId: z.number().optional().nullable(),
      action: z.enum(['exitoso', 'rechazado', 'en_negociacion']),
      motivoRechazo: z.string().optional().nullable(),
      notasBroker: z.string().optional().nullable(),
      ajustesGuardados: z.record(z.string(), z.any()).optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de datos no disponible");

      try {
        const [feedback] = await db.insert(matchFeedback).values({
          matchId: input.matchId || null,
          propertyId: input.propertyId || null,
          requirementId: input.requirementId || null,
          action: input.action,
          motivoRechazo: input.motivoRechazo || null,
          notasBroker: input.notasBroker || null,
          ajustesGuardados: input.ajustesGuardados || null,
        }).returning();

        // Si el match fue rechazado, actualizar el status en propertyMatches
        if (input.matchId && input.action === 'rechazado') {
          await db.update(propertyMatches)
            .set({ status: 'rejected' })
            .where(eq(propertyMatches.id, input.matchId));
        }

        console.log(`[JanIA-Feedback] Feedback registrado para Match #${input.matchId}: ${input.action} - ${input.motivoRechazo || 'Sin motivo'}`);
        return { success: true, feedbackId: feedback.id };
      } catch (e: any) {
        console.error("[JanIA-Feedback] Error guardando feedback:", e.message);
        throw new Error(`Error guardando feedback: ${e.message}`);
      }
    }),

  // Obtener Glosario y Léxico Vivo de JanIA (Capa B)
  getInmobiliarioLexicon: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];
      try {
        const terms = await db.select().from(inmobiliarioLexicon).orderBy(desc(inmobiliarioLexicon.frecuenciaUso)).limit(100);
        return terms;
      } catch (e: any) {
        console.error("[JanIA-Lexicon] Error obteniendo léxico:", e.message);
        return [];
      }
    }),

  // Aprender o Registrar Nuevo Término Inmobiliario (Capa B)
  learnNewLexiconTerm: publicProcedure
    .input(z.object({
      terminoColoquial: z.string(),
      categoria: z.string(),
      conceptoCanonico: z.string(),
      origen: z.string().default('humano_validado'),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de datos no disponible");

      try {
        const cleanTerm = input.terminoColoquial.toLowerCase().trim();
        const [term] = await db.insert(inmobiliarioLexicon).values({
          terminoColoquial: cleanTerm,
          categoria: input.categoria,
          conceptoCanonico: input.conceptoCanonico,
          frecuenciaUso: 1,
          origen: input.origen,
        }).onConflictDoUpdate({
          target: inmobiliarioLexicon.terminoColoquial,
          set: {
            frecuenciaUso: sql`${inmobiliarioLexicon.frecuenciaUso} + 1`,
            updatedAt: new Date(),
          }
        }).returning();

        return { success: true, term };
      } catch (e: any) {
        console.error("[JanIA-Lexicon] Error registrando término:", e.message);
        throw new Error(`Error registrando término: ${e.message}`);
      }
    }),


  // Create lead from conversation
  createLead: publicProcedure
    .input(
      z.object({
        name: z.string(),
        email: z.string().email(),
        phone: z.string().optional(),
        inquiryType: z.enum(['buy', 'sell', 'rent', 'invest', 'general']),
        budget: z.string().optional(),
        preferredZones: z.array(z.string()).optional(),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        const messageWithDetails = [
          input.message,
          input.budget ? `Presupuesto: ${input.budget}` : null,
          input.preferredZones && input.preferredZones.length > 0
            ? `Zonas de interés: ${input.preferredZones.join(', ')}`
            : null
        ].filter(Boolean).join('\n');

        const result = await db.insert(leads).values({
          name: input.name,
          email: input.email,
          phone: input.phone,
          inquiryType: input.inquiryType,
          message: messageWithDetails,
          source: 'janIA',
          status: 'new',
        });

        return {
          leadId: (result as any).insertId || 0,
          success: true,
        };
      } catch (error) {
        console.error('Error creating lead:', error);
        throw error;
      }
    }),

  // Get market analysis for zone
  getMarketAnalysis: publicProcedure
    .input(z.object({ zone: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        // Get properties in zone to analyze
        const zoneProperties = await db
          .select()
          .from(properties)
          .where(eq(properties.zone, input.zone)) as any[];

        if (zoneProperties.length === 0) {
          return {
            zone: input.zone,
            message: 'No hay propiedades disponibles en esta zona.',
          };
        }

        // Calculate average prices
        const prices = zoneProperties
          .map(p => parseFloat(p.price.toString()))
          .filter(p => !isNaN(p));

        const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

        return {
          zone: input.zone,
          totalProperties: zoneProperties.length,
          averagePrice: avgPrice,
          properties: zoneProperties.slice(0, 5),
        };
      } catch (error) {
        console.error('Error getting market analysis:', error);
        throw error;
      }
    }),

  // Get current WhatsApp bot connection status and ingestion stats
  getBotStatus: publicProcedure.query(async () => {
    const now = Date.now();
    if (cachedBotStatusData && (now - cachedBotStatusTime) < 15000) {
      return cachedBotStatusData;
    }

    const db = await getDb();
    if (!db) return cachedBotStatusData || { isReady: true, phone: "573192919978", todayProperties: 0, todayRequirements: 0 };

    try {
      let isReady = true;
      let phone: string | null = "573192919978";

      // 1. Query the database-persisted bot status heartbeat (written by the VPS bot)
      const [statusRow] = await db
        .select()
        .from(pendingSessions)
        .where(eq(pendingSessions.jid, "system:bot_status"))
        .limit(1);

      if (statusRow) {
        const data = statusRow.sessionData as { isReady: boolean; phone: string | null; updatedAt: string };
        if (data && data.phone) {
          phone = data.phone;
        }
      }

      // Contadores del día según hora local de Bogotá (UTC-5)
      const [propTodayCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(properties)
        .where(sql`DATE(${properties.createdAt} AT TIME ZONE 'America/Bogota') = CURRENT_DATE`);

      const [reqTodayCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(requirements)
        .where(sql`DATE(${requirements.createdAt} AT TIME ZONE 'America/Bogota') = CURRENT_DATE`);

      const result = {
        isReady,
        phone,
        todayProperties: propTodayCount?.count || 0,
        todayRequirements: reqTodayCount?.count || 0
      };

      cachedBotStatusData = result;
      cachedBotStatusTime = Date.now();
      return result;
    } catch (error: any) {
      if (cachedBotStatusData) return cachedBotStatusData;
      console.error("[BotStatus] Error checking bot status:", error);
      return { isReady: true, phone: "573192919978", todayProperties: 0, todayRequirements: 0 };
    }
  }),

  getQrCode: publicProcedure.query(async () => {
    try {
      const qrPath = path.join(process.cwd(), "qr-captador.png");
      const qrMatchPath = path.join(process.cwd(), "qr-match.png");

      let targetPath = fs.existsSync(qrPath) ? qrPath : (fs.existsSync(qrMatchPath) ? qrMatchPath : null);

      if (targetPath) {
        const fileData = fs.readFileSync(targetPath);
        return { hasQr: true, qrData: `data:image/png;base64,${fileData.toString("base64")}` };
      }
      return { hasQr: false, qrData: null };
    } catch (e) {
      return { hasQr: false, qrData: null };
    }
  }),

  // Get all requirements registered in the database
  getAllRequirements: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    try {
      return await db
        .select()
        .from(requirements)
        .orderBy(desc(requirements.id))
        .limit(300);
    } catch (error) {
      console.error('Error getting all requirements:', error);
      throw error;
    }
  }),

  // Real-time report stats from DB
  getReportStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    try {
      const [propTotal] = await db.select({ count: sql<number>`count(*)::int` }).from(properties);
      const [propActive] = await db.select({ count: sql<number>`count(*)::int` }).from(properties).where(sql`${properties.available} = true`);
      const [reqTotal] = await db.select({ count: sql<number>`count(*)::int` }).from(requirements);
      const [reqActive] = await db.select({ count: sql<number>`count(*)::int` }).from(requirements).where(eq(requirements.status, 'active'));
      const [matchTotal] = await db.select({ count: sql<number>`count(*)::int` }).from(propertyMatches);
      const [convTotal] = await db.select({ count: sql<number>`count(*)::int` }).from(conversations);

      // Tendencia mensual de los últimos 6 meses (propiedades y requerimientos)
      const monthlyProps = await db.execute(sql`
        SELECT to_char(date_trunc('month', "createdAt"), 'Mon YYYY') as mes,
               count(*)::int as total
        FROM properties
        WHERE "createdAt" >= now() - interval '6 months'
        GROUP BY 1 ORDER BY 1
      `);
      const monthlyReqs = await db.execute(sql`
        SELECT to_char(date_trunc('month', "createdAt"), 'Mon YYYY') as mes,
               count(*)::int as total
        FROM requirements
        WHERE "createdAt" >= now() - interval '6 months'
        GROUP BY 1 ORDER BY 1
      `);

      return {
        properties: { total: propTotal.count, active: propActive.count },
        requirements: { total: reqTotal.count, active: reqActive.count },
        matches: { total: matchTotal.count },
        conversations: { total: convTotal.count },
        monthlyProps: monthlyProps as unknown as { mes: string; total: number }[],
        monthlyReqs: monthlyReqs as unknown as { mes: string; total: number }[],
      };
    } catch (error) {
      console.error('Error getting report stats:', error);
      throw error;
    }
  }),

  // Liquidación tributaria de Retención en la Fuente y Ganancia Ocasional (DIAN v17.6)
  calcularImpuestos: publicProcedure
    .input(
      z.object({
        precioVenta: z.number().min(0),
        costoFiscal: z.number().min(0),
        anosPosesion: z.number().min(0),
        esViviendaHabitacion: z.boolean().default(false),
      })
    )
    .mutation(({ input }) => {
      return liquidarImpuestosVenta({
        precioVenta: input.precioVenta,
        costoFiscal: input.costoFiscal,
        anosPosesion: input.anosPosesion,
        esViviendaHabitacion: input.esViviendaHabitacion,
      });
    }),

  // Disparo manual/inmediato del tip del día a Grupo 2 y Canal oficial
  triggerDailyTip: publicProcedure
    .mutation(async () => {
      const { publishTodayTipNow } = await import('../_core/cronService');
      return await publishTodayTipNow();
    }),
});

export type JanIARouter = typeof janIARouter;

