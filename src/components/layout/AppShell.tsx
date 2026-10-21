import { Menu, RotateCcw, ShieldAlert, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useProfile } from '../../auth/ProfileContext';
import { ROLES, roleLabel, type Permission } from '../../auth/roles';
import { useData } from '../../data/DataProvider';
import type { Role } from '../../domain/types';
import { CircularLogo } from '../brand/PapelitoLogo';
import { Button, cx, ErrorState, LoadingState } from '../ui';
import { useToast } from '../ui/Toast';
import { NAV } from './nav';

export function Logo({ dark = false }: { dark?: boolean }) {
  return <CircularLogo dark={dark} />;
}

function ProfileSwitcher({ compact }: { compact?: boolean }) {
  const { role, setRole, mode } = useProfile();
  if (mode === 'supabase') return <span className="text-xs font-semibold text-neutral-600">{roleLabel(role)}</span>;
  return (
    <label className="flex items-center gap-2 text-xs">
      {!compact && <span className="text-neutral-500">Perfil simulado</span>}
      <select
        aria-label="Perfil simulado"
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        className="h-8 max-w-[7.5rem] rounded-md border border-paper-line bg-white px-2 text-sm text-ink sm:max-w-none focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      >
        {ROLES.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const { can } = useProfile();
  const items = NAV.filter((n) => !n.permission || can(n.permission));
  const groups = [...new Set(items.map((i) => i.group))];
  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-5">
      {groups.map((g) => (
        <div key={g}>
          <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-[0.1em] text-neutral-500">{g}</p>
          <ul className="space-y-0.5">
            {items
              .filter((i) => i.group === g)
              .map((i) => (
                <li key={i.to}>
                  <NavLink
                    to={i.to}
                    end={i.to === '/app'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cx(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                        isActive ? 'bg-brand-500 font-bold text-ink' : 'text-neutral-300 hover:bg-white/5 hover:text-brand-500',
                      )
                    }
                  >
                    <i.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                    {i.label}
                  </NavLink>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function ResetDemo() {
  const { reset } = useData();
  const { can } = useProfile();
  const toast = useToast();
  if (!can('demo:redefinir')) return null;
  return (
    <button
      onClick={async () => {
        if (!window.confirm('Recriar a base demonstrativa? Os lançamentos feitos neste navegador serão descartados.')) return;
        await reset();
        toast.success('Base demonstrativa recriada.');
      }}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-neutral-400 hover:bg-white/5 hover:text-white"
    >
      <RotateCcw className="h-3.5 w-3.5" /> Recriar dados fictícios
    </button>
  );
}

/** Barra fixa que deixa explícito: dados fictícios e sem autenticação real. */
function DemoBar({ onMenu }: { onMenu: () => void }) {
  return (
    <div className="sticky top-0 z-30 border-b border-paper-line bg-white/90 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-2.5 lg:px-8">
        <button className="grid h-9 w-9 place-items-center rounded-lg border border-paper-line lg:hidden" onClick={onMenu} aria-label="Abrir menu">
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/" className="lg:hidden">
          <Logo />
        </Link>
        <div className="hidden min-w-0 flex-1 items-center gap-2 text-xs text-amber-900 md:flex">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <span className="truncate">
            <strong>Modo demonstração.</strong> Dados fictícios gerados para teste. Não há autenticação real: o perfil abaixo é apenas simulado.
          </span>
        </div>
        <div className="ml-auto min-w-0">
          <ProfileSwitcher compact />
        </div>
      </div>
      <p className="border-t border-amber-100 bg-amber-50 px-4 py-1.5 text-[11px] text-amber-900 md:hidden">
        <strong>Demonstração</strong> · dados fictícios · sem autenticação real
      </p>
    </div>
  );
}

function MobileBottomNav({ onMore }: { onMore: () => void }) {
  const { can } = useProfile();
  const items = NAV.filter((n) => !n.permission || can(n.permission)).slice(0, 4);
  return (
    <nav aria-label="Navegação rápida" className="fixed inset-x-0 bottom-0 z-40 border-t border-paper-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="grid grid-cols-5">
        {items.map((i) => (
          <li key={i.to}>
            <NavLink
              to={i.to}
              end={i.to === '/app'}
              className={({ isActive }) => cx('flex flex-col items-center gap-0.5 py-2 text-[11px]', isActive ? 'bg-brand-500 font-bold text-ink' : 'text-neutral-500')}
            >
              <i.icon className="h-5 w-5" aria-hidden />
              {i.short}
            </NavLink>
          </li>
        ))}
        <li>
          <button onClick={onMore} className="flex w-full flex-col items-center gap-0.5 py-2 text-[11px] text-neutral-500">
            <Menu className="h-5 w-5" aria-hidden /> Mais
          </button>
        </li>
      </ul>
    </nav>
  );
}

export function AppShell() {
  const [open, setOpen] = useState(false);
  const { status, error, reload } = useData();
  const { role, mode, signOut } = useProfile();
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const sidebar = (
    <div className="flex h-full flex-col bg-ink px-3 py-5 text-white">
      <div className="mb-6 flex items-center justify-between px-3">
        <Link to="/" aria-label="Papelito Circular — página inicial">
          <Logo dark />
        </Link>
        <button className="text-neutral-400 lg:hidden" onClick={() => setOpen(false)} aria-label="Fechar menu">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SideNav onNavigate={() => setOpen(false)} />
      </div>
      <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
        <div className="px-3 text-xs text-neutral-400">
          <p className="text-neutral-500">{mode === 'demo' ? 'Perfil simulado' : 'Perfil autorizado'}</p>
          <p className="font-medium text-white">{roleLabel(role)}</p>
        </div>
        {mode === 'demo' && <ResetDemo />}
        {mode === 'supabase' && <button className="px-3 py-2 text-sm text-white underline" onClick={() => void signOut()}>Sair da conta</button>}
        <p className="px-3 text-[11px] leading-snug text-neutral-500">Versão 0.1 · Fase 1 — protótipo. Não validado para operação industrial.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl">{sidebar}</div>
        </div>
      )}
      <div className="lg:pl-64">
        {mode === 'demo' ? <DemoBar onMenu={() => setOpen(true)} /> : <div className="border-b bg-white px-4 py-3 text-sm"><button onClick={() => setOpen(true)} className="lg:hidden mr-3" aria-label="Abrir menu"><Menu className="inline h-5 w-5" /></button><span className="font-semibold">Papelito Circular</span><span className="ml-4 text-neutral-500">{roleLabel(role)}</span><span className="ml-4 text-amber-700">Dados demonstrativos · não inserir informações reais</span></div>}
        <main className="mx-auto max-w-[1400px] px-4 pb-28 pt-6 lg:px-8 lg:pb-12">
          {status === 'loading' && <LoadingState />}
          {status === 'error' && <ErrorState message={error ?? 'Erro desconhecido.'} onRetry={reload} />}
          {status === 'ready' && <Outlet />}
        </main>
      </div>
      <MobileBottomNav onMore={() => setOpen(true)} />
    </div>
  );
}

/** Bloqueio de interface por perfil (simulado). Em produção, a autorização é feita no backend. */
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can, role } = useProfile();
  if (can(permission)) return <>{children}</>;
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-xl border border-paper-line bg-white p-8 text-center shadow-card">
      <ShieldAlert className="mx-auto h-8 w-8 text-neutral-400" aria-hidden />
      <h1 className="mt-3 text-lg font-semibold">Área restrita</h1>
      <p className="mt-1 text-sm text-neutral-600">
        O perfil <strong>{roleLabel(role)}</strong> não tem acesso a esta área. Solicite ao administrador a autorização necessária.
      </p>
      <p className="mt-3 text-xs text-neutral-500">O acesso às telas é controlado pelo perfil; a proteção dos dados reais depende das políticas do Supabase.</p>
      <Button variant="secondary" className="mt-4" onClick={() => history.back()}>
        Voltar
      </Button>
    </div>
  );
}

/** Página inicial do app conforme o perfil (ex.: Capital Recicláveis vai direto às coletas). */
export function HomeRedirect({ children }: { children: ReactNode }) {
  const { can } = useProfile();
  if (can('dashboard:ver')) return <>{children}</>;
  const first = NAV.find((n) => n.permission && can(n.permission));
  return <Navigate to={first?.to ?? '/app/metodologia'} replace />;
}
