import { useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Download, FileCheck2, Truck } from 'lucide-react';
import { useProfile } from '../auth/ProfileContext';
import { Button, Card, CardHeader, EmptyState, Field, FormGrid, Input, PageHeader, Textarea } from '../components/ui';
import { fmtKg, today, useRealData, type Pickup, type PickupConfirmation } from './data';

function isCapital(partner:string){return partner.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()==='capital reciclaveis';}
export function difference(pickup:Pickup, confirmation:PickupConfirmation):number {
  return Math.round((Number(confirmation.received_kg)-Number(pickup.quantity_kg))*1000)/1000;
}
function csvValue(value:unknown):string {
  const s=String(value??'');
  const safe=/^[=+\-@\t\r]/.test(s)?"'"+s:s;
  return '"'+safe.replace(/"/g,'""')+'"';
}
function exportReconciliation(pickups:Pickup[], confirmations:PickupConfirmation[]) {
  const byId=new Map(confirmations.map(c=>[c.pickup_id,c]));
  const header=['data_saida','material','parceiro','peso_saida_kg','data_entrada','peso_recebido_kg','diferenca_kg','comprovante_saida','comprovante_recebimento','situacao'];
  const rows=pickups.map(p=>{
    const c=byId.get(p.id),diff=c?difference(p,c):null;
    return [p.occurred_on,p.material_id,p.partner,p.quantity_kg,c?.received_on??'',c?.received_kg??'',diff??'',p.document_ref??'',c?.receipt_reference??'',!c?'aguardando':diff===0?'conciliado':'divergente'];
  });
  const text='\uFEFF'+[header,...rows].map(row=>row.map(csvValue).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='papelito-capital-conciliacao.csv';a.click();URL.revokeObjectURL(url);
}
export default function CapitalReconciliation() {
  const {role}=useProfile();
  const {data,create}=useRealData();
  const canCreate=['admin','ambiental'].includes(role);
  const canConfirm=role==='capital';
  const [date,setDate]=useState(today()),[material,setMaterial]=useState(''),[weight,setWeight]=useState(''),[outRef,setOutRef]=useState(''),[notes,setNotes]=useState('');
  const [selected,setSelected]=useState<string|null>(null),[receivedOn,setReceivedOn]=useState(today()),[receivedWeight,setReceivedWeight]=useState(''),[receipt,setReceipt]=useState(''),[confirmNotes,setConfirmNotes]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const balance=(()=>{const totals:Record<string,number>={};for(const e of data.entries){if(e.destination==='reciclagem')totals[e.material_id]=(totals[e.material_id]||0)+Number(e.quantity_kg);}for(const p of data.pickups){totals[p.material_id]=(totals[p.material_id]||0)-Number(p.quantity_kg);}return totals;})();
  const available=balance[material]||0;
  const confirmed=new Map(data.confirmations.map(c=>[c.pickup_id,c]));
  const pending=data.pickups.filter(p=>isCapital(p.partner)&&!confirmed.has(p.id));
  const withDifference=data.pickups.filter(p=>{const c=confirmed.get(p.id);return c&&difference(p,c)!==0;}).length;
  const receivedCount=data.confirmations.length;
  async function execute(action:()=>Promise<void>,success:string) {
    setBusy(true);setError('');setMessage('');
    try{await action();setMessage(success);return true;}
    catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar a informação.');return false;}
    finally{setBusy(false);}
  }
  async function createPickup(e:FormEvent){e.preventDefault();
    const kg=Number(weight);
    if(!material||!Number.isFinite(kg)||kg<=0||kg>available)return;
    const ok=await execute(()=>create('pickups',{occurred_on:date,material_id:material,partner:'Capital Recicláveis',quantity_kg:kg,document_ref:outRef.trim()||null,notes:notes.trim()||null}), 'Retirada registrada. A confirmação da Capital permanece pendente.');
    if(ok){setWeight('');setOutRef('');setNotes('');}
  }
  async function confirmPickup(e:FormEvent){e.preventDefault();
    const p=data.pickups.find(x=>x.id===selected);
    if(!canConfirm||!p||confirmed.has(p.id)||!isCapital(p.partner)||!receivedWeight||Number(receivedWeight)<=0||receipt.trim().length<3)return;
    const ok=await execute(()=>create('confirmations',{pickup_id:p.id,received_on:receivedOn,received_kg:Number(receivedWeight),receipt_reference:receipt.trim(),notes:confirmNotes.trim()||null}),
      'Recebimento confirmado pela conta Capital. A diferença já pode ser conferida.');
    if(ok){setSelected(null);setReceivedWeight('');setReceipt('');setConfirmNotes('');}
  }
  const selectedPickup=data.pickups.find(p=>p.id===selected);
  return <section>
    <PageHeader eyebrow="Papelito ↔ Capital" title="Coletas e conferência" description="Rastreabilidade em duas etapas: peso de saída informado pela Papelito e peso de recebimento confirmado pela Capital Recicláveis." actions={<Button variant="secondary" onClick={()=>exportReconciliation(data.pickups,data.confirmations)}><Download size={16}/> Exportar conciliação</Button>}/>
    <div className="mb-6 grid gap-3 sm:grid-cols-3">
      <Card><div className="p-5"><p className="text-xs text-neutral-600">Aguardando Capital</p><strong className="mt-2 block text-3xl font-black">{pending.length}</strong><p className="mt-1 text-xs">Retiradas da Papelito ainda sem confirmação</p></div></Card>
      <Card><div className="p-5"><p className="text-xs text-neutral-600">Recebimentos informados</p><strong className="mt-2 block text-3xl font-black">{receivedCount}</strong><p className="mt-1 text-xs">Pesagem registrada pela conta Capital</p></div></Card>
      <Card><div className="p-5"><p className="text-xs text-neutral-600">Diferenças encontradas</p><strong className="mt-2 block text-3xl font-black">{withDifference}</strong><p className="mt-1 text-xs">Coletas com peso recebido diferente do enviado</p></div></Card>
    </div>
    {error&&<p role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {message&&<p role="status" className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-900">{message}</p>}
    {canCreate&&<Card className="mb-6">
      <CardHeader title="1 · Registrar saída na Papelito" description="Apenas materiais efetivamente pesados e disponíveis no estoque reciclável."/>
      {data.materials.filter(m=>m.recyclable&&m.active).length===0?<div className="p-5"><EmptyState title="Não existem materiais recicláveis cadastrados" description="Cadastre os materiais e registre as entradas antes de criar a primeira retirada."/></div>:
      <form onSubmit={e=>void createPickup(e)} className="space-y-4 p-5">
        <FormGrid>
          <Field label="Data da coleta" htmlFor="cap-date"><Input id="cap-date" type="date" required max={today()} value={date} onChange={e=>setDate(e.target.value)}/></Field>
          <Field label="Material" htmlFor="cap-mat"><select id="cap-mat" required value={material} onChange={e=>setMaterial(e.target.value)} className="h-10 w-full rounded-lg border bg-white px-3 text-sm"><option value="">Selecione</option>{data.materials.filter(m=>m.recyclable&&m.active).map(m=><option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}</select></Field>
          <Field label="Peso de saída (kg)" htmlFor="cap-out"><Input id="cap-out" type="number" required min=".001" step=".001" value={weight} onChange={e=>setWeight(e.target.value)}/><p className="mt-1 text-xs text-neutral-600">Disponível no estoque: {fmtKg(available)}</p></Field>
          <Field label="Número do comprovante (opcional)" htmlFor="cap-ref"><Input id="cap-ref" value={outRef} maxLength={180} onChange={e=>setOutRef(e.target.value)}/></Field>
          <Field label="Observações internas" htmlFor="cap-notes"><Textarea id="cap-notes" value={notes} onChange={e=>setNotes(e.target.value)}/></Field>
        </FormGrid>
        {Number(weight)>available&&<p className="text-sm text-red-700">O peso não pode superar o saldo reciclável disponível.</p>}
        <Button type="submit" loading={busy} disabled={!material||!weight||Number(weight)<=0||Number(weight)>available}><Truck size={16}/> Registrar retirada para Capital</Button>
      </form>}
    </Card>}
    {canConfirm&&<Card className="mb-6"><CardHeader title="2 · Confirmação pela Capital" description="Use a conta Capital para registrar o peso realmente recebido e sua referência documental."/>
      {selectedPickup ? <form onSubmit={e=>void confirmPickup(e)} className="space-y-4 p-5">
        <p className="rounded-lg bg-brand-50 p-3 text-sm">Retirada em {selectedPickup.occurred_on} · Peso enviado: <strong>{fmtKg(Number(selectedPickup.quantity_kg))}</strong></p>
        <FormGrid>
          <Field label="Data do recebimento" htmlFor="rec-date"><Input id="rec-date" required type="date" min={selectedPickup.occurred_on} max={today()} value={receivedOn} onChange={e=>setReceivedOn(e.target.value)}/></Field>
          <Field label="Peso recebido (kg)" htmlFor="rec-weight"><Input id="rec-weight" required type="number" step=".001" min=".001" value={receivedWeight} onChange={e=>setReceivedWeight(e.target.value)}/></Field>
          <Field label="Comprovante da Capital" htmlFor="rec-ref"><Input id="rec-ref" required minLength={3} value={receipt} maxLength={180} onChange={e=>setReceipt(e.target.value)}/></Field>
          <Field label="Observações" htmlFor="rec-notes"><Textarea id="rec-notes" value={confirmNotes} onChange={e=>setConfirmNotes(e.target.value)}/></Field>
        </FormGrid>
        <div className="flex gap-3"><Button type="submit" loading={busy} disabled={!receivedWeight||Number(receivedWeight)<=0||receipt.trim().length<3}>Confirmar recebimento</Button><Button variant="secondary" type="button" onClick={()=>setSelected(null)}>Cancelar</Button></div>
      </form>:<div className="p-5 text-sm text-neutral-600">Escolha uma coleta pendente na lista abaixo para informar a pesagem da Capital.</div>}
    </Card>}
    {!canCreate&&!canConfirm&&<p className="mb-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Seu perfil pode consultar as coletas, mas não alterar registros. A Capital confirma o recebimento com sua própria conta.</p>}
    <Card><CardHeader title="Histórico e conciliação" description="Diferenças de peso são sinalizadas sem alterar automaticamente o estoque ou inventar justificativas."/>
      {data.pickups.length===0?<EmptyState title="Nenhuma coleta registrada" description="Os números aparecerão após lançamentos reais de saída na Papelito."/>:
        <div className="divide-y">{data.pickups.map(p=>{
          const c=confirmed.get(p.id), diff=c?difference(p,c):null;
          const materialName=data.materials.find(m=>m.id===p.material_id)?.name||'Material não cadastrado';
          return <div key={p.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><strong className="text-sm">{materialName} · {p.partner}</strong>
                <p className="mt-1 text-xs text-neutral-600">Saída Papelito: {p.occurred_on} · {p.document_ref||'Sem referência documental informada'}</p></div>
              <span className={'inline-flex items-center gap-2 rounded px-3 py-2 text-xs font-semibold '+(!c?'bg-amber-50 text-amber-900':diff===0?'bg-emerald-50 text-emerald-900':'bg-orange-50 text-orange-900')}>
                {!c?<AlertCircle size={15}/>:diff===0?<CheckCircle2 size={15}/>:<AlertCircle size={15}/>}
                {!c?'Aguardando confirmação':diff===0?'Peso conciliado':'Diferença de peso'}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded bg-paper p-3"><p className="text-xs">Saída Papelito</p><strong>{fmtKg(Number(p.quantity_kg))}</strong></div>
              <div className="rounded bg-paper p-3"><p className="text-xs">Recebido Capital</p><strong>{c?fmtKg(Number(c.received_kg)):'—'}</strong></div>
              <div className="rounded bg-paper p-3"><p className="text-xs">Diferença (Capital − Papelito)</p><strong>{diff===null?'—':fmtKg(diff)}</strong></div>
            </div>
            {c&&<p className="mt-3 flex items-center gap-2 text-xs text-neutral-600"><FileCheck2 size={15}/> Recebido em {c.received_on} · Comprovante: {c.receipt_reference}</p>}
            {!c&&canConfirm&&isCapital(p.partner)&&<Button className="mt-3" size="sm" onClick={()=>{setSelected(p.id);setReceivedOn(today());}}>Confirmar esta coleta</Button>}
          </div>;
        })}</div>}
    </Card>
  </section>;
}
