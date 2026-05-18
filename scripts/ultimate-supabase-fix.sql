-- ============================================================
-- VECY NETWORK — ULTIMATE SECURITY HARDENING (RLS & FUNCTIONS)
-- ============================================================

-- 1. Habilitar RLS en TODAS las tablas en el esquema public
DO $$ 
DECLARE 
    r record;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    END LOOP;
END $$;

-- 2. Limpiar políticas existentes para evitar conflictos
DO $$ 
DECLARE 
    r record;
BEGIN
    FOR r IN (SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 3. Crear Políticas Universales
-- Regla de Oro: service_role tiene acceso TOTAL, anon/authenticated NO tienen acceso a menos que se especifique.

DO $$ 
DECLARE 
    r record;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        -- Acceso total para service_role (JanIA y Backend interno)
        EXECUTE format('CREATE POLICY "service_access_all" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);', r.tablename);
        
        -- Bloqueo total por defecto para anon y authenticated
        EXECUTE format('CREATE POLICY "public_deny_all" ON public.%I FOR ALL TO anon, authenticated USING (false);', r.tablename);
    END LOOP;
END $$;

-- 4. Excepciones Específicas para el Portal Web
-- properties: Lectura pública de inmuebles disponibles
DROP POLICY IF EXISTS "public_deny_all" ON properties;
CREATE POLICY "properties_read_public" ON properties FOR SELECT TO anon, authenticated USING (available = true);
CREATE POLICY "service_access_all" ON properties FOR ALL TO service_role USING (true) WITH CHECK (true);

-- propertyImages: Lectura pública de fotos
DROP POLICY IF EXISTS "public_deny_all" ON "propertyImages";
CREATE POLICY "images_read_public" ON "propertyImages" FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "service_access_all" ON "propertyImages" FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. Blindaje de Funciones (Search Path)
-- Esto soluciona el aviso de "mutable search_path"
ALTER FUNCTION public.buscar_matches_para_inmueble(uuid) SET search_path = public;

-- VERIFICACIÓN
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
