import { describe, expect, it } from 'vitest';
import * as op from '../../data/operations';
import { blank, ctx } from '../../test/fixtures';
import { avoidableLossCost, costAt, netLossCost, periodChange, recoveredValue } from '../finance';
import type { CostEntry, WasteRecord } from '../types';

const costs: CostEntry[] = [
  { id: 'c1', kind: 'materia_prima', materialId: 'mp-01', valuePerKg: 10, validFrom: '2026-01-01', validTo: '2026-06-30', source: 'teste', demo: true },
  { id: 'c2', kind: 'materia_prima', materialId: 'mp-01', valuePerKg: 12, validFrom: '2026-07-01', source: 'teste', demo: true },
  { id: 'c3', kind: 'venda_residuo', materialId: 'rs-01', valuePerKg: 1, validFrom: '2026-01-01', source: 'teste', demo: true },
];
const w = (p: Partial<WasteRecord>): WasteRecord => ({
  id: Math.random().toString(36), date: '2026-08-01', materialId: 'rs-01', origin: 'maquina', sectorId: 'set-ma', machineId: 'mq-01',
  netWeight: 10, unitId: 'u-kg', classification: 'perda_anormal', reasonId: 'mot-setup', locationId: 'loc-01', registeredByRole: 'operador', createdAt: '', ...p,
});
const materials = blank().materials;

describe('indicadores financeiros', () => {
  it('usa o custo vigente na data', () => {
    expect(costAt(costs, 'materia_prima', 'mp-01', '2026-03-01')?.valuePerKg).toBe(10);
    expect(costAt(costs, 'materia_prima', 'mp-01', '2026-07-01')?.valuePerKg).toBe(12);
    expect(costAt(costs, 'materia_prima', 'mp-02', '2026-07-01')).toBeNull();
  });

  it('somente perdas anormais entram no custo; aparas normais não', () => {
    const r = avoidableLossCost([w({}), w({ classification: 'apara_normal', netWeight: 500 }), w({ date: '2026-03-01', netWeight: 5 })], materials, costs);
    expect(r.value).toBe(10 * 12 + 5 * 10);
    expect(r.kg).toBe(15);
    expect(r.usesDemoValues).toBe(true);
  });

  it('exclui e sinaliza quantidades sem custo cadastrado', () => {
    const r = avoidableLossCost([w({ materialId: 'rs-02', netWeight: 7 })], materials, costs);
    expect(r.value).toBe(0);
    expect(r.kgWithoutCost).toBe(7);
  });

  it('custo líquido = bruto − recuperável das mesmas perdas', () => {
    const r = netLossCost([w({ netWeight: 10 })], materials, costs);
    expect(r.gross.value).toBe(120);
    expect(r.recoverable.value).toBe(10);
    expect(r.net).toBe(110);
  });

  it('valor recuperado usa apenas peso confirmado', () => {
    const base = { id: 'c', number: 'C', company: 'Capital Recicláveis', scheduledDate: '2026-08-01', collectedDate: '2026-08-01', locationId: 'loc-03', documents: [], history: [] };
    const r = recoveredValue([
      { ...base, status: 'pesagem_conferida', items: [{ materialId: 'rs-01', declaredKg: 100, confirmedKg: 98 }] },
      { ...base, id: 'd', status: 'realizada', items: [{ materialId: 'rs-01', declaredKg: 100 }] },
    ], costs);
    expect(r.value).toBe(98);
  });

  it('variação entre períodos', () => {
    expect(periodChange(110, 100)).toBeCloseTo(0.1);
    expect(periodChange(5, 0)).toBeNull();
  });

  it('recusa custos com vigência sobreposta', () => {
    let s = blank();
    s = op.saveCost(s, { kind: 'materia_prima', materialId: 'mp-01', valuePerKg: 1, validFrom: '2026-01-01', source: 'teste', demo: true }, ctx('financeiro'));
    expect(() => op.saveCost(s, { kind: 'materia_prima', materialId: 'mp-01', valuePerKg: 2, validFrom: '2026-05-01', source: 'teste', demo: true }, ctx())).toThrow(/sobreposta/);
    s = op.closeCostValidity(s, s.costs[0].id, '2026-04-30', ctx());
    s = op.saveCost(s, { kind: 'materia_prima', materialId: 'mp-01', valuePerKg: 2, validFrom: '2026-05-01', source: 'teste', demo: true }, ctx());
    expect(s.costs).toHaveLength(2);
  });
});
