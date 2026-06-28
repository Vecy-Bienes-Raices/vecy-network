import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { invokeLLM } from '../_core/llm';
import { getDb } from '../db';
import { conversations, messages, leads, propertyMatches, properties, requirements } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { scrapePropertyLink } from '../_core/scraper';
import { JANIA_PROMPT, processWhatsAppMessage } from '../_core/janIA';
import axios from 'axios';

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
        const mockUserName = ctx.user ? ctx.user.name : "Usuario Web";

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

        const janIAResponse = result.dmResponse || result.response;
        const wantsVoice = result.wantsVoice || false;
        const voiceResponse = result.voiceResponse || janIAResponse;

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

        try {
          console.log(`[JanIA-Router] Descargando archivo desde URL para análisis: ${input.fileUrl}`);
          const fileRes = await axios.get(input.fileUrl, { responseType: 'arraybuffer' });
          const base64Data = Buffer.from(fileRes.data).toString('base64');
          const contentTypeHeader = fileRes.headers['content-type'];
          const contentType = typeof contentTypeHeader === 'string' ? contentTypeHeader : (input.fileType || '');

          if (contentType.includes('pdf') || input.fileUrl.toLowerCase().endsWith('.pdf')) {
            pdfBuffer = base64Data;
            pdfMimeType = contentType || 'application/pdf';
            console.log('[JanIA-Router] Archivo detectado como PDF.');
          } else if (contentType.includes('image') || input.fileUrl.toLowerCase().match(/\.(jpe?g|png|gif|webp)$/i)) {
            imageBuffer = base64Data;
            console.log('[JanIA-Router] Archivo detectado como Imagen.');
          }
        } catch (downloadError: any) {
          console.error('[JanIA-Router] Error descargando archivo de análisis:', downloadError.message || downloadError);
        }

        const mockUserId = ctx.user ? `web-user-${ctx.user.id}` : `web-session-${input.sessionId}`;
        const mockUserName = ctx.user ? ctx.user.name : "Usuario Web";

        const result = await processWhatsAppMessage(
          `[Archivo: ${input.fileType}]`,
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

        const analysis = result.dmResponse || result.response;

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
            attachments: [input.fileUrl],
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
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        const matches = await db
          .select({
            id: propertyMatches.id,
            matchScore: propertyMatches.matchScore,
            matchReason: propertyMatches.matchReason,
            status: propertyMatches.status,
            createdAt: propertyMatches.createdAt,
            property: {
              id: properties.id,
              name: properties.name,
              price: properties.price,
              city: properties.city,
              zone: properties.zone,
              idUsuarioWhatsapp: properties.idUsuarioWhatsapp,
              propertyType: properties.propertyType,
              transactionType: properties.transactionType,
              rawText: properties.rawText,
            },
            requirement: {
              id: requirements.id,
              name: requirements.name,
              presupuestoMax: requirements.presupuestoMax,
              ciudadDeseada: requirements.ciudadDeseada,
              zonaDeseada: requirements.zonaDeseada,
              idUsuarioWhatsapp: requirements.idUsuarioWhatsapp,
              tipoInmuebleDeseado: requirements.tipoInmuebleDeseado,
              tipoNegocioDeseado: requirements.tipoNegocioDeseado,
              rawText: requirements.rawText,
            }
          })
          .from(propertyMatches)
          .innerJoin(properties, eq(propertyMatches.propertyId, properties.id))
          .innerJoin(requirements, eq(propertyMatches.requirementId, requirements.id))
          .orderBy(desc(propertyMatches.createdAt));

        return matches;
      } catch (error) {
        console.error('Error getting all matches:', error);
        throw error;
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
});

export type JanIARouter = typeof janIARouter;
