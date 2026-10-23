import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Outlet } from 'react-router-dom';
import { Boxes, ClipboardList, Database, Factory, FileSpreadsheet, Gauge, LogOut, Settings2, ShieldCheck, Truck, type LucideIcon } from 'lucide-react';
import { useProfile } from '../auth/ProfileContext';
import { roleLabel } from '../auth/roles';
import { Button, Card, CardHeader, EmptyState, ErrorState, Field, FormGrid, Input, LoadingState, PageHeader, Select, Textarea } from '../components/ui';
import { fmtKg, stockByMaterial, today, totalKg, useRealData, type Entry } from './data';

const names = { apara_normal: 'Apara normal / prevista', perda_anormal: 'Perda anormal / evitável' };
const destinations = { reciclagem: 'Reciclagem / estoque', reuso: 'Reutilização interna', rejeito: 'Rejeito' };
const nav: { to: string; label: string; icon: LucideIcon; roles: string[] }[] = [
  { to: '/app', label: 'Visão geral', icon: Gauge, roles: ['admin','supervisor','ambiental','operador','financeiro'] },
  { to: '/app/cadastros', label: 'Cadastros', icon: Factory, roles: ['admin','supervisor','ambiental','operador','financeiro'] },
  { to: '/app/referencias', label: 'Aparas previstas', icon: Settings2, roles: ['admin','supervisor','ambiental','financeiro'] },
  { to: '/app/residuos', label: 'Lançar aparas e perdas', icon: ClipboardList, roles: ['admin','supervisor','ambiental','operador','financeiro'] },
  { to: '/app/estoque', label: 'Estoque reciclável', icon: Boxes, roles: ['admin','supervisor','ambiental','financeiro'] },
  { to: '/app/coletas', label: 'Coletas', icon: Truck, roles: ['admin','supervisor','ambiental','financeiro','capital'] },
  { to: '/app/importacao', label: 'Conferir CSV', icon: FileSpreadsheet, roles: ['admin','supervisor','ambiental','financeiro'] },
  { to: '/app/usuarios', label: 'Acessos por área', icon: ShieldCheck, roles: ['admin'] },
];
function PageNotice({ children }: { children: ReactNode }) {
  return <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{children}</p>;
}
function Message({ error, success }: { error: string; success: string }) {
  return <>{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {success && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{success}</p>}</>;
}
function useSubmitAction() {
  const { create, toggle } = useRealData();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function run(action: () => Promise<void>, ok = 'Registro salvo no Supabase.') {
    setSaving(true); setError(''); setSuccess('');
    try { await action(); setSuccess(ok); return true; }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar.'); return false; }
    finally { setSaving(false); }
  }
  return { saving, error, success, run, create, toggle };
}
function NotAllowed() { return <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Sua conta pode consultar, mas não realizar lançamentos nesta área.</p>; }
function Empty({ title, help }: { title: string; help: string }) {
  return <EmptyState title={title} description={help} />;
}
function DateLabel({ value }: { value: string }) {
  const [y,m,d] = value.split('-');
  return <>{d && m && y ? d + '/' + m + '/' + y : value}</>;
}
function MaterialName({ id }: { id: string }) {
  const { data } = useRealData();
  return <>{data.materials.find(m => m.id === id)?.name || 'Material não encontrado'}</>;
}
function MachineName({ id }: { id: string }) {
  const { data } = useRealData();
  return <>{data.machines.find(m => m.id === id)?.name || 'Máquina não encontrada'}</>;
}
function RecordsTable({ rows }: { rows: Entry[] }) {
  return rows.length === 0 ? <Empty title="Nenhum lançamento realizado" help="Os dados reais vão aparecer aqui após o primeiro registro." /> :
    <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm">
      <thead className="bg-paper text-neutral-600"><tr>{['Data','Máquina','Material','Ordem/lote','Origem','Destino','Peso'].map(t => <th className="p-3" key={t}>{t}</th>)}</tr></thead>
      <tbody>{rows.slice(0,100).map(e => <tr key={e.id} className="border-t border-paper-line">
        <td className="p-3"><DateLabel value={e.occurred_on}/></td>
        <td className="p-3"><MachineName id={e.machine_id}/></td>
        <td className="p-3"><MaterialName id={e.material_id}/></td>
        <td className="p-3">{e.batch_ref}</td><td className="p-3">{names[e.origin_class]}</td>
        <td className="p-3">{destinations[e.destination]}</td>
        <td className="p-3 text-right font-semibold">{fmtKg(Number(e.quantity_kg))}</td>
      </tr>)}</tbody>
    </table></div>;
}

export function RealShell() {
  const { role, signOut } = useProfile();
  const { loading, error, refresh } = useRealData();
  const links = nav.filter(n => n.roles.includes(role));
  return <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
    <aside className="bg-ink px-5 py-6 text-white">
      <Link to="/" className="block text-2xl font-black tracking-tight text-brand-500">PAPELITO <span className="text-white">CIRCULAR</span></Link>
      <p className="mb-6 mt-2 text-xs text-neutral-400">Ambiente operacional · Supabase</p>
      <nav aria-label="Menu de operação" className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
        {links.map(n => <NavLink key={n.to} to={n.to} end={n.to==='/app'}
          className={({ isActive }) => 'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ' + (isActive ? 'bg-brand-500 font-bold text-ink' : 'text-neutral-300 hover:bg-white/10')}>
          <n.icon className="h-4 w-4 shrink-0" />{n.label}
        </NavLink>)}
      </nav>
      <div className="mt-8 border-t border-white/10 pt-5 text-xs text-neutral-300">
        <p>Perfil autenticado: <strong>{roleLabel(role)}</strong></p>
        <button className="mt-3 inline-flex items-center gap-2 underline" onClick={() => void signOut()}><LogOut className="h-4 w-4"/>Sair</button>
      </div>
    </aside>
    <main className="min-w-0 px-4 py-8 sm:px-7 xl:px-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-600"><Database size={15}/> Dados reais · origem Supabase</span>
        <button onClick={() => void refresh()} className="text-xs text-neutral-600 underline">Atualizar dados</button>
      </div>
      {loading ? <LoadingState label="Consultando registros reais..." /> : error ? <ErrorState message={error} onRetry={() => void refresh()} /> : <Outlet/>}
    </main>
  </div>;
}

export function RealHome() {
  const { role } = useProfile();
  const { data } = useRealData();
  if (role === 'capital') return <Navigate to="/app/coletas" replace/>;
  const hasEntries = data.entries.length > 0;
  const normal = data.entries.filter(e => e.origin_class === 'apara_normal');
  const abnormal = data.entries.filter(e => e.origin_class === 'perda_anormal');
  const stock = Object.values(stockByMaterial(data)).reduce((a,b) => a+b,0);
  const stats = [
    ['Aparas normais',hasEntries ? fmtKg(totalKg(normal)) : '—'],
    ['Perdas anormais',hasEntries ? fmtKg(totalKg(abnormal)) : '—'],
    ['Em estoque reciclável',hasEntries ? fmtKg(stock) : '—'],
    ['Coletas registradas',data.pickups.length ? fmtKg(totalKg(data.pickups)) : '—'],
  ];
  return <>
    <PageHeader eyebrow="Operação real" title="Visão geral" description="Indicadores gerados exclusivamente a partir dos registros gravados no Supabase. Nenhum valor de demonstração."/>
    {!hasEntries && <PageNotice>Base operacional vazia. Comece cadastrando suas máquinas e materiais; os indicadores serão calculados conforme os lançamentos reais.</PageNotice>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(([label,value]) => <Card key={label}><div className="p-5"><p className="text-sm text-neutral-600">{label}</p><p className="mt-3 text-2xl font-bold">{value}</p></div></Card>)}
    </div>
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {[['1 · Cadastrar','Máquinas e materiais reais','/app/cadastros'],['2 · Registrar','Aparas ou perdas da máquina','/app/residuos'],['3 · Acompanhar','Estoque e coletas','/app/estoque']].map(([t,d,url]) =>
        <Link key={url} to={url} className="rounded-xl border border-paper-line bg-white p-5 hover:border-ink"><strong>{t}</strong><p className="mt-2 text-sm text-neutral-600">{d}</p></Link>)}
    </div>
    <Card className="mt-6"><CardHeader title="Últimos lançamentos" description="Origem industrial e destino físico são informações separadas."/><RecordsTable rows={data.entries.slice(0,12)}/></Card>
  </>;
}

export function RealMasters() {
  const { role } = useProfile();
  const { data } = useRealData();
  const writeMachines = ['admin','supervisor'].includes(role);
  const writeMaterials = ['admin','supervisor','ambiental'].includes(role);
  const act = useSubmitAction();
  const [mc,setMc]=useState(''),[mn,setMn]=useState('');
  const [rc,setRc]=useState(''),[rn,setRn]=useState(''),[recyclable,setRecyclable]=useState(true);
  async function machine(e: FormEvent) {
    e.preventDefault();
    if(await act.run(() => act.create('machines',{code:mc.trim(),name:mn.trim()}),'Máquina cadastrada.')) {setMc('');setMn('');}
  }
  async function material(e: FormEvent) {
    e.preventDefault();
    if(await act.run(() => act.create('materials',{code:rc.trim(),name:rn.trim(),recyclable}),'Material cadastrado.')) {setRc('');setRn('');}
  }
  return <>
    <PageHeader eyebrow="Etapa 1" title="Cadastros industriais" description="Cadastre apenas máquinas e materiais reais. O sistema não contém exemplos nem cadastros fictícios."/>
    <Message error={act.error} success={act.success}/>
    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <Card><CardHeader title="Máquinas" description="Identifique cada equipamento pelo código utilizado na indústria."/>
        {writeMachines && <form className="space-y-3 p-5" onSubmit={e => void machine(e)}>
          <FormGrid><Field label="Código" htmlFor="mc-code"><Input id="mc-code" required maxLength={40} value={mc} onChange={e=>setMc(e.target.value)} placeholder="Código real"/></Field>
          <Field label="Nome da máquina" htmlFor="mc-name"><Input id="mc-name" required value={mn} onChange={e=>setMn(e.target.value)} placeholder="Descrição"/></Field></FormGrid>
          <Button type="submit" disabled={act.saving || mc.trim().length<2 || mn.trim().length<2}>Cadastrar máquina</Button>
        </form>}
        <div className="divide-y border-t">{data.machines.length===0?<Empty title="Nenhuma máquina cadastrada" help="Informe os equipamentos reais antes de lançar perdas."/>:data.machines.map(m=><div key={m.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm"><span><strong>{m.code}</strong> — {m.name}{!m.active&&<em className="ml-2 text-red-700">(inativa)</em>}</span>{writeMachines&&<button className="underline text-xs" onClick={()=>void act.run(()=>act.toggle('machines',m.id,!m.active))}>{m.active?'Desativar':'Ativar'}</button>}</div>)}</div>
      </Card>
      <Card><CardHeader title="Materiais" description="Tipo de material gerado e sua possibilidade de reciclagem."/>
        {writeMaterials && <form className="space-y-3 p-5" onSubmit={e=>void material(e)}>
          <FormGrid><Field label="Código" htmlFor="mt-code"><Input id="mt-code" required maxLength={40} value={rc} onChange={e=>setRc(e.target.value)} placeholder="Código real"/></Field>
          <Field label="Nome do material" htmlFor="mt-name"><Input id="mt-name" required value={rn} onChange={e=>setRn(e.target.value)} placeholder="Descrição"/></Field></FormGrid>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={recyclable} onChange={e=>setRecyclable(e.target.checked)}/> Material aceito para reciclagem</label>
          <Button type="submit" disabled={act.saving || rc.trim().length<2 || rn.trim().length<2}>Cadastrar material</Button>
        </form>}
        <div className="divide-y border-t">{data.materials.length===0?<Empty title="Nenhum material cadastrado" help="Cadastre os materiais de interesse do programa."/>:data.materials.map(m=><div key={m.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm"><span><strong>{m.code}</strong> — {m.name} <span className="text-neutral-500">({m.recyclable?'reciclável':'não reciclável'})</span>{!m.active&&<em className="ml-2 text-red-700">(inativo)</em>}</span>{writeMaterials&&<button className="underline text-xs" onClick={()=>void act.run(()=>act.toggle('materials',m.id,!m.active))}>{m.active?'Desativar':'Ativar'}</button>}</div>)}</div>
      </Card>
    </div>
  </>;
}

export function RealStandards() {
  const { role } = useProfile();const {data}=useRealData();const act=useSubmitAction();
  const [machine,setMachine]=useState(''),[material,setMaterial]=useState(''),[pct,setPct]=useState(''),[source,setSource]=useState(''),[start,setStart]=useState(today());
  const permitted=['admin','supervisor'].includes(role);
  async function submit(e: FormEvent) {e.preventDefault();
    if(await act.run(()=>act.create('standards',{machine_id:machine,material_id:material,expected_pct:Number(pct.replace(',','.')),source:source.trim(),valid_from:start}),'Referência aprovada cadastrada.')){setPct('');setSource('');}}
  return <>
    <PageHeader eyebrow="Parâmetros" title="Aparas previstas" description="Registre apenas percentuais de referência aprovados pela indústria ou compras, identificando a fonte e a vigência."/>
    <PageNotice>O percentual previsto já pode estar embutido na compra de matéria-prima. Ele não representa perda financeira adicional. Não será criada nenhuma meta automaticamente.</PageNotice>
    <Message error={act.error} success={act.success}/>
    {permitted && <Card className="my-5"><CardHeader title="Cadastrar parâmetro" description="Por máquina e material, com origem da informação comprovável."/>
      <form onSubmit={e=>void submit(e)} className="space-y-4 p-5">
        <FormGrid>
          <Field label="Máquina" htmlFor="std-machine"><Select id="std-machine" required value={machine} onChange={e=>setMachine(e.target.value)}><option value="">Selecione</option>{data.machines.filter(x=>x.active).map(x=><option value={x.id} key={x.id}>{x.code} — {x.name}</option>)}</Select></Field>
          <Field label="Material" htmlFor="std-mat"><Select id="std-mat" required value={material} onChange={e=>setMaterial(e.target.value)}><option value="">Selecione</option>{data.materials.filter(x=>x.active).map(x=><option key={x.id} value={x.id}>{x.code} — {x.name}</option>)}</Select></Field>
          <Field label="Percentual esperado (%)" htmlFor="std-pct"><Input id="std-pct" type="number" min={0} max={100} step=".0001" required value={pct} onChange={e=>setPct(e.target.value)} /></Field>
          <Field label="Vigência a partir de" htmlFor="std-date"><Input id="std-date" type="date" required value={start} onChange={e=>setStart(e.target.value)}/></Field>
          <Field label="Fonte / critério aprovado" htmlFor="std-source"><Input id="std-source" minLength={3} required value={source} onChange={e=>setSource(e.target.value)} placeholder="Documento, método ou aprovação"/></Field>
        </FormGrid>
        <Button disabled={act.saving || !data.machines.length || !data.materials.length} type="submit">Salvar referência</Button>
      </form>
    </Card>}
    <Card><CardHeader title="Referências registradas"/>{data.standards.length===0?<Empty title="Nenhuma referência informada" help="O sistema não presumirá percentuais de apara."/>:<div className="divide-y">{data.standards.map(s=><div key={s.id} className="p-4 text-sm"><strong><MachineName id={s.machine_id}/> · <MaterialName id={s.material_id}/></strong><p className="mt-1">Percentual esperado: <strong>{Number(s.expected_pct).toLocaleString('pt-BR')}%</strong> · Desde <DateLabel value={s.valid_from}/></p><p className="text-neutral-600">Fonte: {s.source}</p></div>)}</div>}</Card>
  </>;
}

export function RealEntries() {
  const {role}=useProfile();const {data}=useRealData();const act=useSubmitAction();
  const canWrite=['admin','supervisor','ambiental','operador'].includes(role);
  const [date,setDate]=useState(today()),[machine,setMachine]=useState(''),[material,setMaterial]=useState(''),[batch,setBatch]=useState('');
  const [klass,setKlass]=useState<'apara_normal'|'perda_anormal'>('apara_normal'),[destination,setDestination]=useState<'reciclagem'|'reuso'|'rejeito'>('reciclagem');
  const [kg,setKg]=useState(''),[reason,setReason]=useState('');
  const mat=data.materials.find(x=>x.id===material);
  async function submit(e: FormEvent){e.preventDefault();
    if(!machine||!material||Number(kg)<=0)return;
    if(destination==='reciclagem'&&!mat?.recyclable) return;
    const values={occurred_on:date,machine_id:machine,material_id:material,batch_ref:batch.trim(),origin_class:klass,destination,quantity_kg:Number(kg),reason:reason.trim()||null};
    if(await act.run(()=>act.create('entries',values),'Lançamento gravado no Supabase.')){setKg('');setReason('');setBatch('');}}
  return <>
    <PageHeader eyebrow="Etapa 2" title="Registrar aparas e perdas" description="Informe cada ocorrência industrial com máquina, material, origem, destinação prevista e peso efetivamente medido."/>
    <PageNotice>Origem e destinação são dimensões diferentes: uma perda anormal pode seguir para reciclagem, mas o peso físico é registrado uma única vez. Registre somente pesagens reais.</PageNotice>
    <Message error={act.error} success={act.success}/>
    {canWrite ? <Card className="my-5"><CardHeader title="Novo lançamento" description="Os campos essenciais são obrigatórios; nenhuma máquina ou material é pré-cadastrado."/>
      {!data.machines.some(x=>x.active)||!data.materials.some(x=>x.active)?<div className="p-5 text-sm">É necessário <Link to="/app/cadastros" className="font-semibold underline">cadastrar máquinas e materiais</Link> antes de lançar.</div>:
      <form onSubmit={e=>void submit(e)} className="space-y-4 p-5">
        <FormGrid>
          <Field label="Data" htmlFor="ev-date"><Input id="ev-date" type="date" required value={date} max={today()} onChange={e=>setDate(e.target.value)}/></Field>
          <Field label="Máquina de origem" htmlFor="ev-machine"><Select id="ev-machine" required value={machine} onChange={e=>setMachine(e.target.value)}><option value="">Selecione</option>{data.machines.filter(x=>x.active).map(m=><option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}</Select></Field>
          <Field label="Material gerado" htmlFor="ev-material"><Select id="ev-material" required value={material} onChange={e=>setMaterial(e.target.value)}><option value="">Selecione</option>{data.materials.filter(x=>x.active).map(m=><option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}</Select></Field>
          <Field label="Ordem / lote de produção" htmlFor="ev-batch"><Input id="ev-batch" required maxLength={100} value={batch} onChange={e=>setBatch(e.target.value)} placeholder="Referência real"/></Field>
          <Field label="Origem da geração" htmlFor="ev-class"><Select id="ev-class" value={klass} onChange={e=>setKlass(e.target.value as typeof klass)}><option value="apara_normal">Apara normal / prevista</option><option value="perda_anormal">Perda anormal / evitável</option></Select></Field>
          <Field label="Destinação do material" htmlFor="ev-dest"><Select id="ev-dest" value={destination} onChange={e=>setDestination(e.target.value as typeof destination)}><option value="reciclagem">Encaminhar ao estoque reciclável</option><option value="reuso">Reutilização interna</option><option value="rejeito">Rejeito</option></Select></Field>
          <Field label="Peso líquido (kg)" htmlFor="ev-kg"><Input id="ev-kg" type="number" min=".001" step=".001" required value={kg} onChange={e=>setKg(e.target.value)}/></Field>
          <Field label={klass==='perda_anormal'?'Motivo da perda (obrigatório)':'Motivo / observação'} htmlFor="ev-reason">
            <Textarea id="ev-reason" required={klass==='perda_anormal'} value={reason} onChange={e=>setReason(e.target.value)}/></Field>
        </FormGrid>
        {destination==='reciclagem'&&mat&&!mat.recyclable&&<p role="alert" className="text-sm text-red-700">Este material foi cadastrado como não reciclável. Selecione outra destinação ou corrija o cadastro.</p>}
        <Button type="submit" disabled={act.saving||!machine||!material||!batch.trim()||!(Number(kg)>0)||(destination==='reciclagem'&&!mat?.recyclable)||(klass==='perda_anormal'&&reason.trim().length<3)}>Gravar lançamento real</Button>
      </form>}</Card>:<NotAllowed/>}
    <Card className="mt-5"><CardHeader title="Histórico de ocorrências" description="Lançamentos gravados no Supabase, sem dados de teste."/><RecordsTable rows={data.entries}/></Card>
  </>;
}

export function RealStock() {
  const {data}=useRealData();const balance=stockByMaterial(data);
  return <>
    <PageHeader eyebrow="Estoque" title="Saldo reciclável" description="Entradas destinadas à reciclagem menos coletas registradas. Reuso e rejeito não entram nesse saldo."/>
    {data.entries.length===0&&<PageNotice>Nenhum material entrou no estoque. Registre primeiro uma apara ou perda com destino à reciclagem.</PageNotice>}
    <Card><CardHeader title="Materiais em estoque" description="Pesos em quilogramas. O saldo é calculado a partir dos registros reais."/>
      {!data.materials.length?<Empty title="Nenhum material cadastrado" help="Cadastre os materiais para iniciar o controle."/>:<div className="divide-y">{data.materials.filter(m=>m.recyclable).map(m=><div key={m.id} className="flex items-center justify-between gap-4 p-5"><div><strong>{m.code} — {m.name}</strong><p className="text-xs text-neutral-500">Entradas e retiradas por material</p></div><strong>{data.entries.length?fmtKg(balance[m.id]||0):'—'}</strong></div>)}</div>}
    </Card>
    <p className="mt-3 text-xs text-neutral-600">Coletas registradas nesta fase representam retirada informada pela Papelito; a conferência documental da Capital Recicláveis será implementada separadamente.</p>
  </>;
}

export function RealPickups() {
  const {role}=useProfile();const {data}=useRealData();const act=useSubmitAction();
  const canWrite=['admin','ambiental'].includes(role);
  const [date,setDate]=useState(today()),[material,setMaterial]=useState(''),[partner,setPartner]=useState(''),[kg,setKg]=useState(''),[ref,setRef]=useState(''),[notes,setNotes]=useState('');
  const balances=stockByMaterial(data), available=balances[material]||0;
  async function submit(e: FormEvent) {e.preventDefault();
    if(!(Number(kg)>0)||Number(kg)>available)return;
    if(await act.run(()=>act.create('pickups',{occurred_on:date,material_id:material,quantity_kg:Number(kg),partner:partner.trim(),document_ref:ref.trim()||null,notes:notes.trim()||null}),'Retirada registrada com baixa no saldo reciclável.')){setKg('');setRef('');setNotes('');}}
  return <>
    <PageHeader eyebrow="Logística reversa" title="Coletas registradas" description="Controle interno da retirada de material, sem presumir confirmação de pesagem ou destinação pelo parceiro."/>
    <Message error={act.error} success={act.success}/>
    {canWrite&&<Card className="my-5"><CardHeader title="Registrar retirada" description="O peso informado não pode superar o saldo reciclável disponível; essa regra também é validada no banco."/>
      {!data.materials.some(m=>m.recyclable)?<div className="p-5 text-sm">Cadastre materiais recicláveis e gere entradas antes da primeira coleta.</div>:<form className="space-y-4 p-5" onSubmit={e=>void submit(e)}>
        <FormGrid>
          <Field label="Data da retirada" htmlFor="pu-date"><Input id="pu-date" type="date" max={today()} value={date} onChange={e=>setDate(e.target.value)} required/></Field>
          <Field label="Material" htmlFor="pu-material"><Select id="pu-material" required value={material} onChange={e=>setMaterial(e.target.value)}><option value="">Selecione</option>{data.materials.filter(m=>m.recyclable&&m.active).map(m=><option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}</Select></Field>
          <Field label="Parceiro coletor" htmlFor="pu-partner"><Input id="pu-partner" required value={partner} onChange={e=>setPartner(e.target.value)} placeholder="Empresa responsável"/></Field>
          <Field label="Peso retirado (kg)" htmlFor="pu-kg" hint={'Saldo disponível: '+fmtKg(available)}><Input id="pu-kg" type="number" min=".001" step=".001" required value={kg} onChange={e=>setKg(e.target.value)}/></Field>
          <Field label="Comprovante / referência (opcional)" htmlFor="pu-ref"><Input id="pu-ref" value={ref} onChange={e=>setRef(e.target.value)} /></Field>
          <Field label="Observações" htmlFor="pu-notes"><Textarea id="pu-notes" value={notes} onChange={e=>setNotes(e.target.value)} /></Field>
        </FormGrid>
        {Number(kg)>available&&<p role="alert" className="text-sm text-red-700">A retirada não pode superar o saldo disponível.</p>}
        <Button type="submit" disabled={act.saving||!material||partner.trim().length<2||!(Number(kg)>0)||Number(kg)>available}>Gravar retirada real</Button>
      </form>}</Card>}
    {!canWrite && <PageNotice>Seu perfil tem acesso de consulta às coletas. Confirmação externa e documentos estarão disponíveis em etapa posterior.</PageNotice>}
    <Card className="mt-5"><CardHeader title="Histórico de retiradas"/>
    {data.pickups.length===0?<Empty title="Nenhuma retirada registrada" help="Não há coletas demonstrativas ou pesos fictícios."/>:<div className="divide-y">{data.pickups.map(p=><div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm">
      <div><strong><MaterialName id={p.material_id}/></strong> · {p.partner}<p className="mt-1 text-neutral-600"><DateLabel value={p.occurred_on}/> · {p.document_ref||'Sem comprovante vinculado'}</p></div><strong>{fmtKg(Number(p.quantity_kg))}</strong>
    </div>)}</div>}</Card>
  </>;
}

export function RealRestricted({ roles, children }: { roles: string[]; children: ReactNode }) {
  const {role}=useProfile();
  if(!roles.includes(role))return <div className="rounded-xl bg-white p-8"><h1 className="text-xl font-bold">Área restrita</h1><p className="mt-2 text-sm">Seu perfil não pode acessar este módulo.</p></div>;
  return <>{children}</>;
}
export function RealUnderConstruction() {
  return <><PageHeader title="Relatórios financeiros" description="Aguardando a definição e o cadastro dos critérios reais de custo de perdas anormais."/>
    <PageNotice>O custo das aparas normais já pode estar embutido na matéria-prima. Não apresentaremos estimativas financeiras sem validação industrial e financeira.</PageNotice></>;
}
