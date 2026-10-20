import { describe, expect, it } from 'vitest';
import { collectionDivergence } from '../../domain/collections';
import { computeDashboard } from '../../domain/indicators';
import { detectInconsistencies } from '../../domain/stock';
import { demo, REF } from '../../test/fixtures';
import { generateDemoSnapshot } from '../seed';

describe('base demonstrativa', () => {
  const s = demo();

  it('é determinística', () => {
    const again = generateDemoSnapshot(REF);
    expect(again.machineRecords.length).toBe(s.machineRecords.length);
    expect(again.wasteRecords.map((w) => w.netWeight)).toEqual(s.wasteRecords.map((w) => w.netWeight));
  });

  it('é identificada como fictícia', () => {
    expect(s.meta.mode).toBe('demo');
    expect(s.costs.every((c) => c.demo)).toBe(true);
    expect(s.machines.every((m) => /demonstrativa/i.test(m.name))).toBe(true);
    expect(s.products.every((p) => /\(demo\)/.test(p.name))).toBe(true);
  });

  it('respeita as regras do estoque (nenhum saldo negativo)', () => {
    expect(detectInconsistencies(s.movements)).toEqual([]);
  });

  it('cobre todo o fluxo: produção → aparas → estoque → coleta → destinação', () => {
    expect(s.machineRecords.length).toBeGreaterThan(100);
    expect(s.manualRecords.length).toBeGreaterThan(50);
    expect(new Set(s.wasteRecords.map((w) => w.classification))).toEqual(new Set(['apara_normal', 'perda_anormal', 'retrabalho', 'rejeito']));
    const statuses = new Set(s.collections.map((c) => c.status));
    for (const st of ['agendada', 'realizada', 'pesagem_conferida', 'destinacao_documentada']) expect(statuses).toContain(st);
    expect(s.collections.some((c) => collectionDivergence(c)?.outOfTolerance)).toBe(true);
  });

  it('indicadores são calculados a partir dos registros', () => {
    const f = { from: '2026-09-16', to: REF };
    const d = computeDashboard(s, f);
    const expected = s.machineRecords.filter((r) => r.date >= f.from && r.date <= f.to).reduce((a, r) => a + r.rawMaterialKg, 0);
    expect(d.mpKg).toBeCloseTo(expected, 3);
    expect(d.aproveitamento).toBeGreaterThan(0.9);
    expect(d.aproveitamento).toBeLessThan(1);
    expect(Object.keys(d.finalOutput).sort()).toEqual(['u-bob', 'u-cx', 'u-un']);
    // filtro por máquina restringe os dados
    const one = computeDashboard(s, { ...f, machineId: 'mq-01' });
    expect(one.byMachine.map((m) => m.code)).toEqual(['MQ-01']);
    expect(one.mpKg).toBeLessThan(d.mpKg);
  });
});
