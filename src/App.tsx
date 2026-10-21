import { useMemo } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProfileProvider } from './auth/ProfileContext';
import { RequireSession } from './auth/RequireSession';
import Login from './pages/Login';
import UserAdministration from './pages/UserAdministration';
import type { Permission } from './auth/roles';
import { AppShell, HomeRedirect, RequirePermission } from './components/layout/AppShell';
import { ToastProvider } from './components/ui/Toast';
import { DataProvider } from './data/DataProvider';
import type { DataRepository } from './data/repository';
import type { Role } from './domain/types';
import Audit from './pages/Audit';
import Collections from './pages/Collections';
import Dashboard from './pages/Dashboard';
import Finance from './pages/Finance';
import Landing from './pages/Landing';
import MachineProduction from './pages/MachineProduction';
import Methodology from './pages/Methodology';
import Registry from './pages/Registry';
import Stock from './pages/Stock';
import Waste from './pages/Waste';

const guard = (p: Permission, el: JSX.Element) => <RequirePermission permission={p}>{el}</RequirePermission>;

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/app" element={<RequireSession><AppShell /></RequireSession>}>
        <Route index element={<HomeRedirect><Dashboard /></HomeRedirect>} />
        <Route path="producao/maquinas" element={guard('producao:ver', <MachineProduction />)} />
        <Route path="residuos" element={guard('residuos:ver', <Waste />)} />
        <Route path="estoque" element={guard('estoque:ver', <Stock />)} />
        <Route path="coletas" element={guard('coletas:ver', <Collections />)} />
        <Route path="financeiro" element={guard('financeiro:ver', <Finance />)} />
        <Route path="cadastros" element={guard('cadastros:ver', <Registry />)} />
        <Route path="auditoria" element={guard('auditoria:ver', <Audit />)} />
        <Route path="usuarios" element={guard('usuarios:gerenciar', <UserAdministration />)} />
        <Route path="metodologia" element={<Methodology />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function Providers({ repository, initialRole, children }: { repository: DataRepository; initialRole?: Role; children: React.ReactNode }) {
  return (
    <ProfileProvider initialRole={initialRole}>
      <ToastProvider>
        <DataProvider repository={repository}>{children}</DataProvider>
      </ToastProvider>
    </ProfileProvider>
  );
}

export default function App({ repository }: { repository: DataRepository }) {
  const repo = useMemo(() => repository, [repository]);
  return (
    <Providers repository={repo}>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </Providers>
  );
}
