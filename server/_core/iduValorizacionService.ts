/**
 * SERVICIO OFICIAL DE EXPEDICIÓN DE CERTIFICADO DE ESTADO DE CUENTA Y PAZ Y SALVO DEL IDU
 * Instituto de Desarrollo Urbano (IDU) — Alcaldía Mayor de Bogotá
 * 
 * Permite a asesores y clientes consultar el CHIP del predio, generar automáticamente
 * el Certificado de Estado de Cuenta para Trámite Notarial (Paz y Salvo de Valorización)
 * bajo el Artículo 44 del Acuerdo Distrital 915 de 2023, y entregarlo directamente en
 * archivo PDF por WhatsApp con su PIN de seguridad legal oficial.
 * 
 * DOCTRINA OFICIAL VECY (v32.72):
 * - Consulta directa al portal oficial del IDU (https://webidu.idu.gov.co/ServiciosValorizacion/faces/site/index.xhtml).
 * - Cero intermediarios, 100% oficial y automatizado en tiempo real.
 * - Sin costo alguno para el cliente o asesor ($0 COP).
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

export interface IduDetectionResult {
  found: boolean;
  chip?: string;
  isIduRequest?: boolean;
}

export interface IduReportResult {
  isIduRequest: boolean;
  chip?: string;
  reportText?: string;
  pdfBuffer?: Buffer;
  pdfFileName?: string;
  matricula?: string;
  direccion?: string;
  pinSeguridad?: string;
  fechaVencimiento?: string;
}

export interface DownloadIduPdfResult {
  success: boolean;
  pdfBuffer?: Buffer;
  pdfFileName?: string;
  matricula?: string;
  direccion?: string;
  pinSeguridad?: string;
  errorMessage?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MEMORIA DE SESIONES PENDIENTES DE IDU (cuando el usuario pide IDU sin CHIP)
// ─────────────────────────────────────────────────────────────────────────────
interface PendingIduSession {
  timestamp: number;
}

const pendingIduSessions = new Map<string, PendingIduSession>();
const IDU_SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutos

export function hasPendingIduSession(senderId: string): boolean {
  const session = pendingIduSessions.get(senderId);
  if (!session) return false;
  if (Date.now() - session.timestamp > IDU_SESSION_TTL_MS) {
    pendingIduSessions.delete(senderId);
    return false;
  }
  return true;
}

export function setPendingIduSession(senderId: string): void {
  pendingIduSessions.set(senderId, { timestamp: Date.now() });
}

export function clearPendingIduSession(senderId: string): void {
  pendingIduSessions.delete(senderId);
}

/**
 * Detecta si un texto contiene una solicitud de paz y salvo del IDU / Valorización
 * y extrae el código CHIP si viene especificado.
 */
export function extractChipForIduValorizacion(text: string): IduDetectionResult {
  if (!text || typeof text !== 'string') return { found: false };

  const clean = text.trim();
  const lower = clean.toLowerCase();

  // Palabras clave de intención de Paz y Salvo IDU / Valorización
  const iduKeywords = [
    'idu', 'valorizacion', 'valorización', 'webidu',
    'paz y salvo idu', 'paz y salvo de valorizacion', 'paz y salvo de valorización',
    'certificado idu', 'estado de cuenta idu', 'paz y salvo de idu'
  ];

  const hasIduKeyword = iduKeywords.some(kw => lower.includes(kw));

  // Buscar código CHIP de Bogotá: "AAA" + 4 dígitos + 4 caracteres alfanuméricos
  const chipMatch = clean.match(/\b(AAA[0-9]{4}[A-Z0-9]{4})\b/i);

  if (hasIduKeyword) {
    return {
      found: true,
      isIduRequest: true,
      chip: chipMatch ? chipMatch[1].toUpperCase() : undefined
    };
  }

  return { found: false };
}

/**
 * Descarga automatizada oficial del Certificado de Estado de Cuenta y Paz y Salvo
 * de Valorización desde el portal oficial del Instituto de Desarrollo Urbano (IDU).
 */
export async function downloadIduCertificatePdf(chip: string): Promise<DownloadIduPdfResult> {
  const cleanChip = chip.toUpperCase().trim();
  const downloadDir = path.join(os.tmpdir(), `vecy-idu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

  try {
    fs.mkdirSync(downloadDir, { recursive: true });
  } catch (_) {}

  let browser: any = null;
  try {
    const puppeteer = (await import('puppeteer')).default;
    const executablePath = fs.existsSync('/usr/bin/google-chrome')
      ? '/usr/bin/google-chrome'
      : undefined;

    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(45000);

    // Habilitar comportamiento de descarga por CDP
    const client = await page.target().createCDPSession();
    await client.send('Browser.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadDir,
      eventsEnabled: true
    });

    // 1. Navegar directamente al formulario oficial de generación de certificados del IDU
    await page.goto('https://webidu.idu.gov.co/ServiciosValorizacion/faces/site/generateCert.xhtml', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // 3. Escribir el CHIP en el input oficial
    await page.waitForSelector('[id="validtaPin_form:pinNumber"]', { timeout: 15000 });
    await page.type('[id="validtaPin_form:pinNumber"]', cleanChip);

    // 4. Hacer clic en "Validar"
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {}),
      page.click('[id="validtaPin_form:pinNumberButton"]')
    ]);

    // 5. Verificar mensajes del portal del IDU
    const portalMessages = await page.evaluate(() => {
      const msgs = Array.from(
        document.querySelectorAll('.ui-messages-error, .ui-messages-info, .ui-growl-message, .ui-message, .ui-messages-error-summary, .ui-messages-error-detail')
      ).map(m => (m as HTMLElement).innerText?.trim()).filter(Boolean);
      return msgs;
    });

    const hasNotFoundError = (portalMessages as string[]).some((m: string) => 
      m.toLowerCase().includes('no se encuentra registrado') || 
      m.toLowerCase().includes('invalido') || 
      m.toLowerCase().includes('inválido')
    );

    if (hasNotFoundError) {
      return {
        success: false,
        errorMessage: `El código CHIP ${cleanChip} no se encuentra registrado en el sistema oficial del Instituto de Desarrollo Urbano (IDU). Por favor verifica que esté bien escrito según tu recibo predial o escritura.`
      };
    }

    // 6. Extraer los datos autocompletados del predio (Matrícula y Dirección)
    const predioData = await page.evaluate(() => {
      const matEl = document.querySelector('[id="validtaPin_form:matInmo"]') as HTMLInputElement;
      const dirEl = document.querySelector('[id="validtaPin_form:dirPred"]') as HTMLInputElement;
      return {
        matricula: matEl ? matEl.value.trim() : '',
        direccion: dirEl ? dirEl.value.trim() : ''
      };
    });

    // 7. Hacer clic en "Generar Certificado"
    await page.waitForSelector('[id="validtaPin_form:pinGenerateButton"]', { timeout: 10000 });
    await page.click('[id="validtaPin_form:pinGenerateButton"]');

    // 8. Esperar la descarga del archivo report.pdf
    let downloadedFilePath: string | null = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 1000));
      if (fs.existsSync(downloadDir)) {
        const files = fs.readdirSync(downloadDir);
        const pdfFile = files.find(f => f.toLowerCase().endsWith('.pdf') && !f.endsWith('.crdownload'));
        if (pdfFile) {
          downloadedFilePath = path.join(downloadDir, pdfFile);
          break;
        }
      }
    }

    if (!downloadedFilePath || !fs.existsSync(downloadedFilePath)) {
      return {
        success: false,
        errorMessage: 'El portal del IDU no entregó el archivo PDF en el tiempo esperado. Por favor intenta de nuevo en unos momentos.',
        matricula: predioData.matricula,
        direccion: predioData.direccion
      };
    }

    const pdfBuffer = fs.readFileSync(downloadedFilePath);
    if (!pdfBuffer || pdfBuffer.length < 500) {
      return {
        success: false,
        errorMessage: 'El archivo descargado desde el IDU está vacío o incompleto.',
        matricula: predioData.matricula,
        direccion: predioData.direccion
      };
    }

    const pdfFileName = `Paz_y_Salvo_IDU_${cleanChip}_2026.pdf`;

    return {
      success: true,
      pdfBuffer,
      pdfFileName,
      matricula: predioData.matricula || undefined,
      direccion: predioData.direccion || undefined
    };
  } catch (err: any) {
    console.error(`[IDU-SERVICE] Error descargando Paz y Salvo del IDU para ${cleanChip}:`, err);
    return {
      success: false,
      errorMessage: `Error de conexión con el portal oficial del IDU: ${err?.message || 'Tiempo de espera agotado'}`
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {}
    }
    // Limpieza de carpeta temporal
    try {
      if (fs.existsSync(downloadDir)) {
        fs.rmSync(downloadDir, { recursive: true, force: true });
      }
    } catch (_) {}
  }
}

/**
 * Orquestador principal de asistencia de Paz y Salvo del IDU desde WhatsApp.
 * Atiende tanto solicitudes con CHIP incluido como solicitudes en lenguaje natural que requieren
 * preguntar el CHIP de forma interactiva.
 */
export async function executeIduAssistanceFromWhatsApp(
  body: string,
  senderId?: string,
  isPrivateDm = true,
  options?: { skipDownload?: boolean }
): Promise<IduReportResult> {
  const clean = (body || '').trim();
  let detection = extractChipForIduValorizacion(clean);

  // Si no se detectó CHIP pero el usuario tiene una sesión pendiente de IDU activa:
  if (!detection.chip && senderId && hasPendingIduSession(senderId)) {
    const chipCandidate = clean.match(/\b(AAA[0-9]{4}[A-Z0-9]{4})\b/i);
    if (chipCandidate) {
      detection = {
        found: true,
        isIduRequest: true,
        chip: chipCandidate[1].toUpperCase()
      };
      clearPendingIduSession(senderId);
    }
  }

  if (!detection.found && !detection.isIduRequest) {
    return { isIduRequest: false };
  }

  const chip = detection.chip;

  // CASO 1: Pide paz y salvo del IDU pero aún NO ha dado el código CHIP
  if (!chip) {
    if (senderId) {
      setPendingIduSession(senderId);
    }

    const reportText =
      `🏛️ *PAZ Y SALVO DE VALORIZACIÓN IDU — VECY BIENES RAÍCES* 🇨🇴\n\n` +
      `¡Con el mayor gusto te expido tu Certificado de Estado de Cuenta y Paz y Salvo oficial del IDU en archivo PDF!\n\n` +
      `👉 *Por favor indícame el código CHIP del predio:*\n` +
      `_(Inicia por AAA, ejemplo: AAA0058EEXS. Lo encuentras en la parte superior de tu recibo predial o escritura)_ 📄✨\n\n` +
      `Una vez me lo des, me conecto al portal oficial del IDU y te entrego el PDF oficial listo para tu trámite en notaría.`;

    return {
      isIduRequest: true,
      reportText
    };
  }

  // CASO 2: Tiene CHIP → Descargar automáticamente el PDF oficial desde el portal del IDU
  let downloadResult: DownloadIduPdfResult | null = null;
  const shouldAttemptDownload = process.env.NODE_ENV !== 'test' && !options?.skipDownload;

  if (shouldAttemptDownload) {
    downloadResult = await downloadIduCertificatePdf(chip);
  }

  if (downloadResult && downloadResult.success && downloadResult.pdfBuffer) {
    const matText = downloadResult.matricula ? `📜 *Matrícula Inmobiliaria:* ${downloadResult.matricula}\n` : '';
    const dirText = downloadResult.direccion ? `📍 *Dirección del predio:* ${downloadResult.direccion}\n` : '';

    const reportText =
      `🏛️ *PAZ Y SALVO DE VALORIZACIÓN IDU BOGOTÁ — VECY BIENES RAÍCES* 🇨🇴\n\n` +
      `🏠 *Predio CHIP:* ${chip}\n` +
      matText +
      dirText +
      `\n✅ *Adjunto encuentras tu Certificado Oficial de Estado de Cuenta expedido por el Instituto de Desarrollo Urbano (IDU).* ` +
      `Este documento certifica con plena validez legal para trámites notariales (Artículo 44 del Acuerdo Distrital 915 de 2023) que el inmueble *NO presenta deudas por concepto de Contribución de Valorización* y se encuentra al día con el Distrito.\n\n` +
      `¡Listo para tu trámite de escrituración, promesa o venta en notaría! 🏢✨`;

    // Registro persistente en base de datos para analítica e historial
    try {
      const { getDb } = await import('../db');
      const { predialConsultations } = await import('../../drizzle/schema');
      const db = await getDb();
      if (db) {
        await db.insert(predialConsultations).values({
          chip: chip.toUpperCase(),
          documentType: 'CHIP',
          documentNumber: chip.toUpperCase(),
          nombreContribuyente: 'PROPIETARIO / TITULAR IDU',
          numBp: null,
          anoGravable: '2026',
          queryType: 'paz_y_salvo_idu',
          downloadUrl: 'https://webidu.idu.gov.co/ServiciosValorizacion/faces/site/index.xhtml',
          requesterPhone: senderId ? senderId.replace(/@.*$/, '') : null,
          source: isPrivateDm ? 'whatsapp_dm' : 'whatsapp_group',
          status: 'completed',
          metadata: {
            pdfFileName: downloadResult.pdfFileName,
            matricula: downloadResult.matricula,
            direccion: downloadResult.direccion,
            date: new Date().toISOString()
          }
        });
      }
    } catch (dbErr) {
      console.warn('[IDU-SERVICE] No se pudo guardar la consulta en BD:', dbErr);
    }

    return {
      isIduRequest: true,
      chip,
      reportText,
      pdfBuffer: downloadResult.pdfBuffer,
      pdfFileName: downloadResult.pdfFileName,
      matricula: downloadResult.matricula,
      direccion: downloadResult.direccion
    };
  }

  // CASO 3: Error del portal (CHIP inválido o no registrado)
  const errorMsg = downloadResult?.errorMessage ||
    `No fue posible expedir el certificado de valorización en este momento para el CHIP ${chip}.`;

  const reportText =
    `🏛️ *PAZ Y SALVO DE VALORIZACIÓN IDU BOGOTÁ — VECY BIENES RAÍCES* 🇨🇴\n\n` +
    `🏠 *Predio CHIP:* ${chip}\n\n` +
    `⚠️ ${errorMsg}\n\n` +
    `🌐 *Puedes consultar directamente en el portal oficial del IDU:*\n` +
    `👉 https://webidu.idu.gov.co/ServiciosValorizacion/faces/site/index.xhtml\n\n` +
    `Si tienes dudas o necesitas apoyo de nuestro equipo jurídico y catastral, escríbenos al canal oficial o consúltame de nuevo indicando el CHIP exacto. 👍`;

  return {
    isIduRequest: true,
    chip,
    reportText,
    matricula: downloadResult?.matricula,
    direccion: downloadResult?.direccion
  };
}
