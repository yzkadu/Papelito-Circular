import { describe, expect, it } from 'vitest';
import { collectionSchema, costSchema, machineRecordSchema, movementSchema, wasteSchema } from './schemas';

const issues = (r: { success: boolean; error?: { issues: { path: (string | number)[]; message: string }[] } }) =>
  r.success ? [] : r.error!.issues.map((i) => `${i.path.join('.')}: ${i.message}`);

describe('validação dos formulários', () => {
  const machine = {
    date: '2026-10-10', shift: 'A', machineId: 'mq-01', orderId: 'op-1', producedQty: '100', approvedQty: '95',
    rejectedQty: '3', reworkQty: '2', rawMaterialId: 'mp-01', rawMaterialKg: '110', lossReasonId: 'mot-setup', occurrence: '',
  };

  it('aceita produção balanceada (números digitados como texto)', () => {
    const r = machineRecordSchema.safeParse(machine);
    expect(r.success).toBe(true);
    expect(r.success && r.data.producedQty).toBe(100);
  });

  it('rejeita produção desbalanceada, campos vazios e negativos', () => {
    expect(issues(machineRecordSchema.safeParse({ ...machine, approvedQty: '96' })).join()).toMatch(/precisa ser igual/);
    expect(issues(machineRecordSchema.safeParse({ ...machine, machineId: '' })).join()).toMatch(/Selecione a máquina/);
    expect(issues(machineRecordSchema.safeParse({ ...machine, rejectedQty: '-1', approvedQty: '99' })).join()).toMatch(/negativo/);
    expect(issues(machineRecordSchema.safeParse({ ...machine, lossReasonId: '' })).join()).toMatch(/motivo/);
  });

  it('perdas: máquina obrigatória quando a origem é máquina', () => {
    const w = { date: '2026-10-10', materialId: 'rs-01', origin: 'maquina', sectorId: 'set-ma', machineId: '', netWeight: '3', unitId: 'u-kg', classification: 'apara_normal', reasonId: 'mot-refile', locationId: 'loc-01' };
    expect(issues(wasteSchema.safeParse(w)).join()).toMatch(/máquina/);
    expect(wasteSchema.safeParse({ ...w, origin: 'manual' }).success).toBe(true);
    expect(issues(wasteSchema.safeParse({ ...w, origin: 'manual', netWeight: '0' })).join()).toMatch(/maior que zero/);
  });

  it('movimentação: ajuste exige justificativa; transferência exige destino diferente', () => {
    const m = { date: '2026-10-10', type: 'ajuste', materialId: 'rs-01', locationId: 'loc-01', quantityKg: '-3', reference: 'inv', note: '' };
    expect(issues(movementSchema.safeParse(m)).join()).toMatch(/Justifique/);
    expect(movementSchema.safeParse({ ...m, note: 'contagem' }).success).toBe(true);
    expect(issues(movementSchema.safeParse({ ...m, type: 'transferencia', quantityKg: '3', toLocationId: 'loc-01' })).join()).toMatch(/Destino igual/);
  });

  it('coleta exige ao menos um material com peso', () => {
    expect(issues(collectionSchema.safeParse({ number: 'C1', scheduledDate: '2026-10-10', locationId: 'loc-03', items: [] })).join()).toMatch(/ao menos um/);
  });

  it('custo exige origem e vigência coerente', () => {
    const c = { kind: 'materia_prima', materialId: 'mp-01', valuePerKg: '7', validFrom: '2026-10-10', validTo: '2026-10-01', source: 'cotação' };
    expect(issues(costSchema.safeParse(c)).join()).toMatch(/posterior/);
    expect(issues(costSchema.safeParse({ ...c, validTo: '', source: '' })).join()).toMatch(/origem/);
  });
});
