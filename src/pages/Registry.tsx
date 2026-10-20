import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useProfile } from '../auth/ProfileContext';
import { ROLES } from '../auth/roles';
import { Badge, Button, Card, CardHeader, cx, DataTable, DemoTag, Field, FormGrid, Input, Notice, PageHeader, Select } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { useData, useSnapshot } from '../data/DataProvider';
import { unitCode } from '../domain/format';
import type { Machine, Product, Sector, Snapshot, Unit } from '../domain/types';
import { machineSchema, productSchema, sectorSchema, unitSchema } from '../forms/schemas';
import { errMsg } from '../forms/useZodForm';

type Tab = 'setores' | 'maquinas' | 'produtos' | 'unidades' | 'materiais' | 'perfis';
const TABS: { id: Tab; label: string }[] = [
  { id: 'setores', label: 'Setores' },
  { id: 'maquinas', label: 'Máquinas' },
  { id: 'produtos', label: 'Produtos' },
  { id: 'unidades', label: 'Unidades de medida' },
  { id: 'materiais', label: 'Materiais e locais' },
  { id: 'perfis', label: 'Perfis de acesso' },
];

const newId = (p: string) => `${p}-${Date.now().toString(36)}`;
const SECTOR_KIND = { mecanizado: 'Mecanizado', manual: 'Manual', apoio: 'Apoio' } as const;

function ActiveBadge({ active }: { active: boolean }) {
  return active ? <Badge tone="green">Ativo</Badge> : <Badge>Inativo</Badge>;
}

function useSave() {
  const toast = useToast();
  return async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      toast.success(msg);
      return true;
    } catch (e) {
      toast.error(e);
      return false;
    }
  };
}

function SectorsTab({ s, editable }: { s: Snapshot; editable: boolean }) {
  const { actions } = useData();
  const save = useSave();
  const [editing, setEditing] = useState<Sector | null>(null);
  const f = useForm({ resolver: zodResolver(sectorSchema), values: editing ? { code: editing.code, name: editing.name, kind: editing.kind } : { code: '', name: '', kind: 'mecanizado' as const } });
  const submit = f.handleSubmit(async (v) => {
    const item: Sector = { id: editing?.id ?? newId('set'), active: editing?.active ?? true, ...v };
    if (await save(() => actions.saveMaster('sectors', item), editing ? 'Setor atualizado.' : 'Setor cadastrado.')) setEditing(null);
  });
  return (
    <>
      {editable && (
        <form onSubmit={submit} className="space-y-4 border-b border-paper-line p-5" noValidate aria-label="Cadastro de setor">
          <FormGrid>
            <Field label="Código" htmlFor="sc-code" error={errMsg(f.formState.errors.code)}><Input id="sc-code" {...f.register('code')} /></Field>
            <Field label="Nome" htmlFor="sc-name" error={errMsg(f.formState.errors.name)}><Input id="sc-name" {...f.register('name')} /></Field>
            <Field label="Tipo" htmlFor="sc-kind"><Select id="sc-kind" {...f.register('kind')}>{Object.entries(SECTOR_KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
          </FormGrid>
          <div className="flex justify-end gap-2">
            {editing && <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancelar edição</Button>}
            <Button type="submit">{editing ? 'Salvar alterações' : 'Cadastrar setor'}</Button>
          </div>
        </form>
      )}
      <DataTable caption="Setores" rows={s.sectors} rowKey={(r) => r.id} columns={[
        { key: 'c', header: 'Código', cell: (r) => <strong>{r.code}</strong> },
        { key: 'n', header: 'Nome', cell: (r) => r.name },
        { key: 'k', header: 'Tipo', cell: (r) => SECTOR_KIND[r.kind] },
        { key: 'm', header: 'Máquinas', align: 'right', cell: (r) => s.machines.filter((m) => m.sectorId === r.id).length },
        { key: 'a', header: 'Situação', cell: (r) => <ActiveBadge active={r.active} /> },
        ...(editable ? [{ key: 'e', header: '', cell: (r: Sector) => (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => setEditing(r)} aria-label={`Editar ${r.code}`}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="ghost" onClick={() => save(() => actions.saveMaster('sectors', { ...r, active: !r.active }), 'Situação alterada.')}>{r.active ? 'Desativar' : 'Ativar'}</Button>
          </div>
        ) }] : []),
      ]} />
    </>
  );
}

function MachinesTab({ s, editable }: { s: Snapshot; editable: boolean }) {
  const { actions } = useData();
  const save = useSave();
  const [editing, setEditing] = useState<Machine | null>(null);
  const f = useForm({ resolver: zodResolver(machineSchema), values: editing ? { code: editing.code, name: editing.name, sectorId: editing.sectorId, notes: editing.notes ?? '' } : { code: '', name: '', sectorId: '', notes: '' } });
  const submit = f.handleSubmit(async (v) => {
    const item: Machine = { id: editing?.id ?? newId('mq'), active: editing?.active ?? true, ...v, notes: v.notes || undefined };
    if (await save(() => actions.saveMaster('machines', item), editing ? 'Máquina atualizada.' : 'Máquina cadastrada.')) setEditing(null);
  });
  const e = f.formState.errors;
  return (
    <>
      {editable && (
        <form onSubmit={submit} className="space-y-4 border-b border-paper-line p-5" noValidate aria-label="Cadastro de máquina">
          <FormGrid>
            <Field label="Código" htmlFor="mc-code" error={errMsg(e.code)}><Input id="mc-code" placeholder="Ex.: MQ-05" {...f.register('code')} /></Field>
            <Field label="Nome / descrição" htmlFor="mc-name" error={errMsg(e.name)}><Input id="mc-name" {...f.register('name')} /></Field>
            <Field label="Setor" htmlFor="mc-sector" error={errMsg(e.sectorId)}>
              <Select id="mc-sector" {...f.register('sectorId')}><option value="">Selecione…</option>{s.sectors.filter((x) => x.kind === 'mecanizado').map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>
            </Field>
          </FormGrid>
          <div className="flex justify-end gap-2">
            {editing && <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancelar edição</Button>}
            <Button type="submit">{editing ? 'Salvar alterações' : 'Cadastrar máquina'}</Button>
          </div>
        </form>
      )}
      <DataTable caption="Máquinas" rows={s.machines} rowKey={(r) => r.id} columns={[
        { key: 'c', header: 'Código', cell: (r) => <strong>{r.code}</strong> },
        { key: 'n', header: 'Nome', cell: (r) => r.name },
        { key: 's', header: 'Setor', cell: (r) => s.sectors.find((x) => x.id === r.sectorId)?.name },
        { key: 'r', header: 'Lançamentos', align: 'right', cell: (r) => s.machineRecords.filter((x) => x.machineId === r.id).length },
        { key: 'a', header: 'Situação', cell: (r) => <ActiveBadge active={r.active} /> },
        ...(editable ? [{ key: 'e', header: '', cell: (r: Machine) => (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => setEditing(r)} aria-label={`Editar ${r.code}`}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="ghost" onClick={() => save(() => actions.saveMaster('machines', { ...r, active: !r.active }), 'Situação alterada.')}>{r.active ? 'Desativar' : 'Ativar'}</Button>
          </div>
        ) }] : []),
      ]} />
    </>
  );
}

function ProductsTab({ s, editable }: { s: Snapshot; editable: boolean }) {
  const { actions } = useData();
  const save = useSave();
  const f = useForm({ resolver: zodResolver(productSchema), defaultValues: { code: '', name: '', unitId: '', altUnitId: '', altFactor: '' as const } });
  const e = f.formState.errors;
  const submit = f.handleSubmit(async (v) => {
    const item: Product = {
      id: newId('pr'), code: v.code, name: v.name, unitId: v.unitId, active: true,
      conversions: v.altUnitId && v.altFactor !== '' && v.altFactor !== undefined ? [{ unitId: v.altUnitId, factor: Number(v.altFactor) }] : [],
    };
    if (await save(() => actions.saveMaster('products', item), 'Produto cadastrado.')) f.reset();
  });
  return (
    <>
      {editable && (
        <form onSubmit={submit} className="space-y-4 border-b border-paper-line p-5" noValidate aria-label="Cadastro de produto">
          <FormGrid>
            <Field label="Código" htmlFor="pc-code" error={errMsg(e.code)}><Input id="pc-code" {...f.register('code')} /></Field>
            <Field label="Nome" htmlFor="pc-name" error={errMsg(e.name)}><Input id="pc-name" {...f.register('name')} /></Field>
            <Field label="Unidade-padrão" htmlFor="pc-unit" error={errMsg(e.unitId)} hint="Unidade em que a produção é contada">
              <Select id="pc-unit" {...f.register('unitId')}><option value="">Selecione…</option>{s.units.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.code} — {u.name}</option>)}</Select>
            </Field>
            <Field label="Unidade alternativa (opcional)" htmlFor="pc-alt">
              <Select id="pc-alt" {...f.register('altUnitId')}><option value="">Nenhuma</option>{s.units.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.code} — {u.name}</option>)}</Select>
            </Field>
            <Field label="Unidades-padrão por unidade alternativa" htmlFor="pc-factor" error={errMsg(e.altFactor)} hint="Ex.: 1 caixa = 50 unidades → 50">
              <Input id="pc-factor" type="number" step="any" {...f.register('altFactor')} />
            </Field>
          </FormGrid>
          <div className="flex justify-end"><Button type="submit">Cadastrar produto</Button></div>
        </form>
      )}
      <DataTable caption="Produtos" rows={s.products} rowKey={(r) => r.id} columns={[
        { key: 'c', header: 'Código', cell: (r) => <strong>{r.code}</strong> },
        { key: 'n', header: 'Nome', cell: (r) => r.name },
        { key: 'u', header: 'Unidade-padrão', cell: (r) => unitCode(s.units, r.unitId) },
        { key: 'v', header: 'Conversões', cell: (r) => r.conversions.length ? r.conversions.map((c) => `1 ${unitCode(s.units, c.unitId)} = ${c.factor} ${unitCode(s.units, r.unitId)}`).join('; ') : <span className="text-neutral-400">—</span> },
        { key: 'a', header: 'Situação', cell: (r) => <ActiveBadge active={r.active} /> },
      ]} />
    </>
  );
}

function UnitsTab({ s, editable }: { s: Snapshot; editable: boolean }) {
  const { actions } = useData();
  const save = useSave();
  const f = useForm({ resolver: zodResolver(unitSchema), defaultValues: { code: '', name: '', dimension: 'contagem' as const, factorToBase: '' as const } });
  const e = f.formState.errors;
  const submit = f.handleSubmit(async (v) => {
    const item: Unit = { id: newId('u'), code: v.code, name: v.name, dimension: v.dimension, factorToBase: v.factorToBase === '' || v.factorToBase === undefined ? null : Number(v.factorToBase), active: true };
    if (await save(() => actions.saveMaster('units', item), 'Unidade cadastrada.')) f.reset();
  });
  const BASE = { massa: 'kg', contagem: 'un', comprimento: 'm', volume: 'L' } as const;
  return (
    <>
      {editable && (
        <form onSubmit={submit} className="space-y-4 border-b border-paper-line p-5" noValidate aria-label="Cadastro de unidade">
          <FormGrid>
            <Field label="Código" htmlFor="uc-code" error={errMsg(e.code)}><Input id="uc-code" placeholder="Ex.: FD" {...f.register('code')} /></Field>
            <Field label="Nome" htmlFor="uc-name" error={errMsg(e.name)}><Input id="uc-name" placeholder="Ex.: Fardo" {...f.register('name')} /></Field>
            <Field label="Grandeza" htmlFor="uc-dim"><Select id="uc-dim" {...f.register('dimension')}><option value="massa">Massa</option><option value="contagem">Contagem</option><option value="comprimento">Comprimento</option><option value="volume">Volume</option></Select></Field>
            <Field label="Fator para a unidade-base (opcional)" htmlFor="uc-factor" error={errMsg(e.factorToBase)} hint="Deixe vazio para embalagens sem tamanho fixo (caixa, bobina): o fator é definido por produto.">
              <Input id="uc-factor" type="number" step="any" {...f.register('factorToBase')} />
            </Field>
          </FormGrid>
          <div className="flex justify-end"><Button type="submit">Cadastrar unidade</Button></div>
        </form>
      )}
      <DataTable caption="Unidades" rows={s.units} rowKey={(r) => r.id} columns={[
        { key: 'c', header: 'Código', cell: (r) => <strong>{r.code}</strong> },
        { key: 'n', header: 'Nome', cell: (r) => r.name },
        { key: 'd', header: 'Grandeza', cell: (r) => r.dimension },
        { key: 'f', header: 'Conversão', cell: (r) => (r.factorToBase === null ? <span className="text-neutral-500">por produto</span> : `1 ${r.code} = ${r.factorToBase} ${BASE[r.dimension]}`) },
      ]} />
    </>
  );
}

export default function Registry() {
  const s = useSnapshot();
  const { can } = useProfile();
  const editable = can('cadastros:editar');
  const [tab, setTab] = useState<Tab>('setores');
  return (
    <>
      <PageHeader eyebrow="Gestão" title="Cadastros" description="Setores, máquinas, produtos, unidades, materiais e perfis. Cadastros não são apagados: são desativados, preservando o histórico." actions={<DemoTag />} />
      {!editable && <div className="mb-4"><Notice>Somente o perfil Administrador pode alterar cadastros.</Notice></div>}
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-paper-line bg-white p-1 shadow-card" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={cx('whitespace-nowrap rounded-lg px-3 py-2 text-sm', tab === t.id ? 'bg-ink text-white' : 'text-neutral-600 hover:bg-neutral-100')}>
            {t.label}
          </button>
        ))}
      </div>
      <Card>
        <CardHeader title={TABS.find((t) => t.id === tab)!.label} />
        {tab === 'setores' && <SectorsTab s={s} editable={editable} />}
        {tab === 'maquinas' && <MachinesTab s={s} editable={editable} />}
        {tab === 'produtos' && <ProductsTab s={s} editable={editable} />}
        {tab === 'unidades' && <UnitsTab s={s} editable={editable} />}
        {tab === 'materiais' && (
          <>
            <DataTable caption="Materiais" rows={s.materials} rowKey={(r) => r.id} columns={[
              { key: 'c', header: 'Código', cell: (r) => <strong>{r.code}</strong> },
              { key: 'n', header: 'Nome', cell: (r) => r.name },
              { key: 'u', header: 'Uso', cell: (r) => (r.use === 'materia_prima' ? <Badge tone="blue">Matéria-prima</Badge> : <Badge tone="violet">Resíduo</Badge>) },
              { key: 'r', header: 'Reciclável', cell: (r) => (r.recyclable ? 'Sim' : 'Não') },
              { key: 's', header: 'Origem (rastreabilidade)', cell: (r) => s.materials.find((m) => m.id === r.sourceMaterialId)?.name ?? '—' },
            ]} />
            <div className="border-t border-paper-line">
              <DataTable caption="Locais" rows={s.locations} rowKey={(r) => r.id} columns={[
                { key: 'c', header: 'Local', cell: (r) => <strong>{r.code}</strong> },
                { key: 'n', header: 'Nome', cell: (r) => r.name },
                { key: 'l', header: 'Lotes / recipientes', cell: (r) => s.lots.filter((l) => l.locationId === r.id).map((l) => l.code).join(', ') || '—' },
              ]} />
            </div>
          </>
        )}
        {tab === 'perfis' && (
          <div className="p-5">
            <Notice tone="amber" title="Sem autenticação real nesta versão">A gestão de usuários será implementada com Supabase Auth na Fase 2. A matriz abaixo já é a referência para as políticas de acesso no banco.</Notice>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {ROLES.map((r) => <li key={r.id} className="rounded-lg border border-paper-line p-4"><p className="font-medium">{r.label}</p><p className="text-sm text-neutral-600">{r.description}</p></li>)}
            </ul>
          </div>
        )}
      </Card>
    </>
  );
}
