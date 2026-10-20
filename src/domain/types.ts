/**
 * Modelo de domínio do Papelito Circular.
 * Espelha o esquema planejado em supabase/migrations/0001_schema_inicial.sql
 * (nomes em camelCase aqui; snake_case no banco).
 */

export type ID = string;
/** Datas de negócio no formato ISO `AAAA-MM-DD`. */
export type ISODate = string;
/** Instantes no formato ISO 8601 completo. */
export type ISODateTime = string;

// ---------------------------------------------------------------- Perfis
export type Role =
  | 'operador'
  | 'supervisor'
  | 'ambiental'
  | 'capital'
  | 'financeiro'
  | 'admin';

// ---------------------------------------------------------------- Unidades
/** Grandeza física. Só é permitido converter dentro da mesma grandeza. */
export type UnitDimension = 'massa' | 'contagem' | 'comprimento' | 'volume';

export interface Unit {
  id: ID;
  code: string;
  name: string;
  dimension: UnitDimension;
  /**
   * Fator para a unidade-base da grandeza (kg, un, m, L).
   * `null` = unidade de embalagem sem fator fixo (caixa, bobina, fardo):
   * só converte com fator cadastrado no próprio produto.
   */
  factorToBase: number | null;
  active: boolean;
}

// ---------------------------------------------------------------- Cadastros
export type SectorKind = 'mecanizado' | 'manual' | 'apoio';

export interface Sector {
  id: ID;
  code: string;
  name: string;
  kind: SectorKind;
  active: boolean;
}

export interface Machine {
  id: ID;
  code: string;
  name: string;
  sectorId: ID;
  active: boolean;
  notes?: string;
}

export interface ProductConversion {
  /** Unidade alternativa (ex.: caixa). */
  unitId: ID;
  /** Quantas unidades-padrão do produto cabem em 1 unidade alternativa. */
  factor: number;
}

export interface Product {
  id: ID;
  code: string;
  name: string;
  /** Unidade-padrão de contagem da produção deste produto. */
  unitId: ID;
  conversions: ProductConversion[];
  active: boolean;
}

export type MaterialUse = 'materia_prima' | 'residuo';
export type MaterialCategory = 'papel' | 'cartao' | 'plastico' | 'misto' | 'nao_reciclavel';

export interface Material {
  id: ID;
  code: string;
  name: string;
  use: MaterialUse;
  category: MaterialCategory;
  recyclable: boolean;
  /** Para resíduos: matéria-prima de origem (rastreabilidade e custo). */
  sourceMaterialId?: ID;
  active: boolean;
}

export type WasteClass = 'apara_normal' | 'perda_anormal' | 'retrabalho' | 'rejeito';

export interface LossReason {
  id: ID;
  name: string;
  appliesTo: WasteClass[];
  active: boolean;
}

export interface StorageLocation {
  id: ID;
  code: string;
  name: string;
  active: boolean;
}

/** Lote ou recipiente de resíduo — preparado para etiqueta QR Code. */
export interface WasteLot {
  id: ID;
  code: string;
  materialId: ID;
  locationId: ID;
  container: 'bag' | 'fardo' | 'cacamba' | 'tambor' | 'outro';
  active: boolean;
}

// ---------------------------------------------------------------- Produção
export type Shift = 'A' | 'B' | 'C';

/**
 * Roteiro da ordem. Define em que etapa a produção final é contada
 * (evita dupla contagem entre máquina e etapa manual posterior).
 */
export type OrderRoute = 'maquina' | 'maquina_manual' | 'manual';

export interface ProductionOrder {
  id: ID;
  number: string;
  productId: ID;
  route: OrderRoute;
  plannedQty: number;
  unitId: ID;
  status: 'aberta' | 'encerrada';
  openedAt: ISODate;
}

export type RecordStatus = 'pendente' | 'validado';

export interface MachineProductionRecord {
  id: ID;
  date: ISODate;
  shift: Shift;
  machineId: ID;
  orderId: ID;
  unitId: ID;
  producedQty: number;
  approvedQty: number;
  rejectedQty: number;
  reworkQty: number;
  rawMaterialId: ID;
  /** Consumo de matéria-prima, sempre em kg (massa). */
  rawMaterialKg: number;
  occurrence?: string;
  lossReasonId?: ID;
  status: RecordStatus;
  createdByRole: Role;
  createdAt: ISODateTime;
}

export interface ManualProductionRecord {
  id: ID;
  date: ISODate;
  shift: Shift;
  sectorId: ID;
  activityType: string;
  orderId: ID;
  productId: ID;
  unitId: ID;
  receivedQty: number;
  completedQty: number;
  rejectedQty: number;
  reworkQty: number;
  notes?: string;
  status: RecordStatus;
  createdByRole: Role;
  createdAt: ISODateTime;
}

// ---------------------------------------------------------------- Resíduos
export type WasteOrigin = 'maquina' | 'manual' | 'outro';

export interface WasteRecord {
  id: ID;
  date: ISODate;
  materialId: ID;
  origin: WasteOrigin;
  sectorId: ID;
  machineId?: ID;
  netWeight: number;
  /** Deve ser uma unidade de massa. */
  unitId: ID;
  classification: WasteClass;
  reasonId: ID;
  locationId: ID;
  lotId?: ID;
  productionRecordId?: ID;
  /** Perfil que lançou (sem dados pessoais na versão demonstrativa). */
  registeredByRole: Role;
  createdAt: ISODateTime;
}

export type MovementType =
  | 'saldo_inicial'
  | 'entrada'
  | 'reutilizacao'
  | 'transferencia'
  | 'coleta'
  | 'ajuste';

export interface StockMovement {
  id: ID;
  date: ISODate;
  type: MovementType;
  materialId: ID;
  locationId: ID;
  /** Somente transferências. */
  toLocationId?: ID;
  /**
   * Quantidade em kg. Positiva para todos os tipos, exceto `ajuste`,
   * que pode ser negativa (sinal = sentido do ajuste).
   */
  quantityKg: number;
  reference: string;
  sourceId?: ID;
  note?: string;
  createdByRole: Role;
  createdAt: ISODateTime;
}

// ---------------------------------------------------------------- Coletas
export type CollectionStatus =
  | 'agendada'
  | 'realizada'
  | 'pesagem_conferida'
  | 'destinacao_documentada'
  | 'cancelada';

export interface CollectionItem {
  materialId: ID;
  lotId?: ID;
  /** Peso informado pela Papelito (pesagem interna). */
  declaredKg: number;
  /** Peso confirmado na pesagem do coletor. */
  confirmedKg?: number;
}

export type DocumentKind =
  | 'comprovante_retirada'
  | 'ticket_pesagem'
  | 'nota_fiscal'
  | 'mtr'
  | 'cdf'
  | 'outro';

export interface CollectionDocument {
  id: ID;
  kind: DocumentKind;
  name: string;
  reference: string;
  addedAt: ISODateTime;
}

export interface CollectionEvent {
  status: CollectionStatus;
  at: ISODateTime;
  role: Role;
}

export interface Collection {
  id: ID;
  number: string;
  company: string;
  scheduledDate: ISODate;
  collectedDate?: ISODate;
  locationId: ID;
  items: CollectionItem[];
  status: CollectionStatus;
  documents: CollectionDocument[];
  destination?: string;
  notes?: string;
  history: CollectionEvent[];
}

// ---------------------------------------------------------------- Custos
export type CostKind = 'materia_prima' | 'venda_residuo';

export interface CostEntry {
  id: ID;
  kind: CostKind;
  materialId: ID;
  /** R$ por kg. */
  valuePerKg: number;
  validFrom: ISODate;
  validTo?: ISODate;
  source: string;
  /** true = valor fictício de demonstração. */
  demo: boolean;
}

// ---------------------------------------------------------------- Auditoria
export interface AuditEntry {
  id: ID;
  at: ISODateTime;
  role: Role;
  action: 'criar' | 'editar' | 'validar' | 'status' | 'redefinir';
  entity: string;
  entityId: ID;
  summary: string;
}

// ---------------------------------------------------------------- Snapshot
export interface Snapshot {
  units: Unit[];
  sectors: Sector[];
  machines: Machine[];
  products: Product[];
  materials: Material[];
  lossReasons: LossReason[];
  locations: StorageLocation[];
  lots: WasteLot[];
  orders: ProductionOrder[];
  machineRecords: MachineProductionRecord[];
  manualRecords: ManualProductionRecord[];
  wasteRecords: WasteRecord[];
  movements: StockMovement[];
  collections: Collection[];
  costs: CostEntry[];
  audit: AuditEntry[];
  meta: { mode: 'demo' | 'supabase'; referenceDate: ISODate; version: number };
}
