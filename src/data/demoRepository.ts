import { can, type Permission } from '../auth/roles';
import { DomainError } from '../domain/errors';
import type { Role, Snapshot } from '../domain/types';
import * as op from './operations';
import type { DataRepository } from './repository';
import { defaultReferenceDate, generateDemoSnapshot } from './seed';

const STORAGE_KEY = 'papelito-circular:demo:v1';

export interface DemoOptions {
  /** Latência simulada (ms) para exercitar estados de carregamento. */
  latencyMs?: number;
  persist?: boolean;
  referenceDate?: string;
  initial?: Snapshot;
}

/**
 * Repositório demonstrativo: mantém o Snapshot em memória e, quando possível, no localStorage
 * deste navegador. Verifica permissões apenas por coerência da demonstração —
 * NÃO é controle de acesso real (qualquer pessoa pode trocar de perfil).
 */
export class DemoRepository implements DataRepository {
  readonly mode = 'demo' as const;
  private state: Snapshot | null;
  private seq = 0;

  constructor(private opts: DemoOptions = {}) {
    this.state = opts.initial ?? null;
  }

  private ctx(role: Role): op.OpContext {
    return {
      role,
      now: () => new Date().toISOString(),
      newId: (p) => `${p}-${Date.now().toString(36)}-${(++this.seq).toString(36)}`,
    };
  }

  private delay() {
    const ms = this.opts.latencyMs ?? 0;
    return ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();
  }

  private read(): Snapshot | null {
    if (!this.opts.persist) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Snapshot;
      return parsed?.meta?.mode === 'demo' && parsed.meta.version === 1 ? parsed : null;
    } catch {
      return null;
    }
  }

  private write(s: Snapshot) {
    this.state = s;
    if (!this.opts.persist) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* sem armazenamento: dados valem só até recarregar a página */
    }
  }

  private current(): Snapshot {
    if (!this.state) throw new Error('Base não carregada.');
    return this.state;
  }

  private async mutate(role: Role, perm: Permission, fn: (s: Snapshot, ctx: op.OpContext) => Snapshot) {
    await this.delay();
    if (!can(role, perm)) throw new DomainError('O perfil selecionado não tem permissão para esta ação.');
    const next = fn(this.current(), this.ctx(role));
    this.write(next);
    return next;
  }

  async load() {
    await this.delay();
    if (!this.state) this.write(this.read() ?? generateDemoSnapshot(this.opts.referenceDate ?? defaultReferenceDate()));
    return this.current();
  }

  saveMaster: DataRepository['saveMaster'] = (kind, item, role) =>
    this.mutate(role, 'cadastros:editar', (s, c) => op.saveMaster(s, kind, item, c));
  createOrder: DataRepository['createOrder'] = (input, role) =>
    this.mutate(role, 'producao:registrar', (s, c) => op.createOrder(s, input, c));
  addMachineRecord: DataRepository['addMachineRecord'] = (input, role) =>
    this.mutate(role, 'producao:registrar', (s, c) => op.addMachineRecord(s, input, c));
  addManualRecord: DataRepository['addManualRecord'] = (input, role) =>
    this.mutate(role, 'producao:registrar', (s, c) => op.addManualRecord(s, input, c));
  validateRecord: DataRepository['validateRecord'] = (kind, id, role) =>
    this.mutate(role, 'producao:validar', (s, c) => op.validateRecord(s, kind, id, c));
  addWasteRecord: DataRepository['addWasteRecord'] = (input, role) =>
    this.mutate(role, 'residuos:registrar', (s, c) => op.addWasteRecord(s, input, c));
  addMovement: DataRepository['addMovement'] = (input, role) =>
    this.mutate(role, 'estoque:movimentar', (s, c) => op.addMovement(s, input, c));
  scheduleCollection: DataRepository['scheduleCollection'] = (input, role) =>
    this.mutate(role, 'coletas:gerenciar', (s, c) => op.scheduleCollection(s, input, c));
  transitionCollection: DataRepository['transitionCollection'] = (id, to, payload, role) =>
    this.mutate(role, to === 'destinacao_documentada' || to === 'cancelada' ? 'coletas:gerenciar' : 'coletas:confirmar', (s, c) =>
      op.transitionCollection(s, id, to, payload, c),
    );
  addCollectionDocument: DataRepository['addCollectionDocument'] = (id, doc, role) =>
    this.mutate(role, 'coletas:confirmar', (s, c) => op.addCollectionDocument(s, id, doc, c));
  saveCost: DataRepository['saveCost'] = (input, role) =>
    this.mutate(role, 'custos:editar', (s, c) => op.saveCost(s, input, c));
  closeCostValidity: DataRepository['closeCostValidity'] = (id, validTo, role) =>
    this.mutate(role, 'custos:editar', (s, c) => op.closeCostValidity(s, id, validTo, c));

  async reset() {
    await this.delay();
    const fresh = generateDemoSnapshot(this.opts.referenceDate ?? defaultReferenceDate());
    this.write(fresh);
    return fresh;
  }
}
