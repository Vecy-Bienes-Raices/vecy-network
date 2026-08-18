import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

/**
 * Gestor Autónomo de Archivos y Flyers para Vecy Network (v22.7)
 * - Guarda localmente en `public/uploads/` y `uploads/` (servidos públicamente por Express en /uploads/...)
 * - Soporta subida opcional a Supabase Storage bucket `property-flyers`
 * - Devuelve URLs públicas inmediatas y accesibles para la web
 */

const uploadsDir = path.resolve(process.cwd(), 'public/uploads');

// Asegurar que exista la carpeta base
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, '').replace(/[^\w\d\-_\.\/]/g, '_');
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

  // Intentar también subir a Supabase Storage si las credenciales están disponibles
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

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
          console.log(`[Storage] Archivo subido exitosamente a Supabase Storage: ${publicData.publicUrl}`);
          return { key, url: publicData.publicUrl };
        }
      }
    } catch (sbErr: any) {
      console.warn(`[Storage] Supabase Storage opcional omitido (${sbErr.message}), usando almacenamiento local estático.`);
    }
  }

  // URL estática local servida por Express
  const publicUrl = `/uploads/${key}`;
  console.log(`[Storage] Archivo guardado localmente en ${targetFilePath} -> URL: ${publicUrl}`);
  return { key, url: publicUrl };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return {
    key,
    url: `/uploads/${key}`
  };
}
