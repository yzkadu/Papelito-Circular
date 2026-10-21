import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Role } from '../domain/types';
import { can as canRole, type Permission } from './roles';
import { authMode, supabase } from './supabase';

type Status = 'loading' | 'signed_out' | 'authenticated' | 'no_profile' | 'not_configured';
interface ProfileState {
  role: Role; setRole: (r: Role) => void; can: (p: Permission) => boolean;
  mode: 'demo' | 'supabase'; status: Status; userId: string | null;
  signIn: (email: string, password: string) => Promise<void>; signOut: () => Promise<void>;
}
const Ctx = createContext<ProfileState | null>(null);
const KEY = 'papelito-circular:perfil-simulado';

function readRole(fallback: Role): Role {
  try { return (localStorage.getItem(KEY) as Role) || fallback; } catch { return fallback; }
}

export function ProfileProvider({ children, initialRole = 'admin' }: { children: ReactNode; initialRole?: Role }) {
  const [role, setRoleState] = useState<Role>(() => authMode ? 'operador' : readRole(initialRole));
  const [status, setStatus] = useState<Status>(authMode ? 'loading' : 'authenticated');
  const [userId, setUserId] = useState<string | null>(null);
  const setRole = useCallback((r: Role) => {
    if (authMode) return; // Em produção, papel vem exclusivamente do banco.
    setRoleState(r);
    try { localStorage.setItem(KEY, r); } catch { /* sem storage */ }
  }, []);

  useEffect(() => {
    if (!authMode) return;
    if (!supabase) { setStatus('not_configured'); return; }
    let alive = true;
    let generation = 0;
    const client = supabase;
    const sync = async () => {
      const index = ++generation;
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (!alive || index !== generation) return;
      if (authError || !user) { setUserId(null); setStatus('signed_out'); return; }
      setUserId(user.id);
      const { data, error } = await client.from('profiles').select('role,active').eq('id', user.id).maybeSingle();
      if (!alive || index !== generation) return;
      const allowed: Role[] = ['operador','supervisor','ambiental','capital','financeiro','admin'];
      if (error || !data?.active || !allowed.includes(data.role as Role)) {
        setStatus('no_profile');
        return;
      }
      setRoleState(data.role as Role);
      setStatus('authenticated');
    };
    const { data: listener } = client.auth.onAuthStateChange(() => {
      // Não consultar outras tabelas dentro do callback de Auth: agendamento evita deadlock.
      queueMicrotask(() => { if (alive) void sync(); });
    });
    void sync();
    return () => { alive = false; generation++; listener.subscription.unsubscribe(); };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!authMode || !supabase) throw new Error('Autenticação indisponível.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Não foi possível entrar. Verifique e-mail, senha e liberação da conta.');
  }, []);
  const signOut = useCallback(async () => {
    if (!authMode || !supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error('Não foi possível encerrar a sessão.');
    setUserId(null);
    setStatus('signed_out');
  }, []);
  const value = useMemo(() => ({
    role, setRole, can: (p: Permission) => status === 'authenticated' && canRole(role, p),
    mode: (authMode ? 'supabase' : 'demo') as 'supabase' | 'demo',
    status, userId, signIn, signOut,
  }), [role, setRole, status, userId, signIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useProfile() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useProfile fora do ProfileProvider');
  return ctx;
}
