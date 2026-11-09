import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../auth/supabase';

export interface Machine { id: string; code: string; name: string; active: boolean; created_at: string }
export interface Material { id: string; code: string; name: string; recyclable: boolean; active: boolean; created_at: string }
export interface Standard { id: string; machine_id: string; material_id: string; expected_pct: number; source: string; valid_from: string; created_at: string }
export interface Entry { id: string; occurred_on: string; machine_id: string; material_id: string; batch_ref: string; origin_class: 'apara_normal' | 'perda_anormal'; destination: 'reciclagem' | 'reuso' | 'rejeito'; quantity_kg: number; reason: string | null; created_at: string; import_source?: 'manual' | 'csv'; source_ref?: string | null }
export interface Pickup { id: string; occurred_on: string; material_id: string; quantity_kg: number; partner: string; document_ref: string | null; notes: string | null; created_at: string }
export interface PickupConfirmation { id: string; pickup_id: string; received_on: string; received_kg: number; receipt_reference: string; notes: string | null; created_at: string }
export interface AcademicEvidence { id: string; category: string; title: string; description: string; occurred_on: string; document_reference: string | null; storage_path: string | null; created_at: string }
export type RealData = { machines: Machine[]; materials: Material[]; standards: Standard[]; entries: Entry[]; pickups: Pickup[]; confirmations: PickupConfirmation[]; evidence: AcademicEvidence[] };
const empty: RealData = { machines: [], materials: [], standards: [], entries: [], pickups: [], confirmations: [], evidence: [] };
const TABLES = {
  machines: 'circular_machines',
  materials: 'circular_materials',
  standards: 'circular_scrap_standards',
  entries: 'circular_entries',
  pickups: 'circular_pickups',
  confirmations: 'circular_pickup_confirmations',
  evidence: 'circular_academic_evidence',
} as const;

export function stockByMaterial(data: RealData): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const e of data.entries) {
    if (e.destination === 'reciclagem') balances[e.material_id] = (balances[e.material_id] || 0) + Number(e.quantity_kg);
  }
  for (const p of data.pickups) balances[p.material_id] = (balances[p.material_id] || 0) - Number(p.quantity_kg);
  return balances;
}
export const totalKg = (items: { quantity_kg: number }[]) => items.reduce((sum, row) => sum + Number(row.quantity_kg), 0);
export const fmtKg = (number: number) => number.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 }) + ' kg';
export function today() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}
export async function loadRealData(): Promise<RealData> {
  const client = supabase;
  if (!client) throw new Error('A conexão com Supabase não está configurada.');
  const keys = Object.keys(TABLES) as (keyof RealData)[];
  const results = await Promise.all(keys.map(async key => {
    const rows: unknown[] = [];
    const pageSize = 500;
    let offset = 0;
    while (true) {
      const { data, error } = await client.from(TABLES[key]).select('*')
        .order('created_at', { ascending: false }).range(offset, offset + pageSize - 1);
      if (error) throw new Error('Não foi possível carregar ' + key + ': ' + error.message);
      rows.push(...(data || []));
      if (!data || data.length < pageSize) break;
      offset += pageSize;
    }
    return [key, rows];
  }));
  return Object.fromEntries(results) as RealData;
}
export async function insertReal(table: keyof RealData, values: Record<string, unknown>) {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { error } = await supabase.from(TABLES[table]).insert(values);
  if (error) throw new Error(error.message);
}
export async function importRealEntries(rows: Record<string, unknown>[]) {
  if (!supabase) throw new Error('Supabase não configurado.');
  if (!rows.length || rows.length > 300) throw new Error('Selecione de 1 a 300 linhas por importação.');
  const { error } = await supabase.from('circular_entries').insert(rows);
  if (error) throw new Error(error.code === '23505'
    ? 'Pelo menos um identificador de origem já foi importado. Corrija os duplicados antes de tentar novamente.'
    : error.message);
}
export async function uploadPrivateEvidence(file: File): Promise<string> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const mimeToExtension: Record<string, string> = {'application/pdf':'pdf','image/png':'png','image/jpeg':'jpg'};
  const ext = mimeToExtension[file.type];
  if (!ext || file.size > 10485760 || file.size === 0) {
    throw new Error('Anexe somente PDF, PNG ou JPG, até 10 MB.');
  }
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Sessão não autorizada para anexos.');
  const path = user.id + '/' + crypto.randomUUID() + '.' + ext;
  const { error } = await supabase.storage.from('papelito-circular-evidencias')
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error('Falha ao armazenar o documento: ' + error.message);
  return path;
}
export async function removePrivateEvidence(path: string) {
  if (!supabase) return;
  await supabase.storage.from('papelito-circular-evidencias').remove([path]);
}
export async function signEvidence(path: string): Promise<string> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const {data, error} = await supabase.storage.from('papelito-circular-evidencias').createSignedUrl(path, 60);
  if (error || !data) throw new Error(error?.message || 'Não foi possível abrir o anexo.');
  return data.signedUrl;
}
export async function updateRealMaster(table: 'machines' | 'materials', id: string, changes: { code: string; name: string }) {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase.from(TABLES[table]).update(changes).eq('id', id).select('id').single();
  if (error || !data) throw new Error(error?.message || 'A atualização não foi autorizada.');
}
export async function setMasterActive(table: 'machines'|'materials', id: string, active: boolean) {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase.from(TABLES[table]).update({ active }).eq('id', id).select('id').single();
  if (error || !data) throw new Error(error?.message || 'Atualização não autorizada.');
}
interface DataContextValue {
  data: RealData; loading: boolean; error: string;
  refresh: () => Promise<void>;
  create: (table: keyof RealData, values: Record<string, unknown>) => Promise<void>;
  toggle: (table: 'machines' | 'materials', id: string, active: boolean) => Promise<void>;
  updateMaster: (table: 'machines' | 'materials', id: string, changes: { code: string; name: string }) => Promise<void>;
  importEntries: (rows: Record<string, unknown>[]) => Promise<void>;
}
const Context = createContext<DataContextValue | null>(null);
export function RealDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<RealData>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await loadRealData()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Falha ao consultar o banco.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const create = useCallback(async (table: keyof RealData, values: Record<string, unknown>) => {
    await insertReal(table, values);
    await refresh();
  }, [refresh]);
  const toggle = useCallback(async (table: 'machines'|'materials', id: string, active: boolean) => {
    await setMasterActive(table, id, active);
    await refresh();
  }, [refresh]);
  const updateMaster = useCallback(async (table: 'machines' | 'materials', id: string, changes: { code: string; name: string }) => {
    await updateRealMaster(table, id, changes);
    await refresh();
  }, [refresh]);
  const importEntries = useCallback(async (rows: Record<string, unknown>[]) => {
    await importRealEntries(rows);
    await refresh();
  }, [refresh]);
  const value = useMemo(() => ({ data, loading, error, refresh, create, toggle, updateMaster, importEntries }), [data, loading, error, refresh, create, toggle, updateMaster, importEntries]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useRealData() {
  const value = useContext(Context);
  if (!value) throw new Error('RealDataProvider ausente');
  return value;
}
