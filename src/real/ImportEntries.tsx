import { useState, type ChangeEvent } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, ShieldCheck, UploadCloud } from 'lucide-react';
import { useProfile } from '../auth/ProfileContext';
import { Button, EmptyState, PageHeader } from '../components/ui';
import { CSV_HEADER, validateCsv, type CheckedRow } from './csv';
import { useRealData } from './data';

function downloadTemplate() {
  const blob = new Blob(['\uFEFF' + CSV_HEADER], { type:'text/csv;charset=utf-8' });
  const uri = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = uri; a.download = 'papelito-modelo-lancamentos.csv'; a.click();
  URL.revokeObjectURL(uri);
}
export default function ImportEntries() {
  const {role} = useProfile();
  const {data,importEntries} = useRealData();
  const permitted=['admin','supervisor','ambiental'].includes(role);
  const [filename,setFilename]=useState('');
  const [rows,setRows]=useState<CheckedRow[]>([]);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const invalid=rows.filter(row=>row.errors.length>0).length;
  async function selectFile(e:ChangeEvent<HTMLInputElement>) {
    const file=e.target.files?.[0];
    e.target.value='';
    setRows([]);setError('');setMessage('');setFilename(file?.name||'');
    if(!file)return;
    if(!/\.csv$/i.test(file.name)||file.size>2_000_000) {
      setError('Escolha um arquivo CSV de até 2 MB. Exporte a planilha do Excel para CSV UTF-8.');return;
    }
    try { setRows(validateCsv(await file.text(),data));}
    catch(err) {setError(err instanceof Error?err.message:'Não foi possível conferir o arquivo.');}
  }
  async function commit() {
    if(!permitted||!rows.length||invalid)return;
    const payload=rows.map(x=>x.record);
    if(payload.some(x=>!x))return;
    setBusy(true);setError('');setMessage('');
    try {
      await importEntries(payload as Record<string,unknown>[]);
      setMessage(payload.length + ' registro(s) inseridos no Supabase. O histórico já está atualizado.');
      setRows([]);setFilename('');
    } catch(e) {setError(e instanceof Error?e.message:'Falha ao importar.');}
    finally {setBusy(false);}
  }
  return <section>
    <PageHeader eyebrow="Integração de dados" title="Importar lançamentos" description="Traga planilhas CSV exportadas do Excel para o mesmo banco utilizado pelos lançamentos manuais, sem registrar duas vezes o mesmo identificador."/>
    <div className="mb-5 rounded-lg border border-brand-300 bg-brand-50 p-4 text-sm">
      <strong>Importação real, controlada.</strong> O arquivo é lido neste navegador, validado contra os cadastros ativos e somente gravado no Supabase após sua confirmação. Nenhuma informação é gerada automaticamente.
    </div>
    {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {message && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="rounded-lg border border-paper-line bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold"><UploadCloud size={21}/> Conferir planilha</h2>
        {permitted ? <>
          <label htmlFor="import-file" className="mt-4 block text-sm font-semibold">Arquivo CSV (UTF-8, até 300 registros)</label>
          <input id="import-file" type="file" accept=".csv,text/csv" onChange={e=>void selectFile(e)} className="mt-2 block w-full rounded-lg border p-3 text-sm"/>
          {filename&&<p className="mt-3 text-sm text-neutral-600">Selecionado: {filename}</p>}
        </> : <p className="mt-3 text-sm text-neutral-600">Seu perfil tem permissão de consulta. A importação precisa ser feita pela administração, supervisão ou gestão ambiental.</p>}
        <p className="mt-4 text-xs leading-6 text-neutral-600">Máquinas e materiais já devem estar cadastrados. Cada linha precisa de <strong>id_origem exclusivo</strong>, data, códigos reais, lote, classificação, destinação e peso. O mesmo ID não poderá ser importado novamente, mesmo em outro arquivo.</p>
      </div>
      <div className="rounded-lg border border-paper-line bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold"><FileSpreadsheet size={21}/> Modelo padronizado</h2>
        <p className="mt-3 text-sm text-neutral-600">Use o cabeçalho oficial e preencha os campos com os dados autorizados pela Papelito. Não existem linhas fictícias.</p>
        <Button onClick={downloadTemplate} className="mt-4"><Download size={16}/> Baixar modelo CSV</Button>
      </div>
    </div>
    {rows.length>0 ? <div className="mt-6 rounded-lg border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div><h2 className="font-bold">Validação antes da gravação</h2>
          <p className="text-xs text-neutral-600">{rows.length} linhas analisadas · {rows.length-invalid} válidas · {invalid} com problemas</p></div>
        <Button onClick={()=>void commit()} loading={busy} disabled={!permitted||invalid>0||rows.length===0}>
          <ShieldCheck size={16}/> Confirmar {rows.length} lançamentos
        </Button>
      </div>
      {invalid>0&&<p className="m-4 flex items-center gap-2 rounded bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle size={17}/> Corrija todas as linhas sinalizadas no arquivo e selecione-o novamente. Nenhum registro foi enviado.</p>}
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="bg-paper text-xs uppercase text-neutral-600"><tr>{['Linha','ID de origem','Data','Máquina','Material','Peso','Resultado'].map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead>
          <tbody>{rows.slice(0,100).map(x=><tr key={x.line} className="border-t">
            <td className="p-3">{x.line}</td><td className="p-3">{x.code}</td><td className="p-3">{x.date}</td><td className="p-3">{x.machineCode}</td><td className="p-3">{x.materialCode}</td><td className="p-3">{x.kg} kg</td>
            <td className="p-3">{x.errors.length?<span className="text-red-700">{x.errors.join('; ')}</span>:<span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 size={15}/> Válida</span>}</td>
          </tr>)}</tbody>
        </table>
        {rows.length>100&&<p className="p-3 text-xs text-neutral-600">Mostrando 100 linhas. Todas as {rows.length} foram validadas.</p>}
      </div>
    </div> : <div className="mt-6 rounded-lg border border-paper-line bg-white"><EmptyState title="Nenhum arquivo selecionado" description="Exporte a planilha como CSV e selecione-a para conferir os dados." /></div>}
  </section>;
}
