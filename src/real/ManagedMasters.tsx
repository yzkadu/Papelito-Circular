import { useMemo, useState, type FormEvent } from 'react';
import { Archive, ArrowRight, CheckCircle2, ClipboardList, Factory, FilePenLine, Layers3, Plus, Search, ShieldCheck, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProfile } from '../auth/ProfileContext';
import { Button, EmptyState, Input, PageHeader } from '../components/ui';
import { useRealData, type Machine, type Material } from './data';

type Kind = 'machines' | 'materials';
type Item = Machine | Material;
const norm = (v: string) => v.trim().toLocaleUpperCase('pt-BR');
const clean = (v: string) => v.trim();

export default function ManagedMasters() {
  const { role } = useProfile();
  const { data, create, toggle, updateMaster } = useRealData();
  const [kind, setKind] = useState<Kind>('machines');
  const [query, setQuery] = useState('');
  const [onlyActive, setOnlyActive] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [recyclable, setRecyclable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const all = data[kind];
  const isMachine = kind === 'machines';
  const title = isMachine ? 'Máquinas' : 'Materiais';
  const mayWrite = isMachine ? ['admin','supervisor'].includes(role) : ['admin','supervisor','ambiental'].includes(role);
  const filtered = useMemo(() => all.filter(item => {
    const haystack = (item.code + ' ' + item.name).toLocaleLowerCase('pt-BR');
    return (!onlyActive || item.active) && (!query || haystack.includes(query.toLocaleLowerCase('pt-BR').trim()));
  }).sort((a,b) => a.code.localeCompare(b.code, 'pt-BR', { numeric: true })), [all, onlyActive, query]);
  const countActive = all.filter(m => m.active).length;
  const current = editId ? all.find(m => m.id === editId) : undefined;
  const duplicate = all.some(m => norm(m.code) === norm(code) && m.id !== editId);
  const formOpen = createOpen || !!editId;
  const formValid = code.trim().length >= 2 && code.trim().length <= 40 && name.trim().length >= 2 && !duplicate;
  const usedByHistory = (id: string) => isMachine
    ? data.entries.some(e => e.machine_id === id) || data.standards.some(s => s.machine_id === id)
    : data.entries.some(e => e.material_id === id) || data.pickups.some(p => p.material_id === id) || data.standards.some(s => s.material_id === id);

  function clear() { setCode(''); setName(''); setRecyclable(true); setEditId(null); setCreateOpen(false); setError(''); }
  function switchKind(next: Kind) {
    clear(); setSuccess(''); setQuery(''); setKind(next); setOnlyActive(true);
  }
  function openCreate() { clear(); setSuccess(''); setCreateOpen(true); }
  function openEdit(item: Item) {
    setSuccess(''); setError(''); setEditId(item.id); setCreateOpen(false);
    setCode(item.code); setName(item.name);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!mayWrite || !formValid) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      if (editId) {
        await updateMaster(kind, editId, { code: norm(code), name: clean(name) });
        setSuccess('Cadastro atualizado e alteração registrada no histórico.');
      } else {
        if (isMachine) await create('machines', { code: norm(code), name: clean(name), active: true });
        else await create('materials', { code: norm(code), name: clean(name), recyclable, active: true });
        setSuccess('Cadastro criado e salvo no Supabase.');
      }
      clear();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar este cadastro.');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(item: Item) {
    if (!mayWrite || saving) return;
    if (item.active && usedByHistory(item.id) &&
      !window.confirm('Este cadastro já possui histórico de lançamentos ou referências. Ele continuará nos relatórios, mas não poderá ser usado em novos lançamentos. Deseja desativar?')) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await toggle(kind, item.id, !item.active);
      setSuccess(item.active ? 'Cadastro desativado; histórico preservado.' : 'Cadastro reativado.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível alterar o status.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pc-masters">
      <PageHeader eyebrow="Base cadastral" title="Cadastros industriais" description="Organize os códigos e nomes usados na operação. Os registros são reais, compartilhados e rastreáveis." />
      <div className="pc-master-steps">
        <div><span className="pc-step-number">01</span><div><strong>Organize a base</strong><small>Máquinas e materiais com códigos reais</small></div></div>
        <ArrowRight size={18} aria-hidden="true"/>
        <div><span className="pc-step-number">02</span><div><strong>Defina referências</strong><small>Aparas previstas e critérios aprovados</small></div></div>
        <ArrowRight size={18} aria-hidden="true"/>
        <div><span className="pc-step-number">03</span><div><strong>Registre ocorrências</strong><small>Pesagens vinculadas aos cadastros</small></div></div>
      </div>

      <div className="pc-master-tabbar" role="tablist" aria-label="Tipo de cadastro">
        <button role="tab" aria-selected={isMachine} className={isMachine ? 'pc-master-tab is-active' : 'pc-master-tab'} onClick={() => switchKind('machines')}>
          <Factory size={18}/> Máquinas <span>{data.machines.length}</span>
        </button>
        <button role="tab" aria-selected={!isMachine} className={!isMachine ? 'pc-master-tab is-active' : 'pc-master-tab'} onClick={() => switchKind('materials')}>
          <Layers3 size={18}/> Materiais <span>{data.materials.length}</span>
        </button>
      </div>

      <section className="pc-master-panel" aria-label={'Gerenciar '+title.toLowerCase()}>
        <div className="pc-master-toolbar">
          <div><span className="pc-eyebrow">CADASTRO DE {title.toLocaleUpperCase('pt-BR')}</span>
            <h2>{title} <span className="pc-count">{countActive} ativo{countActive !== 1 ? 's' : ''}</span></h2>
            <p>{isMachine ? 'Identifique os equipamentos que geram aparas ou perdas no processo.' : 'Cadastre os materiais efetivamente encontrados e seu potencial de reciclagem.'}</p>
          </div>
          {mayWrite && <Button onClick={openCreate}><Plus size={17} className="mr-2"/> Novo cadastro</Button>}
        </div>

        {(error || success) && <div className="px-5 pb-3">{error && <p role="alert" className="pc-inline-alert is-error">{error}</p>}{success && <p role="status" className="pc-inline-alert is-success"><CheckCircle2 size={16}/>{success}</p>}</div>}

        {formOpen && <form onSubmit={e => void submit(e)} className="pc-master-form" aria-label={editId ? 'Editar cadastro' : 'Novo cadastro'}>
          <div className="pc-form-head">
            <div><span className="pc-eyebrow">{editId ? 'ATUALIZAÇÃO' : 'NOVO REGISTRO'}</span>
              <h3>{editId ? 'Editar '+(current?.name ?? title.toLowerCase()) : 'Adicionar '+(isMachine ? 'máquina' : 'material')}</h3></div>
            <button type="button" onClick={clear} className="pc-icon-button" aria-label="Fechar formulário"><X size={18}/></button>
          </div>
          <div className="pc-form-grid">
            <label>Código interno / ERP <span aria-hidden="true">*</span>
              <Input value={code} onChange={e=>setCode(e.target.value)} required minLength={2} maxLength={40}
                placeholder="Código utilizado na empresa" aria-invalid={duplicate}/>
              <small>Identificador único. Será salvo em letras maiúsculas.</small>
              {duplicate && <small role="alert" className="text-red-700">Já existe um cadastro com esse código.</small>}
            </label>
            <label>Descrição <span aria-hidden="true">*</span>
              <Input value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={180} placeholder={isMachine ? 'Nome utilizado na fábrica' : 'Identificação do material'} />
              <small>Use o nome reconhecido pelos operadores e responsáveis.</small>
            </label>
            {!isMachine && !editId && <label className="pc-check-field">
              <input type="checkbox" checked={recyclable} onChange={e=>setRecyclable(e.target.checked)}/>
              <span><strong>Material reciclável</strong><small>Permite entrada no estoque de reciclagem e registro de coleta.</small></span>
            </label>}
          </div>
          {editId && <p className="pc-form-note">Alterações no código ou nome são auditadas. O histórico de pesagens permanece vinculado ao mesmo registro.</p>}
          <div className="pc-form-footer"><button type="button" onClick={clear} className="pc-text-button">Cancelar</button>
            <Button type="submit" disabled={saving || !formValid}>{saving ? 'Salvando...' : editId ? 'Salvar alterações' : 'Cadastrar '+(isMachine ? 'máquina' : 'material')}</Button>
          </div>
        </form>}

        <div className="pc-master-filters">
          <label className="pc-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={'Buscar '+title.toLowerCase()+' por código ou nome'} aria-label={'Buscar '+title.toLowerCase()}/></label>
          <label className="pc-toggle"><input type="checkbox" checked={onlyActive} onChange={e=>setOnlyActive(e.target.checked)}/> Somente ativos</label>
        </div>

        {!mayWrite && <div className="pc-view-only"><ShieldCheck size={17}/> Seu perfil possui acesso de consulta a estes cadastros.</div>}
        {filtered.length === 0 ? <EmptyState title={all.length ? 'Nenhum resultado para os filtros' : 'Nenhum cadastro registrado'} description={all.length ? 'Altere a pesquisa ou exiba os registros inativos.' : 'O primeiro cadastro poderá ser criado por um perfil autorizado.'} /> :
          <div className="pc-master-list">
            <div className="pc-master-list-head"><span>Código / identificação</span><span>Condição</span><span>Ações</span></div>
            {filtered.map(item => <div className="pc-master-item" key={item.id}>
              <div className="pc-master-identity"><span className="pc-master-code">{item.code}</span><div>
                <strong>{item.name}</strong>
                <small>{isMachine ? 'Máquina industrial' : (item as Material).recyclable ? 'Material reciclável' : 'Material sem reciclagem cadastrada'}</small>
              </div></div>
              <div><span className={'pc-status '+(item.active?'is-active':'is-inactive')}>{item.active?'Ativo':'Inativo'}</span></div>
              <div className="pc-master-actions">
                {mayWrite ? <>
                  <button type="button" onClick={()=>openEdit(item)} disabled={saving} title="Editar código e descrição"><FilePenLine size={16}/>Editar</button>
                  <button type="button" onClick={()=>void changeStatus(item)} disabled={saving} title={item.active?'Desativar registro':'Reativar registro'}>
                    {item.active?<Archive size={16}/>:<CheckCircle2 size={16}/>} {item.active?'Desativar':'Reativar'}
                  </button>
                </>:<span className="text-xs text-neutral-500">Somente leitura</span>}
              </div>
            </div>)}
          </div>}
        <div className="pc-master-footnote"><ShieldCheck size={16}/> Cadastros inativos permanecem nos registros históricos. Alterações são gravadas em trilha de auditoria no banco.</div>
      </section>
      <div className="pc-next-actions">
        <ClipboardList size={20}/>
        <div><strong>Cadastros concluídos?</strong><p>Agora é possível definir os percentuais de apara previstos ou registrar pesagens reais.</p></div>
        <div><Link to="/app/referencias">Aparas previstas <ArrowRight size={14}/></Link><Link to="/app/residuos">Lançar ocorrência <ArrowRight size={14}/></Link></div>
      </div>
    </div>
  );
}
