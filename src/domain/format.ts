import { parseISODate } from './dates';
import type { ID, Unit } from './types';

const nf = (max: number, min = 0) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: max, minimumFractionDigits: min });

export const fmtNumber = (v: number, max = 1) => nf(max).format(v);
export const fmtKg = (v: number) => `${nf(v >= 100 ? 0 : 1).format(v)} kg`;
export const fmtMoney = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
export const fmtPct = (v: number | null, digits = 1) => (v === null || !Number.isFinite(v) ? '—' : `${nf(digits, digits).format(v * 100)}%`);
export const fmtDate = (s?: string) => (s ? parseISODate(s).toLocaleDateString('pt-BR') : '—');
export const fmtDateTime = (s: string) => new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export const unitCode = (units: Unit[], id: ID) => units.find((u) => u.id === id)?.code ?? '?';

/** "12.400 un · 830 cx" — quantidades por unidade, nunca somadas entre si. */
export function fmtByUnit(byUnit: Record<ID, number>, units: Unit[]): string {
  const parts = Object.entries(byUnit)
    .filter(([, q]) => q !== 0)
    .map(([u, q]) => `${fmtNumber(q, 0)} ${unitCode(units, u)}`);
  return parts.length ? parts.join(' · ') : '—';
}
