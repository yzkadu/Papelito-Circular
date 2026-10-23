import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../auth/supabase';

export interface Machine { id: string; code: string; name: string; active: boolean; created_at: string }
export interface Material { id: string; code: string; name: string; recyclable: boolean; active: boolean; created_at: string }
export interface Standard { id: string; machine_id: string; material_id: string; expected_pct: number; source: string; valid_from: string; created_at: string }
export interface Entry { id: string; occurred_on: string; machine_id: string; material_id: string; batch_ref: string; origin_class: 'apara_normal' | 'perda_anormal'; destination: 'reciclagem' | 'reuso' | 'rejeito'; quantity_kg: number; reason: string | null; created_at: string }
export interface Pickup { id: string; occurred_on: string; material_id: string; quantity_kg: number; partner: string; document_ref: string | null; notes: string | null; created_at: string }
export type RealData = { machines: Machine[]; materials: Material[]; standards: Standard[]; entries: Entry[]; pickups: Pickup[] };
const empty: RealData = { machines: [], materials: [], standards: [], entries: [], pickups: [] };
const TABLES = {
  machines: 'circular_machines',
  materials: 'circular_materials',
  standards: 'circular_scrap_standards',
  entries: 'circular_entries',
  pickups: 'circular_pickups',
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
  if (!supabase) throw new Error('A conexão com Supabase não está configurada.');
  const keys = Object.keys(TABLES) as (keyof RealData)[];
  const responses = await Promise.all(keys.map(key => supabase.from(TABLES[key]).select('*').order('created_at', { ascending: false }).limit(1000)));
  for (let i = 0; i < responses.length; i++) if (responses[i].error) {
    throw new Error('Não foi possível carregar ' + keys[i] + ': ' + responses[i].error!.message);
  }
  const state: RealData = { ...empty };
  keys.forEach((key, i) => { (state[key] as unknown[]) = responses[i].data || []; });
  return state;
}
export async function insertReal(table: keyof RealData, values: Record<string, unknown>) {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { error } = await supabase.from(TABLES[table]).insert(values);
  if (error) throw new Error(error.message);
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
  const value = useMemo(() => ({ data, loading, error, refresh, create, toggle }), [data, loading, error, refresh, create, toggle]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useRealData() {
  const value = useContext(Context);
  if (!value) throw new Error('RealDataProvider ausente');
  return value;
}
