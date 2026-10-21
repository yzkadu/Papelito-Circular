import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useProfile } from './ProfileContext';
import { LoadingState } from '../components/ui';

export function RequireSession({ children }: { children: ReactNode }) {
  const { mode, status, signOut } = useProfile();
  if (mode === 'demo' || status === 'authenticated') return <>{children}</>;
  if (status === 'loading') return <div className="mx-auto max-w-xl p-10"><LoadingState /></div>;
  if (status === 'signed_out') return <Navigate to="/login" replace />;

  return (
    <main className="mx-auto mt-16 max-w-lg rounded-xl border border-paper-line bg-white p-8 text-center">
      <h1 className="text-xl font-bold">Acesso indisponível</h1>
      <p className="mt-3 text-sm text-neutral-600">
        {status === 'not_configured'
          ? 'O Supabase ainda não foi configurado neste ambiente. Contate o administrador.'
          : 'Sua conta não possui um perfil ativo autorizado. Solicite ao administrador sua liberação.'}
      </p>
      {status === 'no_profile' && (
        <button className="mt-5 rounded-lg bg-ink px-4 py-2 text-white" onClick={() => void signOut()}>
          Sair da conta
        </button>
      )}
    </main>
  );
}
