import type { RealData } from './data';

export const CSV_HEADER = 'id_origem;data;maquina;material;lote;classificacao;destinacao;peso_kg;motivo\n';
type Key = 'id_origem'|'data'|'maquina'|'material'|'lote'|'classificacao'|'destinacao'|'peso_kg'|'motivo';
const REQUIRED: Key[] = ['id_origem','data','maquina','material','lote','classificacao','destinacao','peso_kg'];
const ALIASES: Record<Key,string[]> = {
  id_origem: ['id_origem','identificador','referencia_unica','id_externo'],
  data: ['data','data_registro','ocorrido_em'],
  maquina: ['maquina','codigo_maquina','equipamento'],
  material: ['material','codigo_material','residuo'],
  lote: ['lote','ordem','ordem_producao','lote_producao'],
  classificacao: ['classificacao','tipo','origem'],
  destinacao: ['destinacao','destino'],
  peso_kg: ['peso_kg','peso','quantidade_kg','kg'],
  motivo: ['motivo','causa','observacao']
};
export const norm = (text:string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
function parse(raw:string):string[][] {
  const text=raw.replace(/^\uFEFF/,'');
  const first=(text.match(/^[^\r\n]*/)?.[0] || '');
  const sep=(first.match(/;/g)||[]).length >= (first.match(/,/g)||[]).length ? ';' : ',';
  const result:string[][]=[];
  let cells:string[]=[], cell='', quote=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){if(quote && text[i+1]==='"'){cell+='"';i++;}else quote=!quote;}
    else if(c===sep && !quote){cells.push(cell.trim());cell='';}
    else if((c==='\r'||c==='\n')&&!quote){
      if(c==='\r'&&text[i+1]==='\n')i++;
      cells.push(cell.trim()); cell='';
      if(cells.some(Boolean))result.push(cells);
      cells=[];
    }else cell+=c;
  }
  if(quote)throw Error('O CSV contém aspas sem fechamento.');
  cells.push(cell.trim());if(cells.some(Boolean))result.push(cells);
  return result;
}
function validDate(s:string):boolean {
  const br=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s),iso=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if(!br&&!iso)return false;
  const y=Number(br?br[3]:iso![1]),m=Number(br?br[2]:iso![2]),d=Number(br?br[1]:iso![3]);
  const date=new Date(Date.UTC(y,m-1,d));
  return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d;
}
function toIso(s:string):string {
  if(s.includes('/')) {const [d,m,y]=s.split('/');return y+'-'+m+'-'+d;}return s;
}
export interface CheckedRow {
  line: number;
  code: string;
  date: string;
  machineCode: string;
  materialCode: string;
  kg: string;
  errors: string[];
  record: Record<string,unknown> | null;
}
export function validateCsv(raw:string, data:Pick<RealData,'machines'|'materials'|'entries'>, maxRows=300):CheckedRow[] {
  const rows=parse(raw);
  if(rows.length<2)throw Error('Inclua cabeçalho e pelo menos uma linha.');
  if(rows.length>maxRows+1)throw Error('O limite é de '+maxRows+' registros por arquivo.');
  const names=rows[0].map(norm);
  const at={} as Record<Key,number>;
  (Object.keys(ALIASES) as Key[]).forEach(k=>{at[k]=names.findIndex(h=>ALIASES[k].includes(h));});
  const missing=REQUIRED.filter(k=>at[k]<0);
  if(missing.length)throw Error('Colunas obrigatórias ausentes: '+missing.join(', '));
  const used=new Set<string>();
  const already=new Set(data.entries.map(e=>e.source_ref).filter(Boolean));
  const machines=new Map(data.machines.filter(m=>m.active).map(m=>[norm(m.code),m]));
  const materials=new Map(data.materials.filter(m=>m.active).map(m=>[norm(m.code),m]));
  return rows.slice(1).map((row,i)=>{
    const get=(k:Key)=>at[k]<0?'':(row[at[k]]||'').trim();
    const external=get('id_origem'), machineCode=get('maquina'),materialCode=get('material');
    const date=get('data'),reference='csv:'+external;
    const errors:string[]=[];
    if(!/^[a-zA-Z0-9_-]{3,100}$/.test(external))errors.push('id_origem inválido');
    if(used.has(reference)||already.has(reference))errors.push('id_origem já usado');
    used.add(reference);
    if(!validDate(date))errors.push('data inválida');
    const machine=machines.get(norm(machineCode)),material=materials.get(norm(materialCode));
    if(!machine)errors.push('máquina não cadastrada/ativa');
    if(!material)errors.push('material não cadastrado/ativo');
    if(!get('lote'))errors.push('lote obrigatório');
    const origin=norm(get('classificacao'));
    if(!['apara_normal','perda_anormal'].includes(origin))errors.push('classificação inválida');
    const destination=norm(get('destinacao'));
    if(!['reciclagem','reuso','rejeito'].includes(destination))errors.push('destinação inválida');
    if(destination==='reciclagem'&&material&&!material.recyclable)errors.push('material não reciclável');
    const weight=get('peso_kg').replace(/\s/g,'');
    const amount=Number(weight.includes(',')?weight.replace(/\./g,'').replace(',','.'):weight);
    if(!weight||!Number.isFinite(amount)||amount<=0||Math.round(amount*1000)!==amount*1000)errors.push('peso inválido (máx. 3 decimais)');
    if(origin==='perda_anormal'&&get('motivo').length<3)errors.push('motivo obrigatório para perda');
    if(row.length!==rows[0].length)errors.push('quantidade de colunas diferente do cabeçalho');
    const record=errors.length?null:{
      occurred_on:toIso(date),machine_id:machine!.id,material_id:material!.id,
      batch_ref:get('lote'),origin_class:origin,destination,quantity_kg:amount,
      reason:get('motivo')||null,import_source:'csv',source_ref:reference,
    };
    return {line:i+2,code:external,date,machineCode,materialCode,kg:get('peso_kg'),errors,record};
  });
}
