import { useMemo } from 'react';
import { roleLabel } from '../auth/roles';
import { useProfile } from '../auth/ProfileContext';
import { WASTE_COLORS } from '../components/charts';
import { FilterBar, useFilters } from '../components/Filters';
import { Badge, Button, Card, CardHeader, cx, DataTable, DemoTag, Field, FormGrid, Input, Notice, PageHeader, Select } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { useData, useSnapshot } from '../data/DataProvider';
import { fmtDate, fmtKg, fmtNumber, unitCode } from '../domain/format';
import { applyFilters } from '../domain/indicators';
import type { Snapshot, WasteClass } from '../domain/types';
import { entersWasteStock, WASTE_CLASSES, wasteClassLabel } from '../domain/waste';
import { wasteSchema, type WasteForm } from '../forms/schemas';
import { errMsg, useZodForm } from '../forms/useZodForm';

const TONE: Record<WasteClass, 'blue' | 'red' | 'green' | 'amber'> = { apara_normal: 'blue', perda_anormal: 'red', retrabalho: 'green', rejeito: 'amber' };

function WasteFormCard({ s }: { s: Snapshot }) {
  const { actions } = useData();
  const { role } = useProfile();
  const toast = useToast();
  const defaults: Partial<WasteForm> = {
    date: s.meta.referenceDate, materialId: '', origin: 'maquina', sectorId: '', machineId: '', unitId: 'u-kg',
    classification: undefined, reasonId: '', locationId: '', lotId: '',
  };
  const f = useZodForm<WasteForm>(wasteSchema, defaults);
  const e = f.formState.errors;
  const [origin, sectorId, cls] = f.watch(['origin', 'sectorId', 'classification']);
  const reasons = s.lossReasons.filter((r) => r.active && (!cls || r.appliesTo.includes(cls)));

  const submit = f.handleSubmit(async (v) => {
    try {
      await actions.addWasteRecord({
        ...v,
        machineId: v.origin === 'maquina' ? v.machineId : undefined,
        lotId: v.lotId || undefined,
        registeredByRole: role,
      });
      toast.success(entersWasteStock(v.classification) ? 'Lançamento registrado e entrada gerada no estoque de resíduos.' : 'Retrabalho registrado (não entra no estoque de resíduos).');
      f.reset({ ...defaults, date: v.date, origin: v.origin, sectorId: v.sectorId, machineId: v.machineId, locationId: v.locationId });
    } catch (err) {
      toast.error(err);
    }
  });

  return (
    <Card className="mb-6">
      <CardHeader title="Registrar perda ou apara" description="Escolha primeiro a classificação. Cada tipo tem tratamento diferente nos indicadores." />
      <form onSubmit={submit} className="space-y-5 p-5" noValidate aria-label="Registrar perda ou apara">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-neutral-800">Classificação</legend>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" role="radiogroup">
            {WASTE_CLASSES.map((w) => (
              <label
                key={w.id}
                className={cx(
                  'flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm transition',
                  cls === w.id ? 'border-ink bg-paper ring-1 ring-ink' : 'border-paper-line hover:border-neutral-300',
                )}
              >
                <span className="flex items-center gap-2 font-medium">
                  <input type="radio" value={w.id} className="accent-black" {...f.register('classification', { onChange: () => f.setValue('reasonId', '') })} />
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: WASTE_COLORS[w.id] }} aria-hidden />
                  {w.label}
                </span>
                <span className="text-xs leading-snug text-neutral-500">{w.description}</span>
              </label>
            ))}
          </div>
          {errMsg(e.classification) && <p role="alert" className="mt-1 text-sm text-red-600">{errMsg(e.classification)}</p>}
        </fieldset>

        <FormGrid>
          <Field label="Data" htmlFor="rs-date" error={errMsg(e.date)}><Input id="rs-date" type="date" max={s.meta.referenceDate} {...f.register('date')} /></Field>
          <Field label="Material" htmlFor="rs-mat" error={errMsg(e.materialId)}>
            <Select id="rs-mat" {...f.register('materialId')}>
              <option value="">Selecione…</option>
              {s.materials.filter((m) => m.use === 'residuo' && m.active).map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
            </Select>
          </Field>
          <Field label="Origem da geração" htmlFor="rs-origin" error={errMsg(e.origin)}>
            <Select id="rs-origin" {...f.register('origin')}>
              <option value="maquina">Máquina</option>
              <option value="manual">Atividade manual</option>
              <option value="outro">Outra origem</option>
            </Select>
          </Field>
          <Field label="Setor" htmlFor="rs-sector" error={errMsg(e.sectorId)}>
            <Select id="rs-sector" {...f.register('sectorId', { onChange: () => f.setValue('machineId', '') })}>
              <option value="">Selecione…</option>
              {s.sectors.filter((x) => x.active).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </Select>
          </Field>
          {origin === 'maquina' && (
            <Field label="Máquina" htmlFor="rs-machine" error={errMsg(e.machineId)}>
              <Select id="rs-machine" {...f.register('machineId')}>
                <option value="">Selecione…</option>
                {s.machines.filter((m) => m.active && (!sectorId || m.sectorId === sectorId)).map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Motivo da geração" htmlFor="rs-reason" error={errMsg(e.reasonId)} hint={cls ? undefined : 'Selecione a classificação para ver os motivos'}>
            <Select id="rs-reason" {...f.register('reasonId')}>
              <option value="">Selecione…</option>
              {reasons.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-[1fr_110px] gap-2">
            <Field label="Peso líquido" htmlFor="rs-weight" error={errMsg(e.netWeight)}><Input id="rs-weight" type="number" step="any" inputMode="decimal" {...f.register('netWeight')} /></Field>
            <Field label="Unidade" htmlFor="rs-unit" error={errMsg(e.unitId)}>
              <Select id="rs-unit" {...f.register('unitId')}>
                {s.units.filter((u) => u.dimension === 'massa').map((u) => <option key={u.id} value={u.id}>{u.code}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Local de armazenamento" htmlFor="rs-loc" error={errMsg(e.locationId)}>
            <Select id="rs-loc" {...f.register('locationId')}>
              <option value="">Selecione…</option>
              {s.locations.filter((l) => l.active).map((l) => <option key={l.id} value={l.id}>{l.code} — {l.name}</option>)}
            </Select>
          </Field>
          <Field label="Lote / recipiente (opcional)" htmlFor="rs-lot" hint="Preparado para identificação por QR Code">
            <Select id="rs-lot" {...f.register('lotId')}>
              <option value="">Sem lote</option>
              {s.lots.filter((l) => l.active).map((l) => <option key={l.id} value={l.id}>{l.code}</option>)}
            </Select>
          </Field>
        </FormGrid>
        <p className="text-xs text-neutral-500">Responsável pelo lançamento: perfil <strong>{roleLabel(role)}</strong> (na operação real, o usuário autenticado).</p>
        <div className="flex justify-end"><Button type="submit" loading={f.formState.isSubmitting}>Registrar</Button></div>
      </form>
    </Card>
  );
}

export default function Waste() {
  const s = useSnapshot();
  const { can } = useProfile();
  const [filters, setFilters] = useFilters(s, 30);
  const { wasteRecords } = useMemo(() => applyFilters(s, filters), [s, filters]);
  const rows = [...wasteRecords].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const total = (c: WasteClass) => wasteRecords.filter((w) => w.classification === c).reduce((a, w) => a + w.netWeight, 0);

  return (
    <>
      <PageHeader
        eyebrow="Resíduos"
        title="Perdas e aparas"
        description="Separação obrigatória entre aparas normais, perdas anormais, retrabalho e rejeitos. Aparas normais não são tratadas como perda financeira."
        actions={<DemoTag />}
      />
      {can('residuos:registrar') ? <WasteFormCard s={s} /> : <div className="mb-6"><Notice>O perfil atual pode consultar, mas não registrar.</Notice></div>}
      <FilterBar s={s} value={filters} onChange={setFilters} dims={['sector', 'machine', 'material']} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {WASTE_CLASSES.map((w) => (
          <div key={w.id} className="rounded-xl border border-paper-line bg-white p-4 shadow-card">
            <p className="flex items-center gap-2 text-[13px] font-medium text-neutral-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: WASTE_COLORS[w.id] }} aria-hidden /> {w.short}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{fmtKg(total(w.id))}</p>
            <p className="mt-1 text-xs text-neutral-500">{entersWasteStock(w.id) ? 'Entra no estoque de resíduos' : 'Retorna ao processo'}</p>
          </div>
        ))}
      </div>
      <Card>
        <CardHeader title="Lançamentos" description={`${rows.length} registros no período`} />
        <DataTable
          caption="Lançamentos de perdas e aparas"
          rows={rows}
          maxRows={80}
          rowKey={(r) => r.id}
          columns={[
            { key: 'd', header: 'Data', cell: (r) => fmtDate(r.date) },
            { key: 'c', header: 'Classificação', cell: (r) => <Badge tone={TONE[r.classification]}>{wasteClassLabel(r.classification)}</Badge> },
            { key: 'm', header: 'Material', cell: (r) => s.materials.find((m) => m.id === r.materialId)?.code },
            { key: 'o', header: 'Origem', cell: (r) => r.machineId ? s.machines.find((m) => m.id === r.machineId)?.code : s.sectors.find((x) => x.id === r.sectorId)?.code },
            { key: 'w', header: 'Peso líquido', align: 'right', cell: (r) => `${fmtNumber(r.netWeight, 3)} ${unitCode(s.units, r.unitId).toLowerCase()}` },
            { key: 'r', header: 'Motivo', cell: (r) => s.lossReasons.find((x) => x.id === r.reasonId)?.name },
            { key: 'l', header: 'Local', cell: (r) => s.locations.find((x) => x.id === r.locationId)?.code },
            { key: 'u', header: 'Lançado por', cell: (r) => <span className="text-neutral-500">{roleLabel(r.registeredByRole)}</span> },
          ]}
        />
      </Card>
    </>
  );
}
