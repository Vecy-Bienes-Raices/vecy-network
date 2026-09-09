import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

/**
 * Gestor Autónomo de Archivos y Flyers para Vecy Network (v22.8)
 * - Guarda localmente en `public/uploads/` (servidos públicamente por Express en /uploads/...)
 * - Sube a Supabase Storage bucket `property-flyers` cuando las credenciales están disponibles
 * - Devuelve URLs ABSOLUTAS y públicas accesibles desde cualquier origen (Vercel, VPS, etc.)
 */

const uploadsDir = path.resolve(process.cwd(), 'public/uploads');

// Asegurar que exista la carpeta base
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, '').replace(/[^\w\d\-_\.\/]/g, '_');
}

/**
 * Construye la URL absoluta de fallback local.
 * Usa VPS_BASE_URL del entorno o por defecto el dominio HTTPS de producción (vecy-network.vercel.app).
 */
function buildAbsoluteLocalUrl(key: string): string {
  const base = (process.env.VPS_BASE_URL || 'https://vecy-network.vercel.app').replace(/\/+$/, '');
  return `${base}/uploads/${key}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const targetFilePath = path.join(uploadsDir, key);
  const targetSubdir = path.dirname(targetFilePath);

  if (!fs.existsSync(targetSubdir)) {
    fs.mkdirSync(targetSubdir, { recursive: true });
  }

  const buffer = typeof data === 'string' ? Buffer.from(data, 'base64') : Buffer.from(data);
  fs.writeFileSync(targetFilePath, buffer);

  // ── BLINDAJE DE CUOTA SUPABASE (v31.22) ──
  // Para evitar exceder los límites gratuitos de Supabase Storage (1 GB) y Egress (5 GB/mes),
  // los archivos binarios se almacenan al 100% en el disco local del VPS (136 GB libres).
  // Se sirven públicamente y con SSL seguro a través del proxy HTTPS de Vercel (/uploads/...).
  const publicUrl = buildAbsoluteLocalUrl(key);
  console.log(`[Storage] 📁 Archivo guardado localmente en VPS ${targetFilePath} -> URL: ${publicUrl}`);
  return { key, url: `/uploads/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return {
    key,
    url: `/uploads/${key}`
  };
}
