import { AlertTriangle, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Scale } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useProfile } from '../auth/ProfileContext';
import { roleLabel } from '../auth/roles';
import { Badge, Button, Card, CardHeader, DataTable, DemoTag, Field, FormGrid, Input, Notice, PageHeader, Select } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { useData, useSnapshot } from '../data/DataProvider';
import { addDays } from '../domain/dates';
import { fmtDate, fmtDateTime, fmtKg, fmtNumber } from '../domain/format';
import { balanceOf, balances, detectInconsistencies, movementLabel, stockStatement } from '../domain/stock';
import type { MovementType, Snapshot } from '../domain/types';
import { movementSchema, type MovementForm } from '../forms/schemas';
import { errMsg, useZodForm } from '../forms/useZodForm';

const ICON: Record<MovementType, JSX.Element> = {
  saldo_inicial: <ArrowDownLeft className="h-4 w-4 text-sky-600" />,
  entrada: <ArrowDownLeft className="h-4 w-4 text-emerald-600" />,
  reutilizacao: <ArrowUpRight className="h-4 w-4 text-violet-600" />,
  transferencia: <ArrowLeftRight className="h-4 w-4 text-neutral-500" />,
  coleta: <ArrowUpRight className="h-4 w-4 text-orange-600" />,
  ajuste: <Scale className="h-4 w-4 text-amber-600" />,
};

function MovementFormCard({ s }: { s: Snapshot }) {
  const { actions } = useData();
  const toast = useToast();
  const defaults: Partial<MovementForm> = { date: s.meta.referenceDate, type: 'transferencia', materialId: '', locationId: '', toLocationId: '', reference: '', note: '' };
  const f = useZodForm<MovementForm>(movementSchema, defaults);
  const e = f.formState.errors;
  const [type, materialId, locationId, date] = f.watch(['type', 'materialId', 'locationId', 'date']);
  const available = materialId && locationId ? balanceOf(s.movements, materialId, locationId, date) : null;

  const submit = f.handleSubmit(async (v) => {
    try {
      await actions.addMovement({ ...v, toLocationId: v.type === 'transferencia' ? v.toLocationId : undefined, note: v.note || undefined });
      toast.success('Movimentação registrada.');
      f.reset({ ...defaults, date: v.date, type: v.type });
    } catch (err) {
      toast.error(err);
    }
  });

  return (
    <Card className="mb-6">
      <CardHeader title="Nova movimentação" description="Entradas de produção e baixas de coleta são geradas automaticamente pelos módulos correspondentes." />
      <form onSubmit={submit} className="space-y-4 p-5" noValidate aria-label="Nova movimentação de estoque">
        <FormGrid>
          <Field label="Tipo" htmlFor="mv-type" error={errMsg(e.type)}>
            <Select id="mv-type" {...f.register('type')}>
              <option value="transferencia">Transferência interna</option>
              <option value="reutilizacao">Reutilização</option>
              <option value="ajuste">Ajuste de inventário</option>
              <option value="entrada">Entrada avulsa</option>
              <option value="saldo_inicial">Estoque inicial</option>
            </Select>
          </Field>
          <Field label="Data" htmlFor="mv-date" error={errMsg(e.date)}><Input id="mv-date" type="date" max={s.meta.referenceDate} {...f.register('date')} /></Field>
          <Field label="Material" htmlFor="mv-mat" error={errMsg(e.materialId)}>
            <Select id="mv-mat" {...f.register('materialId')}>
              <option value="">Selecione…</option>
              {s.materials.filter((m) => m.use === 'residuo').map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
            </Select>
          </Field>
          <Field label={type === 'transferencia' ? 'Local de origem' : 'Local'} htmlFor="mv-loc" error={errMsg(e.locationId)} hint={available !== null ? `Saldo disponível na data: ${fmtKg(available)}` : undefined}>
            <Select id="mv-loc" {...f.register('locationId')}>
              <option value="">Selecione…</option>
              {s.locations.map((l) => <option key={l.id} value={l.id}>{l.code} — {l.name}</option>)}
            </Select>
          </Field>
          {type === 'transferencia' && (
            <Field label="Local de destino" htmlFor="mv-to" error={errMsg(e.toLocationId)}>
              <Select id="mv-to" {...f.register('toLocationId')}>
                <option value="">Selecione…</option>
                {s.locations.map((l) => <option key={l.id} value={l.id}>{l.code} — {l.name}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Quantidade (kg)" htmlFor="mv-qty" error={errMsg(e.quantityKg)} hint={type === 'ajuste' ? 'Use valor negativo para reduzir o saldo' : undefined}>
            <Input id="mv-qty" type="number" step="any" inputMode="decimal" {...f.register('quantityKg')} />
          </Field>
          <Field label="Identificação / referência" htmlFor="mv-ref" error={errMsg(e.reference)}><Input id="mv-ref" placeholder="Ex.: inventário 10/2026, fardo 15" {...f.register('reference')} /></Field>
          <Field label={type === 'ajuste' ? 'Justificativa (obrigatória)' : 'Observação'} htmlFor="mv-note" error={errMsg(e.note)}><Input id="mv-note" {...f.register('note')} /></Field>
        </FormGrid>
        <div className="flex justify-end"><Button type="submit" loading={f.formState.isSubmitting}>Registrar movimentação</Button></div>
      </form>
    </Card>
  );
}

export default function Stock() {
  const s = useSnapshot();
  const { can } = useProfile();
  const ref = s.meta.referenceDate;
  const [from, setFrom] = useState(addDays(ref, -29));
  const [to, setTo] = useState(ref);
  const [materialId, setMaterialId] = useState('');
  const statement = useMemo(() => stockStatement(s.movements, from, to), [s.movements, from, to]);
  const issues = useMemo(() => detectInconsistencies(s.movements), [s.movements]);
  const byLocation = useMemo(() => [...balances(s.movements).entries()].filter(([, v]) => Math.abs(v) > 0.0005), [s.movements]);
  const ledger = useMemo(
    () => s.movements.filter((m) => !materialId || m.materialId === materialId).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [s.movements, materialId],
  );
  const mat = (id: string) => s.materials.find((m) => m.id === id);
  const loc = (id?: string) => s.locations.find((l) => l.id === id)?.code ?? '—';

  return (
    <>
      <PageHeader eyebrow="Resíduos" title="Estoque de resíduos" description="Saldo por material e local, com histórico auditável de todas as movimentações (kg)." actions={<DemoTag />} />
      {issues.length > 0 ? (
        <div className="mb-6"><Notice tone="red" title="Inconsistências no histórico">{issues.length} movimentação(ões) deixam saldo negativo. Revise as datas e quantidades.</Notice></div>
      ) : (
        <p className="mb-4 inline-flex items-center gap-2 text-sm text-emerald-700"><Badge tone="green">Razão consistente</Badge> Nenhum saldo negativo em todo o histórico.</p>
      )}
      {can('estoque:movimentar') && <MovementFormCard s={s} />}

      <div className="mb-6 grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader
            title="Demonstrativo do período"
            description="Final = inicial + entradas − reutilizações − coletas ± ajustes"
            actions={
              <div className="flex gap-2">
                <Input aria-label="Início do período" type="date" className="h-9 w-auto" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} />
                <Input aria-label="Fim do período" type="date" className="h-9 w-auto" value={to} min={from} max={ref} onChange={(e) => e.target.value && setTo(e.target.value)} />
              </div>
            }
          />
          <DataTable
            caption="Demonstrativo de estoque"
            rows={statement}
            rowKey={(r) => r.materialId}
            columns={[
              { key: 'm', header: 'Material', cell: (r) => <><strong>{mat(r.materialId)?.code}</strong> <span className="text-neutral-500">{mat(r.materialId)?.name}</span></> },
              { key: 'i', header: 'Inicial', align: 'right', cell: (r) => fmtNumber(r.initial, 1) },
              { key: 'e', header: 'Entradas', align: 'right', cell: (r) => fmtNumber(r.entries, 1) },
              { key: 'r', header: 'Reutiliz.', align: 'right', cell: (r) => fmtNumber(r.reuse, 1) },
              { key: 't', header: 'Transf.*', align: 'right', cell: (r) => <span className="text-neutral-400">{fmtNumber(r.transfers, 1)}</span> },
              { key: 'c', header: 'Coletas', align: 'right', cell: (r) => fmtNumber(r.collections, 1) },
              { key: 'a', header: 'Ajustes', align: 'right', cell: (r) => fmtNumber(r.adjustments, 1) },
              { key: 'f', header: 'Final (kg)', align: 'right', cell: (r) => <strong>{fmtNumber(r.final, 1)}</strong> },
            ]}
          />
          <p className="border-t border-paper-line px-4 py-2 text-xs text-neutral-500">* Transferências mudam apenas o local; não alteram o saldo total do material.</p>
        </Card>
        <Card>
          <CardHeader title="Saldo atual por local" />
          <ul className="divide-y divide-paper-line">
            {byLocation.map(([k, v]) => {
              const [m, l] = k.split('|');
              return (
                <li key={k} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span><strong>{mat(m)?.code}</strong> <span className="text-neutral-500">em {loc(l)}</span></span>
                  <span className={`tabular-nums ${v < 0 ? 'text-red-600' : ''}`}>{fmtKg(v)}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Histórico de movimentações"
          description="Registros não são apagados: correções são feitas por ajuste justificado."
          actions={
            <Select aria-label="Filtrar por material" className="h-9 w-auto" value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
              <option value="">Todos os materiais</option>
              {s.materials.filter((m) => m.use === 'residuo').map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}
            </Select>
          }
        />
        <DataTable
          caption="Histórico de movimentações"
          rows={ledger}
          maxRows={80}
          rowKey={(r) => r.id}
          columns={[
            { key: 'd', header: 'Data', cell: (r) => fmtDate(r.date) },
            { key: 't', header: 'Tipo', cell: (r) => <span className="inline-flex items-center gap-1.5">{ICON[r.type]} {movementLabel(r.type)}</span> },
            { key: 'm', header: 'Material', cell: (r) => mat(r.materialId)?.code },
            { key: 'l', header: 'Local', cell: (r) => r.type === 'transferencia' ? `${loc(r.locationId)} → ${loc(r.toLocationId)}` : loc(r.locationId) },
            { key: 'q', header: 'kg', align: 'right', cell: (r) => { const out = r.type === 'coleta' || r.type === 'reutilizacao'; return <span className={out || r.quantityKg < 0 ? 'text-orange-700' : ''}>{out ? '−' : r.type === 'transferencia' ? '' : r.quantityKg >= 0 ? '+' : ''}{fmtNumber(r.quantityKg, 1)}</span>; } },
            { key: 'r', header: 'Identificação', cell: (r) => <span className="text-neutral-600">{r.reference}{r.note && <span className="block text-xs text-neutral-400">{r.note}</span>}</span> },
            { key: 'u', header: 'Registro', cell: (r) => <span className="text-xs text-neutral-500">{roleLabel(r.createdByRole)}<br />{fmtDateTime(r.createdAt)}</span> },
            { key: 'x', header: '', cell: (r) => issues.some((i) => i.movementId === r.id) ? <AlertTriangle className="h-4 w-4 text-red-600" aria-label="Inconsistente" /> : null },
          ]}
        />
      </Card>
    </>
  );
}
