import {
  BookOpen,
  Boxes,
  Factory,
  Hand,
  History,
  FileSpreadsheet,
  LayoutDashboard,
  Scissors,
  Settings2,
  Truck,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { Permission } from '../../auth/roles';

export interface NavItem {
  to: string;
  label: string;
  short: string;
  icon: LucideIcon;
  permission?: Permission;
  group: 'Visão geral' | 'Operação' | 'Resíduos' | 'Gestão';
}

export const NAV: NavItem[] = [
  { to: '/app', label: 'Dashboard industrial', short: 'Início', icon: LayoutDashboard, permission: 'dashboard:ver', group: 'Visão geral' },
  { to: '/app/producao/maquinas', label: 'Produção por máquina', short: 'Máquinas', icon: Factory, permission: 'producao:ver', group: 'Operação' },
  { to: '/app/producao/manual', label: 'Produção manual', short: 'Manual', icon: Hand, permission: 'producao:ver', group: 'Operação' },
  { to: '/app/residuos', label: 'Perdas e aparas', short: 'Aparas', icon: Scissors, permission: 'residuos:ver', group: 'Resíduos' },
  { to: '/app/estoque', label: 'Estoque de resíduos', short: 'Estoque', icon: Boxes, permission: 'estoque:ver', group: 'Resíduos' },
  { to: '/app/coletas', label: 'Coletas · Capital Recicláveis', short: 'Coletas', icon: Truck, permission: 'coletas:ver', group: 'Resíduos' },
  { to: '/app/financeiro', label: 'Indicadores financeiros', short: 'Financeiro', icon: Wallet, permission: 'financeiro:ver', group: 'Gestão' },
  { to: '/app/cadastros', label: 'Cadastros', short: 'Cadastros', icon: Settings2, permission: 'cadastros:ver', group: 'Gestão' },
  { to: '/app/importacao', label: 'Conferência de planilhas', short: 'Planilhas', icon: FileSpreadsheet, permission: 'importacao:ver', group: 'Gestão' },
  { to: '/app/auditoria', label: 'Histórico e auditoria', short: 'Auditoria', icon: History, permission: 'auditoria:ver', group: 'Gestão' },
  { to: '/app/metodologia', label: 'Metodologia dos indicadores', short: 'Metodologia', icon: BookOpen, group: 'Gestão' },
];
