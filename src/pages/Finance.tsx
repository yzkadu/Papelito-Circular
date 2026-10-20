import { Lock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useProfile } from '../auth/ProfileContext';
import { AXIS, GRID, SERIES, TOOLTIP_STYLE } from '../components/charts';
import { FilterBar, useFilters } from '../components/Filters';
import { Badge, Button, Card, CardHeader, DataTable, DemoTag, Field, FormGrid, Input, Notice, PageHeader, Select } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { useData, useSnapshot } from '../data/DataProvider';
import { addDays, daysBetween, monthKey } from '../domain/dates';
import { averageRawMaterialCost, avoidableLossCost, netLossCost, periodChange, recoveredValue } from '../domain/finance';
import { fmtDate, fmtKg, fmtMoney, fmtPct } from '../domain/format';
import { applyFilters, type DashboardFilters } from '../domain/indicators';
import type { Snapshot } from '../domain/types';
import { costSchema, type CostForm } from '../forms/schemas';
import { errMsg, useZodForm } from '../forms/useZodForm';

function computeFinance(s: Snapshot, f: DashboardFilters) {
  const d = applyFilters(s, f);
  const net = netLossCost(d.wasteRecords, s.materials, s.costs);
  return {
    avgMp: averageRawMaterialCost(d.machineRecords, s.costs),
    net,
    recovered: recoveredValue(d.collections, s.costs),
    d,
  };
}

function Delta({ cur, prev, inverse }: { cur: number; prev: number; inverse?: boolean }) {
  const ch = periodChange(cur, prev);
  if (ch === null) return <span className="text-neutral-400">sem base anterior</span>;
  const good = inverse ? ch < 0 : ch > 0;
  return <span className={good ? 'text-emerald-700' : 'text-red-600'}>{ch > 0 ? '▲' : '▼'} {fmtPct(Math.abs(ch))} vs. período anterior</span>;
}

function CostFormCard({ s }: { s: Snapshot }) {
  const { actions } = useData();
  const toast = useToast();
  const f = useZodForm<CostForm>(costSchema, { kind: 'materia_prima', materialId: '', validFrom: s.meta.referenceDate, validTo: '', source: '' });
  const e = f.formState.errors;
  const kind = f.watch('kind');
  const submit = f.handleSubmit(async (v) => {
    try {
      await actions.saveCost({ ...v, validTo: v.validTo || undefined, demo: s.meta.mode === 'demo' });
      toast.success('Custo cadastrado.');
      f.reset();
    } catch (err) {
      toast.error(err);
    }
  });
  return (
    <form onSubmit={submit} className="space-y-4 border-t border-paper-line p-5" noValidate aria-label="Cadastrar custo">
      <FormGrid>
        <Field label="Tipo" htmlFor="ct-kind"><Select id="ct-kind" {...f.register('kind', { onChange: () => f.setValue('materialId', '') })}><option value="materia_prima">Custo de matéria-prima</option><option value="venda_residuo">Valor de venda de resíduo</option></Select></Field>
        <Field label="Material" htmlFor="ct-mat" error={errMsg(e.materialId)}>
          <Select id="ct-mat" {...f.register('materialId')}>
            <option value="">Selecione…</option>
            {s.materials.filter((m) => (kind === 'materia_prima' ? m.use === 'materia_prima' : m.use === 'residuo')).map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
          </Select>
        </Field>
        <Field label="Valor (R$ por kg)" htmlFor="ct-val" error={errMsg(e.valuePerKg)}><Input id="ct-val" type="number" step="0.0001" inputMode="decimal" {...f.register('valuePerKg')} /></Field>
        <Field label="Início da vigência" htmlFor="ct-from" error={errMsg(e.validFrom)}><Input id="ct-from" type="date" {...f.register('validFrom')} /></Field>
        <Field label="Fim da vigência (opcional)" htmlFor="ct-to" error={errMsg(e.validTo)}><Input id="ct-to" type="date" {...f.register('validTo')} /></Field>
        <Field label="Origem do valor" htmlFor="ct-src" error={errMsg(e.source)}><Input id="ct-src" placeholder="Cotação, nota fiscal, estimativa…" {...f.register('source')} /></Field>
      </FormGrid>
      <div className="flex justify-end"><Button type="submit" loading={f.formState.isSubmitting}>Cadastrar custo</Button></div>
    </form>
  );
}

export default function Finance() {
  const s = useSnapshot();
  const { can } = useProfile();
  const [filters, setFilters] = useFilters(s, 30);
  const [showForm, setShowForm] = useState(false);
  const span = daysBetween(filters.from, filters.to) + 1;
  const prevFilters = { ...filters, from: addDays(filters.from, -span), to: addDays(filters.from, -1) };
  const cur = useMemo(() => computeFinance(s, filters), [s, filters]);
  const prev = useMemo(() => computeFinance(s, prevFilters), [s, prevFilters.from, prevFilters.to, filters.sectorId, filters.machineId, filters.materialId, filters.productId]); // eslint-disable-line react-hooks/exhaustive-deps

  const monthly = useMemo(() => {
    const months = new Map<string, { month: string; perdas: number; recuperado: number }>();
    const get = (k: string) => months.get(k) ?? months.set(k, { month: k, perdas: 0, recuperado: 0 }).get(k)!;
    const all = applyFilters(s, { ...filters, from: '0000-01-01', to: s.meta.referenceDate });
    for (const w of all.wasteRecords) {
      const v = avoidableLossCost([w], s.materials, s.costs).value;
      if (v) get(monthKey(w.date)).perdas += v;
    }
    for (const c of all.collections) {
      if (!c.collectedDate) continue;
      get(monthKey(c.collectedDate)).recuperado += recoveredValue([c], s.costs).value;
    }
    return [...months.values()].sort((a, b) => a.month.localeCompare(b.month)).map((m) => ({ ...m, perdas: Math.round(m.perdas), recuperado: Math.round(m.recuperado) }));
  }, [s, filters]);

  const byMachine = useMemo(
    () =>
      s.machines
        .map((m) => ({ name: m.code, value: Math.round(avoidableLossCost(cur.d.wasteRecords.filter((w) => w.machineId === m.id), s.materials, s.costs).value) }))
        .filter((x) => x.value > 0),
    [s, cur],
  );

  const demo = cur.net.usesDemoValues || cur.recovered.usesDemoValues || cur.avgMp.usesDemoValues;

  return (
    <>
      <PageHeader
        eyebrow="Gestão · acesso restrito"
        title="Indicadores financeiros"
        description="Estimativas a partir de custos informados manualmente (sem integração com o Protheus nesta fase)."
        actions={<><DemoTag /><Badge tone="violet"><Lock className="h-3 w-3" /> Gestão e financeiro</Badge></>}
      />
      {demo && (
        <div className="mb-4">
          <Notice tone="amber" title="Valores fictícios">Todos os custos desta demonstração são inventados apenas para exercitar os cálculos. Não representam preços ou custos reais da Papelito.</Notice>
        </div>
      )}
      <FilterBar s={s} value={filters} onChange={setFilters} dims={['sector', 'machine', 'material']} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Custo médio da matéria-prima', value: cur.avgMp.avg === null ? '—' : `${fmtMoney(cur.avgMp.avg)}/kg`, sub: `Ponderado por ${fmtKg(cur.avgMp.kg)} consumidos` },
          { label: 'Custo bruto das perdas evitáveis', value: fmtMoney(cur.net.gross.value), sub: <Delta cur={cur.net.gross.value} prev={prev.net.gross.value} inverse /> },
          { label: 'Valor recuperável dessas perdas', value: fmtMoney(cur.net.recoverable.value), sub: `${fmtKg(cur.net.recoverable.kg)} × valor de venda do resíduo` },
          { label: 'Custo líquido estimado das perdas', value: fmtMoney(cur.net.net), sub: <Delta cur={cur.net.net} prev={prev.net.net} inverse /> },
          { label: 'Valor recuperado com coletas', value: fmtMoney(cur.recovered.value), sub: `${fmtKg(cur.recovered.kg)} com pesagem conferida` },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-paper-line bg-white p-4 shadow-card">
            <p className="text-[13px] font-medium text-neutral-600">{k.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{k.value}</p>
            <p className="mt-1 text-xs text-neutral-500">{k.sub}</p>
          </div>
        ))}
      </div>
      {(cur.net.gross.kgWithoutCost > 0 || cur.recovered.kgWithoutCost > 0) && (
        <p className="mt-2 text-xs text-amber-700">Atenção: {fmtKg(cur.net.gross.kgWithoutCost + cur.recovered.kgWithoutCost)} sem custo vigente cadastrado foram excluídos dos valores.</p>
      )}

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Evolução mensal (R$)" description="Custo bruto das perdas evitáveis e valor recuperado com coletas" />
          <div className="h-64 px-2 pb-3 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly} margin={{ left: 8, right: 16 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="month" {...AXIS} tickFormatter={(m) => `${m.slice(5)}/${m.slice(2, 4)}`} />
                <YAxis {...AXIS} width={72} tickFormatter={(v) => fmtMoney(v).replace(',00', '')} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v, n) => [fmtMoney(Number(v)), n === 'perdas' ? 'Perdas evitáveis' : 'Recuperado']} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-neutral-700">{v === 'perdas' ? 'Perdas evitáveis' : 'Recuperado com coletas'}</span>} />
                <Line type="monotone" dataKey="perdas" stroke={SERIES[1]} strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="recuperado" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Custo das perdas evitáveis por máquina (R$)" description={`${fmtDate(filters.from)} a ${fmtDate(filters.to)}`} />
          <div className="h-64 px-2 pb-3 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byMachine} margin={{ left: 8, right: 16 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="name" {...AXIS} />
                <YAxis {...AXIS} width={72} tickFormatter={(v) => fmtMoney(v).replace(',00', '')} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [fmtMoney(Number(v)), 'Custo estimado']} />
                <Bar dataKey="value" fill={SERIES[1]} radius={[4, 4, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Tabela de custos"
          description="Valores informados manualmente, com vigência. Um valor por material e tipo em cada data."
          actions={can('custos:editar') && <Button variant="secondary" onClick={() => setShowForm((v) => !v)}>{showForm ? 'Fechar' : 'Novo custo'}</Button>}
        />
        {showForm && <CostFormCard s={s} />}
        <DataTable
          caption="Tabela de custos"
          rows={[...s.costs].sort((a, b) => a.materialId.localeCompare(b.materialId) || a.validFrom.localeCompare(b.validFrom))}
          rowKey={(r) => r.id}
          columns={[
            { key: 'k', header: 'Tipo', cell: (r) => (r.kind === 'materia_prima' ? 'Matéria-prima' : 'Venda de resíduo') },
            { key: 'm', header: 'Material', cell: (r) => s.materials.find((m) => m.id === r.materialId)?.name },
            { key: 'v', header: 'R$/kg', align: 'right', cell: (r) => fmtMoney(r.valuePerKg) },
            { key: 'f', header: 'Vigência', cell: (r) => `${fmtDate(r.validFrom)} → ${r.validTo ? fmtDate(r.validTo) : 'atual'}` },
            { key: 's', header: 'Origem', cell: (r) => <>{r.source} {r.demo && <Badge tone="amber">fictício</Badge>}</> },
          ]}
        />
      </Card>

      <Card className="mt-6">
        <CardHeader title="Premissas e limitações" />
        <ul className="list-disc space-y-1.5 px-10 py-4 text-sm text-neutral-700">
          <li>Somente <strong>perdas anormais</strong> entram no custo de perdas. Aparas normais, retrabalho e rejeitos não são tratados automaticamente como perda financeira.</li>
          <li>O custo da perda usa o custo da <strong>matéria-prima de origem</strong> do resíduo vigente na data do lançamento (R$/kg). Não considera mão de obra, energia ou custo de oportunidade.</li>
          <li>O valor recuperado considera apenas coletas com <strong>pesagem conferida</strong>, pelo peso confirmado.</li>
          <li>Todos os cálculos são em kg e R$; quantidades em outras unidades não entram nestes indicadores.</li>
          <li>Registros sem custo vigente são excluídos do valor e sinalizados — o sistema nunca estima preços automaticamente.</li>
        </ul>
      </Card>
    </>
  );
}
