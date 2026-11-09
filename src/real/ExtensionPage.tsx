import { useState, type FormEvent } from 'react';
import { CheckCircle2, ClipboardCheck, FileCheck2, FileLock2, FolderOpen, GraduationCap, Paperclip, ShieldCheck, Users } from 'lucide-react';
import { PageHeader, Button, Card, CardHeader, Field, FormGrid, Input, Select, Textarea, EmptyState } from '../components/ui';
import { removePrivateEvidence, signEvidence, today, uploadPrivateEvidence, useRealData } from './data';

const stages=[
  {key:'necessidade',label:'Necessidade identificada',help:'Problema real relatado pela Papelito ou Capital, com data e interlocução'},
  {key:'diagnostico',label:'Diagnóstico inicial',help:'Situação anterior da pesagem, rastreamento ou coleta'},
  {key:'aceite',label:'Aceite e parceria',help:'Documento de aceite ou confirmação real da instituição parceira'},
  {key:'planejamento',label:'Plano de intervenção',help:'Objetivos, atividades e responsabilidades acordadas'},
  {key:'execucao',label:'Execução da atividade',help:'Demonstração, capacitação, implantação ou entrega realizada'},
  {key:'frequencia',label:'Participação e frequência',help:'Registro real da participação, com consentimento quando necessário'},
  {key:'devolutiva',label:'Resultados e devolutiva',help:'Avaliação da Capital/Papelito sobre o benefício, problemas e melhorias'},
  {key:'relatorio',label:'Relatório final',help:'Documento acadêmico efetivamente elaborado'},
  {key:'depoimento',label:'Depoimento pessoal',help:'Reflexão autoral sobre a execução e a experiência'}
];
export default function ExtensionPage(){
  const {data,create}=useRealData();
  const [category,setCategory]=useState('necessidade'),[title,setTitle]=useState(''),[description,setDescription]=useState(''),[date,setDate]=useState(today()),[documentRef,setDocumentRef]=useState('');
  const [file,setFile]=useState<File|null>(null),[saving,setSaving]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [signed,setSigned]=useState<{id:string,url:string}|null>(null);
  const found=new Set(data.evidence.map(e=>e.category));
  async function save(e:FormEvent) {
    e.preventDefault();
    if(!title.trim()||description.trim().length<8)return;
    setSaving(true);setError('');setMessage('');
    let path:string|null=null;
    try{
      if(file)path=await uploadPrivateEvidence(file);
      await create('evidence',{category,title:title.trim(),description:description.trim(),occurred_on:date,document_reference:documentRef.trim()||null,storage_path:path});
      setMessage('Registro acadêmico salvo. A validação da faculdade depende das evidências e da entrega oficial.');
      setTitle('');setDescription('');setDocumentRef('');setFile(null);
      const input=document.getElementById('evidence-file') as HTMLInputElement|null;
      if(input)input.value='';
    }catch(ex){
      if(path)await removePrivateEvidence(path);
      setError(ex instanceof Error?ex.message:'Não foi possível armazenar a evidência.');
    }finally{setSaving(false);}
  }
  async function openFile(id:string,path:string) {
    setError('');setSigned(null);
    try{setSigned({id,url:await signEvidence(path)});}
    catch(e){setError(e instanceof Error?e.message:'Falha ao gerar acesso temporário.');}
  }
  return <section>
    <PageHeader eyebrow="Projeto acadêmico" title="Extensão & evidências" description="Organização real da ação Papelito–Capital, preservando a necessidade identificada, a participação e os comprovantes necessários para a entrega acadêmica."/>
    <div className="pc-extension-intro">
      <span className="pc-eyebrow" style={{color:'#fcd930'}}>PROJETO PAPELITO CIRCULAR · PARCERIA OPERACIONAL</span>
      <h2 className="mt-3">Da necessidade à melhoria comprovada.</h2>
      <p>Instituição de realização: Papelito Brasil. Beneficiária operacional: Capital Recicláveis. O formato foi informado como aceito pela faculdade. Registre aqui apenas o que foi efetivamente diagnosticado, realizado e documentado — a publicação do aplicativo não substitui a ação nem os documentos oficiais.</p>
    </div>
    <div className="mb-6 grid gap-3 sm:grid-cols-3">
      <Card><div className="p-5"><ClipboardCheck size={19}/><p className="mt-3 text-sm">Categorias com registros</p><strong className="text-3xl font-black">{found.size} / {stages.length}</strong></div></Card>
      <Card><div className="p-5"><FileCheck2 size={19}/><p className="mt-3 text-sm">Registros documentados</p><strong className="text-3xl font-black">{data.evidence.length}</strong></div></Card>
      <Card><div className="p-5"><FileLock2 size={19}/><p className="mt-3 text-sm">Arquivos anexados</p><strong className="text-3xl font-black">{data.evidence.filter(x=>x.storage_path).length}</strong><p className="text-xs text-neutral-500">Armazenamento privado</p></div></Card>
    </div>
    <div className="pc-home-columns">
      <div className="pc-home-panel"><span className="pc-eyebrow">NECESSIDADE</span><h2>Problema real da parceria</h2>
        <p>Documente com a Papelito e a Capital o que precisa melhorar no fluxo de coleta: separação, identificação, pesagem, informação antecipada ou conferência das quantidades. Não presuma que esses problemas existam sem escuta real.</p>
        <div className="pc-check-step"><span><Users size={18}/></span><div><strong>Conversa com os envolvidos</strong><small>Data, participantes, necessidade e autorização de uso das informações</small></div></div>
      </div>
      <div className="pc-home-panel"><span className="pc-eyebrow">RESULTADO</span><h2>Benefício demonstrável</h2>
        <p>Ao longo do piloto, anote as mudanças implementadas, a forma de participação da Capital, exemplos reais de uso e o retorno dos responsáveis. Não afirme redução de custos ou perdas sem medições.</p>
        <div className="pc-check-step"><span><GraduationCap size={18}/></span><div><strong>Comprovação para a faculdade</strong><small>Projeto, carta de aceite, ação, frequência, devolutiva, relatório e depoimento</small></div></div>
      </div>
    </div>
    <Card className="mb-6"><CardHeader title="Checklist baseado nos registros reais" description="Registro existente não significa documento validado ou nota atribuída pela faculdade."/>
      <div className="grid gap-2 p-5 sm:grid-cols-2">
        {stages.map(s=><div className="flex items-start gap-3 border-b p-3" key={s.key}>
          <span className={'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded '+(found.has(s.key)?'bg-emerald-100 text-emerald-800':'bg-neutral-100 text-neutral-600')}>{found.has(s.key)?<CheckCircle2 size={18}/>:<ClipboardCheck size={18}/>}</span>
          <div><strong className="text-sm">{s.label}</strong><p className="mt-1 text-xs text-neutral-600">{s.help}</p></div>
        </div>)}
      </div>
    </Card>
    <Card className="mb-6"><CardHeader title="Adicionar registro ou evidência" description="Pode anexar um PDF, JPG ou PNG (até 10 MB). O arquivo fica privado e acessível somente pela administração."/>
      {error&&<p role="alert" className="mx-5 mt-4 rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message&&<p role="status" className="mx-5 mt-4 rounded bg-green-50 p-3 text-sm text-green-900">{message}</p>}
      <form onSubmit={e=>void save(e)} className="space-y-4 p-5">
        <FormGrid>
          <Field htmlFor="ev-cat" label="Etapa / tipo de evidência"><Select id="ev-cat" value={category} onChange={e=>setCategory(e.target.value)}>{stages.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}</Select></Field>
          <Field htmlFor="ev-day" label="Data efetiva"><Input id="ev-day" required type="date" max={today()} value={date} onChange={e=>setDate(e.target.value)}/></Field>
          <Field htmlFor="ev-title" label="Título do registro"><Input id="ev-title" required minLength={4} maxLength={150} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex.: alinhamento com o responsável"/></Field>
          <Field htmlFor="ev-ref" label="Referência documental (opcional)"><Input id="ev-ref" maxLength={250} value={documentRef} onChange={e=>setDocumentRef(e.target.value)} placeholder="Protocolo, número ou documento"/></Field>
          <Field htmlFor="ev-desc" label="O que ocorreu e qual necessidade foi atendida"><Textarea id="ev-desc" required minLength={8} maxLength={2500} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Descreva somente os fatos realizados, sem dados inventados."/></Field>
          <Field htmlFor="evidence-file" label="Comprovante (opcional)"><Input id="evidence-file" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={e=>setFile(e.target.files?.[0]||null)}/><p className="mt-1 text-xs text-neutral-600"><Paperclip size={13} className="inline"/> Arquivos privados. Não anexe dados pessoais sem autorização.</p></Field>
        </FormGrid>
        <Button loading={saving} disabled={title.trim().length<4||description.trim().length<8}>Salvar evidência real</Button>
      </form>
    </Card>
    <Card><CardHeader title="Histórico documental" description="Todos os registros são associados à conta administrativa e à data de lançamento."/>
      {data.evidence.length===0?<EmptyState title="Nenhuma evidência cadastrada" description="Use o formulário acima conforme as atividades forem efetivamente realizadas."/>:<div className="divide-y">
        {data.evidence.map(e=><article key={e.id} className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><strong>{e.title}</strong><span className="rounded bg-brand-100 px-3 py-1 text-xs font-bold">{stages.find(s=>s.key===e.category)?.label||e.category}</span></div>
          <p className="mt-1 text-xs text-neutral-600">{e.occurred_on} · {e.document_reference||'Sem referência adicional'}</p>
          <p className="mt-2 whitespace-pre-line text-sm">{e.description}</p>
          {e.storage_path&&<div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <button onClick={()=>void openFile(e.id,e.storage_path!)} className="inline-flex items-center gap-2 font-semibold underline"><FolderOpen size={16}/> Gerar link privado (60 segundos)</button>
            {signed?.id===e.id&&<a href={signed.url} target="_blank" rel="noopener noreferrer" className="rounded bg-ink px-3 py-2 font-semibold text-white">Abrir documento</a>}
          </div>}
        </article>)}
      </div>}
    </Card>
    <p className="mt-5 flex gap-2 text-xs text-neutral-600"><ShieldCheck size={16}/> Esta área é administrativa e não publica documentos automaticamente. A entrega oficial continua sendo realizada no AVA conforme os modelos da faculdade.</p>
  </section>;
}
