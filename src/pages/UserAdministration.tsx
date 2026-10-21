import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useProfile } from '../auth/ProfileContext';
import { ROLES } from '../auth/roles';
import { supabase } from '../auth/supabase';
import type { Role } from '../domain/types';

type Member = { id: string; display_name: string; role: Role; active: boolean };

export default function UserAdministration() {
  const { userId } = useProfile();
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [newId, setNewId] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('operador');

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const { data, error: fetchError } = await supabase.from('profiles')
      .select('id,display_name,role,active').order('display_name');
    if (fetchError) { setError(fetchError.message); return; }
    setMembers((data ?? []) as Member[]);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function change(member: Member, changes: Partial<Pick<Member, 'role' | 'active'>>) {
    if (!supabase || member.id === userId) return;
    setBusy(true); setError(''); setNotice('');
    const { data, error: updateError } = await supabase.from('profiles')
      .update(changes).eq('id', member.id).select('id').single();
    if (updateError || !data) setError(updateError?.message || 'Não foi possível atualizar o perfil.');
    else { setNotice('Permissão atualizada.'); await refresh(); }
    setBusy(false);
  }

  async function addProfile(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(''); setNotice('');
    const { error: insertError } = await supabase.from('profiles').insert({
      id: newId.trim(), display_name: name.trim(), role, active: true,
    });
    if (insertError) setError(insertError.message);
    else { setNewId(''); setName(''); setNotice('Perfil vinculado à conta do Supabase.'); await refresh(); }
    setBusy(false);
  }

  if (!supabase) return <p>Configure o Supabase para gerenciar os usuários reais.</p>;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usuários e permissões</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Cada colaborador possui seu próprio acesso. Somente um administrador pode atribuir perfis.
        </p>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      <div className="overflow-x-auto rounded-xl border border-paper-line bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">Perfis ativos e cadastrados</h2>
          <button onClick={() => void refresh()} className="text-sm underline">Atualizar lista</button>
        </div>
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b text-neutral-500"><th className="py-2">Nome</th><th>Perfil</th><th>Situação</th></tr></thead>
          <tbody>
            {members.map(member => (
              <tr key={member.id} className="border-b last:border-0">
                <td className="py-3 pr-3 font-medium">{member.display_name}{member.id === userId && <span className="ml-2 text-xs text-neutral-500">(você)</span>}</td>
                <td className="pr-3">
                  <select aria-label={`Perfil de ${member.display_name}`} value={member.role} disabled={busy || member.id === userId}
                    onChange={e => void change(member, { role: e.target.value as Role })}
                    className="max-w-44 rounded-md border px-2 py-2">
                    {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </td>
                <td>
                  <button disabled={busy || member.id === userId} onClick={() => void change(member, { active: !member.active })}
                    className="rounded-lg border px-3 py-1.5 disabled:opacity-50">
                    {member.active ? 'Ativo · desativar' : 'Inativo · ativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && <p className="mt-4 text-sm text-neutral-500">Nenhum perfil encontrado.</p>}
      </div>
      <form onSubmit={addProfile} className="rounded-xl border border-paper-line bg-white p-5">
        <h2 className="font-bold">Vincular novo usuário</h2>
        <p className="mt-1 text-xs text-neutral-600">
          Primeiro crie ou convide a conta em Supabase → Authentication → Users; depois informe o UUID dessa conta.
          Nunca cadastre senhas nesta tela.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm">UUID do Auth
            <input required type="text" pattern="[a-fA-F0-9-]{36}" value={newId} onChange={e => setNewId(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="ID da conta" />
          </label>
          <label className="text-sm">Nome de exibição
            <input required value={name} onChange={e => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Nome" />
          </label>
          <label className="text-sm">Perfil
            <select value={role} onChange={e => setRole(e.target.value as Role)}
              className="mt-1 w-full rounded-lg border px-3 py-2">
              {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </label>
        </div>
        <button disabled={busy} type="submit" className="mt-4 rounded-lg bg-brand-500 px-4 py-2 font-bold disabled:opacity-50">
          Vincular perfil
        </button>
      </form>
      <p className="text-xs text-neutral-500">
        O bloqueio real de dados operacionais depende das políticas RLS e da migração para um repositório Supabase.
        Os módulos produtivos ainda utilizam dados demonstrativos, se habilitados.
      </p>
    </section>
  );
}
