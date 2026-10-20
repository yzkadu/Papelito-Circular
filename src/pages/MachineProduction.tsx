import { CheckCheck, CheckCircle2, ClipboardPlus, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useProfile } from '../auth/ProfileContext';
import { Badge, Button, Card, CardHeader, DataTable, DemoTag, Field, FormGrid, Input, Notice, PageHeader, Select, Textarea } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { useData, useSnapshot } from '../data/DataProvider';
import { fmtByUnit, fmtDate, fmtKg, fmtNumber, fmtPct, unitCode } from '../domain/format';
import { approvalRate } from '../domain/production';
import { round, sumByUnit } from '../domain/units';
import type { Snapshot } from '../domain/types';
import { machineRecordSchema, orderSchema, SHIFTS, type MachineRecordForm, type OrderForm } from '../forms/schemas';
import { errMsg, useZodForm } from '../forms/useZodForm';

const ROUTE_LABEL = { maquina: 'Somente máquina', maquina_manual: 'Máquina + etapa manual', manual: 'Somente manual' } as const;

function OrderFormCard({ s, onDone }: { s: Snapshot; onDone: () => void }) {
  const { actions } = useData();
  const toast = useToast();
  const f = useZodForm<OrderForm>(orderSchema, {
    number: '', productId: '', route: 'maquina', unitId: '', plannedQty: undefined, openedAt: s.meta.referenceDate,
  });
  const product = s.products.find((p) => p.id === f.watch('productId'));
  const unitOptions = product ? [product.unitId, ...product.conversions.map((c) => c.unitId)] : [];
  const submit = f.handleSubmit(async (v) => {
    try {
      await actions.createOrder(v);
      toast.success(`Ordem ${v.number} aberta.`);
      onDone();
    } catch (e) {
      toast.error(e);
    }
  });
  const e = f.formState.errors;
  return (
    <Card className="mb-6">
      <CardHeader title="Nova ordem de produção" description="O roteiro define onde a produção final é contada (evita dupla contagem)." />
      <form onSubmit={submit} className="space-y-4 p-5" noValidate>
        <FormGrid>
          <Field label="Número da ordem" htmlFor="op-number" error={errMsg(e.number)}>
            <Input id="op-number" placeholder="Ex.: OP-2026-0001" {...f.register('number')} />
          </Field>
          <Field label="Produto" htmlFor="op-product" error={errMsg(e.productId)}>
            <Select id="op-product" {...f.register('productId', { onChange: () => f.setValue('unitId', '') })}>
              <option value="">Selecione…</option>
              {s.products.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </Select>
          </Field>
          <Field label="Roteiro" htmlFor="op-route" error={errMsg(e.route)}>
            <Select id="op-route" {...f.register('route')}>
              {Object.entries(ROUTE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Unidade" htmlFor="op-unit" error={errMsg(e.unitId)} hint="Somente unidades cadastradas para o produto">
            <Select id="op-unit" {...f.register('unitId')} disabled={!product}>
              <option value="">Selecione…</option>
              {unitOptions.map((u) => <option key={u} value={u}>{unitCode(s.units, u)}</option>)}
            </Select>
          </Field>
          <Field label="Quantidade planejada" htmlFor="op-qty" error={errMsg(e.plannedQty)}>
            <Input id="op-qty" type="number" step="any" inputMode="decimal" {...f.register('plannedQty')} />
          </Field>
          <Field label="Abertura" htmlFor="op-date" error={errMsg(e.openedAt)}>
            <Input id="op-date" type="date" {...f.register('openedAt')} />
          </Field>
        </FormGrid>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>
          <Button type="submit" loading={f.formState.isSubmitting}>Abrir ordem</Button>
        </div>
      </form>
    </Card>
  );
}

function RecordForm({ s }: { s: Snapshot }) {
  const { actions } = useData();
  const toast = useToast();
  const defaults: Partial<MachineRecordForm> = {
    date: s.meta.referenceDate, shift: 'A', machineId: '', orderId: '', rawMaterialId: '', lossReasonId: '', occurrence: '',
  };
  const f = useZodForm<MachineRecordForm>(machineRecordSchema, defaults);
  const e = f.formState.errors;
  const [produced, approved, rejected, rework] = f.watch(['producedQty', 'approvedQty', 'rejectedQty', 'reworkQty']).map((x) => Number(x) || 0);
  const order = s.orders.find((o) => o.id === f.watch('orderId'));
  const openOrders = s.orders.filter((o) => o.status === 'aberta' && o.route !== 'manual');
  const sum = round(approved + rejected + rework, 3);
  const balanced = produced > 0 && sum === produced;

  const submit = f.handleSubmit(async (v) => {
    try {
      await actions.addMachineRecord({
        ...v,
        unitId: order!.unitId,
        lossReasonId: v.lossReasonId || undefined,
        occurrence: v.occurrence || undefined,
      });
      toast.success('Produção registrada. Aguardando validação do supervisor.');
      f.reset({ ...defaults, date: v.date, shift: v.shift, machineId: v.machineId, orderId: v.orderId, rawMaterialId: v.rawMaterialId });
    } catch (err) {
      toast.error(err);
    }
  });

  return (
    <Card className="mb-6">
      <CardHeader title="Registrar produção" description="Um lançamento por máquina, turno e ordem." actions={<ClipboardPlus className="h-5 w-5 text-neutral-400" />} />
      <form onSubmit={submit} className="space-y-5 p-5" noValidate aria-label="Registrar produção por máquina">
        <FormGrid>
          <Field label="Data" htmlFor="pm-date" error={errMsg(e.date)}>
            <Input id="pm-date" type="date" max={s.meta.referenceDate} {...f.register('date')} />
          </Field>
          <Field label="Turno" htmlFor="pm-shift" error={errMsg(e.shift)}>
            <Select id="pm-shift" {...f.register('shift')}>
              {SHIFTS.map((t) => <option key={t} value={t}>Turno {t}</option>)}
            </Select>
          </Field>
          <Field label="Máquina" htmlFor="pm-machine" error={errMsg(e.machineId)}>
            <Select id="pm-machine" {...f.register('machineId')}>
              <option value="">Selecione…</option>
              {s.machines.filter((m) => m.active).map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
            </Select>
          </Field>
          <Field label="Ordem de produção" htmlFor="pm-order" error={errMsg(e.orderId)} hint={order ? `Unidade: ${unitCode(s.units, order.unitId)} · ${ROUTE_LABEL[order.route]}` : undefined}>
            <Select id="pm-order" {...f.register('orderId')}>
              <option value="">Selecione…</option>
              {openOrders.map((o) => {
                const p = s.products.find((x) => x.id === o.productId);
                return <option key={o.id} value={o.id}>{o.number} — {p?.name}</option>;
              })}
            </Select>
          </Field>
          <Field label="Matéria-prima" htmlFor="pm-mp" error={errMsg(e.rawMaterialId)}>
            <Select id="pm-mp" {...f.register('rawMaterialId')}>
              <option value="">Selecione…</option>
              {s.materials.filter((m) => m.use === 'materia_prima').map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
            </Select>
          </Field>
          <Field label="Consumo de matéria-prima (kg)" htmlFor="pm-mpkg" error={errMsg(e.rawMaterialKg)}>
            <Input id="pm-mpkg" type="number" step="any" inputMode="decimal" {...f.register('rawMaterialKg')} />
          </Field>
        </FormGrid>

        <fieldset className="rounded-lg border border-paper-line p-4">
          <legend className="px-1 text-sm font-medium text-neutral-800">
            Quantidades {order && <span className="font-normal text-neutral-500">({unitCode(s.units, order.unitId)})</span>}
          </legend>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Produzido" htmlFor="pm-prod" error={errMsg(e.producedQty)}>
              <Input id="pm-prod" type="number" step="any" inputMode="decimal" {...f.register('producedQty')} />
            </Field>
            <Field label="Aprovado" htmlFor="pm-appr" error={errMsg(e.approvedQty)}>
              <Input id="pm-appr" type="number" step="any" inputMode="decimal" {...f.register('approvedQty')} />
            </Field>
            <Field label="Rejeitado" htmlFor="pm-rej" error={errMsg(e.rejectedQty)}>
              <Input id="pm-rej" type="number" step="any" inputMode="decimal" {...f.register('rejectedQty')} />
            </Field>
            <Field label="Retrabalho" htmlFor="pm-rew" error={errMsg(e.reworkQty)}>
              <Input id="pm-rew" type="number" step="any" inputMode="decimal" {...f.register('reworkQty')} />
            </Field>
          </div>
          <p className={`mt-3 flex items-center gap-1.5 text-sm ${balanced ? 'text-emerald-700' : 'text-neutral-500'}`} aria-live="polite">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Aprovado + rejeitado + retrabalho = {fmtNumber(sum, 3)} {produced > 0 && `de ${fmtNumber(produced, 3)} produzidos`}
          </p>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Motivo de perda (se houver)" htmlFor="pm-reason" error={errMsg(e.lossReasonId)}>
            <Select id="pm-reason" {...f.register('lossReasonId')}>
              <option value="">Nenhum</option>
              {s.lossReasons.filter((r) => r.appliesTo.some((c) => c !== 'apara_normal')).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          </Field>
          <Field label="Ocorrência" htmlFor="pm-occ" error={errMsg(e.occurrence)} hint="Paradas, ajustes, problemas de material…">
            <Textarea id="pm-occ" rows={2} {...f.register('occurrence')} />
          </Field>
        </div>
        <Notice>O peso das aparas e perdas deste turno é lançado em <strong>Perdas e aparas</strong>, vinculado à máquina.</Notice>
        <div className="flex justify-end">
          <Button type="submit" loading={f.formState.isSubmitting}>Registrar produção</Button>
        </div>
      </form>
    </Card>
  );
}

export default function MachineProduction() {
  const s = useSnapshot();
  const { can } = useProfile();
  const { actions } = useData();
  const toast = useToast();
  const [machineId, setMachineId] = useState(s.machines[0]?.id ?? '');
  const [showOrder, setShowOrder] = useState(false);

  const records = useMemo(
    () => s.machineRecords.filter((r) => !machineId || r.machineId === machineId).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [s.machineRecords, machineId],
  );
  const pending = records.filter((r) => r.status === 'pendente');

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Produção por máquina"
        description="Lançamento por turno com quantidades aprovadas, rejeitadas e retrabalhadas na unidade da ordem de produção."
        actions={
          <>
            <DemoTag />
            {can('producao:registrar') && (
              <Button variant="secondary" onClick={() => setShowOrder((v) => !v)}>
                <Plus className="h-4 w-4" /> Nova ordem
              </Button>
            )}
          </>
        }
      />
      {showOrder && <OrderFormCard s={s} onDone={() => setShowOrder(false)} />}
      {can('producao:registrar') ? <RecordForm s={s} /> : <div className="mb-6"><Notice>O perfil atual pode consultar, mas não registrar produção.</Notice></div>}

      <Card>
        <CardHeader
          title="Histórico por máquina"
          description={`${records.length} lançamentos · aprovação ${fmtPct(approvalRate(records))} · ${fmtByUnit(sumByUnit(records, (r) => r.unitId, (r) => r.approvedQty), s.units)} aprovados`}
          actions={
            <>
              <Select aria-label="Filtrar por máquina" value={machineId} onChange={(e) => setMachineId(e.target.value)} className="h-9 w-auto">
                <option value="">Todas as máquinas</option>
                {s.machines.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}
              </Select>
              {can('producao:validar') && pending.length > 0 && (
                <Badge tone="amber">{pending.length} pendente(s)</Badge>
              )}
            </>
          }
        />
        <DataTable
          caption="Histórico de produção por máquina"
          rows={records}
          maxRows={60}
          rowKey={(r) => r.id}
          columns={[
            { key: 'd', header: 'Data', cell: (r) => <>{fmtDate(r.date)} <span className="text-neutral-400">· {r.shift}</span></> },
            { key: 'm', header: 'Máquina', cell: (r) => s.machines.find((m) => m.id === r.machineId)?.code },
            { key: 'o', header: 'Ordem', cell: (r) => s.orders.find((o) => o.id === r.orderId)?.number },
            { key: 'p', header: 'Produzido', align: 'right', cell: (r) => `${fmtNumber(r.producedQty, 3)} ${unitCode(s.units, r.unitId)}` },
            { key: 'a', header: 'Aprov.', align: 'right', cell: (r) => fmtNumber(r.approvedQty, 3) },
            { key: 'j', header: 'Rejeit.', align: 'right', cell: (r) => fmtNumber(r.rejectedQty, 3) },
            { key: 'w', header: 'Retrab.', align: 'right', cell: (r) => fmtNumber(r.reworkQty, 3) },
            { key: 'k', header: 'MP', align: 'right', cell: (r) => fmtKg(r.rawMaterialKg) },
            {
              key: 's', header: 'Situação', cell: (r) =>
                r.status === 'validado' ? <Badge tone="green">Validado</Badge> : can('producao:validar') ? (
                  <Button size="sm" variant="secondary" onClick={async () => {
                    try { await actions.validateRecord('machine', r.id); toast.success('Lançamento validado.'); } catch (err) { toast.error(err); }
                  }}>
                    <CheckCheck className="h-3.5 w-3.5" /> Validar
                  </Button>
                ) : <Badge tone="amber">Pendente</Badge>,
            },
            { key: 'oc', header: 'Ocorrência', cell: (r) => <span className="text-neutral-500">{r.occurrence ?? '—'}</span> },
          ]}
        />
      </Card>
    </>
  );
}
