import { CheckCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useProfile } from '../auth/ProfileContext';
import { Badge, Button, Card, CardHeader, DataTable, DemoTag, Field, FormGrid, Input, Notice, PageHeader, Select, Textarea } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { useData, useSnapshot } from '../data/DataProvider';
import { fmtByUnit, fmtDate, fmtNumber, unitCode } from '../domain/format';
import { availableForManualStage } from '../domain/production';
import { sumByUnit } from '../domain/units';
import type { Snapshot } from '../domain/types';
import { manualRecordSchema, SHIFTS, type ManualRecordForm } from '../forms/schemas';
import { errMsg, useZodForm } from '../forms/useZodForm';

function ManualForm({ s }: { s: Snapshot }) {
  const { actions } = useData();
  const toast = useToast();
  const defaults: Partial<ManualRecordForm> = {
    date: s.meta.referenceDate, shift: 'A', sectorId: s.sectors.find((x) => x.kind === 'manual')?.id ?? '', activityType: '', orderId: '', notes: '',
  };
  const f = useZodForm<ManualRecordForm>(manualRecordSchema, defaults);
  const e = f.formState.errors;
  const order = s.orders.find((o) => o.id === f.watch('orderId'));
  const product = order && s.products.find((p) => p.id === order.productId);
  const available = order?.route === 'maquina_manual' ? availableForManualStage(s, order.id) : null;
  const activities = [...new Set(s.manualRecords.map((r) => r.activityType))];

  const submit = f.handleSubmit(async (v) => {
    try {
      await actions.addManualRecord({ ...v, productId: order!.productId, unitId: order!.unitId, notes: v.notes || undefined });
      toast.success('Atividade manual registrada.');
      f.reset({ ...defaults, date: v.date, shift: v.shift, sectorId: v.sectorId, activityType: v.activityType, orderId: v.orderId });
    } catch (err) {
      toast.error(err);
    }
  });

  return (
    <Card className="mb-6">
      <CardHeader title="Registrar atividade manual" description="Lançamento por setor e atividade — sem identificação individual de trabalhadores." />
      <form onSubmit={submit} className="space-y-5 p-5" noValidate aria-label="Registrar produção manual">
        <FormGrid>
          <Field label="Data" htmlFor="mn-date" error={errMsg(e.date)}>
            <Input id="mn-date" type="date" max={s.meta.referenceDate} {...f.register('date')} />
          </Field>
          <Field label="Turno" htmlFor="mn-shift" error={errMsg(e.shift)}>
            <Select id="mn-shift" {...f.register('shift')}>{SHIFTS.map((t) => <option key={t} value={t}>Turno {t}</option>)}</Select>
          </Field>
          <Field label="Setor" htmlFor="mn-sector" error={errMsg(e.sectorId)}>
            <Select id="mn-sector" {...f.register('sectorId')}>
              <option value="">Selecione…</option>
              {s.sectors.filter((x) => x.kind === 'manual' && x.active).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </Select>
          </Field>
          <Field label="Tipo de atividade" htmlFor="mn-act" error={errMsg(e.activityType)}>
            <Input id="mn-act" list="mn-activities" placeholder="Ex.: acabamento, montagem, embalagem" {...f.register('activityType')} />
            <datalist id="mn-activities">{activities.map((a) => <option key={a} value={a} />)}</datalist>
          </Field>
          <Field label="Ordem de produção" htmlFor="mn-order" error={errMsg(e.orderId)} hint={product ? `${product.name} · ${unitCode(s.units, order!.unitId)}` : undefined}>
            <Select id="mn-order" {...f.register('orderId')}>
              <option value="">Selecione…</option>
              {s.orders.filter((o) => o.route !== 'maquina').map((o) => (
                <option key={o.id} value={o.id}>{o.number} — {s.products.find((p) => p.id === o.productId)?.name}{o.status === 'encerrada' ? ' (encerrada)' : ''}</option>
              ))}
            </Select>
          </Field>
        </FormGrid>
        {available !== null && (
          <Notice title="Etapa posterior à máquina">
            Saldo aprovado nas máquinas ainda não recebido por esta etapa: <strong>{fmtNumber(available, 3)} {unitCode(s.units, order!.unitId)}</strong>.
            O recebido não pode superar esse saldo — assim a mesma peça não é contada duas vezes.
          </Notice>
        )}
        <fieldset className="rounded-lg border border-paper-line p-4">
          <legend className="px-1 text-sm font-medium text-neutral-800">Quantidades {order && <span className="font-normal text-neutral-500">({unitCode(s.units, order.unitId)})</span>}</legend>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Recebido" htmlFor="mn-rec" error={errMsg(e.receivedQty)}><Input id="mn-rec" type="number" step="any" inputMode="decimal" {...f.register('receivedQty')} /></Field>
            <Field label="Concluído" htmlFor="mn-done" error={errMsg(e.completedQty)}><Input id="mn-done" type="number" step="any" inputMode="decimal" {...f.register('completedQty')} /></Field>
            <Field label="Rejeitado" htmlFor="mn-rej" error={errMsg(e.rejectedQty)}><Input id="mn-rej" type="number" step="any" inputMode="decimal" {...f.register('rejectedQty')} /></Field>
            <Field label="Para retrabalho" htmlFor="mn-rew" error={errMsg(e.reworkQty)}><Input id="mn-rew" type="number" step="any" inputMode="decimal" {...f.register('reworkQty')} /></Field>
          </div>
        </fieldset>
        <Field label="Observações" htmlFor="mn-notes" error={errMsg(e.notes)}><Textarea id="mn-notes" rows={2} {...f.register('notes')} /></Field>
        <div className="flex justify-end"><Button type="submit" loading={f.formState.isSubmitting}>Registrar atividade</Button></div>
      </form>
    </Card>
  );
}

export default function ManualProduction() {
  const s = useSnapshot();
  const { can } = useProfile();
  const { actions } = useData();
  const toast = useToast();
  const [activity, setActivity] = useState('');
  const activities = [...new Set(s.manualRecords.map((r) => r.activityType))];
  const rows = useMemo(
    () => s.manualRecords.filter((r) => !activity || r.activityType === activity).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [s.manualRecords, activity],
  );

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Produção manual"
        description="Atividades manuais, inclusive etapas posteriores à produção por máquina. Os indicadores são por setor e atividade — não há ranking individual."
        actions={<DemoTag />}
      />
      {can('producao:registrar') ? <ManualForm s={s} /> : <div className="mb-6"><Notice>O perfil atual pode consultar, mas não registrar atividades.</Notice></div>}
      <Card>
        <CardHeader
          title="Histórico de atividades manuais"
          description={`${rows.length} lançamentos · ${fmtByUnit(sumByUnit(rows, (r) => r.unitId, (r) => r.completedQty), s.units)} concluídos`}
          actions={
            <Select aria-label="Filtrar por atividade" className="h-9 w-auto" value={activity} onChange={(e) => setActivity(e.target.value)}>
              <option value="">Todas as atividades</option>
              {activities.map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          }
        />
        <DataTable
          caption="Histórico de produção manual"
          rows={rows}
          maxRows={60}
          rowKey={(r) => r.id}
          columns={[
            { key: 'd', header: 'Data', cell: (r) => <>{fmtDate(r.date)} <span className="text-neutral-400">· {r.shift}</span></> },
            { key: 'a', header: 'Atividade', cell: (r) => r.activityType },
            { key: 'o', header: 'Ordem', cell: (r) => { const o = s.orders.find((x) => x.id === r.orderId); return <>{o?.number} {o?.route === 'maquina_manual' && <Badge tone="blue">pós-máquina</Badge>}</>; } },
            { key: 'r', header: 'Recebido', align: 'right', cell: (r) => `${fmtNumber(r.receivedQty, 3)} ${unitCode(s.units, r.unitId)}` },
            { key: 'c', header: 'Concluído', align: 'right', cell: (r) => fmtNumber(r.completedQty, 3) },
            { key: 'j', header: 'Rejeit.', align: 'right', cell: (r) => fmtNumber(r.rejectedQty, 3) },
            { key: 'w', header: 'Retrab.', align: 'right', cell: (r) => fmtNumber(r.reworkQty, 3) },
            {
              key: 's', header: 'Situação', cell: (r) =>
                r.status === 'validado' ? <Badge tone="green">Validado</Badge> : can('producao:validar') ? (
                  <Button size="sm" variant="secondary" onClick={async () => {
                    try { await actions.validateRecord('manual', r.id); toast.success('Lançamento validado.'); } catch (err) { toast.error(err); }
                  }}><CheckCheck className="h-3.5 w-3.5" /> Validar</Button>
                ) : <Badge tone="amber">Pendente</Badge>,
            },
          ]}
        />
      </Card>
    </>
  );
}
