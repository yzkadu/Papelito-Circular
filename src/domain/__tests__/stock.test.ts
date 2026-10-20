import { describe, expect, it } from 'vitest';
import * as op from '../../data/operations';
import { blank, ctx } from '../../test/fixtures';
import { balanceByMaterial, balanceOf, checkMovement, detectInconsistencies, stockStatement } from '../stock';
import type { StockMovement } from '../types';

const mv = (p: Partial<StockMovement>): StockMovement => ({
  id: Math.random().toString(36), date: '2026-10-01', type: 'entrada', materialId: 'rs-01', locationId: 'loc-01',
  quantityKg: 10, reference: 'ref', createdByRole: 'admin', createdAt: '2026-10-01T00:00:00Z', ...p,
});

describe('estoque de resíduos', () => {
  const base = [
    mv({ type: 'saldo_inicial', quantityKg: 100, date: '2026-09-30' }),
    mv({ type: 'entrada', quantityKg: 50, date: '2026-10-02' }),
    mv({ type: 'transferencia', quantityKg: 120, toLocationId: 'loc-03', date: '2026-10-03' }),
    mv({ type: 'coleta', quantityKg: 100, locationId: 'loc-03', date: '2026-10-04' }),
    mv({ type: 'reutilizacao', quantityKg: 10, date: '2026-10-05' }),
    mv({ type: 'ajuste', quantityKg: -2.5, note: 'contagem', date: '2026-10-06' }),
  ];

  it('calcula saldos por local e por material', () => {
    expect(balanceOf(base, 'rs-01', 'loc-01')).toBe(17.5);
    expect(balanceOf(base, 'rs-01', 'loc-03')).toBe(20);
    expect(balanceByMaterial(base).get('rs-01')).toBe(37.5);
    expect(balanceOf(base, 'rs-01', 'loc-01', '2026-10-02')).toBe(150);
  });

  it('demonstrativo: final = inicial + entradas − reutilizações − coletas ± ajustes', () => {
    const [row] = stockStatement(base, '2026-10-01', '2026-10-31');
    expect(row).toMatchObject({ initial: 100, entries: 50, reuse: 10, transfers: 120, collections: 100, adjustments: -2.5, final: 37.5 });
  });

  it('impede retirada maior que o saldo disponível', () => {
    const r = checkMovement(base, mv({ type: 'coleta', quantityKg: 21, locationId: 'loc-03', date: '2026-10-10' }));
    expect(r.ok).toBe(false);
    expect(checkMovement(base, mv({ type: 'coleta', quantityKg: 20, locationId: 'loc-03', date: '2026-10-10' })).ok).toBe(true);
  });

  it('impede retirada retroativa que torna saldos posteriores negativos', () => {
    const r = checkMovement(base, mv({ type: 'reutilizacao', quantityKg: 40, date: '2026-10-02' }));
    expect(r.ok).toBe(false);
  });

  it('exige justificativa no ajuste e origem ≠ destino na transferência', () => {
    expect(checkMovement(base, mv({ type: 'ajuste', quantityKg: 1 })).ok).toBe(false);
    expect(checkMovement(base, mv({ type: 'transferencia', quantityKg: 1, toLocationId: 'loc-01' })).ok).toBe(false);
  });

  it('detecta inconsistências em históricos importados', () => {
    const bad = [...base, mv({ type: 'coleta', quantityKg: 999, locationId: 'loc-03', date: '2026-10-07' })];
    expect(detectInconsistencies(base)).toHaveLength(0);
    expect(detectInconsistencies(bad)).toHaveLength(1);
  });

  it('lançamento de apara gera entrada no estoque; retrabalho não', () => {
    let s = blank();
    const w = { date: '2026-10-10', materialId: 'rs-01', origin: 'maquina' as const, sectorId: 'set-ma', machineId: 'mq-01', unitId: 'u-g', reasonId: 'mot-refile', locationId: 'loc-01', registeredByRole: 'operador' as const };
    s = op.addWasteRecord(s, { ...w, netWeight: 2500, classification: 'apara_normal' }, ctx('operador'));
    expect(s.movements).toHaveLength(1);
    expect(s.movements[0]).toMatchObject({ type: 'entrada', quantityKg: 2.5 });
    s = op.addWasteRecord(s, { ...w, unitId: 'u-kg', netWeight: 3, classification: 'retrabalho', reasonId: 'mot-espec' }, ctx('operador'));
    expect(s.movements).toHaveLength(1);
    expect(() => op.addWasteRecord(s, { ...w, unitId: 'u-un', netWeight: 3, classification: 'apara_normal' }, ctx())).toThrow(/massa/);
    expect(() => op.addWasteRecord(s, { ...w, netWeight: 3, classification: 'apara_normal', reasonId: 'mot-contam' }, ctx())).toThrow(/não se aplica/);
  });
});
