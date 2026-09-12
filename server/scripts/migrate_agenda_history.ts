import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { getDb, getRawSql } from '../db';

const SOURCE_SUPABASE_URL = 'https://iqmlenxldsdrxsbegkwf.supabase.co';
const SOURCE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbWxlbnhsZHNkcnhzYmVna3dmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3NDgxNCwiZXhwIjoyMDY2NTUwODE0fQ.VnnOEVHE54Vbpeu3xKHdeBu0ACGqYZg3VcJ8kRgTofs';

async function runMigration() {
  console.log('🚀 Iniciando migración segura de datos: Vecy Agenda -> Vecy Network...');

  // 1. Conectar a base de datos de destino (Vecy Network)
  await getDb();
  const sql = getRawSql();
  if (!sql) {
    throw new Error('❌ No se pudo conectar a la base de datos de Vecy Network.');
  }

  // 2. Asegurar secuencia para solicitudes.id en Vecy Network
  console.log('⚙️ Verificando secuencia para columna id en solicitudes...');
  await sql`
    CREATE SEQUENCE IF NOT EXISTS solicitudes_id_seq;
  `;
  await sql`
    ALTER TABLE solicitudes ALTER COLUMN id SET DEFAULT nextval('solicitudes_id_seq');
  `;
  console.log('✅ Secuencia solicitudes_id_seq configurada correctamente.');

  // 3. Conectar a Supabase origen (Vecy Agenda Pro) en modo SOLO LECTURA vía REST
  const resp = await fetch(`${SOURCE_SUPABASE_URL}/rest/v1/solicitudes?select=*&order=id.asc`, {
    headers: {
      apikey: SOURCE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SOURCE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!resp.ok) {
    throw new Error(`❌ Error leyendo solicitudes de Vecy Agenda: ${resp.status} ${await resp.text()}`);
  }

  const sourceRows: any[] = await resp.json();

  console.log(`📦 Solicitudes leídas del origen: ${sourceRows.length}`);

  let insertedCount = 0;
  let skippedCount = 0;

  for (const row of sourceRows) {
    // Verificar si ya existe por id o por solicitud_id
    const existing = await sql`
      SELECT id FROM solicitudes 
      WHERE id = ${row.id} OR (solicitud_id = ${row.solicitud_id} AND solicitud_id IS NOT NULL)
      LIMIT 1;
    `;

    if (existing.length > 0) {
      skippedCount++;
      continue;
    }

    const createdAtIso = row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString();
    const firmaAuditIso = row.firma_fechahora_audit ? new Date(row.firma_fechahora_audit).toISOString() : null;

    // Mapear campos limpios a la tabla de destino
    await sql`
      INSERT INTO solicitudes (
        id,
        solicitud_id,
        solicitante_nombre,
        solicitante_tipo_persona,
        solicitante_perfil,
        solicitante_email,
        solicitante_celular,
        solicitante_tipo_documento,
        solicitante_numero_documento,
        servicio_solicitado,
        nombre_inmueble,
        codigo_inmueble,
        opcion_negocio,
        fecha_cita_texto,
        hora_cita,
        cantidad_personas,
        interesado_nombre,
        interesado_tipo_documento,
        interesado_documento,
        tipo_cliente,
        acompanantes,
        firma_virtual_base64,
        firma_fechahora_audit,
        created_at,
        solicitante_representante_legal,
        autorizacion,
        agent_id
      ) VALUES (
        ${row.id},
        ${row.solicitud_id ?? null},
        ${row.solicitante_nombre ?? null},
        ${row.solicitante_tipo_persona ?? null},
        ${row.solicitante_perfil ?? null},
        ${row.solicitante_email ?? null},
        ${row.solicitante_celular ?? null},
        ${row.solicitante_tipo_documento ?? null},
        ${row.solicitante_numero_documento ?? null},
        ${row.servicio_solicitado ?? null},
        ${row.nombre_inmueble ?? null},
        ${row.codigo_inmueble ?? null},
        ${row.opcion_negocio ?? null},
        ${row.fecha_cita_texto ?? null},
        ${row.hora_cita ?? null},
        ${row.cantidad_personas ?? null},
        ${row.interesado_nombre ?? null},
        ${row.interesado_tipo_documento ?? null},
        ${row.interesado_documento ?? null},
        ${row.tipo_cliente ?? null},
        ${JSON.stringify(row.acompanantes || [])},
        ${row.firma_virtual_base64 ?? null},
        ${firmaAuditIso},
        ${createdAtIso},
        ${row.solicitante_representante_legal ?? null},
        ${row.autorizacion ?? false},
        ${row.agent_id ?? null}
      );
    `;
    insertedCount++;
  }

  console.log(`✅ Migración completada: ${insertedCount} insertadas, ${skippedCount} ya existentes omitidas.`);

  // 4. Actualizar el valor actual de la secuencia al ID más alto
  await sql`
    SELECT setval('solicitudes_id_seq', (SELECT GREATEST(MAX(id), 1) FROM solicitudes) + 1);
  `;
  console.log('✅ Secuencia solicitudes_id_seq sincronizada con el MAX(id) + 1.');

  // 5. Verificar contador oficial de solicitud_id
  const counterRows = await sql`
    SELECT current_value FROM counters WHERE name = 'solicitud_id' LIMIT 1;
  `;
  console.log(`ℹ️ Contador actual en Vecy Network: ${counterRows[0]?.current_value}`);

  // 6. Resumen final en base de datos
  const totalRows = await sql`SELECT count(*) FROM solicitudes;`;
  console.log(`🎉 Total de solicitudes en Vecy Network ahora: ${totalRows[0]?.count}`);

  process.exit(0);
}

runMigration().catch((error) => {
  console.error('❌ Error en la migración:', error);
  process.exit(1);
});
