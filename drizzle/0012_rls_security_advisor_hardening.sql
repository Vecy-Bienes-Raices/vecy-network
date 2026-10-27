-- Migration 0012: Blindaje de Seguridad Supabase Security Advisor (rls_disabled_in_public)
-- Activa Row Level Security (RLS) y políticas de aislamiento para 'advisors' y 'predial_consultations'

-- 1. Tabla advisors
ALTER TABLE public.advisors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_advisors" ON public.advisors;
DROP POLICY IF EXISTS "deny_anon_advisors" ON public.advisors;
CREATE POLICY "service_role_all_advisors" ON public.advisors FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "deny_anon_advisors" ON public.advisors FOR ALL TO anon, authenticated USING (false);

-- 2. Tabla predial_consultations
ALTER TABLE public.predial_consultations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_predial" ON public.predial_consultations;
DROP POLICY IF EXISTS "deny_anon_predial" ON public.predial_consultations;
CREATE POLICY "service_role_all_predial" ON public.predial_consultations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "deny_anon_predial" ON public.predial_consultations FOR ALL TO anon, authenticated USING (false);
