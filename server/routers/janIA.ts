import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { invokeLLM } from '../_core/llm';
import { getDb } from '../db';
import { conversations, messages, leads, propertyMatches, properties } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';

const JANÍA_SYSTEM_PROMPT = `Eres JanIA, una asistente de IA especializada en bienes raíces en Colombia. Tu rol es:

1. **Ayudar a comprar/vender/invertir**: Proporciona información sobre propiedades, mercado, y oportunidades de inversión.
2. **Responder sobre normativa**: Conoces las leyes, impuestos, y regulaciones inmobiliarias en Colombia.
3. **Análisis de mercado**: Puedes analizar tendencias, precios y proporcionar recomendaciones basadas en datos.
4. **Matching de propiedades**: Sugieres propiedades que coinciden con los criterios del usuario.
5. **Limitaciones**: Solo respondes sobre bienes raíces en Colombia. Si te preguntan sobre otros temas, responde cortésmente que solo puedes ayudar con bienes raíces.

Sé amable, profesional y proporciona información precisa. Siempre intenta entender las necesidades del usuario y ofrece soluciones específicas.`;

export const janIARouter = router({
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
    .mutation(async ({ input }) => {
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
          const result = await db.insert(conversations).values({
            sessionId: input.sessionId,
            topic: 'general',
            messageCount: 0,
            status: 'active',
          }) as any;
          conversationId = result.insertId || 1;
        } else {
          conversationId = conversation[0].id;
        }

        // Get conversation history for context
        const conversationHistory = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conversationId))
          .orderBy(messages.createdAt);

        // Build message history for LLM
        const messageHistory = conversationHistory.map(msg => ({
          role: msg.role as 'user' | 'janIA' | 'system',
          content: msg.content,
        }));

        // Add current user message
        messageHistory.push({
          role: 'user',
          content: input.message,
        });

        // Call LLM
        const response = await invokeLLM({
          messages: [
            { role: 'system', content: JANÍA_SYSTEM_PROMPT },
            ...messageHistory.map(m => ({
              role: m.role as 'system' | 'user' | 'assistant',
              content: m.content,
            })),
          ],
        });

        const janIAResponse = typeof response.choices[0]?.message?.content === 'string' 
          ? response.choices[0].message.content 
          : 'No response';

        // Save user message
        await db.insert(messages).values({
          conversationId: conversationId,
          role: 'user',
          content: input.message,
          messageType: 'text',
        });

        // Save JanIA response
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
            messageCount: conversationHistory.length + 2,
            lastMessage: janIAResponse,
            updatedAt: new Date(),
          })
          .where(eq(conversations.id, conversationId));

        return {
          content: janIAResponse,
          conversationId,
        };
      } catch (error) {
        console.error('Error in JanIA chat:', error);
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
    .mutation(async ({ input }) => {
      try {
        // Prepare file content for analysis
        const fileContent = `[Archivo: ${input.fileType}]\nURL: ${input.fileUrl}`;

        const response = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: `${JANÍA_SYSTEM_PROMPT}\n\nAnaliza el archivo proporcionado y proporciona un análisis detallado relacionado con bienes raíces.`,
            },
            {
              role: 'user',
              content: fileContent as string,
            },
          ],
        });

        const analysis = typeof response.choices[0]?.message?.content === 'string'
          ? response.choices[0].message.content
          : 'No analysis available';

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
        leadId: z.number(),
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
          .where(eq(propertyMatches.leadId, input.leadId))
          .orderBy(desc(propertyMatches.matchScore))
          .limit(input.limit) as any[];

        return matches;
      } catch (error) {
        console.error('Error getting property matches:', error);
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
        const result = await db.insert(leads).values({
          name: input.name,
          email: input.email,
          phone: input.phone,
          inquiryType: input.inquiryType,
          budget: input.budget,
          preferredZones: input.preferredZones ? JSON.stringify(input.preferredZones) : null,
          message: input.message,
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
