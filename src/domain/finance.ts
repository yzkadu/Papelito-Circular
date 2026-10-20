import { isCollected } from './collections';
import { round } from './units';
import { isAvoidableLoss } from './waste';
import type {
  Collection,
  CostEntry,
  CostKind,
  ID,
  ISODate,
  MachineProductionRecord,
  Material,
  WasteRecord,
} from './types';

/** Custo vigente na data (vigência inclusiva). Sem custo cadastrado → null (nunca inventamos valores). */
export function costAt(costs: CostEntry[], kind: CostKind, materialId: ID, date: ISODate): CostEntry | null {
  const valid = costs
    .filter((c) => c.kind === kind && c.materialId === materialId && c.validFrom <= date && (!c.validTo || c.validTo >= date))
    .sort((a, b) => b.validFrom.localeCompare(a.validFrom));
  return valid[0] ?? null;
}

export interface MoneyResult {
  value: number;
  /** kg considerados no cálculo. */
  kg: number;
  /** kg sem custo cadastrado (excluídos do valor). */
  kgWithoutCost: number;
  usesDemoValues: boolean;
}

const empty = (): MoneyResult => ({ value: 0, kg: 0, kgWithoutCost: 0, usesDemoValues: false });

/** Matéria-prima de origem de um resíduo (ou o próprio material). */
export const sourceMaterialOf = (materialId: ID, materials: Material[]) =>
  materials.find((m) => m.id === materialId)?.sourceMaterialId ?? materialId;

/**
 * Custo médio ponderado da matéria-prima consumida (R$/kg):
 * Σ (kg consumidos × custo vigente na data) ÷ Σ kg com custo.
 */
export function averageRawMaterialCost(records: MachineProductionRecord[], costs: CostEntry[]): MoneyResult & { avg: number | null } {
  const r = empty();
  for (const rec of records) {
    const c = costAt(costs, 'materia_prima', rec.rawMaterialId, rec.date);
    if (!c) {
      r.kgWithoutCost += rec.rawMaterialKg;
      continue;
    }
    r.kg += rec.rawMaterialKg;
    r.value += rec.rawMaterialKg * c.valuePerKg;
    r.usesDemoValues ||= c.demo;
  }
  return { ...r, value: round(r.value, 2), avg: r.kg > 0 ? round(r.value / r.kg, 4) : null };
}

/**
 * Custo bruto estimado das perdas evitáveis:
 * Σ kg de perda anormal × custo da matéria-prima de origem vigente na data.
 * Aparas normais, retrabalho e rejeito NÃO entram.
 */
export function avoidableLossCost(waste: WasteRecord[], materials: Material[], costs: CostEntry[]): MoneyResult {
  const r = empty();
  for (const w of waste) {
    if (!isAvoidableLoss(w.classification)) continue;
    const c = costAt(costs, 'materia_prima', sourceMaterialOf(w.materialId, materials), w.date);
    if (!c) {
      r.kgWithoutCost += w.netWeight;
      continue;
    }
    r.kg += w.netWeight;
    r.value += w.netWeight * c.valuePerKg;
    r.usesDemoValues ||= c.demo;
  }
  return { ...r, value: round(r.value, 2), kg: round(r.kg, 3) };
}

/**
 * Valor potencialmente recuperável das perdas evitáveis:
 * Σ kg de perda anormal × valor de venda do resíduo vigente na data.
 */
export function recoverableFromLosses(waste: WasteRecord[], costs: CostEntry[]): MoneyResult {
  const r = empty();
  for (const w of waste) {
    if (!isAvoidableLoss(w.classification)) continue;
    const c = costAt(costs, 'venda_residuo', w.materialId, w.date);
    if (!c) {
      r.kgWithoutCost += w.netWeight;
      continue;
    }
    r.kg += w.netWeight;
    r.value += w.netWeight * c.valuePerKg;
    r.usesDemoValues ||= c.demo;
  }
  return { ...r, value: round(r.value, 2), kg: round(r.kg, 3) };
}

/**
 * Valor recuperado com coletas: Σ kg CONFIRMADOS na pesagem × valor de venda vigente na data da retirada.
 * Coletas sem pesagem conferida não entram (o valor ainda não é conhecido).
 */
export function recoveredValue(collections: Collection[], costs: CostEntry[]): MoneyResult {
  const r = empty();
  for (const c of collections) {
    if (!isCollected(c) || !c.collectedDate) continue;
    for (const i of c.items) {
      if (i.confirmedKg === undefined) continue;
      const cost = costAt(costs, 'venda_residuo', i.materialId, c.collectedDate);
      if (!cost) {
        r.kgWithoutCost += i.confirmedKg;
        continue;
      }
      r.kg += i.confirmedKg;
      r.value += i.confirmedKg * cost.valuePerKg;
      r.usesDemoValues ||= cost.demo;
    }
  }
  return { ...r, value: round(r.value, 2), kg: round(r.kg, 3) };
}

/** Custo líquido estimado = custo bruto das perdas evitáveis − valor recuperável dessas mesmas perdas. */
export function netLossCost(waste: WasteRecord[], materials: Material[], costs: CostEntry[]) {
  const gross = avoidableLossCost(waste, materials, costs);
  const recoverable = recoverableFromLosses(waste, costs);
  return {
    gross,
    recoverable,
    net: round(gross.value - recoverable.value, 2),
    usesDemoValues: gross.usesDemoValues || recoverable.usesDemoValues,
  };
}

/** Variação percentual entre períodos; null quando a base é zero. */
export function periodChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}
