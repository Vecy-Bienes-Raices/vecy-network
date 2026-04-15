-- ============================================================
-- VECY NETWORK — SCRIPT DE SEGURIDAD SUPABASE (RLS)
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- Propósito: Activar Row-Level Security en TODAS las tablas
-- IMPORTANTE: El backend usa el SERVICE ROLE KEY que siempre
-- tiene acceso completo, por eso las políticas bloquean
-- SÓLO el acceso anónimo desde la API pública.
-- ============================================================

-- 1. TABLA: users (datos sensibles — email, cédula, teléfono)
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- El backend (service role) tiene acceso total automáticamente.
-- Ningún usuario anónimo ni autenticado puede leer datos de otros usuarios.
CREATE POLICY "users_no_public_access"
ON "users"
FOR ALL
TO anon, authenticated
USING (false);

-- ============================================================

-- 2. TABLA: properties (catálogo público de inmuebles)
ALTER TABLE "properties" ENABLE ROW LEVEL SECURITY;

-- Las propiedades SÍ son visibles públicamente (catálogo).
-- Pero solo el backend puede crear/modificar/eliminar.
CREATE POLICY "properties_public_read"
ON "properties"
FOR SELECT
TO anon, authenticated
USING (available = true);

CREATE POLICY "properties_backend_write"
ON "properties"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================

-- 3. TABLA: leads (datos CRÍTICOS — cédula, email, WhatsApp)
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;

-- NADIE puede acceder a leads desde la API pública. Solo backend.
CREATE POLICY "leads_no_public_access"
ON "leads"
FOR ALL
TO anon, authenticated
USING (false);

-- ============================================================

-- 4. TABLA: clientLedger (registro legal inmutable)
ALTER TABLE "clientLedger" ENABLE ROW LEVEL SECURITY;

-- NADIE puede acceder al ledger desde la API pública.
CREATE POLICY "ledger_no_public_access"
ON "clientLedger"
FOR ALL
TO anon, authenticated
USING (false);

-- ============================================================

-- 5. TABLA: referralLinks (enlaces blindados de agentes)
ALTER TABLE "referralLinks" ENABLE ROW LEVEL SECURITY;

-- Solo el backend puede gestionar los enlaces.
CREATE POLICY "links_no_public_access"
ON "referralLinks"
FOR ALL
TO anon, authenticated
USING (false);

-- ============================================================

-- 6. TABLA: conversations (conversaciones con JanIA)
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_no_public_access"
ON "conversations"
FOR ALL
TO anon, authenticated
USING (false);

-- ============================================================

-- 7. TABLA: messages
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_no_public_access"
ON "messages"
FOR ALL
TO anon, authenticated
USING (false);

-- ============================================================

-- 8. TABLA: propertyMatches
ALTER TABLE "propertyMatches" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches_no_public_access"
ON "propertyMatches"
FOR ALL
TO anon, authenticated
USING (false);

-- ============================================================

-- 9. TABLA: marketAnalysis (datos públicos de mercado)
ALTER TABLE "marketAnalysis" ENABLE ROW LEVEL SECURITY;

-- Análisis de mercado SÍ puede ser público (informativo)
CREATE POLICY "market_public_read"
ON "marketAnalysis"
FOR SELECT
TO anon, authenticated
USING (true);

-- ============================================================

-- 10. TABLA: favorites
ALTER TABLE "favorites" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorites_no_public_access"
ON "favorites"
FOR ALL
TO anon, authenticated
USING (false);

-- ============================================================

-- 11. TABLA: propertyImages (imágenes enlazadas a propiedades)
ALTER TABLE "propertyImages" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "images_public_read"
ON "propertyImages"
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "images_backend_write"
ON "propertyImages"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================
-- VERIFICACIÓN — ejecutar para confirmar que RLS está activo
-- ============================================================
SELECT
  schemaname,
  tablename,
  rowsecurity AS "RLS Activo"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
