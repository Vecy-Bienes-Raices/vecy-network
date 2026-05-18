-- ============================================================
-- VECY NETWORK — COMPREHENSIVE SECURITY SCRIPT (RLS & FUNCTIONS)
-- ============================================================

-- 1. Activar RLS en TODAS las tablas (incluyendo las nuevas)
DO $$ 
DECLARE 
    t text;
BEGIN
    FOR t IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    END LOOP;
END $$;

-- 2. Limpiar y recrear políticas de seguridad
-- users, leads, clientLedger, conversations, messages, propertyMatches, shares, favorites, referralLinks
DO $$ 
DECLARE 
    t text;
BEGIN
    FOR t IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%I_security" ON public.%I;', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%I_read" ON public.%I;', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%I_write" ON public.%I;', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%I_service_access" ON public.%I;', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%I_public_deny" ON public.%I;', t, t);
        
        -- Política por defecto: Bloqueo total para anon/auth, acceso total para service_role
        EXECUTE format('CREATE POLICY "%I_service_access" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);', t, t);
        EXECUTE format('CREATE POLICY "%I_public_deny" ON public.%I FOR ALL TO anon, authenticated USING (false);', t, t);
    END LOOP;
END $$;

-- 3. Excepciones de lectura pública (Propiedades e Imágenes)
DROP POLICY IF EXISTS "properties_public_read" ON "properties";
CREATE POLICY "properties_public_read" ON "properties" FOR SELECT TO anon, authenticated USING (available = true);

DROP POLICY IF EXISTS "images_public_read" ON "propertyImages";
CREATE POLICY "images_public_read" ON "propertyImages" FOR SELECT TO anon, authenticated USING (true);

-- 4. Blindaje de la función de matching (Fix Search Path Mutable)
-- Esto previene ataques de inyección de esquema
ALTER FUNCTION public.buscar_matches_para_inmueble(uuid) SET search_path = public;

-- VERIFICACIÓN FINAL
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
