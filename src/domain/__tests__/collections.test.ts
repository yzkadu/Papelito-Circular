import { describe, expect, it } from 'vitest';
import * as op from '../../data/operations';
import { blank, ctx } from '../../test/fixtures';
import { collectionDivergence, isDestinationProven, itemDivergence } from '../collections';
import { balanceOf } from '../stock';

function withStock(kg = 200) {
  let s = blank();
  s = op.addMovement(s, { date: '2026-10-01', type: 'saldo_inicial', materialId: 'rs-01', locationId: 'loc-03', quantityKg: kg, reference: 'abertura' }, ctx());
  s = op.scheduleCollection(s, { number: 'COL-1', company: 'Capital Recicláveis', scheduledDate: '2026-10-05', locationId: 'loc-03', items: [{ materialId: 'rs-01', declaredKg: 150 }] }, ctx('ambiental'));
  return s;
}

describe('divergência de pesagem', () => {
  it('calcula diferença absoluta e percentual sobre o informado', () => {
    expect(itemDivergence({ materialId: 'x', declaredKg: 100, confirmedKg: 97 })).toEqual({ diffKg: -3, pct: -0.03, outOfTolerance: true });
    expect(itemDivergence({ materialId: 'x', declaredKg: 100, confirmedKg: 101.5 })?.outOfTolerance).toBe(false);
    expect(itemDivergence({ materialId: 'x', declaredKg: 100, confirmedKg: 102 })?.outOfTolerance).toBe(false);
    expect(itemDivergence({ materialId: 'x', declaredKg: 100 })).toBeNull();
  });
});

describe('fluxo da coleta', () => {
  it('agendamento não baixa estoque; retirada baixa pelo peso informado', () => {
    let s = withStock();
    expect(balanceOf(s.movements, 'rs-01', 'loc-03')).toBe(200);
    const id = s.collections[0].id;
    s = op.transitionCollection(s, id, 'realizada', { collectedDate: '2026-10-05' }, ctx('capital'));
    expect(balanceOf(s.movements, 'rs-01', 'loc-03')).toBe(50);
    s = op.transitionCollection(s, id, 'pesagem_conferida', { confirmedKg: [140] }, ctx('capital'));
    const c = s.collections[0];
    expect(collectionDivergence(c)).toMatchObject({ diffKg: -10, outOfTolerance: true });
    expect(isDestinationProven(c)).toBe(false);
  });

  it('não permite retirada maior que o saldo', () => {
    const s = withStock(100);
    expect(() => op.transitionCollection(s, s.collections[0].id, 'realizada', { collectedDate: '2026-10-05' }, ctx())).toThrow(/Saldo insuficiente/);
  });

  it('não pula etapas e exige documento para destinação', () => {
    let s = withStock();
    const id = s.collections[0].id;
    expect(() => op.transitionCollection(s, id, 'pesagem_conferida', { confirmedKg: [150] }, ctx())).toThrow();
    s = op.transitionCollection(s, id, 'realizada', { collectedDate: '2026-10-05' }, ctx());
    s = op.transitionCollection(s, id, 'pesagem_conferida', { confirmedKg: [150] }, ctx());
    s = op.addCollectionDocument(s, id, { kind: 'ticket_pesagem', name: 'Ticket', reference: 'T1' }, ctx());
    expect(() => op.transitionCollection(s, id, 'destinacao_documentada', { destination: 'Reciclagem' }, ctx())).toThrow(/documento/);
    s = op.addCollectionDocument(s, id, { kind: 'cdf', name: 'CDF', reference: 'C1' }, ctx());
    s = op.transitionCollection(s, id, 'destinacao_documentada', { destination: 'Reciclagem' }, ctx());
    expect(isDestinationProven(s.collections[0])).toBe(true);
    expect(s.collections[0].history.map((h) => h.status)).toEqual(['agendada', 'realizada', 'pesagem_conferida', 'destinacao_documentada']);
  });
});
