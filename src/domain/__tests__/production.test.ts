import { describe, expect, it } from 'vitest';
import * as op from '../../data/operations';
import { blank, ctx } from '../../test/fixtures';
import { DomainError } from '../errors';
import { availableForManualStage, checkMachineBalance, checkManualBalance, finalOutputByUnit } from '../production';

function setup() {
  let s = blank();
  s = op.createOrder(s, { number: 'OP-1', productId: 'pr-c', route: 'maquina_manual', unitId: 'u-un', plannedQty: 1000, openedAt: '2026-10-01' }, ctx());
  const order = s.orders[0];
  s = op.addMachineRecord(s, {
    date: '2026-10-10', shift: 'A', machineId: 'mq-03', orderId: order.id, unitId: 'u-un',
    producedQty: 100, approvedQty: 90, rejectedQty: 6, reworkQty: 4, rawMaterialId: 'mp-02', rawMaterialKg: 5,
  }, ctx('operador'));
  return { s, order };
}

describe('cálculos de produção', () => {
  it('exige produzido = aprovado + rejeitado + retrabalho', () => {
    expect(checkMachineBalance({ producedQty: 100, approvedQty: 90, rejectedQty: 6, reworkQty: 4 }).ok).toBe(true);
    expect(checkMachineBalance({ producedQty: 100, approvedQty: 90, rejectedQty: 6, reworkQty: 5 }).ok).toBe(false);
    expect(checkMachineBalance({ producedQty: 0, approvedQty: 0, rejectedQty: 0, reworkQty: 0 }).ok).toBe(false);
    expect(checkMachineBalance({ producedQty: 0.3, approvedQty: 0.1, rejectedQty: 0.2, reworkQty: 0 }).ok).toBe(true);
  });

  it('etapa manual não pode concluir mais do que recebeu', () => {
    expect(checkManualBalance({ receivedQty: 50, completedQty: 48, rejectedQty: 2, reworkQty: 0 }).ok).toBe(true);
    expect(checkManualBalance({ receivedQty: 50, completedQty: 49, rejectedQty: 2, reworkQty: 0 }).ok).toBe(false);
  });

  it('recebimento manual limitado ao saldo aprovado na máquina (evita dupla contagem)', () => {
    const { s, order } = setup();
    expect(availableForManualStage(s, order.id)).toBe(90);
    const base = { date: '2026-10-10', shift: 'A' as const, sectorId: 'set-am', activityType: 'Acabamento', orderId: order.id, productId: 'pr-c', unitId: 'u-un', completedQty: 50, rejectedQty: 0, reworkQty: 0 };
    const s2 = op.addManualRecord(s, { ...base, receivedQty: 60 }, ctx('operador'));
    expect(availableForManualStage(s2, order.id)).toBe(30);
    expect(() => op.addManualRecord(s2, { ...base, receivedQty: 31, completedQty: 31 }, ctx('operador'))).toThrow(DomainError);
  });

  it('produção final conta a etapa manual e não o intermediário da máquina', () => {
    const { s, order } = setup();
    const s2 = op.addManualRecord(s, {
      date: '2026-10-10', shift: 'A', sectorId: 'set-am', activityType: 'Acabamento', orderId: order.id, productId: 'pr-c', unitId: 'u-un',
      receivedQty: 90, completedQty: 85, rejectedQty: 5, reworkQty: 0,
    }, ctx());
    expect(finalOutputByUnit(s2.orders, s2.machineRecords, s2.manualRecords)).toEqual({ 'u-un': 85 });
  });

  it('recusa registro com unidade diferente da ordem', () => {
    const { s, order } = setup();
    expect(() => op.addMachineRecord(s, {
      date: '2026-10-10', shift: 'B', machineId: 'mq-03', orderId: order.id, unitId: 'u-cx',
      producedQty: 1, approvedQty: 1, rejectedQty: 0, reworkQty: 0, rawMaterialId: 'mp-02', rawMaterialKg: 1,
    }, ctx())).toThrow(/mesma unidade/);
  });

  it('cadastro e edição de máquina com código único', () => {
    let s = blank();
    s = op.saveMaster(s, 'machines', { id: 'mq-new', code: 'mq-09', name: 'Nova máquina', sectorId: 'set-ma', active: true }, ctx());
    expect(s.machines.find((m) => m.id === 'mq-new')?.code).toBe('MQ-09');
    s = op.saveMaster(s, 'machines', { id: 'mq-new', code: 'MQ-09', name: 'Renomeada', sectorId: 'set-ma', active: false }, ctx());
    expect(s.machines.find((m) => m.id === 'mq-new')).toMatchObject({ name: 'Renomeada', active: false });
    expect(() => op.saveMaster(s, 'machines', { id: 'x', code: 'MQ-01', name: 'Duplicada', sectorId: 'set-ma', active: true }, ctx())).toThrow(/código/);
    expect(s.audit[0].action).toBe('editar');
  });
});
