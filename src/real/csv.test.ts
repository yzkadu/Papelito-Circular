import { describe, expect, it } from 'vitest';
import { CSV_HEADER, validateCsv } from './csv';
import { difference } from './CapitalReconciliation';
import type { RealData, Pickup, PickupConfirmation } from './data';

const data:RealData = {
  machines:[{id:'mq1',code:'MQ-01',name:'Máquina',active:true,created_at:''}],
  materials:[{id:'mat1',code:'AP-01',name:'Aparas',active:true,recyclable:true,created_at:''}],
  standards:[],entries:[],pickups:[],confirmations:[],evidence:[],
};
const row = (id='REF001',classification='apara_normal',motivo='') =>
  [id,'09/11/2026','MQ-01','AP-01','OP123',classification,'reciclagem','12,500',motivo].join(';');
describe('importação real de planilhas',()=>{
  it('modelo não contém dados fictícios',()=>expect(CSV_HEADER.trim().split('\n')).toHaveLength(1));
  it('valida CSV e mapeia códigos cadastrados',()=>{
    const checked=validateCsv(CSV_HEADER+row()+'\n',data);
    expect(checked).toHaveLength(1);
    expect(checked[0].errors).toEqual([]);
    expect(checked[0].record).toMatchObject({machine_id:'mq1',material_id:'mat1',quantity_kg:12.5,source_ref:'csv:REF001',import_source:'csv'});
  });
  it('impede duplicidade dentro do mesmo arquivo e ao reenviar',()=>{
    const repeated=validateCsv(CSV_HEADER+row()+'\n'+row()+'\n',data);
    expect(repeated[1].errors).toContain('id_origem já usado');
    const history={...data,entries:[{id:'e1',occurred_on:'2026-11-09',machine_id:'mq1',material_id:'mat1',batch_ref:'OP123',origin_class:'apara_normal' as const,destination:'reciclagem' as const,quantity_kg:12.5,reason:null,created_at:'',source_ref:'csv:REF001'}]};
    expect(validateCsv(CSV_HEADER+row()+'\n',history)[0].errors).toContain('id_origem já usado');
  });
  it('exige motivo para perda anormal',()=>{
    expect(validateCsv(CSV_HEADER+row('R002','perda_anormal','')+'\n',data)[0].errors).toContain('motivo obrigatório para perda');
  });
  it('rejeita códigos de máquinas inexistentes',()=>{
    expect(validateCsv(CSV_HEADER+row().replace('MQ-01','FICTICIA')+'\n',data)[0].errors).toContain('máquina não cadastrada/ativa');
  });
});
describe('conciliação Papelito–Capital',()=>{
  it('diferença de peso positiva ou negativa não muda a retirada de origem',()=>{
    const pickup={quantity_kg:100} as Pickup;
    expect(difference(pickup,{received_kg:98.5} as PickupConfirmation)).toBe(-1.5);
    expect(difference(pickup,{received_kg:101.25} as PickupConfirmation)).toBe(1.25);
    expect(difference(pickup,{received_kg:100} as PickupConfirmation)).toBe(0);
  });
});
