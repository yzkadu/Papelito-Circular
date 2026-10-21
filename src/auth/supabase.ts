import { createClient } from '@supabase/supabase-js';

/**
 * A chave publishable (ou anon legada) é pública; nunca use service_role no cliente.
 * GitHub publica o frontend, Supabase autentica usuários e autoriza dados via RLS.
 */
export const authMode = import.meta.env.VITE_AUTH_MODE === 'supabase';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
