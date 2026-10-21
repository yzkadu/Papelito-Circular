import { useState, type ChangeEvent } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { PageHeader } from '../components/ui';

type FieldName = 'date' | 'machine' | 'classification' | 'weight' | 'material' | 'reason' | 'location';
type RowPreview = { line: number; date: string; machine: string; classification: string; weight: string; material: string; reason: string; location: string; errors: string[] };
const fields: Record<FieldName, string[]> = {
  date: ['data', 'data_registro', 'dt', 'dia'],
  machine: ['maquina', 'equipamento', 'codigo_maquina', 'maquina_codigo'],
  classification: ['classificacao', 'classe', 'tipo', 'tipo_residuo', 'tipo_perda'],
  weight: ['peso_kg', 'peso_liquido_kg', 'peso', 'quantidade_kg', 'kg', 'massa_kg'],
  material: ['material', 'residuo', 'codigo_material', 'tipo_material'],
  reason: ['motivo', 'causa', 'causa_da_perda', 'ocorrencia'],
  location: ['local', 'local_armazenamento', 'deposito', 'setor'],
};
const required: FieldName[] = ['date', 'machine', 'classification', 'weight'];
const names: Record<FieldName, string> = {
  date: 'Data', machine: 'Máquina', classification: 'Classificação',
  weight: 'Peso (kg)', material: 'Material', reason: 'Motivo', location: 'Local',
};
function normalize(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}
function detectSeparator(first: string) {
  let quote = false;
  const counts: Record<string, number> = { ';': 0, ',': 0, '\t': 0 };
  for (let i = 0; i < first.length; i++) {
    const ch = first[i];
    if (ch === '"') {
      if (quote && first[i + 1] === '"') i++;
      else quote = !quote;
    } else if (!quote && ch in counts) counts[ch]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}
function parseCsv(text: string): string[][] {
  const lines = text.replace(/^\uFEFF/, '');
  const sep = detectSeparator(lines.split(/\r?\n/, 1)[0] || '');
  const result: string[][] = [];
  let cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < lines.length; i++) {
    const c = lines[i];
    if (c === '"') {
      if (quoted && lines[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (c === sep && !quoted) {
      cells.push(cell.trim()); cell = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && lines[i + 1] === '\n') i++;
      cells.push(cell.trim()); cell = '';
      if (cells.some(Boolean)) result.push(cells);
      cells = [];
    } else {
      cell += c;
    }
  }
  if (quoted) throw new Error('Arquivo CSV com aspas não fechadas.');
  cells.push(cell.trim());
  if (cells.some(Boolean)) result.push(cells);
  return result;
}
function validDate(input: string) {
  const value = input.trim();
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!br && !iso) return false;
  const y = Number(br ? br[3] : iso![1]), m = Number(br ? br[2] : iso![2]), d = Number(br ? br[1] : iso![3]);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() + 1 === m && date.getUTCDate() === d;
}
function numericKg(input: string) {
  const s = input.trim().replace(/\s/g, '');
  const num = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return s !== '' && Number.isFinite(num) && num > 0;
}
function validType(input: string) {
  const s = normalize(input);
  return ['apara', 'aparas', 'apara_prevista', 'apara_normal', 'perda', 'perda_evitavel', 'perda_anormal', 'rejeito', 'retrabalho'].includes(s);
}
function inspect(content: string) {
  const rows = parseCsv(content);
  if (rows.length < 2) throw new Error('O arquivo precisa ter cabeçalho e ao menos uma linha de dados.');
  if (rows.length > 5001) throw new Error('O limite de conferência é de 5.000 linhas por arquivo.');
  const headers = rows[0].map(normalize);
  const indices = {} as Record<FieldName, number>;
  (Object.keys(fields) as FieldName[]).forEach(key => {
    indices[key] = headers.findIndex(h => fields[key].includes(h));
  });
  const missing = required.filter(key => indices[key] < 0);
  if (missing.length) throw new Error('Colunas obrigatórias não encontradas: ' + missing.map(key => names[key]).join(', '));
  const result: RowPreview[] = rows.slice(1).map((cols, i) => {
    const get = (key: FieldName) => indices[key] >= 0 ? (cols[indices[key]] || '').trim() : '';
    const date = get('date'), machine = get('machine'), classification = get('classification'), weight = get('weight');
    const errors: string[] = [];
    if (!validDate(date)) errors.push('data inválida');
    if (!machine) errors.push('máquina não informada');
    if (!validType(classification)) errors.push('classificação não reconhecida');
    if (!numericKg(weight)) errors.push('peso inválido');
    return { line: i + 2, date, machine, classification, weight, material: get('material'), reason: get('reason'), location: get('location'), errors };
  });
  return result;
}
function downloadTemplate() {
  const csv = '\uFEFFdata;maquina;classificacao;peso_kg;material;motivo;local\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'modelo-aparas-perdas-papelito.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default function Imports() {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<RowPreview[]>([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(''); setRows([]); setLoaded(false); setFileName(file?.name || '');
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) { setError('Exporte a planilha como CSV UTF-8 antes de selecionar.'); return; }
    if (file.size > 2_000_000) { setError('Limite de 2 MB por arquivo. Divida a planilha em períodos menores.'); return; }
    try {
      const parsed = inspect(await file.text());
      setRows(parsed); setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível ler o CSV.');
    }
  }
  const invalid = rows.filter(r => r.errors.length > 0).length;
  return (
    <section>
      <PageHeader eyebrow="Dados" title="Conferência de planilhas" description="Carregue um CSV exportado do Excel para conferir a estrutura e os registros antes da futura integração com o banco de dados." />
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <strong>Etapa de conferência — ainda não é importação.</strong> O arquivo é processado somente neste navegador: não é enviado a um servidor nem salvo no sistema. Não utilize dados sigilosos neste protótipo público.
      </div>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-paper-line bg-white p-5 shadow-card">
          <label htmlFor="csv-upload" className="mb-2 flex items-center gap-2 font-semibold"><Upload size={19} /> Selecionar planilha CSV</label>
          <input id="csv-upload" type="file" accept=".csv,text/csv" onChange={e => void handleFile(e)} className="block w-full rounded-lg border border-paper-line p-3 text-sm" />
          <p className="mt-2 text-xs text-neutral-600">Formato CSV UTF-8, separado por ponto e vírgula ou vírgula. Máximo: 2 MB / 5.000 linhas.</p>
          {fileName && <p className="mt-3 text-sm text-neutral-700"><FileSpreadsheet className="mr-2 inline h-4 w-4" />{fileName}</p>}
          {error && <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-red-700"><AlertTriangle size={16} />{error}</p>}
        </div>
        <div className="rounded-xl border border-paper-line bg-white p-5 shadow-card">
          <p className="font-semibold">Modelo para preenchimento</p>
          <p className="mt-2 text-sm text-neutral-600">Baixe o cabeçalho-padrão, abra no Excel e preencha com os registros autorizados.</p>
          <button onClick={downloadTemplate} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-ink">
            <Download size={16} /> Baixar modelo CSV
          </button>
        </div>
      </div>
      {loaded && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-4"><p className="text-xs text-neutral-500">Linhas analisadas</p><strong className="text-2xl">{rows.length}</strong></div>
            <div className="rounded-xl border bg-white p-4"><p className="text-xs text-neutral-500">Estruturalmente válidas</p><strong className="text-2xl text-emerald-700">{rows.length - invalid}</strong></div>
            <div className="rounded-xl border bg-white p-4"><p className="text-xs text-neutral-500">Com pendências</p><strong className="text-2xl text-red-700">{invalid}</strong></div>
          </div>
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-neutral-50"><tr>
                {['Linha','Data','Máquina','Classificação','Peso (kg)','Material','Validação'].map(h => <th className="border-b p-3" key={h}>{h}</th>)}
              </tr></thead>
              <tbody>
                {rows.slice(0, 100).map(r => <tr key={r.line} className="border-b last:border-0">
                  <td className="p-3">{r.line}</td><td className="p-3">{r.date}</td><td className="p-3">{r.machine}</td>
                  <td className="p-3">{r.classification}</td><td className="p-3">{r.weight}</td><td className="p-3">{r.material || '—'}</td>
                  <td className="p-3">{r.errors.length ? <span className="text-red-700">{r.errors.join(', ')}</span> : <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 size={14}/> Estrutura válida</span>}</td>
                </tr>)}
              </tbody>
            </table>
            {rows.length > 100 && <p className="p-4 text-xs text-neutral-500">Prévia limitada às primeiras 100 linhas. Todas as linhas foram conferidas.</p>}
          </div>
          <p className="text-sm text-neutral-600">Esta conferência valida formato, datas, classificações e pesos. A validação contra máquinas, matérias-primas, parâmetros de aparas previstas e duplicidades no banco será adicionada depois do levantamento da indústria.</p>
        </div>
      )}
    </section>
  );
}
