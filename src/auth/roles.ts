import type { Role } from '../domain/types';

/**
 * Matriz de permissões. Na versão demonstrativa ela só controla a INTERFACE.
 * Em produção, as mesmas regras precisam ser verificadas no backend
 * (políticas RLS do Supabase — ver supabase/migrations).
 */
export type Permission =
  | 'dashboard:ver'
  | 'producao:ver'
  | 'producao:registrar'
  | 'producao:validar'
  | 'residuos:ver'
  | 'residuos:registrar'
  | 'estoque:ver'
  | 'estoque:movimentar'
  | 'coletas:ver'
  | 'coletas:gerenciar'
  | 'coletas:confirmar'
  | 'financeiro:ver'
  | 'custos:editar'
  | 'cadastros:ver'
  | 'cadastros:editar'
  | 'auditoria:ver'
  | 'demo:redefinir';

export const ROLES: { id: Role; label: string; description: string }[] = [
  { id: 'operador', label: 'Operador de produção', description: 'Registra atividades e consulta informações operacionais.' },
  { id: 'supervisor', label: 'Supervisor', description: 'Acompanha a produção, valida lançamentos e consulta indicadores.' },
  { id: 'ambiental', label: 'Responsável ambiental', description: 'Classificação de resíduos, estoque, coletas e documentação.' },
  { id: 'capital', label: 'Capital Recicláveis', description: 'Consulta e confirma exclusivamente as coletas.' },
  { id: 'financeiro', label: 'Financeiro', description: 'Indicadores econômicos e tabela de custos.' },
  { id: 'admin', label: 'Administrador', description: 'Cadastros, usuários, permissões e configurações.' },
];

const MATRIX: Record<Role, Permission[]> = {
  operador: ['dashboard:ver', 'producao:ver', 'producao:registrar', 'residuos:ver', 'residuos:registrar', 'estoque:ver', 'cadastros:ver'],
  supervisor: [
    'dashboard:ver', 'producao:ver', 'producao:registrar', 'producao:validar', 'residuos:ver', 'residuos:registrar',
    'estoque:ver', 'coletas:ver', 'cadastros:ver', 'auditoria:ver',
  ],
  ambiental: [
    'dashboard:ver', 'producao:ver', 'residuos:ver', 'residuos:registrar', 'estoque:ver', 'estoque:movimentar',
    'coletas:ver', 'coletas:gerenciar', 'coletas:confirmar', 'cadastros:ver', 'auditoria:ver',
  ],
  capital: ['coletas:ver', 'coletas:confirmar'],
  financeiro: ['dashboard:ver', 'producao:ver', 'residuos:ver', 'estoque:ver', 'coletas:ver', 'financeiro:ver', 'custos:editar', 'auditoria:ver'],
  admin: [
    'dashboard:ver', 'producao:ver', 'producao:registrar', 'producao:validar', 'residuos:ver', 'residuos:registrar',
    'estoque:ver', 'estoque:movimentar', 'coletas:ver', 'coletas:gerenciar', 'coletas:confirmar', 'financeiro:ver',
    'custos:editar', 'cadastros:ver', 'cadastros:editar', 'auditoria:ver', 'demo:redefinir',
  ],
};

export const can = (role: Role, p: Permission) => MATRIX[role].includes(p);
export const roleLabel = (r: Role) => ROLES.find((x) => x.id === r)?.label ?? r;
