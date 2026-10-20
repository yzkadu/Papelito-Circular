/**
 * Contrato da camada de dados. A interface (React) depende SOMENTE deste contrato.
 * - DemoRepository: dados fictícios no navegador (Fase 1).
 * - SupabaseRepository: PostgreSQL + RLS (Fase 2) — implementa o mesmo contrato.
 */
import type { TransitionPayload } from '../domain/collections';
import type {
  CollectionDocument,
  CollectionStatus,
  ID,
  ISODate,
  Role,
  Snapshot,
} from '../domain/types';
import type { WasteInput } from '../domain/waste';
import type {
  CollectionInput,
  CostInput,
  MachineRecordInput,
  ManualRecordInput,
  MasterItem,
  MasterKind,
  MovementInput,
  OrderInput,
} from './operations';

export interface DataRepository {
  readonly mode: 'demo' | 'supabase';
  load(): Promise<Snapshot>;
  saveMaster<K extends MasterKind>(kind: K, item: MasterItem[K], role: Role): Promise<Snapshot>;
  createOrder(input: OrderInput, role: Role): Promise<Snapshot>;
  addMachineRecord(input: MachineRecordInput, role: Role): Promise<Snapshot>;
  addManualRecord(input: ManualRecordInput, role: Role): Promise<Snapshot>;
  validateRecord(kind: 'machine' | 'manual', id: ID, role: Role): Promise<Snapshot>;
  addWasteRecord(input: WasteInput, role: Role): Promise<Snapshot>;
  addMovement(input: MovementInput, role: Role): Promise<Snapshot>;
  scheduleCollection(input: CollectionInput, role: Role): Promise<Snapshot>;
  transitionCollection(id: ID, to: CollectionStatus, payload: TransitionPayload, role: Role): Promise<Snapshot>;
  addCollectionDocument(id: ID, doc: Omit<CollectionDocument, 'id' | 'addedAt'>, role: Role): Promise<Snapshot>;
  saveCost(input: CostInput, role: Role): Promise<Snapshot>;
  closeCostValidity(id: ID, validTo: ISODate, role: Role): Promise<Snapshot>;
  /** Somente demonstração: recria a base fictícia. */
  reset(): Promise<Snapshot>;
}
