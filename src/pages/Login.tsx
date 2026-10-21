import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useProfile } from '../auth/ProfileContext';
import { CircularLogo } from '../components/brand/PapelitoLogo';

export default function Login() {
  const { status, mode, signIn, signOut } = useProfile();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  if (mode === 'demo' || status === 'authenticated') return <Navigate to="/app" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao entrar. Verifique seus dados.');
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-paper-line bg-white p-8 shadow-card">
        <Link to="/" aria-label="Página inicial"><CircularLogo /></Link>
        <h1 className="mt-8 text-2xl font-bold text-ink">Acesso ao Papelito Circular</h1>
        <p className="mt-2 text-sm text-neutral-600">Entre com a conta autorizada para sua área. Seu perfil é definido pelo administrador. Não há cadastro público.</p>
        {status === 'not_configured' ? (
          <p role="alert" className="mt-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Autenticação não configurada neste ambiente. Informe o administrador.
          </p>
        ) : status === 'no_profile' ? (
          <div className="mt-6">
            <p role="alert" className="text-sm text-red-800">Sua conta existe, mas não tem perfil ativo. Solicite acesso ao administrador.</p>
            <button className="mt-4 underline" onClick={() => void signOut()}>Sair</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">E-mail</label>
              <input id="email" type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full rounded-lg border border-paper-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium">Senha</label>
              <input id="password" type="password" required minLength={1} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full rounded-lg border border-paper-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={sending || status === 'loading'}
              className="w-full rounded-lg bg-brand-500 px-4 py-3 font-bold text-ink disabled:opacity-50">
              {sending ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        )}
        <p className="mt-6 text-xs text-neutral-500">Cada área pode ter sua conta funcional. Não compartilhe senhas fora da equipe autorizada.</p>
      </div>
    </main>
  );
}
