-- ============================================================
-- VECY NETWORK — Creación del Superadministrador Oficial
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- Insertar o actualizar el usuario administrador principal de Vecy
INSERT INTO "users" (
  "openId",
  "name",
  "email",
  "loginMethod",
  "role",
  "documentType",
  "documentNumber",
  "phone",
  "vPoints"
) VALUES (
  'vecy-superadmin',                  -- openId único e inmutable
  'Vecy Network Admin',
  'vecybienesraices@gmail.com',
  'google',
  'admin',                            -- rol: admin completo
  'NIT',
  '000000000',
  '+573166569719',
  999
)
ON CONFLICT ("openId") 
DO UPDATE SET
  "role" = 'admin',
  "email" = 'vecybienesraices@gmail.com',
  "name" = 'Vecy Network Admin',
  "updatedAt" = NOW();

-- Verificar que quedó creado correctamente
SELECT id, name, email, role, "createdAt"
FROM "users"
WHERE email = 'vecybienesraices@gmail.com';
