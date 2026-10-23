import { describe, expect, it } from 'vitest';
import { fmtKg, stockByMaterial, totalKg, type RealData } from '../../real/data';

const base: RealData = { machines: [], materials: [], standards: [], entries: [], pickups: [] };
describe('Ambiente operacional sem registros fictícios', () => {
  it('inicia sem métricas artificiais', () => {
    expect(base.machines).toHaveLength(0);
    expect(base.entries).toHaveLength(0);
    expect(base.pickups).toHaveLength(0);
    expect(Object.values(stockByMaterial(base))).toHaveLength(0);
  });
  it('conta uma vez o material físico reciclável e retira somente a coleta', () => {
    const data = { ...base,
      entries: [
        { id:'e1', occurred_on:'2026-10-23', machine_id:'m1', material_id:'r1', batch_ref:'l1', origin_class:'perda_anormal', destination:'reciclagem', quantity_kg:10, reason:'teste', created_at:'' },
        { id:'e2', occurred_on:'2026-10-23', machine_id:'m1', material_id:'r1', batch_ref:'l2', origin_class:'apara_normal', destination:'reuso', quantity_kg:5, reason:null, created_at:'' },
      ],
      pickups: [{ id:'p1', occurred_on:'2026-10-23', material_id:'r1', quantity_kg:4, partner:'Empresa', document_ref:null, notes:null, created_at:'' }]
    } as RealData;
    expect(stockByMaterial(data)['r1']).toBe(6);
    expect(totalKg(data.entries)).toBe(15);
    expect(fmtKg(6)).toContain('kg');
  });
});
