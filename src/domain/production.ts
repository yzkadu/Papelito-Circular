import { fail, ok, type Check } from './errors';
import { round, sumByUnit } from './units';
import type {
  ID,
  MachineProductionRecord,
  ManualProductionRecord,
  ProductionOrder,
  Snapshot,
} from './types';

const TOLERANCE = 1e-6;

/**
 * Regra de balanço da produção por máquina:
 * produzido = aprovado + rejeitado + retrabalho (mesma unidade).
 */
export function checkMachineBalance(r: {
  producedQty: number;
  approvedQty: number;
  rejectedQty: number;
  reworkQty: number;
}): Check {
  const parts = [r.approvedQty, r.rejectedQty, r.reworkQty];
  if (r.producedQty <= 0) return fail('A quantidade produzida deve ser maior que zero.');
  if (parts.some((p) => p < 0)) return fail('Quantidades não podem ser negativas.');
  const sum = round(parts.reduce((a, b) => a + b, 0), 6);
  if (Math.abs(sum - r.producedQty) > TOLERANCE) {
    return fail(
      `Aprovado + rejeitado + retrabalho (${sum}) deve ser igual ao produzido (${r.producedQty}).`,
    );
  }
  return ok;
}

/** Regra da etapa manual: concluído + rejeitado + retrabalho ≤ recebido. */
export function checkManualBalance(r: {
  receivedQty: number;
  completedQty: number;
  rejectedQty: number;
  reworkQty: number;
}): Check {
  if (r.receivedQty <= 0) return fail('A quantidade recebida deve ser maior que zero.');
  if ([r.completedQty, r.rejectedQty, r.reworkQty].some((p) => p < 0)) {
    return fail('Quantidades não podem ser negativas.');
  }
  const out = round(r.completedQty + r.rejectedQty + r.reworkQty, 6);
  if (out - r.receivedQty > TOLERANCE) {
    return fail(`Concluído + rejeitado + retrabalho (${out}) não pode superar o recebido (${r.receivedQty}).`);
  }
  return ok;
}

/**
 * Saldo disponível para a etapa manual de uma ordem `maquina_manual`:
 * aprovado nas máquinas − já recebido pela etapa manual.
 * Impede que a mesma peça seja recebida (e contada) duas vezes.
 */
export function availableForManualStage(snapshot: Snapshot, orderId: ID, excludeRecordId?: ID): number {
  const approved = snapshot.machineRecords
    .filter((r) => r.orderId === orderId)
    .reduce((a, r) => a + r.approvedQty, 0);
  const received = snapshot.manualRecords
    .filter((r) => r.orderId === orderId && r.id !== excludeRecordId)
    .reduce((a, r) => a + r.receivedQty, 0);
  return round(approved - received, 3);
}

export function checkManualAgainstOrder(
  snapshot: Snapshot,
  input: { orderId: ID; receivedQty: number; unitId: ID },
): Check {
  const order = snapshot.orders.find((o) => o.id === input.orderId);
  if (!order) return fail('Ordem de produção não encontrada.');
  if (order.route === 'maquina') {
    return fail(`A ordem ${order.number} não possui etapa manual no roteiro.`);
  }
  if (input.unitId !== order.unitId) {
    return fail('A etapa manual deve usar a mesma unidade da ordem de produção.');
  }
  if (order.route === 'maquina_manual') {
    const available = availableForManualStage(snapshot, order.id);
    if (input.receivedQty - available > TOLERANCE) {
      return fail(
        `Recebido (${input.receivedQty}) maior que o saldo aprovado nas máquinas para a ordem ${order.number} (${available}).`,
      );
    }
  }
  return ok;
}

export function checkMachineAgainstOrder(order: ProductionOrder | undefined, unitId: ID): Check {
  if (!order) return fail('Ordem de produção não encontrada.');
  if (order.route === 'manual') return fail(`A ordem ${order.number} é exclusivamente manual.`);
  if (order.status !== 'aberta') return fail(`A ordem ${order.number} está encerrada.`);
  if (order.unitId !== unitId) return fail('O registro deve usar a mesma unidade da ordem de produção.');
  return ok;
}

/**
 * Produção final por unidade, sem dupla contagem:
 * - ordens `maquina`         → aprovado na máquina;
 * - ordens `maquina_manual`  → concluído na etapa manual (o aprovado na máquina é intermediário);
 * - ordens `manual`          → concluído na etapa manual.
 */
export function finalOutputByUnit(
  orders: ProductionOrder[],
  machineRecords: MachineProductionRecord[],
  manualRecords: ManualProductionRecord[],
): Record<ID, number> {
  const route = new Map(orders.map((o) => [o.id, o.route]));
  const fromMachines = machineRecords.filter((r) => route.get(r.orderId) === 'maquina');
  const fromManual = manualRecords.filter((r) => route.get(r.orderId) !== 'maquina');
  const a = sumByUnit(fromMachines, (r) => r.unitId, (r) => r.approvedQty);
  const b = sumByUnit(fromManual, (r) => r.unitId, (r) => r.completedQty);
  const out: Record<ID, number> = { ...a };
  for (const [u, q] of Object.entries(b)) out[u] = round((out[u] ?? 0) + q, 3);
  return out;
}

/** Índice de aprovação (adimensional): aprovado ÷ produzido, somando registros na mesma unidade. */
export function approvalRate(records: MachineProductionRecord[]): number | null {
  const produced = records.reduce((a, r) => a + r.producedQty, 0);
  if (produced <= 0) return null;
  return records.reduce((a, r) => a + r.approvedQty, 0) / produced;
}
