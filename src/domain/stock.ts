import { fail, ok, type Check } from './errors';
import { round } from './units';
import type { ID, ISODate, MovementType, StockMovement } from './types';

export const MOVEMENT_TYPES: { id: MovementType; label: string; direction: 'entrada' | 'saida' | 'neutro' | 'ajuste' }[] = [
  { id: 'saldo_inicial', label: 'Estoque inicial', direction: 'entrada' },
  { id: 'entrada', label: 'Entrada', direction: 'entrada' },
  { id: 'reutilizacao', label: 'Reutilização', direction: 'saida' },
  { id: 'transferencia', label: 'Transferência interna', direction: 'neutro' },
  { id: 'coleta', label: 'Coleta externa', direction: 'saida' },
  { id: 'ajuste', label: 'Ajuste de inventário', direction: 'ajuste' },
];

export const movementLabel = (t: MovementType) => MOVEMENT_TYPES.find((m) => m.id === t)?.label ?? t;

const key = (materialId: ID, locationId: ID) => `${materialId}|${locationId}`;

/** Efeitos de uma movimentação no saldo de cada par (material, local), em kg. */
export function movementEffects(m: StockMovement): { key: string; delta: number }[] {
  switch (m.type) {
    case 'saldo_inicial':
    case 'entrada':
      return [{ key: key(m.materialId, m.locationId), delta: m.quantityKg }];
    case 'reutilizacao':
    case 'coleta':
      return [{ key: key(m.materialId, m.locationId), delta: -m.quantityKg }];
    case 'transferencia':
      return [
        { key: key(m.materialId, m.locationId), delta: -m.quantityKg },
        { key: key(m.materialId, m.toLocationId ?? ''), delta: m.quantityKg },
      ];
    case 'ajuste':
      return [{ key: key(m.materialId, m.locationId), delta: m.quantityKg }];
  }
}

/** Ordem cronológica; no mesmo dia, entradas antes de saídas; depois ordem de lançamento. */
export function sortMovements(ms: StockMovement[]): StockMovement[] {
  const weight = (m: StockMovement) => (m.type === 'saldo_inicial' ? 0 : m.type === 'entrada' ? 1 : 2);
  return [...ms].sort(
    (a, b) => a.date.localeCompare(b.date) || weight(a) - weight(b) || a.createdAt.localeCompare(b.createdAt),
  );
}

/** Saldos atuais por material e local (kg). */
export function balances(ms: StockMovement[], until?: ISODate): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of ms) {
    if (until && m.date > until) continue;
    for (const e of movementEffects(m)) out.set(e.key, round((out.get(e.key) ?? 0) + e.delta, 3));
  }
  return out;
}

export function balanceOf(ms: StockMovement[], materialId: ID, locationId: ID, until?: ISODate): number {
  return balances(ms, until).get(key(materialId, locationId)) ?? 0;
}

export function balanceByMaterial(ms: StockMovement[], until?: ISODate): Map<ID, number> {
  const out = new Map<ID, number>();
  for (const [k, v] of balances(ms, until)) {
    const mat = k.split('|')[0];
    out.set(mat, round((out.get(mat) ?? 0) + v, 3));
  }
  return out;
}

export interface Inconsistency {
  movementId: ID;
  date: ISODate;
  materialId: ID;
  locationId: ID;
  balanceAfter: number;
}

/** Percorre o razão em ordem cronológica e aponta saldos que ficariam negativos. */
export function detectInconsistencies(ms: StockMovement[]): Inconsistency[] {
  const running = new Map<string, number>();
  const issues: Inconsistency[] = [];
  for (const m of sortMovements(ms)) {
    for (const e of movementEffects(m)) {
      const next = round((running.get(e.key) ?? 0) + e.delta, 3);
      running.set(e.key, next);
      if (next < -1e-6) {
        const [materialId, locationId] = e.key.split('|');
        issues.push({ movementId: m.id, date: m.date, materialId, locationId, balanceAfter: next });
      }
    }
  }
  return issues;
}

/** Valida uma nova movimentação contra o histórico (impede saldo negativo em qualquer data). */
export function checkMovement(existing: StockMovement[], m: StockMovement): Check {
  if (m.type === 'ajuste') {
    if (m.quantityKg === 0) return fail('O ajuste deve ter quantidade diferente de zero.');
    if (!m.note?.trim()) return fail('Informe a justificativa do ajuste de inventário.');
  } else if (!(m.quantityKg > 0)) {
    return fail('A quantidade deve ser maior que zero.');
  }
  if (m.type === 'transferencia') {
    if (!m.toLocationId) return fail('Informe o local de destino da transferência.');
    if (m.toLocationId === m.locationId) return fail('Origem e destino da transferência devem ser diferentes.');
  }
  if (!m.reference.trim()) return fail('Informe a identificação (referência) da movimentação.');
  // Entradas nunca deixam saldo negativo.
  if (m.type === 'saldo_inicial' || m.type === 'entrada' || (m.type === 'ajuste' && m.quantityKg > 0)) return ok;

  const issues = detectInconsistencies([...existing, m]).filter((i) => i.movementId === m.id);
  if (issues.length > 0) {
    const available = balanceOf(existing, m.materialId, m.locationId, m.date);
    return fail(
      `Saldo insuficiente: disponível ${available.toLocaleString('pt-BR')} kg no local em ${m.date.split("-").reverse().join("/")}. A movimentação deixaria o estoque negativo.`,
    );
  }
  // Uma retirada retroativa não pode tornar negativos saldos de datas posteriores.
  const before = new Set(detectInconsistencies(existing).map((i) => i.movementId));
  const after = detectInconsistencies([...existing, m]).filter((i) => !before.has(i.movementId));
  if (after.length > 0) {
    return fail('A movimentação retroativa deixaria saldos posteriores negativos. Verifique a data.');
  }
  return ok;
}

export interface StockStatementRow {
  materialId: ID;
  initial: number;
  entries: number;
  reuse: number;
  transfers: number;
  collections: number;
  adjustments: number;
  final: number;
}

/**
 * Demonstrativo do período por material (kg):
 * final = inicial + entradas − reutilizações − coletas ± ajustes.
 * Transferências não alteram o saldo do material (só o local) — exibidas como volume movimentado.
 */
export function stockStatement(ms: StockMovement[], from: ISODate, to: ISODate): StockStatementRow[] {
  const rows = new Map<ID, StockStatementRow>();
  const row = (id: ID) => {
    let r = rows.get(id);
    if (!r) {
      r = { materialId: id, initial: 0, entries: 0, reuse: 0, transfers: 0, collections: 0, adjustments: 0, final: 0 };
      rows.set(id, r);
    }
    return r;
  };
  for (const m of ms) {
    if (m.date > to) continue;
    const r = row(m.materialId);
    const inPeriod = m.date >= from && m.type !== 'saldo_inicial';
    if (!inPeriod) {
      const net = movementEffects(m).reduce((a, e) => a + e.delta, 0);
      r.initial = round(r.initial + net, 3);
      continue;
    }
    if (m.type === 'entrada') r.entries = round(r.entries + m.quantityKg, 3);
    if (m.type === 'reutilizacao') r.reuse = round(r.reuse + m.quantityKg, 3);
    if (m.type === 'transferencia') r.transfers = round(r.transfers + m.quantityKg, 3);
    if (m.type === 'coleta') r.collections = round(r.collections + m.quantityKg, 3);
    if (m.type === 'ajuste') r.adjustments = round(r.adjustments + m.quantityKg, 3);
  }
  for (const r of rows.values()) {
    r.final = round(r.initial + r.entries - r.reuse - r.collections + r.adjustments, 3);
  }
  return [...rows.values()];
}
