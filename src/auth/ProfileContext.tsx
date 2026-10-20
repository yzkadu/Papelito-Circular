import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Role } from '../domain/types';
import { can as canRole, type Permission } from './roles';

/**
 * PERFIL SIMULADO — não é autenticação.
 * Qualquer pessoa pode trocar de perfil. Serve apenas para demonstrar o que cada perfil verá.
 */
interface ProfileState {
  role: Role;
  setRole: (r: Role) => void;
  can: (p: Permission) => boolean;
}

const Ctx = createContext<ProfileState | null>(null);
const KEY = 'papelito-circular:perfil-simulado';

function readRole(fallback: Role): Role {
  try {
    return (localStorage.getItem(KEY) as Role) || fallback;
  } catch {
    return fallback;
  }
}

export function ProfileProvider({ children, initialRole = 'admin' }: { children: ReactNode; initialRole?: Role }) {
  const [role, setRoleState] = useState<Role>(() => readRole(initialRole));
  const setRole = useCallback((r: Role) => {
    setRoleState(r);
    try {
      localStorage.setItem(KEY, r);
    } catch {
      /* armazenamento indisponível: perfil vale só nesta sessão */
    }
  }, []);
  const value = useMemo(() => ({ role, setRole, can: (p: Permission) => canRole(role, p) }), [role, setRole]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfile() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useProfile fora do ProfileProvider');
  return v;
}
