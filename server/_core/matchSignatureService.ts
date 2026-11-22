/**
 * VECY NETWORK — SERVICIO DE FIRMA ELECTRÓNICA DE TÉRMINOS, CONDICIONES Y PRIVACIDAD PARA LIBERACIÓN DE MATCHES
 * Patrón Vecy Agenda: Token móvil (/firma-match/:token) -> SignaturePad PNG -> pdf-lib + QR + CUV -> WhatsApp Baileys.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { pendingSessions, requirementProposals } from "../../drizzle/schema";

export interface MatchSignatureItem {
  matchCode: string;
  propertyCode?: string;
  propertyId?: number;
  score: number;
  tipoInmueble: string;
  zona: string;
  ciudad?: string;
  precioOCanon: string;
  area?: string;
}

export interface MatchSignatureRecord {
  token: string;
  userJid: string;
  phone: string;
  userName?: string;
  userRole: string;
  requirementId?: number;
  requirementTitle?: string;
  matches: MatchSignatureItem[];
  status: "pending" | "signed";
  createdAt: string;
  signedAt?: string;
  signerName?: string;
  signerDocumentType?: string;
  signerDocument?: string;
  signerIp?: string;
  signatureBase64?: string;
  cuv?: string;
  sha256Hash?: string;
  signedPdfUrl?: string;
  method?: "canvas" | "whatsapp_text";
  whatsappDelivered?: boolean;
}

const MEMORY_MATCH_SIG_STORE = new Map<string, MatchSignatureRecord>();
const USER_LATEST_TOKEN_MAP = new Map<string, string>();

const PORTAL_BASE_URL = "https://vecy-bienes-raices.vercel.app";

function cleanPhone(raw: string): string {
  return (raw || "").split("@")[0].split(":")[0].replace(/\D/g, "");
}

function getTermsClausesForRole(userRole: string): {
  roleLabel: string;
  title: string;
  clauses: string[];
} {
  const isAgent = userRole === "agente_inmobiliario";
  if (isAgent) {
    return {
      roleLabel: "Agente / Bróker Inmobiliario Aliado",
      title: "ACUERDO DE ALIANZA COLABORATIVA (40 / 20 / 40) Y CONFIDENCIALIDAD DE MATCH",
      clauses: [
        "1. Esquema de Honorarios 40/20/40: El firmante reconoce y acepta el modelo colaborativo de VECY BIENES RAÍCES: 40% para la Punta Captadora, 40% para la Punta Colocadora y 20% para VECY (del cual VECY destina el 10% a la Bolsa Colaborativa de la Red y 10% a soporte e infraestructura IA).",
        "2. No Desintermediación y Nexo Causal (Arts. 1340–1346 C.Co.): Queda estrictamente prohibido contactar directamente a propietarios, compradores o colegas contraparte por fuera de la mesa central de VECY (+57 316 656 9719) o eludir la trazabilidad del código #M asignado.",
        "3. Reserva de Identidad y Vigencia: Los códigos PROP-... y #M... habilitan el trámite seguro con Eduardo Rivera y Jani Alves. La violación de la cláusula de no elusión genera responsabilidad mercantil por el 100% de los honorarios pactados.",
        "4. Política de Tratamiento de Datos (Ley 1581 de 2012 y Dec. 1377 de 2013): El firmante autoriza de manera previa, expresa e informada el tratamiento de sus datos personales, marca temporal e IP exclusivamente para gestión inmobiliaria, validación de identidad y trazabilidad jurídica."
      ],
    };
  }

  return {
    roleLabel: userRole === "propietario_directo" ? "Propietario Directo" : "Cliente / Comprador / Inversionista / Arrendatario",
    title: "TÉRMINOS DE ACOMPAÑAMIENTO COMERCIAL VECY BIENES RAÍCES Y POLÍTICA DE PRIVACIDAD",
    clauses: [
      "1. Acompañamiento Centralizado y Seguro: El acceso a los códigos de cruce #M... y PROP-... se otorga para coordinar visitas y estudio documental únicamente a través de Eduardo Rivera y Jani Alves (+57 316 656 9719), garantizando seguridad jurídica y prevención de fraudes.",
      "2. Reglas Comerciales y Cero Elusión: Para propietarios directos en gestión de corretaje aplica la comisión de ley del 3% sobre el valor de venta o 1 canon neto mensual (sin incluir administración) en arriendo. Para compradores o arrendatarios finales el acompañamiento de búsqueda es gratuito y sin recargos ocultos.",
      "3. Confidencialidad y Uso Exclusivo: Los datos de los inmuebles y códigos entregados son para uso personal e intransferible del firmante, comprometiéndose a no contactar ni cerrar por fuera de la mesa oficial VECY sobre opciones presentadas mediante este Match.",
      "4. Protección de Datos (Ley 1581 de 2012): Autoriza expresamente a VECY BIENES RAÍCES el tratamiento de sus datos de identificación, firma electrónica, IP y estampa cronológica conforme a la Ley 527 de 1999 (validez jurídica de mensajes de datos)."
    ],
  };
}

async function saveMatchSignatureRecord(record: MatchSignatureRecord): Promise<void> {
  MEMORY_MATCH_SIG_STORE.set(record.token, record);
  const phoneKey = cleanPhone(record.phone || record.userJid);
  if (record.status === "pending") {
    if (record.userJid) USER_LATEST_TOKEN_MAP.set(record.userJid, record.token);
    if (phoneKey) USER_LATEST_TOKEN_MAP.set(phoneKey, record.token);
  } else {
    if (record.userJid && USER_LATEST_TOKEN_MAP.get(record.userJid) === record.token) {
      USER_LATEST_TOKEN_MAP.delete(record.userJid);
    }
    if (phoneKey && USER_LATEST_TOKEN_MAP.get(phoneKey) === record.token) {
      USER_LATEST_TOKEN_MAP.delete(phoneKey);
    }
  }

  if (process.env.NODE_ENV === "test") return;

  try {
    const db = await getDb();
    if (db) {
      const dbKey = `match_sig:${record.token}`;
      await db
        .insert(pendingSessions)
        .values({
          jid: dbKey,
          sessionData: record,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: pendingSessions.jid,
          set: {
            sessionData: record,
            updatedAt: new Date(),
          },
        });

      if (phoneKey) {
        const userPtrKey = `match_sig_user:${phoneKey}`;
        await db
          .insert(pendingSessions)
          .values({
            jid: userPtrKey,
            sessionData: { token: record.status === "pending" ? record.token : null, updatedAt: new Date().toISOString() },
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: pendingSessions.jid,
            set: {
              sessionData: { token: record.status === "pending" ? record.token : null, updatedAt: new Date().toISOString() },
              updatedAt: new Date(),
            },
          });
      }
    }
  } catch (err: any) {
    console.warn("[MatchSignature] Error persistiendo en BD:", err?.message);
  }
}

export async function getMatchSignatureRequest(token: string): Promise<MatchSignatureRecord | null> {
  const cleanTok = (token || "").trim();
  if (!cleanTok) return null;

  const inMem = MEMORY_MATCH_SIG_STORE.get(cleanTok);
  if (inMem) return inMem;

  if (process.env.NODE_ENV === "test") return null;

  try {
    const db = await getDb();
    if (db) {
      const [row] = await db
        .select()
        .from(pendingSessions)
        .where(eq(pendingSessions.jid, `match_sig:${cleanTok}`))
        .limit(1);
      if (row?.sessionData && typeof row.sessionData === "object") {
        const rec = row.sessionData as MatchSignatureRecord;
        MEMORY_MATCH_SIG_STORE.set(cleanTok, rec);
        return rec;
      }
    }
  } catch (err: any) {
    console.warn("[MatchSignature] Error leyendo de BD:", err?.message);
  }
  return null;
}

export async function findPendingMatchSignatureForUser(userJidOrPhone: string): Promise<MatchSignatureRecord | null> {
  const cleanKey = cleanPhone(userJidOrPhone);
  const directTok =
    USER_LATEST_TOKEN_MAP.get(userJidOrPhone) ||
    (cleanKey ? USER_LATEST_TOKEN_MAP.get(cleanKey) : undefined);

  if (directTok) {
    const rec = await getMatchSignatureRequest(directTok);
    if (rec && rec.status === "pending") return rec;
  }

  if (process.env.NODE_ENV !== "test" && cleanKey) {
    try {
      const db = await getDb();
      if (db) {
        const [ptr] = await db
          .select()
          .from(pendingSessions)
          .where(eq(pendingSessions.jid, `match_sig_user:${cleanKey}`))
          .limit(1);
        const tok = (ptr?.sessionData as any)?.token;
        if (tok) {
          const rec = await getMatchSignatureRequest(tok);
          if (rec && rec.status === "pending") return rec;
        }
      }
    } catch (_) {}
  }

  return null;
}

export async function createMatchSignatureRequest(input: {
  userJid: string;
  userName?: string;
  userRole?: string;
  requirementId?: number;
  requirementTitle?: string;
  matches: MatchSignatureItem[];
}): Promise<{ token: string; url: string; record: MatchSignatureRecord }> {
  const token = `VECY-M-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
  const phone = cleanPhone(input.userJid);
  const record: MatchSignatureRecord = {
    token,
    userJid: input.userJid,
    phone,
    userName: input.userName || undefined,
    userRole: input.userRole || "comprador_inversionista",
    requirementId: input.requirementId,
    requirementTitle: input.requirementTitle,
    matches: input.matches,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  await saveMatchSignatureRecord(record);
  const url = `${PORTAL_BASE_URL}/firma-match/${token}`;
  return { token, url, record };
}

export async function getMatchSignaturePublicView(token: string) {
  const record = await getMatchSignatureRequest(token);
  if (!record) {
    return { found: false as const };
  }

  const terms = getTermsClausesForRole(record.userRole);
  const matchesPreview = record.matches.map((m) => ({
    score: m.score,
    tipoInmueble: m.tipoInmueble,
    zona: m.zona,
    ciudad: m.ciudad || "Colombia",
    precioOCanon: m.precioOCanon,
    area: m.area,
  }));

  const isSigned = record.status === "signed";
  const unlockedCodes = isSigned
    ? record.matches.map((m) => ({
        matchCode: m.matchCode,
        propertyCode: m.propertyCode || (m.propertyId ? `PROP-${m.propertyId}` : undefined),
        score: m.score,
        tipoInmueble: m.tipoInmueble,
        zona: m.zona,
        ciudad: m.ciudad || "Colombia",
        precioOCanon: m.precioOCanon,
        area: m.area,
      }))
    : [];

  return {
    found: true as const,
    token: record.token,
    status: record.status,
    userName: record.userName || "",
    userRole: record.userRole,
    requirementTitle: record.requirementTitle || "Cruce de Inmuebles VECY",
    termsTitle: terms.title,
    termsRoleLabel: terms.roleLabel,
    termsClauses: terms.clauses,
    matchesCount: record.matches.length,
    matchesPreview,
    createdAt: record.createdAt,
    signedAt: record.signedAt,
    cuv: isSigned ? record.cuv : undefined,
    signedPdfUrl: isSigned ? record.signedPdfUrl : undefined,
    unlockedCodes,
  };
}

export async function buildMatchTermsPdf(record: MatchSignatureRecord): Promise<{
  pdfBytes: Uint8Array;
  pdfBase64: string;
  pdfUrl: string;
  cuv: string;
  sha256Hash: string;
}> {
  const terms = getTermsClausesForRole(record.userRole);
  const signedAtIso = record.signedAt || new Date().toISOString();
  const bogotaTime = new Date(signedAtIso).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "long",
    timeStyle: "medium",
  });

  const payloadForHash = JSON.stringify({
    token: record.token,
    signerName: record.signerName,
    signerDocument: record.signerDocument,
    phone: record.phone,
    signedAt: signedAtIso,
    matches: record.matches.map((m) => m.matchCode),
  });
  const sha256Hash = crypto.createHash("sha256").update(payloadForHash).digest("hex");
  const cuv = `CUV-${sha256Hash.substring(0, 12).toUpperCase()}`;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  const margin = 45;

  const gold = rgb(0.75, 0.58, 0.25);
  const black = rgb(0.1, 0.1, 0.1);
  const gray = rgb(0.4, 0.4, 0.4);

  const safeText = (txt: string) =>
    (txt || "")
      .normalize("NFC")
      .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  // Encabezado Institucional
  page.drawRectangle({
    x: 0,
    y: height - 74,
    width,
    height: 74,
    color: rgb(0.06, 0.06, 0.07),
  });
  page.drawText("VECY BIENES RAICES", {
    x: margin,
    y: height - 34,
    font: boldFont,
    size: 16,
    color: gold,
  });
  page.drawText("CONSTANCIA DIGITAL DE ACEPTACION DE TERMINOS, CONDICIONES Y PRIVACIDAD", {
    x: margin,
    y: height - 54,
    font: boldFont,
    size: 9.5,
    color: rgb(0.95, 0.95, 0.95),
  });

  let cursorY = height - 100;
  page.drawText(safeText(terms.title), {
    x: margin,
    y: cursorY,
    font: boldFont,
    size: 10.5,
    color: black,
    maxWidth: width - margin * 2,
  });
  cursorY -= 22;

  page.drawText(
    safeText(`Referencia Token: ${record.token}  |  Perfil: ${terms.roleLabel}  |  Fecha (Bogota UTC-5): ${bogotaTime}`),
    { x: margin, y: cursorY, font, size: 8.5, color: gray, maxWidth: width - margin * 2 }
  );
  cursorY -= 16;

  page.drawText(
    safeText(`Firmante: ${record.signerName || record.userName || "Usuario Verificado"}  |  Doc: ${record.signerDocumentType || "CC"} ${record.signerDocument || "Verificado WhatsApp"}  |  WhatsApp: +${record.phone || "N/A"}`),
    { x: margin, y: cursorY, font: boldFont, size: 8.5, color: black, maxWidth: width - margin * 2 }
  );
  cursorY -= 22;

  // Cláusulas con word-wrap limpio
  const drawWrappedText = (text: string, size: number, lineHeight: number, useBold = false, color = black) => {
    const words = safeText(text).split(" ");
    let line = "";
    const maxW = width - margin * 2;
    const f = useBold ? boldFont : font;
    for (const w of words) {
      const testLine = line ? `${line} ${w}` : w;
      if (f.widthOfTextAtSize(testLine, size) > maxW) {
        page.drawText(line, { x: margin, y: cursorY, font: f, size, color });
        cursorY -= lineHeight;
        line = w;
      } else {
        line = testLine;
      }
    }
    if (line) {
      page.drawText(line, { x: margin, y: cursorY, font: f, size, color });
      cursorY -= lineHeight;
    }
  };

  for (const clause of terms.clauses) {
    drawWrappedText(clause, 8.8, 12.5, false, black);
    cursorY -= 6;
  }

  cursorY -= 6;
  page.drawText("COINCIDENCIAS (MATCHES) LIBERADAS MEDIANTE ESTE ACUERDO:", {
    x: margin,
    y: cursorY,
    font: boldFont,
    size: 9.2,
    color: gold,
  });
  cursorY -= 14;

  for (const m of record.matches) {
    const pCode = m.propertyCode || (m.propertyId ? `PROP-${m.propertyId}` : "INV-VECY");
    drawWrappedText(
      `- Match ${m.matchCode} (${m.score}% afinidad) | Inmueble ${pCode}: ${m.tipoInmueble} en ${m.zona}${m.ciudad ? `, ${m.ciudad}` : ""} (${m.precioOCanon}${m.area ? `, ${m.area}` : ""})`,
      8.5,
      12,
      true,
      black
    );
  }

  cursorY -= 16;
  const firmaY = Math.max(cursorY, 190);

  // Estampar firma manuscrita PNG (SignaturePad) si fue enviada desde el enlace móvil
  if (record.signatureBase64 && record.signatureBase64.startsWith("data:image")) {
    try {
      const rawB64 = record.signatureBase64.split(",")[1];
      const sigBytes = Buffer.from(rawB64, "base64");
      const sigImg = record.signatureBase64.includes("image/png")
        ? await pdfDoc.embedPng(sigBytes)
        : await pdfDoc.embedJpg(sigBytes);
      const scale = Math.min(180 / sigImg.width, 60 / sigImg.height);
      page.drawImage(sigImg, {
        x: margin,
        y: firmaY - 40,
        width: sigImg.width * scale,
        height: sigImg.height * scale,
      });
    } catch (e: any) {
      console.warn("[MatchSignature PDF] Error incrustando PNG firma:", e?.message);
    }
  } else {
    page.drawText("ACEPTACION ELECTRONICA REGISTRADA VIA WHATSAPP", {
      x: margin,
      y: firmaY - 22,
      font: boldFont,
      size: 9,
      color: gold,
    });
  }

  page.drawLine({ start: { x: margin, y: firmaY - 45 }, end: { x: margin + 230, y: firmaY - 45 }, thickness: 0.7, color: black });
  page.drawText(safeText(record.signerName || record.userName || "FIRMANTE AUTORIZADO").toUpperCase(), {
    x: margin,
    y: firmaY - 58,
    font: boldFont,
    size: 8.5,
    color: black,
  });
  page.drawText(safeText(`${record.signerDocumentType || "C.C."} No. ${record.signerDocument || "N/A"} | IP: ${record.signerIp || "Verificada"}`), {
    x: margin,
    y: firmaY - 70,
    font,
    size: 7.5,
    color: gray,
  });

  // Sello QR criptográfico
  const verifyUrl = `${PORTAL_BASE_URL}/firma-match/${record.token}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 150, margin: 1 });
  const qrBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");
  const qrImage = await pdfDoc.embedPng(qrBytes);

  const sealY = firmaY - 90;
  page.drawRectangle({
    x: margin,
    y: sealY - 62,
    width: width - margin * 2,
    height: 62,
    borderColor: gold,
    borderWidth: 0.8,
    color: rgb(0.97, 0.97, 0.95),
  });
  page.drawImage(qrImage, { x: margin + 8, y: sealY - 55, width: 48, height: 48 });

  const infoX = margin + 66;
  page.drawText("SELLO DE SEGURIDAD DIGITAL - VECY BIENES RAICES (LEY 527 DE 1999)", {
    x: infoX,
    y: sealY - 14,
    font: boldFont,
    size: 8,
    color: gold,
  });
  page.drawText(`CUV: ${cuv}  |  Metodo: ${record.method === "whatsapp_text" ? "Confirmacion WhatsApp" : "Firma Tactil Movil"}`, {
    x: infoX,
    y: sealY - 26,
    font: boldFont,
    size: 7.5,
    color: black,
  });
  page.drawText(`SHA-256: ${sha256Hash.substring(0, 56)}`, {
    x: infoX,
    y: sealY - 38,
    font,
    size: 6.5,
    color: gray,
  });
  page.drawText(`Verificacion en linea: ${verifyUrl}`, {
    x: infoX,
    y: sealY - 50,
    font,
    size: 6.5,
    color: gray,
  });

  const pdfBytes = await pdfDoc.save();
  const pdfDir = path.resolve(process.cwd(), "public/uploads/match-pdfs");
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }
  const fileName = `${record.token}.pdf`;
  fs.writeFileSync(path.join(pdfDir, fileName), Buffer.from(pdfBytes));

  return {
    pdfBytes,
    pdfBase64: Buffer.from(pdfBytes).toString("base64"),
    pdfUrl: `/uploads/match-pdfs/${fileName}`,
    cuv,
    sha256Hash,
  };
}

export async function completeMatchSignature(input: {
  token: string;
  signerName: string;
  signerDocumentType?: string;
  signerDocument: string;
  signatureBase64?: string;
  signerIp?: string;
  acceptedTerms: boolean;
  method?: "canvas" | "whatsapp_text";
}) {
  if (!input.acceptedTerms) {
    throw new Error("Debes aceptar los Términos, Condiciones y Política de Privacidad para continuar.");
  }

  const record = await getMatchSignatureRequest(input.token);
  if (!record) {
    throw new Error("El enlace de firma no existe o ha expirado.");
  }

  record.signerName = input.signerName.trim();
  record.signerDocumentType = (input.signerDocumentType || "CC").trim();
  record.signerDocument = input.signerDocument.trim();
  record.signatureBase64 = input.signatureBase64;
  record.signerIp = input.signerIp || "Verificada";
  record.method = input.method || (input.signatureBase64 ? "canvas" : "whatsapp_text");
  record.signedAt = new Date().toISOString();
  record.status = "signed";

  const pdfResult = await buildMatchTermsPdf(record);
  record.cuv = pdfResult.cuv;
  record.sha256Hash = pdfResult.sha256Hash;
  record.signedPdfUrl = pdfResult.pdfUrl;

  await saveMatchSignatureRecord(record);

  if (process.env.NODE_ENV !== "test") {
    try {
      const db = await getDb();
      if (db) {
        await db
          .update(requirementProposals)
          .set({
            status: "submitted",
            agreementSignedAt: new Date(),
            contactUnlocked: true,
            updatedAt: new Date(),
          })
          .where(eq(requirementProposals.signatureToken, record.token));
      }
    } catch (propErr: any) {
      console.warn("[MatchSignature] Aviso actualizando requirement_proposals:", propErr?.message);
    }
  }

  const unlockedCodes = record.matches.map((m) => ({
    matchCode: m.matchCode,
    propertyCode: m.propertyCode || (m.propertyId ? `PROP-${m.propertyId}` : undefined),
    score: m.score,
    tipoInmueble: m.tipoInmueble,
    zona: m.zona,
    ciudad: m.ciudad || "Colombia",
    precioOCanon: m.precioOCanon,
    area: m.area,
  }));

  // Despacho automático por WhatsApp DM (PDF firmado + códigos liberados + alerta a Eduardo)
  if (process.env.NODE_ENV !== "test") {
    (async () => {
      try {
        const { janiaMatchBot } = await import("./whatsapp-match");
        const target = record.userJid || record.phone;
        if (janiaMatchBot && (janiaMatchBot as any).isReady && target) {
          await janiaMatchBot.sendDirectMessage(target, {
            document: Buffer.from(pdfResult.pdfBytes),
            mimetype: "application/pdf",
            fileName: `VECY_Acuerdo_Match_${record.token}.pdf`,
            caption: `📄 Tu acuerdo firmado con código *${record.cuv}*.`,
          } as any);

          const codesLines = unlockedCodes
            .map((c) => `• *${c.matchCode}* (${c.score}%)${c.propertyCode ? ` — Inmueble *${c.propertyCode}*` : ""} en ${c.zona}`)
            .join("\n");

          const firstCode = unlockedCodes[0]?.matchCode || "#M";
          const unlockMsg =
            `¡Listo${record.signerName ? `, ${record.signerName.split(" ")[0]}` : ""}! ✅ Tus códigos quedaron desbloqueados:\n` +
            `${codesLines}\n` +
            `Escríbele o llama a Eduardo o Jani al *+57 316 656 9719*, pásales el código *${firstCode}* y diles que JanIA te lo entregó para coordinar visita. 🤝`;

          await janiaMatchBot.sendDirectMessage(target, unlockMsg);
          record.whatsappDelivered = true;
          await saveMatchSignatureRecord(record);

          // Aviso ejecutivo a Eduardo Rivera (+57 316 656 9719)
          const alertText =
            `✍️ *MATCH FIRMADO EN PORTAL*\n` +
            `Firmante: *${record.signerName}* (${record.signerDocumentType} ${record.signerDocument})\n` +
            `Rol: ${record.userRole} | WhatsApp: +${record.phone}\n` +
            `Códigos: ${unlockedCodes.map((c) => c.matchCode).join(", ")} | CUV: ${record.cuv}`;
          await janiaMatchBot.sendDirectMessage("573166569719", alertText);
        }
      } catch (waErr: any) {
        console.warn("[MatchSignature] Error en despacho automático WhatsApp:", waErr?.message);
      }
    })();
  }

  return {
    success: true,
    token: record.token,
    cuv: record.cuv,
    signedPdfUrl: record.signedPdfUrl,
    unlockedCodes,
  };
}
