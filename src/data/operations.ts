/**
 * Operações de escrita sobre o Snapshot.
 * Funções puras: recebem o estado, validam as regras de negócio e devolvem um NOVO estado
 * (ou lançam DomainError). São usadas pelo repositório demonstrativo E pelo gerador de dados
 * fictícios — assim a base de demonstração obedece às mesmas regras que a interface.
 * Na Fase 2 estas regras serão replicadas no banco (constraints, triggers e funções RPC).
 */
import { checkTransition, type TransitionPayload, STATUS_LABEL } from '../domain/collections';
import { assertCheck, DomainError } from '../domain/errors';
import {
  checkMachineAgainstOrder,
  checkMachineBalance,
  checkManualAgainstOrder,
  checkManualBalance,
} from '../domain/production';
import { checkMovement } from '../domain/stock';
import { round, toKg } from '../domain/units';
import { checkWasteRecord, entersWasteStock, type WasteInput } from '../domain/waste';
import type {
  AuditEntry,
  Collection,
  CollectionDocument,
  CollectionStatus,
  CostEntry,
  ID,
  ISODate,
  Machine,
  MachineProductionRecord,
  ManualProductionRecord,
  Material,
  Product,
  ProductionOrder,
  Role,
  Sector,
  Snapshot,
  StockMovement,
  StorageLocation,
  Unit,
  WasteRecord,
} from '../domain/types';

export interface OpContext {
  role: Role;
  now: () => string;
  newId: (prefix: string) => string;
  /** Desligado ao gerar a base demonstrativa (evita milhares de entradas de auditoria). */
  audit?: boolean;
}

function withAudit(s: Snapshot, ctx: OpContext, e: Omit<AuditEntry, 'id' | 'at' | 'role'>): Snapshot {
  if (ctx.audit === false) return s;
  const entry: AuditEntry = { id: ctx.newId('aud'), at: ctx.now(), role: ctx.role, ...e };
  return { ...s, audit: [entry, ...s.audit] };
}

// ------------------------------------------------------------------ Cadastros
export type MasterKind = 'units' | 'sectors' | 'machines' | 'products' | 'materials' | 'locations';
export type MasterItem = {
  units: Unit;
  sectors: Sector;
  machines: Machine;
  products: Product;
  materials: Material;
  locations: StorageLocation;
};

const MASTER_LABEL: Record<MasterKind, string> = {
  units: 'unidade',
  sectors: 'setor',
  machines: 'máquina',
  products: 'produto',
  materials: 'material',
  locations: 'local',
};

export function saveMaster<K extends MasterKind>(s: Snapshot, kind: K, item: MasterItem[K], ctx: OpContext): Snapshot {
  const list = s[kind] as MasterItem[K][];
  const code = item.code.trim().toUpperCase();
  if (!code) throw new DomainError('Informe o código.');
  if (!item.name.trim()) throw new DomainError('Informe o nome.');
  if (list.some((x) => x.id !== item.id && x.code.toUpperCase() === code)) {
    throw new DomainError(`Já existe ${MASTER_LABEL[kind]} com o código ${code}.`);
  }
  if (kind === 'machines' && !s.sectors.some((x) => x.id === (item as Machine).sectorId)) {
    throw new DomainError('Setor da máquina não encontrado.');
  }
  if (kind === 'units') {
    const u = item as Unit;
    if (u.factorToBase !== null && !(u.factorToBase > 0)) throw new DomainError('O fator de conversão deve ser maior que zero.');
  }
  if (kind === 'products') {
    const p = item as Product;
    if (!s.units.some((u) => u.id === p.unitId)) throw new DomainError('Unidade do produto não encontrada.');
    if (p.conversions.some((c) => !(c.factor > 0))) throw new DomainError('Fatores de conversão devem ser maiores que zero.');
  }
  const exists = list.some((x) => x.id === item.id);
  const next = exists ? list.map((x) => (x.id === item.id ? { ...item, code } : x)) : [...list, { ...item, code }];
  return withAudit({ ...s, [kind]: next }, ctx, {
    action: exists ? 'editar' : 'criar',
    entity: MASTER_LABEL[kind],
    entityId: item.id,
    summary: `${exists ? 'Editou' : 'Cadastrou'} ${MASTER_LABEL[kind]} ${code} — ${item.name}`,
  });
}

// ------------------------------------------------------------------ Produção
export type OrderInput = Omit<ProductionOrder, 'id' | 'status'>;

export function createOrder(s: Snapshot, input: OrderInput, ctx: OpContext): Snapshot {
  if (!input.number.trim()) throw new DomainError('Informe o número da ordem.');
  if (s.orders.some((o) => o.number === input.number)) throw new DomainError(`A ordem ${input.number} já existe.`);
  if (!(input.plannedQty > 0)) throw new DomainError('A quantidade planejada deve ser maior que zero.');
  const product = s.products.find((p) => p.id === input.productId);
  if (!product) throw new DomainError('Produto não encontrado.');
  if (input.unitId !== product.unitId && !product.conversions.some((c) => c.unitId === input.unitId)) {
    throw new DomainError(`A unidade escolhida não está cadastrada para o produto ${product.name}.`);
  }
  const order: ProductionOrder = { ...input, id: ctx.newId('op'), status: 'aberta' };
  return withAudit({ ...s, orders: [...s.orders, order] }, ctx, {
    action: 'criar', entity: 'ordem de produção', entityId: order.id, summary: `Abriu a ordem ${order.number}`,
  });
}

export function closeOrder(s: Snapshot, orderId: ID, ctx: OpContext): Snapshot {
  const o = s.orders.find((x) => x.id === orderId);
  if (!o) throw new DomainError('Ordem não encontrada.');
  return withAudit({ ...s, orders: s.orders.map((x) => (x.id === orderId ? { ...x, status: 'encerrada' } : x)) }, ctx, {
    action: 'status', entity: 'ordem de produção', entityId: orderId, summary: `Encerrou a ordem ${o.number}`,
  });
}

export type MachineRecordInput = Omit<MachineProductionRecord, 'id' | 'status' | 'createdByRole' | 'createdAt'>;

export function addMachineRecord(s: Snapshot, input: MachineRecordInput, ctx: OpContext): Snapshot {
  assertCheck(checkMachineBalance(input));
  const machine = s.machines.find((m) => m.id === input.machineId);
  if (!machine || !machine.active) throw new DomainError('Máquina não encontrada ou inativa.');
  assertCheck(checkMachineAgainstOrder(s.orders.find((o) => o.id === input.orderId), input.unitId));
  const mp = s.materials.find((m) => m.id === input.rawMaterialId);
  if (!mp || mp.use !== 'materia_prima') throw new DomainError('Selecione uma matéria-prima válida.');
  if (!(input.rawMaterialKg > 0)) throw new DomainError('Informe o consumo de matéria-prima em kg.');
  const rec: MachineProductionRecord = {
    ...input,
    rawMaterialKg: round(input.rawMaterialKg, 3),
    id: ctx.newId('pm'),
    status: 'pendente',
    createdByRole: ctx.role,
    createdAt: ctx.now(),
  };
  return withAudit({ ...s, machineRecords: [...s.machineRecords, rec] }, ctx, {
    action: 'criar', entity: 'produção por máquina', entityId: rec.id,
    summary: `Registrou produção na ${machine.code} (${input.date}, turno ${input.shift}): ${input.producedQty} produzidos`,
  });
}

export type ManualRecordInput = Omit<ManualProductionRecord, 'id' | 'status' | 'createdByRole' | 'createdAt'>;

export function addManualRecord(s: Snapshot, input: ManualRecordInput, ctx: OpContext): Snapshot {
  assertCheck(checkManualBalance(input));
  assertCheck(checkManualAgainstOrder(s, input));
  const order = s.orders.find((o) => o.id === input.orderId)!;
  if (order.productId !== input.productId) throw new DomainError('O produto não corresponde à ordem de produção.');
  if (!input.activityType.trim()) throw new DomainError('Informe o tipo de atividade.');
  const rec: ManualProductionRecord = {
    ...input, id: ctx.newId('pmn'), status: 'pendente', createdByRole: ctx.role, createdAt: ctx.now(),
  };
  return withAudit({ ...s, manualRecords: [...s.manualRecords, rec] }, ctx, {
    action: 'criar', entity: 'produção manual', entityId: rec.id,
    summary: `Registrou atividade manual "${input.activityType}" (${input.date}): ${input.completedQty} concluídos`,
  });
}

export function validateRecord(s: Snapshot, kind: 'machine' | 'manual', id: ID, ctx: OpContext): Snapshot {
  const key = kind === 'machine' ? 'machineRecords' : 'manualRecords';
  const list = s[key] as (MachineProductionRecord | ManualProductionRecord)[];
  const rec = list.find((r) => r.id === id);
  if (!rec) throw new DomainError('Registro não encontrado.');
  if (rec.status === 'validado') throw new DomainError('Este registro já foi validado.');
  const next = list.map((r) => (r.id === id ? { ...r, status: 'validado' as const } : r));
  return withAudit({ ...s, [key]: next }, ctx, {
    action: 'validar', entity: kind === 'machine' ? 'produção por máquina' : 'produção manual', entityId: id,
    summary: `Validou o lançamento de ${rec.date}`,
  });
}

// ------------------------------------------------------------------ Estoque
export type MovementInput = Omit<StockMovement, 'id' | 'createdByRole' | 'createdAt'>;

export function addMovement(s: Snapshot, input: MovementInput, ctx: OpContext): Snapshot {
  if (!s.materials.some((m) => m.id === input.materialId && m.use === 'residuo')) {
    throw new DomainError('Selecione um material do estoque de resíduos.');
  }
  const mov: StockMovement = {
    ...input, quantityKg: round(input.quantityKg, 3), id: ctx.newId('mov'), createdByRole: ctx.role, createdAt: ctx.now(),
  };
  assertCheck(checkMovement(s.movements, mov));
  return withAudit({ ...s, movements: [...s.movements, mov] }, ctx, {
    action: 'criar', entity: 'movimentação de estoque', entityId: mov.id,
    summary: `${mov.type} de ${mov.quantityKg} kg — ref. ${mov.reference}`,
  });
}

// ------------------------------------------------------------------ Perdas e aparas
export function addWasteRecord(s: Snapshot, input: WasteInput, ctx: OpContext): Snapshot {
  assertCheck(checkWasteRecord(s, input));
  const kg = toKg(input.netWeight, input.unitId, s.units);
  if (!kg.ok) throw new DomainError(kg.error);
  const rec: WasteRecord = { ...input, id: ctx.newId('res'), createdAt: ctx.now() };
  let next: Snapshot = { ...s, wasteRecords: [...s.wasteRecords, rec] };
  if (entersWasteStock(input.classification)) {
    next = addMovement(
      next,
      {
        date: input.date, type: 'entrada', materialId: input.materialId, locationId: input.locationId,
        quantityKg: kg.value, reference: `Lançamento ${rec.id}`, sourceId: rec.id,
      },
      { ...ctx, audit: false },
    );
  }
  return withAudit(next, ctx, {
    action: 'criar', entity: 'perdas e aparas', entityId: rec.id,
    summary: `Registrou ${input.classification.replace('_', ' ')}: ${input.netWeight} (${input.date})`,
  });
}

// ------------------------------------------------------------------ Coletas
export interface CollectionInput {
  number: string;
  company: string;
  scheduledDate: ISODate;
  locationId: ID;
  items: { materialId: ID; lotId?: ID; declaredKg: number }[];
  notes?: string;
}

export function scheduleCollection(s: Snapshot, input: CollectionInput, ctx: OpContext): Snapshot {
  if (s.collections.some((c) => c.number === input.number)) throw new DomainError(`A coleta ${input.number} já existe.`);
  if (input.items.length === 0) throw new DomainError('Inclua ao menos um material.');
  if (input.items.some((i) => !(i.declaredKg > 0))) throw new DomainError('O peso informado deve ser maior que zero.');
  const col: Collection = {
    ...input, id: ctx.newId('col'), status: 'agendada', documents: [],
    history: [{ status: 'agendada', at: ctx.now(), role: ctx.role }],
  };
  return withAudit({ ...s, collections: [...s.collections, col] }, ctx, {
    action: 'criar', entity: 'coleta', entityId: col.id, summary: `Agendou a coleta ${col.number} para ${col.scheduledDate}`,
  });
}

export function transitionCollection(
  s: Snapshot, id: ID, to: CollectionStatus, payload: TransitionPayload, ctx: OpContext,
): Snapshot {
  const col = s.collections.find((c) => c.id === id);
  if (!col) throw new DomainError('Coleta não encontrada.');
  assertCheck(checkTransition(col, to, payload));
  let next = s;
  let updated: Collection = { ...col, status: to, history: [...col.history, { status: to, at: ctx.now(), role: ctx.role }] };
  if (to === 'realizada') {
    updated.collectedDate = payload.collectedDate;
    // Baixa no estoque pelo peso informado pela Papelito; todas as linhas precisam caber no saldo.
    for (const item of col.items) {
      next = addMovement(
        next,
        {
          date: payload.collectedDate!, type: 'coleta', materialId: item.materialId, locationId: col.locationId,
          quantityKg: item.declaredKg, reference: `Coleta ${col.number}`, sourceId: col.id,
        },
        { ...ctx, audit: false },
      );
    }
  }
  if (to === 'pesagem_conferida') {
    updated = { ...updated, items: col.items.map((i, idx) => ({ ...i, confirmedKg: round(payload.confirmedKg![idx], 3) })) };
  }
  if (to === 'destinacao_documentada') updated.destination = payload.destination ?? col.destination;
  next = { ...next, collections: next.collections.map((c) => (c.id === id ? updated : c)) };
  return withAudit(next, ctx, {
    action: 'status', entity: 'coleta', entityId: id, summary: `Coleta ${col.number}: ${STATUS_LABEL[to]}`,
  });
}

export function addCollectionDocument(
  s: Snapshot, id: ID, doc: Omit<CollectionDocument, 'id' | 'addedAt'>, ctx: OpContext,
): Snapshot {
  const col = s.collections.find((c) => c.id === id);
  if (!col) throw new DomainError('Coleta não encontrada.');
  if (col.status === 'cancelada') throw new DomainError('Não é possível anexar documentos a uma coleta cancelada.');
  if (!doc.name.trim() || !doc.reference.trim()) throw new DomainError('Informe o nome e a referência do documento.');
  const d: CollectionDocument = { ...doc, id: ctx.newId('doc'), addedAt: ctx.now() };
  return withAudit(
    { ...s, collections: s.collections.map((c) => (c.id === id ? { ...c, documents: [...c.documents, d] } : c)) },
    ctx,
    { action: 'editar', entity: 'coleta', entityId: id, summary: `Anexou referência "${d.name}" à coleta ${col.number}` },
  );
}

// ------------------------------------------------------------------ Custos
export type CostInput = Omit<CostEntry, 'id'>;

export function saveCost(s: Snapshot, input: CostInput, ctx: OpContext): Snapshot {
  if (!(input.valuePerKg >= 0)) throw new DomainError('O valor por kg não pode ser negativo.');
  if (input.validTo && input.validTo < input.validFrom) throw new DomainError('O fim da vigência é anterior ao início.');
  if (!input.source.trim()) throw new DomainError('Informe a origem do valor (ex.: cotação, nota fiscal).');
  const overlaps = s.costs.some(
    (c) =>
      c.kind === input.kind &&
      c.materialId === input.materialId &&
      c.validFrom <= (input.validTo ?? '9999-12-31') &&
      (c.validTo ?? '9999-12-31') >= input.validFrom,
  );
  if (overlaps) {
    throw new DomainError('Já existe custo com vigência sobreposta para este material. Encerre a vigência anterior primeiro.');
  }
  const cost: CostEntry = { ...input, id: ctx.newId('custo') };
  return withAudit({ ...s, costs: [...s.costs, cost] }, ctx, {
    action: 'criar', entity: 'custo', entityId: cost.id, summary: `Cadastrou custo ${input.kind} a partir de ${input.validFrom}`,
  });
}

export function closeCostValidity(s: Snapshot, costId: ID, validTo: ISODate, ctx: OpContext): Snapshot {
  const c = s.costs.find((x) => x.id === costId);
  if (!c) throw new DomainError('Custo não encontrado.');
  if (validTo < c.validFrom) throw new DomainError('O fim da vigência é anterior ao início.');
  return withAudit({ ...s, costs: s.costs.map((x) => (x.id === costId ? { ...x, validTo } : x)) }, ctx, {
    action: 'editar', entity: 'custo', entityId: costId, summary: `Encerrou vigência do custo em ${validTo}`,
  });
}
