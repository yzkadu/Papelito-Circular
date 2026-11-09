import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Outlet } from 'react-router-dom';
import { ArrowRight, Boxes, Check, ClipboardList, Database, Factory, FileSpreadsheet, Gauge, GraduationCap, Leaf, LogOut, PackageCheck, RefreshCw, Settings2, ShieldCheck, Truck, TrendingDown, type LucideIcon } from 'lucide-react';
import { useProfile } from '../auth/ProfileContext';
import { roleLabel } from '../auth/roles';
import { PapelitoWordmark } from '../components/brand/PapelitoLogo';
import ManagedMasters from './ManagedMasters';
import './real.css';
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
  { to: '/app/extensao', label: 'Extensão universitária', icon: GraduationCap, roles: ['admin'] },
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
  return <div className="pc-app pc-layout">
    <aside className="pc-sidebar">
      <Link to="/" className="pc-brand" aria-label="Papelito Circular — início">
        <PapelitoWordmark className="pc-wordmark"/>
        <div className="pc-brand-bottom"><span className="pc-brand-circular">CIRCULAR</span><small>GESTÃO INDUSTRIAL<br/>E SUSTENTABILIDADE</small></div>
      </Link>
      <p className="pc-sidebar-label">MÓDULOS DE OPERAÇÃO</p>
      <nav aria-label="Menu de operação" className="pc-navigation">
        {links.map(n => <NavLink key={n.to} to={n.to} end={n.to==='/app'}
          className={({ isActive }) => 'pc-navlink'+(isActive ? ' is-active':'')}>
          <n.icon aria-hidden="true" />{n.label}
        </NavLink>)}
      </nav>
      <div className="pc-sidebar-spacer"/>
      <div className="pc-profile"><span className="pc-avatar"><ShieldCheck size={18}/></span>
        <div><strong>{roleLabel(role)}</strong><small>Conta autenticada</small></div>
      </div>
      <button className="pc-signout" onClick={() => void signOut()}><LogOut size={16}/>Encerrar sessão</button>
    </aside>
    <div className="pc-main">
      <header className="pc-topbar">
        <div className="pc-topbar-left">
          <span className="pc-topbar-mark"><Leaf size={16}/></span>
          <strong>PAINEL OPERACIONAL</strong><span> / </span><span>Papelito Circular</span>
        </div>
        <div className="pc-topbar-right">
          <span className="pc-live-pill"><span className="pc-live-dot"/>Supabase conectado</span>
          <button className="pc-refresh" onClick={() => void refresh()}><RefreshCw size={15}/> Atualizar</button>
        </div>
      </header>
      <main className="pc-page">
        {loading ? <LoadingState label="Consultando informações reais..." /> : error ?
          <ErrorState message={error} onRetry={() => void refresh()}/> : <Outlet/>}
      </main>
    </div>
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
    {label:'Aparas normais',value:hasEntries ? fmtKg(totalKg(normal)) : '—',note:'Geradas no processo',icon:PackageCheck},
    {label:'Perdas anormais',value:hasEntries ? fmtKg(totalKg(abnormal)) : '—',note:'Ocorrências a investigar',icon:TrendingDown},
    {label:'Estoque reciclável',value:hasEntries ? fmtKg(stock) : '—',note:'Saldo calculado',icon:Boxes},
    {label:'Coletas registradas',value:data.pickups.length ? fmtKg(totalKg(data.pickups)) : '—',note:'Retiradas informadas',icon:Truck},
  ];
  const steps = [
    {label:'Máquinas reais',status:data.machines.length>0,detail:data.machines.length+' cadastrada(s)',to:'/app/cadastros'},
    {label:'Materiais reais',status:data.materials.length>0,detail:data.materials.length+' cadastrado(s)',to:'/app/cadastros'},
    {label:'Referências de apara',status:data.standards.length>0,detail:data.standards.length+' referência(s)',to:'/app/referencias'},
    {label:'Primeiro lançamento',status:data.entries.length>0,detail:data.entries.length+' ocorrência(s)',to:'/app/residuos'},
  ];
  const finished = steps.filter(s=>s.status).length;
  return <div className="pc-home">
    <section className="pc-hero">
      <div>
        <div className="pc-hero-topline">GESTÃO INDUSTRIAL · PAPELITO BRASIL</div>
        <h1>Produzir melhor.<br/>Aproveitar mais.</h1>
        <p>Registre as aparas normais e as perdas evitáveis por máquina, acompanhe materiais recicláveis e construa uma base confiável para decisões industriais.</p>
      </div>
    </section>
    <div className="pc-kpi-grid">
      {stats.map(s=><article className="pc-kpi" key={s.label}>
        <div className="icon"><s.icon size={18}/></div>
        <label>{s.label}</label><strong>{s.value}</strong><small>{s.note}</small>
      </article>)}
    </div>
    <div className="pc-home-columns">
      <section className="pc-home-panel">
        <span className="pc-eyebrow">PRIMEIROS PASSOS · {finished} DE {steps.length} ETAPAS COM REGISTROS</span>
        <h2>Prepare sua operação</h2>
        <p>O ambiente começa sem dados artificiais. Cadastre apenas informações confirmadas pela indústria e acompanhe cada etapa.</p>
        {steps.map((s,i)=><div className={'pc-check-step'+(s.status?' is-done':'')} key={s.label}>
          <span>{s.status?<Check size={17}/>:String(i+1).padStart(2,'0')}</span>
          <div><strong>{s.label}</strong><small>{s.status?s.detail:'Aguardando registro real'}</small></div>
          <Link to={s.to}>{s.status?'Ver':'Cadastrar'}</Link>
        </div>)}
      </section>
      <section className="pc-home-panel">
        <span className="pc-eyebrow">METODOLOGIA · APARAS & PERDAS</span>
        <h2>O que estamos medindo</h2>
        <p>O sistema registra cada peso físico uma vez, distinguindo a causa de geração e a destinação do material.</p>
        <div className="pc-check-step"><span><PackageCheck size={17}/></span>
          <div><strong>Apara prevista</strong><small>Parte normal do processo, já considerada no planejamento de insumos quando aplicável</small></div>
        </div>
        <div className="pc-check-step"><span><TrendingDown size={17}/></span>
          <div><strong>Perda evitável</strong><small>Ocorrência anormal que exige análise de causa e ação corretiva</small></div>
        </div>
        <div className="pc-check-step"><span><Leaf size={17}/></span>
          <div><strong>Destinação reciclável</strong><small>Uma perda anormal também pode ir à reciclagem sem ser contabilizada duas vezes</small></div>
        </div>
      </section>
    </div>
    {!hasEntries && <div className="pc-next-banner">
      <ClipboardList size={24}/><div><strong>Ainda não existem lançamentos industriais.</strong><p>Quando os cadastros estiverem prontos, registre a primeira pesagem.</p></div>
      <Link to="/app/residuos">Novo lançamento</Link></div>}
    <div className="pc-home-headline"><h2>Histórico de ocorrências</h2><Link to="/app/residuos">Ver registros <ArrowRight size={15} className="inline"/></Link></div>
    <Card><RecordsTable rows={data.entries.slice(0,12)}/></Card>
  </div>;
}

export function RealMasters() { return <ManagedMasters />; }

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
