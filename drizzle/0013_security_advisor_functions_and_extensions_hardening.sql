-- Migration 0013: Hardening de Funciones y Extensiones (Supabase Security Advisor)
-- 1. Mover extensiones al esquema privado 'extensions'
ALTER EXTENSION unaccent SET SCHEMA extensions;

-- 2. Fijar search_path inmutable en funciones de matching y triggers (prevención de search_path injection)
ALTER FUNCTION public.buscar_matches_para_inmueble(integer) SET search_path = public;
ALTER FUNCTION public.match_properties_for_requirement(integer, numeric) SET search_path = public;
ALTER FUNCTION public.match_requirements_for_property(integer, numeric) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.get_next_solicitud_id() SET search_path = public;

-- 3. Revocar permisos de ejecución pública y anónima en funciones SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.get_next_solicitud_id() FROM public;
REVOKE EXECUTE ON FUNCTION public.get_next_solicitud_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_next_solicitud_id() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role, postgres;
