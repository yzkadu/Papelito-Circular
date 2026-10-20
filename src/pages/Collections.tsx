import { Check, FileText, Paperclip, Plus, Trash2, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useFieldArray } from 'react-hook-form';
import { useProfile } from '../auth/ProfileContext';
import { roleLabel } from '../auth/roles';
import { Badge, Button, Card, CardHeader, cx, DataTable, DemoTag, EmptyState, Field, FormGrid, Input, Notice, PageHeader, Select } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { useData, useSnapshot } from '../data/DataProvider';
import {
  collectionDivergence,
  COLLECTION_FLOW,
  confirmedTotal,
  declaredTotal,
  DEFAULT_WEIGHT_TOLERANCE,
  DOCUMENT_KINDS,
  itemDivergence,
  STATUS_LABEL,
} from '../domain/collections';
import { fmtDate, fmtDateTime, fmtKg, fmtPct } from '../domain/format';
import { balanceOf } from '../domain/stock';
import type { Collection, CollectionStatus, DocumentKind, Snapshot } from '../domain/types';
import { collectionSchema, type CollectionForm } from '../forms/schemas';
import { errMsg, useZodForm } from '../forms/useZodForm';

const COMPANY = 'Capital Recicláveis';
const STATUS_TONE: Record<CollectionStatus, 'neutral' | 'blue' | 'violet' | 'green' | 'red'> = {
  agendada: 'neutral', realizada: 'blue', pesagem_conferida: 'violet', destinacao_documentada: 'green', cancelada: 'red',
};

function ScheduleForm({ s, onDone }: { s: Snapshot; onDone: () => void }) {
  const { actions } = useData();
  const toast = useToast();
  const nextNumber = `COL-${s.meta.referenceDate.slice(0, 4)}-${String(s.collections.length + 1).padStart(3, '0')}`;
  const f = useZodForm<CollectionForm>(collectionSchema, {
    number: nextNumber, scheduledDate: s.meta.referenceDate, locationId: '', items: [{ materialId: '', lotId: '', declaredKg: undefined as unknown as number }], notes: '',
  });
  const items = useFieldArray({ control: f.control, name: 'items' });
  const e = f.formState.errors;
  const locationId = f.watch('locationId');

  const submit = f.handleSubmit(async (v) => {
    try {
      await actions.scheduleCollection({ ...v, company: COMPANY, items: v.items.map((i) => ({ ...i, lotId: i.lotId || undefined })), notes: v.notes || undefined });
      toast.success(`Coleta ${v.number} agendada.`);
      onDone();
    } catch (err) {
      toast.error(err);
    }
  });

  return (
    <Card className="mb-6">
      <CardHeader title="Agendar coleta" description={`Empresa responsável: ${COMPANY}. O agendamento não dá baixa no estoque.`} />
      <form onSubmit={submit} className="space-y-4 p-5" noValidate aria-label="Agendar coleta">
        <FormGrid>
          <Field label="Número da coleta" htmlFor="col-num" error={errMsg(e.number)}><Input id="col-num" {...f.register('number')} /></Field>
          <Field label="Data agendada" htmlFor="col-date" error={errMsg(e.scheduledDate)}><Input id="col-date" type="date" {...f.register('scheduledDate')} /></Field>
          <Field label="Local de retirada" htmlFor="col-loc" error={errMsg(e.locationId)}>
            <Select id="col-loc" {...f.register('locationId')}>
              <option value="">Selecione…</option>
              {s.locations.map((l) => <option key={l.id} value={l.id}>{l.code} — {l.name}</option>)}
            </Select>
          </Field>
        </FormGrid>
        <fieldset className="space-y-3 rounded-lg border border-paper-line p-4">
          <legend className="px-1 text-sm font-medium">Materiais</legend>
          {items.fields.map((field, idx) => {
            const mat = f.watch(`items.${idx}.materialId`);
            const bal = mat && locationId ? balanceOf(s.movements, mat, locationId) : null;
            return (
              <div key={field.id} className="grid items-end gap-3 sm:grid-cols-[2fr_1.5fr_1fr_auto]">
                <Field label="Material" htmlFor={`col-mat-${idx}`} error={errMsg(e.items?.[idx]?.materialId)} hint={bal !== null ? `Saldo atual no local: ${fmtKg(bal)}` : undefined}>
                  <Select id={`col-mat-${idx}`} {...f.register(`items.${idx}.materialId`)}>
                    <option value="">Selecione…</option>
                    {s.materials.filter((m) => m.use === 'residuo' && m.recyclable).map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
                  </Select>
                </Field>
                <Field label="Lote / recipiente" htmlFor={`col-lot-${idx}`}>
                  <Select id={`col-lot-${idx}`} {...f.register(`items.${idx}.lotId`)}>
                    <option value="">—</option>
                    {s.lots.filter((l) => !mat || l.materialId === mat).map((l) => <option key={l.id} value={l.id}>{l.code}</option>)}
                  </Select>
                </Field>
                <Field label="Peso informado (kg)" htmlFor={`col-kg-${idx}`} error={errMsg(e.items?.[idx]?.declaredKg)}>
                  <Input id={`col-kg-${idx}`} type="number" step="any" inputMode="decimal" {...f.register(`items.${idx}.declaredKg`)} />
                </Field>
                <Button type="button" variant="ghost" aria-label="Remover material" onClick={() => items.remove(idx)} disabled={items.fields.length === 1}><Trash2 className="h-4 w-4" /></Button>
              </div>
            );
          })}
          <Button type="button" variant="secondary" size="sm" onClick={() => items.append({ materialId: '', lotId: '', declaredKg: undefined as unknown as number })}>
            <Plus className="h-4 w-4" /> Adicionar material
          </Button>
        </fieldset>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>
          <Button type="submit" loading={f.formState.isSubmitting}>Agendar</Button>
        </div>
      </form>
    </Card>
  );
}

function Stepper({ status }: { status: CollectionStatus }) {
  const idx = COLLECTION_FLOW.findIndex((x) => x.id === status);
  return (
    <ol className="grid grid-cols-4 gap-1" aria-label="Etapas da coleta">
      {COLLECTION_FLOW.map((st, i) => (
        <li key={st.id} className="flex flex-col gap-1.5">
          <span className={cx('h-1.5 rounded-full', status === 'cancelada' ? 'bg-red-200' : i <= idx ? 'bg-brand-500' : 'bg-neutral-200')} />
          <span className={cx('text-[11px] leading-tight', i <= idx ? 'font-medium text-ink' : 'text-neutral-400')}>{st.label}</span>
        </li>
      ))}
    </ol>
  );
}

function CollectionDetail({ s, c }: { s: Snapshot; c: Collection }) {
  const { actions } = useData();
  const { can } = useProfile();
  const toast = useToast();
  const [collectedDate, setCollectedDate] = useState(c.scheduledDate < s.meta.referenceDate ? c.scheduledDate : s.meta.referenceDate);
  const [confirmed, setConfirmed] = useState<string[]>(c.items.map((i) => String(i.confirmedKg ?? i.declaredKg)));
  const [destination, setDestination] = useState(c.destination ?? '');
  const [doc, setDoc] = useState<{ kind: DocumentKind; name: string; reference: string }>({ kind: 'ticket_pesagem', name: '', reference: '' });
  const [busy, setBusy] = useState(false);
  const mat = (id: string) => s.materials.find((m) => m.id === id);
  const div = collectionDivergence(c);

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(msg);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-2">{c.number} <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge></span>}
        description={`${c.company} · agendada para ${fmtDate(c.scheduledDate)}${c.collectedDate ? ` · retirada em ${fmtDate(c.collectedDate)}` : ''}`}
      />
      <div className="space-y-5 p-5">
        <Stepper status={c.status} />
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-neutral-500">
            <tr><th className="py-1 text-left font-medium">Material / lote</th><th className="py-1 text-right font-medium">Informado</th><th className="py-1 text-right font-medium">Confirmado</th><th className="py-1 text-right font-medium">Divergência</th></tr>
          </thead>
          <tbody className="divide-y divide-paper-line">
            {c.items.map((i, idx) => {
              const d = itemDivergence(i);
              return (
                <tr key={idx}>
                  <td className="py-2">{mat(i.materialId)?.code} <span className="text-neutral-500">{s.lots.find((l) => l.id === i.lotId)?.code}</span></td>
                  <td className="py-2 text-right tabular-nums">{fmtKg(i.declaredKg)}</td>
                  <td className="py-2 text-right tabular-nums">
                    {c.status === 'realizada' && can('coletas:confirmar') ? (
                      <Input aria-label={`Peso confirmado ${mat(i.materialId)?.code}`} type="number" step="any" className="ml-auto h-8 w-28 text-right" value={confirmed[idx]} onChange={(e) => setConfirmed((p) => p.map((x, j) => (j === idx ? e.target.value : x)))} />
                    ) : i.confirmedKg !== undefined ? fmtKg(i.confirmedKg) : '—'}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {d ? <span className={d.outOfTolerance ? 'font-medium text-red-600' : 'text-neutral-600'}>{d.diffKg > 0 ? '+' : ''}{fmtKg(d.diffKg)} ({fmtPct(d.pct)})</span> : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {div?.outOfTolerance && (
          <Notice tone="red" title="Divergência de pesagem acima da tolerância">
            Diferença total de {fmtKg(div.diffKg)} ({fmtPct(div.pct)}), acima de {fmtPct(DEFAULT_WEIGHT_TOLERANCE)}. Verifique balanças e registre um ajuste de inventário justificado se necessário. A tolerância precisa ser acordada entre as empresas.
          </Notice>
        )}

        {c.status === 'agendada' && can('coletas:confirmar') && (
          <div className="flex flex-wrap items-end gap-2 rounded-lg bg-paper p-3">
            <Field label="Data da retirada" htmlFor="col-done"><Input id="col-done" type="date" value={collectedDate} max={s.meta.referenceDate} onChange={(e) => setCollectedDate(e.target.value)} /></Field>
            <Button loading={busy} onClick={() => run(() => actions.transitionCollection(c.id, 'realizada', { collectedDate }), 'Coleta realizada. Baixa registrada no estoque.')}>
              <Truck className="h-4 w-4" /> Confirmar retirada
            </Button>
            {can('coletas:gerenciar') && (
              <Button variant="ghost" loading={busy} onClick={() => window.confirm('Cancelar esta coleta?') && run(() => actions.transitionCollection(c.id, 'cancelada', {}), 'Coleta cancelada.')}>Cancelar coleta</Button>
            )}
          </div>
        )}
        {c.status === 'realizada' && can('coletas:confirmar') && (
          <div className="flex justify-end">
            <Button loading={busy} onClick={() => run(() => actions.transitionCollection(c.id, 'pesagem_conferida', { confirmedKg: confirmed.map(Number) }), 'Pesagem conferida.')}>
              <Check className="h-4 w-4" /> Confirmar pesagem
            </Button>
          </div>
        )}

        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Paperclip className="h-4 w-4" /> Documentos e comprovantes</h3>
          {c.documents.length === 0 ? <p className="text-sm text-neutral-500">Nenhum documento associado.</p> : (
            <ul className="space-y-1.5 text-sm">
              {c.documents.map((d) => (
                <li key={d.id} className="flex items-center gap-2"><FileText className="h-4 w-4 text-neutral-400" /> {d.name} <span className="text-neutral-500">· ref. {d.reference}</span> <span className="ml-auto text-xs text-neutral-400">{fmtDateTime(d.addedAt)}</span></li>
              ))}
            </ul>
          )}
          {c.status !== 'cancelada' && can('coletas:confirmar') && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Select aria-label="Tipo de documento" value={doc.kind} onChange={(e) => setDoc({ ...doc, kind: e.target.value as DocumentKind })}>
                {DOCUMENT_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </Select>
              <Input aria-label="Nome do documento" placeholder="Descrição" value={doc.name} onChange={(e) => setDoc({ ...doc, name: e.target.value })} />
              <Input aria-label="Número ou referência" placeholder="Nº / referência" value={doc.reference} onChange={(e) => setDoc({ ...doc, reference: e.target.value })} />
              <Button variant="secondary" loading={busy} onClick={() => run(async () => { await actions.addCollectionDocument(c.id, doc); setDoc({ ...doc, name: '', reference: '' }); }, 'Documento associado.')}>Associar</Button>
            </div>
          )}
          <p className="mt-2 text-xs text-neutral-500">Nesta versão registramos apenas a referência do documento (o envio de arquivos será implementado com armazenamento seguro na Fase 2). Este sistema não substitui o MTR/SINIR nem outros registros oficiais.</p>
        </div>

        {c.status === 'pesagem_conferida' && can('coletas:gerenciar') && (
          <div className="space-y-2 rounded-lg bg-paper p-3">
            <Field label="Destinação informada no documento" htmlFor="col-dest"><Input id="col-dest" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Ex.: reciclagem de papel — unidade X" /></Field>
            <div className="flex justify-end">
              <Button loading={busy} onClick={() => run(() => actions.transitionCollection(c.id, 'destinacao_documentada', { destination }), 'Destinação documentada.')}>Registrar destinação documentada</Button>
            </div>
          </div>
        )}
        {c.destination && <p className="text-sm"><span className="font-medium">Destinação:</span> {c.destination}</p>}
        <details className="text-xs text-neutral-500">
          <summary className="cursor-pointer">Histórico de status</summary>
          <ul className="mt-2 space-y-1">{c.history.map((h, i) => <li key={i}>{fmtDateTime(h.at)} — {STATUS_LABEL[h.status]} ({roleLabel(h.role)})</li>)}</ul>
        </details>
      </div>
    </Card>
  );
}

export default function Collections() {
  const s = useSnapshot();
  const { can } = useProfile();
  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState<CollectionStatus | ''>('');
  const rows = useMemo(() => [...s.collections].filter((c) => !status || c.status === status).sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate)), [s.collections, status]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = s.collections.find((c) => c.id === (selectedId ?? rows[0]?.id));

  return (
    <>
      <PageHeader
        eyebrow="Resíduos"
        title="Coletas · Capital Recicláveis"
        description="Acompanhamento da retirada dos resíduos. Material retirado não é considerado reciclado até que a destinação seja documentada."
        actions={<><DemoTag />{can('coletas:gerenciar') && <Button onClick={() => setShowForm((v) => !v)}><Plus className="h-4 w-4" /> Agendar coleta</Button>}</>}
      />
      <div className="mb-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {COLLECTION_FLOW.map((st, i) => (
          <div key={st.id} className="rounded-xl border border-paper-line bg-white p-4 shadow-card">
            <p className="text-xs text-neutral-500">Etapa {i + 1}</p>
            <p className="font-medium">{st.label}</p>
            <p className="mt-1 text-xs leading-snug text-neutral-500">{st.description}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums">{s.collections.filter((c) => c.status === st.id).length}</p>
          </div>
        ))}
      </div>
      {showForm && <ScheduleForm s={s} onDone={() => setShowForm(false)} />}
      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader
            title="Coletas"
            actions={
              <Select aria-label="Filtrar por status" className="h-9 w-auto" value={status} onChange={(e) => setStatus(e.target.value as CollectionStatus | '')}>
                <option value="">Todos os status</option>
                {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </Select>
            }
          />
          <DataTable
            caption="Lista de coletas"
            rows={rows}
            rowKey={(r) => r.id}
            empty={<EmptyState title="Nenhuma coleta" />}
            columns={[
              { key: 'n', header: 'Coleta', cell: (r) => <button className={cx('whitespace-nowrap font-medium hover:underline', selected?.id === r.id && 'text-brand-700')} onClick={() => setSelectedId(r.id)}>{r.number}</button> },
              { key: 'd', header: 'Data', cell: (r) => fmtDate(r.collectedDate ?? r.scheduledDate) },
              { key: 's', header: 'Status', cell: (r) => <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge> },
              { key: 'i', header: 'Informado', align: 'right', cell: (r) => fmtKg(declaredTotal(r)) },
              { key: 'c', header: 'Confirmado', align: 'right', cell: (r) => { const t = confirmedTotal(r); return t === null ? '—' : fmtKg(t); } },
              { key: 'v', header: 'Diverg.', align: 'right', cell: (r) => { const d = collectionDivergence(r); return d ? <span className={d.outOfTolerance ? 'font-medium text-red-600' : ''}>{fmtPct(d.pct)}</span> : '—'; } },
            ]}
          />
        </Card>
        {selected ? <CollectionDetail key={selected.id + selected.status} s={s} c={selected} /> : <Card><EmptyState title="Selecione uma coleta" /></Card>}
      </div>
    </>
  );
}
