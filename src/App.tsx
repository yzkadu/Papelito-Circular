import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProfileProvider } from './auth/ProfileContext';
import { RequireSession } from './auth/RequireSession';
import { ToastProvider } from './components/ui/Toast';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Imports from './pages/Imports';
import UserAdministration from './pages/UserAdministration';
import { RealDataProvider } from './real/data';
import { RealShell, RealHome, RealMasters, RealStandards, RealEntries, RealStock, RealPickups, RealRestricted } from './real/RealPages';

export function AppRoutes() {
  return <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<Login />} />
    <Route path="/app" element={<RequireSession><RealDataProvider><RealShell /></RealDataProvider></RequireSession>}>
      <Route index element={<RealHome />} />
      <Route path="cadastros" element={<RealRestricted roles={['admin','supervisor','ambiental','operador','financeiro']}><RealMasters /></RealRestricted>} />
      <Route path="referencias" element={<RealRestricted roles={['admin','supervisor','ambiental','financeiro']}><RealStandards /></RealRestricted>} />
      <Route path="residuos" element={<RealRestricted roles={['admin','supervisor','ambiental','operador','financeiro']}><RealEntries /></RealRestricted>} />
      <Route path="estoque" element={<RealRestricted roles={['admin','supervisor','ambiental','financeiro']}><RealStock /></RealRestricted>} />
      <Route path="coletas" element={<RealRestricted roles={['admin','supervisor','ambiental','financeiro','capital']}><RealPickups /></RealRestricted>} />
      <Route path="importacao" element={<RealRestricted roles={['admin','supervisor','ambiental','financeiro']}><Imports /></RealRestricted>} />
      <Route path="usuarios" element={<RealRestricted roles={['admin']}><UserAdministration /></RealRestricted>} />
      <Route path="producao/maquinas" element={<Navigate to="/app/residuos" replace />} />
      <Route path="metodologia" element={<Navigate to="/app/referencias" replace />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

export default function App() {
  return <ProfileProvider><ToastProvider><HashRouter><AppRoutes /></HashRouter></ToastProvider></ProfileProvider>;
}
