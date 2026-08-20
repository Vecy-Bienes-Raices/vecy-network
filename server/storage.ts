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
 * Usa VPS_BASE_URL del entorno (ej: http://13.140.149.144) o por defecto el IP del VPS.
 */
function buildAbsoluteLocalUrl(key: string): string {
  const base = (process.env.VPS_BASE_URL || 'http://13.140.149.144').replace(/\/+$/, '');
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

  // Intentar subir a Supabase Storage (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY son los nombres reales en .env)
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error: uploadError } = await supabase.storage
        .from('property-flyers')
        .upload(key, buffer, {
          contentType,
          upsert: true
        });

      if (!uploadError) {
        const { data: publicData } = supabase.storage.from('property-flyers').getPublicUrl(key);
        if (publicData?.publicUrl) {
          console.log(`[Storage] ✅ Archivo subido a Supabase Storage: ${publicData.publicUrl}`);
          return { key, url: publicData.publicUrl };
        }
      } else {
        console.warn(`[Storage] Supabase upload error: ${uploadError.message}`);
      }
    } catch (sbErr: any) {
      console.warn(`[Storage] Supabase Storage omitido (${sbErr.message}), usando almacenamiento local.`);
    }
  }

  // Fallback: URL ABSOLUTA del VPS (funciona desde Vercel y cualquier origen externo)
  const publicUrl = buildAbsoluteLocalUrl(key);
  console.log(`[Storage] 📁 Archivo guardado localmente en ${targetFilePath} -> URL absoluta: ${publicUrl}`);
  return { key, url: publicUrl };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return {
    key,
    url: `/uploads/${key}`
  };
}
