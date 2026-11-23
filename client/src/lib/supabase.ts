import { createClient } from '@supabase/supabase-js';
import { hasOAuthCallbackParams, hasOAuthSuccessParams } from '@shared/authRouting';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://knzmpoprlmbonejshfys.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtuem1wb3BybG1ib25lanNoZnlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMjYyMjQsImV4cCI6MjA5MTYwMjIyNH0.yZ3AV1Rt2rmDuP61CA2rJRILpw__vwAJWp3xJUNj_FY";

// Captura síncrona antes de createClient() porque detectSessionInUrl limpia el hash/query asíncronamente
export const INITIAL_URL_SEARCH = typeof window !== 'undefined' ? window.location.search : '';
export const INITIAL_URL_HASH = typeof window !== 'undefined' ? window.location.hash : '';
export const INITIAL_URL_HAS_OAUTH_CALLBACK = hasOAuthCallbackParams(INITIAL_URL_SEARCH, INITIAL_URL_HASH);
export const INITIAL_URL_HAS_OAUTH_SUCCESS = hasOAuthSuccessParams(INITIAL_URL_SEARCH, INITIAL_URL_HASH);

export function hasStoredSupabaseSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const keys = Object.keys(window.localStorage);
    for (const k of keys) {
      if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
        const raw = window.localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.access_token || parsed.currentSession?.access_token)) {
          return true;
        }
      }
    }
  } catch {
    // noop
  }
  return false;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
