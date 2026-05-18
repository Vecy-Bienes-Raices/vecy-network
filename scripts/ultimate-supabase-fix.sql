-- ============================================================
-- VECY NETWORK — ULTIMATE SECURITY DEFINITIVE FIX (RLS & FUNCTIONS)
-- ============================================================

-- 1. Habilitar RLS en TODAS las tablas
DO $$ 
DECLARE 
    r record;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    END LOOP;
END $$;

-- 2. Crear Políticas Universales con limpieza previa quirúrgica
DO $$ 
DECLARE 
    r record;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS "service_access_all" ON public.%I;', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "public_deny_all" ON public.%I;', r.tablename);
        
        -- Acceso total para service_role (JanIA y Backend interno)
        EXECUTE format('CREATE POLICY "service_access_all" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);', r.tablename);
        
        -- Bloqueo total por defecto para anon y authenticated
        EXECUTE format('CREATE POLICY "public_deny_all" ON public.%I FOR ALL TO anon, authenticated USING (false);', r.tablename);
    END LOOP;
END $$;

-- 3. Excepciones Específicas para el Portal Web
DROP POLICY IF EXISTS "properties_read_public" ON public.properties;
CREATE POLICY "properties_read_public" ON public.properties FOR SELECT TO anon, authenticated USING (available = true);

DROP POLICY IF EXISTS "images_read_public" ON public."propertyImages";
CREATE POLICY "images_read_public" ON public."propertyImages" FOR SELECT TO anon, authenticated USING (true);

-- 4. Blindaje de Funciones (Corregido a INTEGER)
ALTER FUNCTION public.buscar_matches_para_inmueble(integer) SET search_path = public;

-- VERIFICACIÓN
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
