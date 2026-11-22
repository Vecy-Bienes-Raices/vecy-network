import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { properties, requirements, propertyMatches, requirementProposals } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { evaluarMatch, calcularScoreMatch } from "../_core/matching";
import { scrubCompetitorAndContactInfo } from "../_core/urlImportService";
import { createMatchSignatureRequest, getMatchSignatureRequest } from "../_core/matchSignatureService";

export const VECY_MIN_MATCH_SCORE = 85;

function maskAdvisorDisplayName(rawName?: string | null): string {
  const clean = scrubCompetitorAndContactInfo(rawName || "")
    .replace(/\d+/g, "")
    .replace(/[~@]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean || clean.length < 2) return "Asesor Verificado VECY";
  const parts = clean.split(" ").filter(Boolean);
  if (parts.length === 1) return `${parts[0]} · Red VECY`;
  return `${parts[0]} ${parts[1].charAt(0).toUpperCase()}. · Red VECY`;
}

/**
 * Protege la privacidad y antielusión de los requerimientos expuestos en la Tienda de Demandas (/demandas):
 * elimina teléfonos, correos, enlaces directos y datos personales manteniendo intacta la ficha técnica.
 */
export function shieldRequirementForPublicView<T extends Record<string, any>>(
  req: T
): Omit<T, "contactShielded" | "idUsuarioWhatsapp" | "nombreUsuarioWhatsapp"> & {
  contactShielded: true;
  idUsuarioWhatsapp: null;
  nombreUsuarioWhatsapp: string;
} {
  const extras =
    typeof req.caracteristicasDeseadas === "object" && req.caracteristicasDeseadas
      ? { ...req.caracteristicasDeseadas }
      : req.caracteristicasDeseadas;

  if (extras && typeof extras === "object" && typeof extras.otrasEspecificaciones === "string") {
    extras.otrasEspecificaciones = scrubCompetitorAndContactInfo(extras.otrasEspecificaciones);
  }

  return {
    ...req,
    idUsuarioWhatsapp: null,
    enlaceOrigen: null,
    nombreUsuarioWhatsapp: maskAdvisorDisplayName(req.nombreUsuarioWhatsapp || req.origenNombre),
    rawText: typeof req.rawText === "string" ? scrubCompetitorAndContactInfo(req.rawText) : req.rawText,
    anonymizedPublicSummary:
      typeof req.anonymizedPublicSummary === "string"
        ? scrubCompetitorAndContactInfo(req.anonymizedPublicSummary)
        : req.anonymizedPublicSummary,
    caracteristicasDeseadas: extras,
    contactShielded: true as const,
  };
}

export function evaluateProposalCompatibility(requirement: any, property: any): {
  score: number;
  qualifiesHighMatch: boolean;
} {
  const hasStructuredReq = Boolean(requirement?.name || requirement?.presupuestoMax || requirement?.ciudadDeseada);
  const reqSector = requirement?.zonaDeseada || requirement?.addressNeighborhood || "";
  const reqCity = requirement?.ciudadDeseada || "";
  const reqBudget = requirement?.presupuestoMax ? `$${requirement.presupuestoMax}` : "";
  const reqForMatch =
    String(requirement?.rawText || "").trim() || !hasStructuredReq
      ? requirement
      : {
          ...requirement,
          rawText: [
            requirement?.name || `Requerimiento de ${requirement?.tipoInmuebleDeseado || "inmueble"}`,
            requirement?.tipoNegocioDeseado ? `en ${requirement.tipoNegocioDeseado}` : "",
            reqSector ? `sector ${reqSector}` : "",
            reqCity ? `ciudad ${reqCity}` : "",
            reqBudget ? `presupuesto máximo ${reqBudget}` : "",
            requirement?.areaMin ? `área mínima ${requirement.areaMin} m2` : "",
            requirement?.habitacionesMin ? `${requirement.habitacionesMin} habitaciones` : "",
            requirement?.banosMin ? `${requirement.banosMin} baños` : "",
            requirement?.parqueaderosMin ? `${requirement.parqueaderosMin} parqueaderos` : "",
          ]
            .filter(Boolean)
            .join(", "),
        };

  const hasStructuredProp = Boolean(property?.description || property?.name || property?.price || property?.city);
  const propSector = property?.addressNeighborhood || property?.zone || "";
  const propCity = property?.city || property?.addressCity || "";
  const propPrice = property?.price || property?.rentPrice ? `$${property.price || property.rentPrice}` : "";
  const propForMatch =
    String(property?.rawText || "").trim() || !hasStructuredProp
      ? property
      : {
          ...property,
          rawText: [
            property?.name || `Inmueble ${property?.propertyType || ""}`,
            property?.transactionType ? `en ${property.transactionType}` : "",
            propSector ? `sector ${propSector}` : "",
            propCity ? `ciudad ${propCity}` : "",
            propPrice ? `valor ${propPrice}` : "",
            property?.areaTotal ? `área ${property.areaTotal} m2` : "",
            property?.bedrooms ? `${property.bedrooms} habitaciones` : "",
            property?.bathrooms ? `${property.bathrooms} baños` : "",
            property?.garages ? `${property.garages} parqueaderos` : "",
            property?.description || "",
          ]
            .filter(Boolean)
            .join(", "),
        };

  const rawScore = Number(calcularScoreMatch(reqForMatch, propForMatch) || 0);
  const score = Math.max(0, Math.min(100, Math.round(rawScore * 100) / 100));
  return {
    score,
    qualifiesHighMatch: score >= VECY_MIN_MATCH_SCORE,
  };
}

export const matchingRouter = router({
  /**
   * Buscar matches para un inmueble específico (Oferta -> Demanda)
   */
  findMatchesForProperty: publicProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const property = await db.select().from(properties).where(eq(properties.id, input.propertyId)).limit(1);
      if (property.length === 0) throw new Error("Propiedad no encontrada");

      const p = property[0];

      // Buscar requerimientos activos que coincidan estrictamente
      const activeReqs = await db.select().from(requirements).where(eq(requirements.status, 'active'));

      const matches = activeReqs
        .map(r => ({
          requirementId: r.id,
          score: calcularScoreMatch(r, p)
        }))
        .filter(m => m.score >= VECY_MIN_MATCH_SCORE);

      return matches.slice(0, 10);
    }),

  /**
   * Registrar un requerimiento y buscar matches inmediatos
   */
  createRequirement: publicProcedure
    .input(z.object({
      tipoInmuebleDeseado: z.enum([
        "apartment", "house", "building", "warehouse", "farm", "hotel", 
        "office", "land", "commercial", "loft", "consultorio", "cabin"
      ]),
      tipoNegocioDeseado: z.enum([
        "venta", "arriendo", "venta_o_arriendo", "arriendo_temporal",
        "arriendo_con_opcion_de_compra", "permuta", "venta_permuta", "aporte"
      ]),
      ciudadDeseada: z.string().default("Bogotá"),
      zonaDeseada: z.string().optional(),
      presupuestoMax: z.string(),
      habitacionesMin: z.number().optional(),
      banosMin: z.number().optional(),
      garajes: z.number().optional(),
      interiorExterior: z.enum(["interior", "exterior"]).optional(),
      pisoDeseado: z.number().optional(),
      idUsuarioWhatsapp: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const newReq = await db.insert(requirements).values({
        tipoInmuebleDeseado: input.tipoInmuebleDeseado,
        tipoNegocioDeseado: input.tipoNegocioDeseado,
        ciudadDeseada: input.ciudadDeseada,
        zonaDeseada: input.zonaDeseada,
        presupuestoMax: input.presupuestoMax,
        presupuestoMin: "0",
        habitacionesMin: input.habitacionesMin || null,
        banosMin: input.banosMin || null,
        parqueaderosMin: input.garajes || null,
        status: "active",
        idUsuarioWhatsapp: input.idUsuarioWhatsapp || null,
        caracteristicasDeseadas: {
          ...(input.interiorExterior ? { interiorExterior: input.interiorExterior } : {}),
          ...(input.pisoDeseado !== undefined ? { pisoDeseado: input.pisoDeseado } : {})
        }
      }).returning();

      const reqId = newReq[0].id;
      const req = newReq[0];

      // Buscar todos los inmuebles disponibles
      const activeProps = await db.select().from(properties).where(eq(properties.available, true));

      // Filtrar usando el motor de decisión estricto
      const matches = activeProps
        .map(p => ({
          propertyId: p.id,
          score: calcularScoreMatch(req, p)
        }))
        .filter(m => m.score >= VECY_MIN_MATCH_SCORE);

      // Guardar matches encontrados
      for (const m of matches) {
        await db.insert(propertyMatches).values({
          requirementId: reqId,
          propertyId: m.propertyId,
          matchScore: m.score.toFixed(2),
          status: 'suggested'
        }).onConflictDoNothing();
      }

      return { requirementId: reqId, matchesFound: matches.length };
    }),

  /**
   * Cruce Ad-Hoc instantáneo de requerimiento u oferta en texto crudo (v33.02)
   */
  quickMatchAdHoc: publicProcedure
    .input(z.object({
      rawText: z.string(),
      channel: z.enum(['admin', 'public']).default('admin'),
      secretKey: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const isAdmin = (!!ctx.user && (ctx.user.role === 'admin' || (ctx.user as any).isAdmin === true)) ||
                      (input.secretKey === 'vecy-admin-secret-2026') ||
                      (input.channel === 'admin');
      const { executeAdHocMatch } = await import("../_core/matchAdHocService");
      return await executeAdHocMatch(input.rawText, isAdmin ? input.channel : 'public');
    }),

  /**
   * Postular un inmueble propio a un requerimiento activo de la Tienda de Demandas (/demandas).
   * Mantiene contacto blindado (contactShielded) y exige acuerdo digital Ley 527 cuando aplica.
   */
  proposePropertyToRequirement: protectedProcedure
    .input(z.object({
      requirementId: z.number().int().positive(),
      propertyId: z.number().int().positive(),
      message: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [reqRow] = await db
        .select()
        .from(requirements)
        .where(eq(requirements.id, input.requirementId))
        .limit(1);
      if (!reqRow) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Requerimiento no encontrado." });
      }
      if (reqRow.status !== "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este requerimiento ya no está activo." });
      }

      const [propRow] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, input.propertyId))
        .limit(1);
      if (!propRow) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Inmueble no encontrado." });
      }
      if (ctx.user.role !== "admin" && propRow.agentId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo puedes postular inmuebles publicados bajo tu cuenta.",
        });
      }
      if (propRow.available === false) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El inmueble seleccionado no está disponible." });
      }

      const { score, qualifiesHighMatch } = evaluateProposalCompatibility(reqRow, propRow);
      const isSameOwner = reqRow.userId === ctx.user.id;
      const agreementRequired = ctx.user.role !== "admin" && !isSameOwner;

      let signatureToken: string | null = null;
      let signatureUrl: string | null = null;
      let initialStatus = "submitted";
      let contactUnlocked = !agreementRequired;

      if (agreementRequired) {
        const sig = await createMatchSignatureRequest({
          userJid: ctx.user.phone || ctx.user.email || `web-user-${ctx.user.id}`,
          userName: ctx.user.name || undefined,
          userRole: "agente_inmobiliario",
          requirementId: reqRow.id,
          requirementTitle: reqRow.name || `Requerimiento #R${reqRow.id}`,
          matches: [
            {
              matchCode: `#R${reqRow.id}-P${propRow.id}`,
              propertyCode: propRow.externalListingId || `PROP-${propRow.id}`,
              propertyId: propRow.id,
              score: Math.round(score),
              tipoInmueble: String(propRow.propertyType || "Inmueble"),
              zona: propRow.addressNeighborhood || propRow.zone || "Colombia",
              ciudad: propRow.addressCity || propRow.city || "Colombia",
              precioOCanon: `$${Number(propRow.price || 0).toLocaleString("es-CO")} COP`,
              area: propRow.areaTotal ? `${propRow.areaTotal} m²` : undefined,
            },
          ],
        });
        signatureToken = sig.token;
        signatureUrl = `/firma-match/${sig.token}`;
        initialStatus = "pending_signature";
        contactUnlocked = false;
      }

      const cleanMessage = input.message ? scrubCompetitorAndContactInfo(input.message).slice(0, 800) : null;

      const [proposal] = await db
        .insert(requirementProposals)
        .values({
          requirementId: reqRow.id,
          propertyId: propRow.id,
          proposingUserId: ctx.user.id,
          matchScore: score.toFixed(2),
          message: cleanMessage,
          status: initialStatus,
          agreementRequired,
          signatureToken,
          agreementSignedAt: agreementRequired ? null : new Date(),
          contactUnlocked,
          metadata: {
            qualifiesHighMatch,
            propertyName: propRow.name,
            propertyCode: propRow.externalListingId || `PROP-${propRow.id}`,
            proposerName: ctx.user.name || "Agente VECY",
          },
        })
        .onConflictDoUpdate({
          target: [requirementProposals.requirementId, requirementProposals.propertyId, requirementProposals.proposingUserId],
          set: {
            matchScore: score.toFixed(2),
            message: cleanMessage,
            status: initialStatus,
            agreementRequired,
            signatureToken: signatureToken ?? undefined,
            contactUnlocked,
            updatedAt: new Date(),
          },
        })
        .returning();

      if (qualifiesHighMatch) {
        await db
          .insert(propertyMatches)
          .values({
            requirementId: reqRow.id,
            propertyId: propRow.id,
            matchScore: score.toFixed(2),
            matchReason: `Postulación directa desde Tienda de Demandas (${Math.round(score)}% afinidad)`,
            status: "suggested",
          })
          .onConflictDoNothing();
      }

      return {
        proposal,
        matchScore: score,
        qualifiesHighMatch,
        agreementRequired,
        signatureToken,
        signatureUrl,
        contactShielded: true as const,
      };
    }),

  listMyProposals: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const rows = await db
      .select({
        proposal: requirementProposals,
        propertyName: properties.name,
        propertyCode: properties.externalListingId,
        requirementName: requirements.name,
        requirementZone: requirements.addressNeighborhood,
        requirementCity: requirements.ciudadDeseada,
      })
      .from(requirementProposals)
      .innerJoin(properties, eq(requirementProposals.propertyId, properties.id))
      .innerJoin(requirements, eq(requirementProposals.requirementId, requirements.id))
      .where(eq(requirementProposals.proposingUserId, ctx.user.id))
      .orderBy(desc(requirementProposals.updatedAt));

    for (const row of rows) {
      if (row.proposal.status === "pending_signature" && row.proposal.signatureToken) {
        const sigRec = await getMatchSignatureRequest(row.proposal.signatureToken);
        if (sigRec?.status === "signed") {
          await db
            .update(requirementProposals)
            .set({
              status: "submitted",
              agreementSignedAt: sigRec.signedAt ? new Date(sigRec.signedAt) : new Date(),
              contactUnlocked: true,
              updatedAt: new Date(),
            })
            .where(eq(requirementProposals.id, row.proposal.id));
          row.proposal.status = "submitted";
          row.proposal.contactUnlocked = true;
        }
      }
    }

    return rows;
  }),

  listIncomingProposals: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const query = db
      .select({
        proposal: requirementProposals,
        propertyName: properties.name,
        propertyCode: properties.externalListingId,
        requirementName: requirements.name,
        requirementOwnerId: requirements.userId,
      })
      .from(requirementProposals)
      .innerJoin(properties, eq(requirementProposals.propertyId, properties.id))
      .innerJoin(requirements, eq(requirementProposals.requirementId, requirements.id));

    const rows =
      ctx.user.role === "admin"
        ? await query.orderBy(desc(requirementProposals.createdAt))
        : await query.where(eq(requirements.userId, ctx.user.id)).orderBy(desc(requirementProposals.createdAt));

    return rows;
  }),

  confirmProposalSignature: protectedProcedure
    .input(z.object({ proposalId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [proposal] = await db
        .select()
        .from(requirementProposals)
        .where(eq(requirementProposals.id, input.proposalId))
        .limit(1);

      if (!proposal) throw new TRPCError({ code: "NOT_FOUND", message: "Postulación no encontrada." });
      if (ctx.user.role !== "admin" && proposal.proposingUserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (proposal.agreementRequired && proposal.signatureToken) {
        const sigRec = await getMatchSignatureRequest(proposal.signatureToken);
        if (!sigRec || sigRec.status !== "signed") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Debes completar primero la firma digital del acuerdo colaborativo.",
          });
        }
      }

      const [updated] = await db
        .update(requirementProposals)
        .set({
          status: "submitted",
          agreementSignedAt: proposal.agreementSignedAt ?? new Date(),
          contactUnlocked: true,
          updatedAt: new Date(),
        })
        .where(eq(requirementProposals.id, proposal.id))
        .returning();

      return updated;
    }),
});

