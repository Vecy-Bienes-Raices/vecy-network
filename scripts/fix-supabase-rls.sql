-- ============================================================
-- VECY NETWORK — COMPREHENSIVE SECURITY SCRIPT (RLS)
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- Propósito: Blindar TODAS las tablas del proyecto VECY
-- ============================================================

-- Función auxiliar para limpiar políticas previas (evita errores de duplicados)
DO $$ 
DECLARE 
    t text;
BEGIN
    FOR t IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    END LOOP;
END $$;

-- 1. TABLA: users (Blindaje total)
DROP POLICY IF EXISTS "users_security" ON "users";
CREATE POLICY "users_security" ON "users" FOR ALL TO anon, authenticated USING (false);

-- 2. TABLA: properties (Lectura pública, escritura protegida)
DROP POLICY IF EXISTS "properties_read" ON "properties";
CREATE POLICY "properties_read" ON "properties" FOR SELECT TO anon, authenticated USING (available = true);

DROP POLICY IF EXISTS "properties_write" ON "properties";
CREATE POLICY "properties_write" ON "properties" FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. TABLA: requirements (Demandas - Blindaje total para anon)
DROP POLICY IF EXISTS "requirements_security" ON "requirements";
CREATE POLICY "requirements_security" ON "requirements" FOR ALL TO anon, authenticated USING (false);

-- 4. TABLA: leads (Privacidad absoluta)
DROP POLICY IF EXISTS "leads_security" ON "leads";
CREATE POLICY "leads_security" ON "leads" FOR ALL TO anon, authenticated USING (false);

-- 5. TABLA: clientLedger (Finanzas e Inmutabilidad)
DROP POLICY IF EXISTS "ledger_security" ON "clientLedger";
CREATE POLICY "ledger_security" ON "clientLedger" FOR ALL TO anon, authenticated USING (false);

-- 6. TABLA: referralLinks (Enlaces de agentes)
DROP POLICY IF EXISTS "links_security" ON "referralLinks";
CREATE POLICY "links_security" ON "referralLinks" FOR ALL TO anon, authenticated USING (false);

-- 7. TABLA: conversations (Chats con IA)
DROP POLICY IF EXISTS "conv_security" ON "conversations";
CREATE POLICY "conv_security" ON "conversations" FOR ALL TO anon, authenticated USING (false);

-- 8. TABLA: messages (Contenido de chats)
DROP POLICY IF EXISTS "msg_security" ON "messages";
CREATE POLICY "msg_security" ON "messages" FOR ALL TO anon, authenticated USING (false);

-- 9. TABLA: propertyMatches (Matches inteligentes)
DROP POLICY IF EXISTS "matches_security" ON "propertyMatches";
CREATE POLICY "matches_security" ON "propertyMatches" FOR ALL TO anon, authenticated USING (false);

-- 10. TABLA: propertyImages (Imágenes públicas)
DROP POLICY IF EXISTS "images_read" ON "propertyImages";
CREATE POLICY "images_read" ON "propertyImages" FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "images_write" ON "propertyImages";
CREATE POLICY "images_write" ON "propertyImages" FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 11. TABLA: marketAnalysis
DROP POLICY IF EXISTS "market_read" ON "marketAnalysis";
CREATE POLICY "market_read" ON "marketAnalysis" FOR SELECT TO anon, authenticated USING (true);

-- 12. TABLA: favorites
DROP POLICY IF EXISTS "fav_security" ON "favorites";
CREATE POLICY "fav_security" ON "favorites" FOR ALL TO anon, authenticated USING (false);

-- ============================================================
-- VERIFICACIÓN FINAL
-- =================================/home/eduardo/PROYECTOS/vecy-network/scripts/fix-supabase-rls.sql===========================
SELECT
  schemaname,
  tablename,
  rowsecurity AS "RLS Activo"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
