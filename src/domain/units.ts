import type { ID, Product, Unit } from './types';

/** Casas decimais padrão por grandeza (armazenamento e exibição). */
export const DECIMALS = { massa: 3, contagem: 3, comprimento: 3, volume: 3, money: 2, pct: 1 } as const;

/** Arredondamento decimal estável (meio para cima), evitando erros de ponto flutuante. */
export function round(value: number, decimals = 3): number {
  if (!Number.isFinite(value)) return value;
  const f = 10 ** decimals;
  const abs = Math.round(Math.abs(value) * f * (1 + Number.EPSILON)) / f;
  return abs === 0 ? 0 : Math.sign(value) * abs;
}

export type ConversionResult = { ok: true; value: number } | { ok: false; error: string };

function factorInProductBase(unit: Unit, product: Product, units: Unit[]): number | null {
  if (unit.id === product.unitId) return 1;
  const custom = product.conversions.find((c) => c.unitId === unit.id);
  if (custom) return custom.factor;
  const base = units.find((u) => u.id === product.unitId);
  if (base && base.dimension === unit.dimension && base.factorToBase && unit.factorToBase) {
    return unit.factorToBase / base.factorToBase;
  }
  return null;
}

/**
 * Converte uma quantidade entre unidades.
 * 1. Mesma unidade → sem alteração.
 * 2. Mesma grandeza com fatores fixos (ex.: g → kg) → regra geral.
 * 3. Unidades de embalagem (caixa, bobina) → exige fator cadastrado no produto.
 * Qualquer outro caso é recusado: nunca somamos unidades incompatíveis.
 */
export function convertQuantity(
  qty: number,
  fromId: ID,
  toId: ID,
  units: Unit[],
  product?: Product,
): ConversionResult {
  if (fromId === toId) return { ok: true, value: qty };
  const from = units.find((u) => u.id === fromId);
  const to = units.find((u) => u.id === toId);
  if (!from || !to) return { ok: false, error: 'Unidade não cadastrada.' };

  if (from.dimension === to.dimension && from.factorToBase && to.factorToBase) {
    return { ok: true, value: round((qty * from.factorToBase) / to.factorToBase, 6) };
  }
  if (product) {
    const f = factorInProductBase(from, product, units);
    const t = factorInProductBase(to, product, units);
    if (f !== null && t !== null) return { ok: true, value: round((qty * f) / t, 6) };
  }
  return {
    ok: false,
    error: `Não há conversão definida entre ${from.code} e ${to.code}${product ? ` para ${product.name}` : ''}.`,
  };
}

/** Converte para kg; recusa unidades que não sejam de massa. */
export function toKg(qty: number, unitId: ID, units: Unit[]): ConversionResult {
  const unit = units.find((u) => u.id === unitId);
  if (!unit) return { ok: false, error: 'Unidade não cadastrada.' };
  if (unit.dimension !== 'massa') return { ok: false, error: `${unit.code} não é unidade de massa.` };
  const kg = units.find((u) => u.dimension === 'massa' && u.factorToBase === 1);
  if (!kg) return { ok: false, error: 'Unidade-base kg não cadastrada.' };
  return convertQuantity(qty, unitId, kg.id, units);
}

export function isMassUnit(unitId: ID, units: Unit[]): boolean {
  return units.find((u) => u.id === unitId)?.dimension === 'massa';
}

/** Soma quantidades agrupando por unidade — nunca mistura unidades diferentes. */
export function sumByUnit<T>(items: T[], unitOf: (i: T) => ID, qtyOf: (i: T) => number): Record<ID, number> {
  const out: Record<ID, number> = {};
  for (const i of items) {
    const u = unitOf(i);
    out[u] = round((out[u] ?? 0) + qtyOf(i), 3);
  }
  return out;
}
