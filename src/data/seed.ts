/**
 * BASE DEMONSTRATIVA — TODOS OS DADOS SÃO FICTÍCIOS.
 * Não representam máquinas, produtos, volumes, custos ou processos reais da Papelito
 * ou da Capital Recicláveis. Nomes terminam com "(demo)" para deixar isso explícito.
 *
 * A base é gerada de forma determinística (semente fixa) e passa pelas MESMAS operações
 * de negócio usadas pela interface — por isso os indicadores são calculados, não digitados.
 */
import { addDays, parseISODate, toISODate } from '../domain/dates';
import { balanceOf } from '../domain/stock';
import { round } from '../domain/units';
import type { ID, ISODate, Shift, Snapshot } from '../domain/types';
import * as op from './operations';

export const DEMO_DAYS = 90;
const DEMO_COMPANY = 'Capital Recicláveis';

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function emptySnapshot(referenceDate: ISODate): Snapshot {
  return {
    units: [], sectors: [], machines: [], products: [], materials: [], lossReasons: [], locations: [], lots: [],
    orders: [], machineRecords: [], manualRecords: [], wasteRecords: [], movements: [], collections: [], costs: [], audit: [],
    meta: { mode: 'demo', referenceDate, version: 1 },
  };
}

export function baseMasterData(s: Snapshot): Snapshot {
  return {
    ...s,
    units: [
      { id: 'u-kg', code: 'KG', name: 'Quilograma', dimension: 'massa', factorToBase: 1, active: true },
      { id: 'u-g', code: 'G', name: 'Grama', dimension: 'massa', factorToBase: 0.001, active: true },
      { id: 'u-t', code: 'T', name: 'Tonelada', dimension: 'massa', factorToBase: 1000, active: true },
      { id: 'u-un', code: 'UN', name: 'Unidade', dimension: 'contagem', factorToBase: 1, active: true },
      { id: 'u-mil', code: 'MIL', name: 'Milheiro', dimension: 'contagem', factorToBase: 1000, active: true },
      { id: 'u-cx', code: 'CX', name: 'Caixa', dimension: 'contagem', factorToBase: null, active: true },
      { id: 'u-bob', code: 'BOB', name: 'Bobina', dimension: 'contagem', factorToBase: null, active: true },
      { id: 'u-m', code: 'M', name: 'Metro', dimension: 'comprimento', factorToBase: 1, active: true },
    ],
    sectors: [
      { id: 'set-ma', code: 'SM-A', name: 'Setor mecanizado A (demo)', kind: 'mecanizado', active: true },
      { id: 'set-mb', code: 'SM-B', name: 'Setor mecanizado B (demo)', kind: 'mecanizado', active: true },
      { id: 'set-am', code: 'AM-1', name: 'Acabamento manual (demo)', kind: 'manual', active: true },
      { id: 'set-res', code: 'RES', name: 'Central de resíduos (demo)', kind: 'apoio', active: true },
    ],
    machines: [
      { id: 'mq-01', code: 'MQ-01', name: 'Máquina demonstrativa 01', sectorId: 'set-ma', active: true },
      { id: 'mq-02', code: 'MQ-02', name: 'Máquina demonstrativa 02', sectorId: 'set-ma', active: true },
      { id: 'mq-03', code: 'MQ-03', name: 'Máquina demonstrativa 03', sectorId: 'set-mb', active: true },
      { id: 'mq-04', code: 'MQ-04', name: 'Máquina demonstrativa 04', sectorId: 'set-mb', active: true },
    ],
    products: [
      { id: 'pr-a', code: 'PD-A', name: 'Produto A — livreto (demo)', unitId: 'u-un', conversions: [{ unitId: 'u-cx', factor: 50 }], active: true },
      { id: 'pr-b', code: 'PD-B', name: 'Produto B — bobina cortada (demo)', unitId: 'u-bob', conversions: [], active: true },
      { id: 'pr-c', code: 'PD-C', name: 'Componente C — semiacabado (demo)', unitId: 'u-un', conversions: [{ unitId: 'u-cx', factor: 500 }], active: true },
      { id: 'pr-d', code: 'PD-D', name: 'Produto D — embalado (demo)', unitId: 'u-cx', conversions: [], active: true },
      { id: 'pr-e', code: 'PD-E', name: 'Kit E — montagem manual (demo)', unitId: 'u-un', conversions: [], active: true },
    ],
    materials: [
      { id: 'mp-01', code: 'MP-01', name: 'Papel base (demo)', use: 'materia_prima', category: 'papel', recyclable: true, active: true },
      { id: 'mp-02', code: 'MP-02', name: 'Cartão (demo)', use: 'materia_prima', category: 'cartao', recyclable: true, active: true },
      { id: 'rs-01', code: 'RS-01', name: 'Aparas de papel (demo)', use: 'residuo', category: 'papel', recyclable: true, sourceMaterialId: 'mp-01', active: true },
      { id: 'rs-02', code: 'RS-02', name: 'Aparas de cartão (demo)', use: 'residuo', category: 'cartao', recyclable: true, sourceMaterialId: 'mp-02', active: true },
      { id: 'rs-05', code: 'RS-05', name: 'Rejeito misto não reciclável (demo)', use: 'residuo', category: 'nao_reciclavel', recyclable: false, active: true },
    ],
    lossReasons: [
      { id: 'mot-refile', name: 'Refile / corte de borda', appliesTo: ['apara_normal'], active: true },
      { id: 'mot-pontas', name: 'Início e fim de bobina', appliesTo: ['apara_normal'], active: true },
      { id: 'mot-setup', name: 'Ajuste de máquina / setup acima do padrão', appliesTo: ['perda_anormal', 'retrabalho'], active: true },
      { id: 'mot-quebra', name: 'Quebra ou rasgo de material', appliesTo: ['perda_anormal', 'rejeito'], active: true },
      { id: 'mot-espec', name: 'Fora de especificação', appliesTo: ['perda_anormal', 'retrabalho', 'rejeito'], active: true },
      { id: 'mot-contam', name: 'Contaminação (cola, sujeira, umidade)', appliesTo: ['rejeito'], active: true },
      { id: 'mot-outro', name: 'Outro (descrever na ocorrência)', appliesTo: ['apara_normal', 'perda_anormal', 'retrabalho', 'rejeito'], active: true },
    ],
    locations: [
      { id: 'loc-01', code: 'ALM-01', name: 'Baia de aparas (demo)', active: true },
      { id: 'loc-02', code: 'ALM-02', name: 'Área de rejeitos (demo)', active: true },
      { id: 'loc-03', code: 'ALM-03', name: 'Área de expedição de recicláveis (demo)', active: true },
    ],
    lots: [
      { id: 'lote-01', code: 'BAG-RS01-001', materialId: 'rs-01', locationId: 'loc-03', container: 'bag', active: true },
      { id: 'lote-02', code: 'FARDO-RS02-001', materialId: 'rs-02', locationId: 'loc-03', container: 'fardo', active: true },
      { id: 'lote-03', code: 'TAMBOR-RS05-001', materialId: 'rs-05', locationId: 'loc-02', container: 'tambor', active: true },
    ],
  };
}

interface Line {
  machineId: ID;
  productId: ID;
  unitId: ID;
  route: 'maquina' | 'maquina_manual';
  mp: ID;
  residue: ID;
  produced: [number, number];
  kgPerUnit: number;
}

const LINES: Line[] = [
  { machineId: 'mq-01', productId: 'pr-a', unitId: 'u-cx', route: 'maquina', mp: 'mp-01', residue: 'rs-01', produced: [380, 460], kgPerUnit: 1.1 },
  { machineId: 'mq-02', productId: 'pr-b', unitId: 'u-bob', route: 'maquina', mp: 'mp-01', residue: 'rs-01', produced: [40, 60], kgPerUnit: 9 },
  { machineId: 'mq-03', productId: 'pr-c', unitId: 'u-un', route: 'maquina_manual', mp: 'mp-02', residue: 'rs-02', produced: [9000, 11000], kgPerUnit: 0.04 },
  { machineId: 'mq-04', productId: 'pr-d', unitId: 'u-cx', route: 'maquina', mp: 'mp-01', residue: 'rs-01', produced: [200, 260], kgPerUnit: 1.6 },
];

/** Gera a base demonstrativa completa terminando em `referenceDate`. */
export function generateDemoSnapshot(referenceDate: ISODate, seed = 20261017): Snapshot {
  const rnd = mulberry32(seed);
  const between = (a: number, b: number) => a + (b - a) * rnd();
  let seq = 0;
  let clock = parseISODate(addDays(referenceDate, -DEMO_DAYS - 1)).getTime();
  const ctx: op.OpContext = {
    role: 'admin',
    audit: false,
    newId: (p) => `${p}-${String(++seq).padStart(5, '0')}`,
    now: () => new Date((clock += 60_000)).toISOString(),
  };
  const setDay = (d: ISODate) => {
    clock = Math.max(clock, parseISODate(d).getTime() + 7 * 3_600_000);
  };
  const as = (role: op.OpContext['role']): op.OpContext => ({ ...ctx, role });

  let s = baseMasterData(emptySnapshot(referenceDate));
  const start = addDays(referenceDate, -DEMO_DAYS);

  // Custos FICTÍCIOS (apenas para demonstrar o cálculo).
  const DEMO_SRC = 'VALOR FICTÍCIO — demonstração';
  const costStart = addDays(start, -30);
  const midpoint = addDays(start, 45);
  s = op.saveCost(s, { kind: 'materia_prima', materialId: 'mp-01', valuePerKg: 7.8, validFrom: costStart, validTo: addDays(midpoint, -1), source: DEMO_SRC, demo: true }, ctx);
  s = op.saveCost(s, { kind: 'materia_prima', materialId: 'mp-01', valuePerKg: 8.1, validFrom: midpoint, source: DEMO_SRC, demo: true }, ctx);
  s = op.saveCost(s, { kind: 'materia_prima', materialId: 'mp-02', valuePerKg: 5.4, validFrom: costStart, source: DEMO_SRC, demo: true }, ctx);
  s = op.saveCost(s, { kind: 'venda_residuo', materialId: 'rs-01', valuePerKg: 0.85, validFrom: costStart, source: DEMO_SRC, demo: true }, ctx);
  s = op.saveCost(s, { kind: 'venda_residuo', materialId: 'rs-02', valuePerKg: 0.6, validFrom: costStart, source: DEMO_SRC, demo: true }, ctx);

  // Estoque inicial.
  const initDate = addDays(start, -1);
  setDay(initDate);
  for (const [materialId, locationId, kg] of [['rs-01', 'loc-01', 1200], ['rs-02', 'loc-01', 600], ['rs-05', 'loc-02', 80]] as const) {
    s = op.addMovement(s, { date: initDate, type: 'saldo_inicial', materialId, locationId, quantityKg: kg, reference: 'Inventário de abertura (demo)' }, ctx);
  }

  // Ordens: uma por produto a cada bloco de 30 dias.
  const orderFor = new Map<string, ID>();
  let orderSeq = 100;
  const ensureOrder = (productId: ID, unitId: ID, route: 'maquina' | 'maquina_manual' | 'manual', day: ISODate) => {
    const block = Math.floor((parseISODate(day).getTime() - parseISODate(start).getTime()) / (30 * 86_400_000));
    const k = `${productId}|${block}`;
    if (!orderFor.has(k)) {
      for (const [kk, id] of orderFor) {
        const prevOrder = s.orders.find((o) => o.id === id);
        if (kk.startsWith(`${productId}|`) && prevOrder?.status === 'aberta') s = op.closeOrder(s, id, ctx);
      }
      s = op.createOrder(s, { number: `OP-DEMO-${++orderSeq}`, productId, route, unitId, plannedQty: 999999, openedAt: day }, ctx);
      orderFor.set(k, s.orders[s.orders.length - 1].id);
    }
    return orderFor.get(k)!;
  };

  let collectionSeq = 0;
  for (let i = 0; i <= DEMO_DAYS; i++) {
    const day = addDays(start, i);
    setDay(day);
    const dow = parseISODate(day).getDay();
    if (dow === 0) continue; // domingo sem produção na demonstração

    let mq03Approved = 0;
    let mq03Order = '';
    for (const line of LINES) {
      const orderId = ensureOrder(line.productId, line.unitId, line.route, day);
      const shifts: Shift[] = dow === 6 ? ['A'] : ['A', 'B'];
      for (const shift of shifts) {
        const produced = Math.round(between(...line.produced));
        const approved = Math.round(produced * between(0.93, 0.975));
        const rejected = Math.min(Math.round(produced * between(0.01, 0.03)), produced - approved);
        const rework = produced - approved - rejected;
        const rawKg = round(produced * line.kgPerUnit * between(1.02, 1.07), 1);
        const abnormal = rnd() < 0.18;
        s = op.addMachineRecord(
          s,
          {
            date: day, shift, machineId: line.machineId, orderId, unitId: line.unitId, producedQty: produced,
            approvedQty: approved, rejectedQty: rejected, reworkQty: rework, rawMaterialId: line.mp, rawMaterialKg: rawKg,
            occurrence: abnormal ? 'Parada para ajuste fora do padrão (demo)' : undefined,
            lossReasonId: abnormal ? 'mot-setup' : undefined,
          },
          as('operador'),
        );
        const recId = s.machineRecords[s.machineRecords.length - 1].id;
        if (i < DEMO_DAYS - 3) s = op.validateRecord(s, 'machine', recId, as('supervisor'));
        if (line.machineId === 'mq-03') {
          mq03Approved += approved;
          mq03Order = orderId;
        }
        const sectorId = s.machines.find((m) => m.id === line.machineId)!.sectorId;
        const waste = (classification: 'apara_normal' | 'perda_anormal' | 'retrabalho' | 'rejeito', kg: number, reasonId: ID, materialId = line.residue) => {
          s = op.addWasteRecord(
            s,
            {
              date: day, materialId, origin: 'maquina', sectorId, machineId: line.machineId, netWeight: round(kg, 1), unitId: 'u-kg',
              classification, reasonId, locationId: classification === 'rejeito' ? 'loc-02' : 'loc-01',
              productionRecordId: recId, registeredByRole: 'operador',
            },
            as('operador'),
          );
        };
        waste('apara_normal', rawKg * between(0.025, 0.045), rnd() < 0.6 ? 'mot-refile' : 'mot-pontas');
        if (abnormal) waste('perda_anormal', rawKg * between(0.006, 0.022), rnd() < 0.5 ? 'mot-setup' : 'mot-quebra');
        if (rnd() < 0.1) waste('retrabalho', rawKg * between(0.002, 0.008), 'mot-espec');
        if (rnd() < 0.08) waste('rejeito', rawKg * between(0.001, 0.004), 'mot-contam', 'rs-05');
      }
    }

    // Etapa manual posterior à MQ-03: recebe parte do aprovado (sem dupla contagem).
    if (mq03Order) {
      const received = Math.floor(mq03Approved * between(0.9, 1));
      const completed = Math.floor(received * between(0.96, 0.99));
      const rejected = Math.floor(received * between(0.003, 0.01));
      const rework = Math.max(0, Math.floor((received - completed - rejected) * 0.5));
      s = op.addManualRecord(
        s,
        {
          date: day, shift: 'A', sectorId: 'set-am', activityType: 'Acabamento e embalagem (demo)', orderId: mq03Order,
          productId: 'pr-c', unitId: 'u-un', receivedQty: received, completedQty: completed, rejectedQty: rejected, reworkQty: rework,
        },
        as('operador'),
      );
      if (i < DEMO_DAYS - 3) s = op.validateRecord(s, 'manual', s.manualRecords[s.manualRecords.length - 1].id, as('supervisor'));
      if (rnd() < 0.3) {
        s = op.addWasteRecord(
          s,
          {
            date: day, materialId: 'rs-02', origin: 'manual', sectorId: 'set-am', netWeight: round(between(2, 6), 1), unitId: 'u-kg',
            classification: 'apara_normal', reasonId: 'mot-refile', locationId: 'loc-01', registeredByRole: 'operador',
          },
          as('operador'),
        );
      }
    }

    // Atividade exclusivamente manual.
    if (dow !== 6) {
      const orderId = ensureOrder('pr-e', 'u-un', 'manual', day);
      const received = Math.round(between(300, 400));
      const completed = Math.round(received * between(0.95, 0.99));
      s = op.addManualRecord(
        s,
        {
          date: day, shift: 'A', sectorId: 'set-am', activityType: 'Montagem de kit (demo)', orderId, productId: 'pr-e', unitId: 'u-un',
          receivedQty: received, completedQty: completed, rejectedQty: Math.round((received - completed) * 0.4), reworkQty: 0,
        },
        as('operador'),
      );
      if (i < DEMO_DAYS - 3) s = op.validateRecord(s, 'manual', s.manualRecords[s.manualRecords.length - 1].id, as('supervisor'));
    }

    // Reutilização ocasional de aparas.
    if (dow === 2 && rnd() < 0.5) {
      const avail = balanceOf(s.movements, 'rs-01', 'loc-01', day);
      if (avail > 50) {
        s = op.addMovement(s, { date: day, type: 'reutilizacao', materialId: 'rs-01', locationId: 'loc-01', quantityKg: 30, reference: 'Reaproveitamento interno (demo)' }, as('ambiental'));
      }
    }

    // Quarta: transferência para a área de expedição. Quinta: coleta.
    if (dow === 3) {
      for (const mat of ['rs-01', 'rs-02']) {
        const avail = balanceOf(s.movements, mat, 'loc-01', day);
        const qty = round(avail * 0.85, 1);
        if (qty > 0) {
          s = op.addMovement(s, { date: day, type: 'transferencia', materialId: mat, locationId: 'loc-01', toLocationId: 'loc-03', quantityKg: qty, reference: `Enfardamento semanal ${day} (demo)` }, as('ambiental'));
        }
      }
    }
    if (dow === 4) {
      const items = (['rs-01', 'rs-02'] as const)
        .map((mat) => ({ materialId: mat, lotId: mat === 'rs-01' ? 'lote-01' : 'lote-02', declaredKg: round(balanceOf(s.movements, mat, 'loc-03', day), 1) }))
        .filter((it) => it.declaredKg > 0);
      if (items.length) {
        const number = `COL-DEMO-${String(++collectionSeq).padStart(3, '0')}`;
        s = op.scheduleCollection(s, { number, company: DEMO_COMPANY, scheduledDate: day, locationId: 'loc-03', items }, as('ambiental'));
        const col = s.collections[s.collections.length - 1];
        const age = DEMO_DAYS - i;
        s = op.addCollectionDocument(s, col.id, { kind: 'comprovante_retirada', name: 'Comprovante de retirada (demo)', reference: `RET-DEMO-${collectionSeq}` }, as('capital'));
        s = op.transitionCollection(s, col.id, 'realizada', { collectedDate: day }, as('capital'));
        if (age > 6) {
          const factor = collectionSeq === 4 ? 0.955 : between(0.985, 1.01);
          s = op.addCollectionDocument(s, col.id, { kind: 'ticket_pesagem', name: 'Ticket de pesagem (demo)', reference: `PES-DEMO-${collectionSeq}` }, as('capital'));
          s = op.transitionCollection(s, col.id, 'pesagem_conferida', { confirmedKg: items.map((it) => round(it.declaredKg * factor, 1)) }, as('capital'));
        }
        if (age > 14) {
          s = op.addCollectionDocument(s, col.id, { kind: 'cdf', name: 'Certificado de destinação (referência demo)', reference: `CDF-DEMO-${collectionSeq}` }, as('ambiental'));
          s = op.transitionCollection(s, col.id, 'destinacao_documentada', { destination: 'Reciclagem de papel e cartão — conforme documento demonstrativo' }, as('ambiental'));
        }
      }
    }

    // Ajuste mensal de inventário (exemplo de diferença física).
    if (i === 60) {
      s = op.addMovement(s, { date: day, type: 'ajuste', materialId: 'rs-01', locationId: 'loc-01', quantityKg: -12.5, reference: 'Inventário físico (demo)', note: 'Diferença encontrada na contagem física (demo)' }, as('ambiental'));
    }
  }

  // Próxima coleta agendada (ainda sem baixa no estoque).
  let next = addDays(referenceDate, 1);
  while (parseISODate(next).getDay() !== 4) next = addDays(next, 1);
  setDay(referenceDate);
  const est = round(balanceOf(s.movements, 'rs-01', 'loc-03'), 1);
  s = op.scheduleCollection(
    s,
    {
      number: `COL-DEMO-${String(++collectionSeq).padStart(3, '0')}`, company: DEMO_COMPANY, scheduledDate: next, locationId: 'loc-03',
      items: [{ materialId: 'rs-01', lotId: 'lote-01', declaredKg: est > 0 ? est : 250 }], notes: 'Peso estimado; confirmar no dia (demo).',
    },
    as('ambiental'),
  );

  return { ...s, audit: [{ id: 'aud-seed', at: new Date().toISOString(), role: 'admin', action: 'redefinir', entity: 'base demonstrativa', entityId: '-', summary: `Base fictícia gerada (${DEMO_DAYS} dias até ${referenceDate})` }] };
}

export const defaultReferenceDate = () => toISODate(new Date());
