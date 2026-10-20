import { fail, ok, type Check } from './errors';
import { round } from './units';
import type { Collection, CollectionItem, CollectionStatus, DocumentKind } from './types';

export const COLLECTION_FLOW: { id: CollectionStatus; label: string; description: string }[] = [
  { id: 'agendada', label: 'Coleta agendada', description: 'Retirada combinada com a Capital Recicláveis.' },
  { id: 'realizada', label: 'Coleta realizada', description: 'Material saiu da Papelito. Baixa no estoque pelo peso informado.' },
  { id: 'pesagem_conferida', label: 'Pesagem conferida', description: 'Peso confirmado pelo coletor e divergências analisadas.' },
  { id: 'destinacao_documentada', label: 'Destinação documentada', description: 'Destinação comprovada por documento. Só aqui o material conta como reciclado.' },
];

export const STATUS_LABEL: Record<CollectionStatus, string> = {
  agendada: 'Agendada',
  realizada: 'Realizada',
  pesagem_conferida: 'Pesagem conferida',
  destinacao_documentada: 'Destinação documentada',
  cancelada: 'Cancelada',
};

export const DOCUMENT_KINDS: { id: DocumentKind; label: string; provesDestination: boolean }[] = [
  { id: 'comprovante_retirada', label: 'Comprovante de retirada', provesDestination: false },
  { id: 'ticket_pesagem', label: 'Ticket de pesagem', provesDestination: false },
  { id: 'nota_fiscal', label: 'Nota fiscal', provesDestination: false },
  { id: 'mtr', label: 'MTR (registro oficial — referência)', provesDestination: true },
  { id: 'cdf', label: 'CDF — Certificado de Destinação Final (referência)', provesDestination: true },
  { id: 'outro', label: 'Outro documento', provesDestination: false },
];

/**
 * Tolerância de divergência entre pesagens (fração).
 * VALOR PROVISÓRIO — precisa ser acordado entre Papelito e Capital Recicláveis (ver LEVANTAMENTO-INDUSTRIAL.md).
 */
export const DEFAULT_WEIGHT_TOLERANCE = 0.02;

const NEXT: Record<CollectionStatus, CollectionStatus[]> = {
  agendada: ['realizada', 'cancelada'],
  realizada: ['pesagem_conferida'],
  pesagem_conferida: ['destinacao_documentada'],
  destinacao_documentada: [],
  cancelada: [],
};

export const canTransition = (from: CollectionStatus, to: CollectionStatus) => NEXT[from].includes(to);
export const nextStatuses = (from: CollectionStatus) => NEXT[from];

export interface Divergence {
  diffKg: number;
  pct: number;
  outOfTolerance: boolean;
}

/** Divergência = confirmado − informado; percentual sobre o informado. */
export function itemDivergence(item: CollectionItem, tolerance = DEFAULT_WEIGHT_TOLERANCE): Divergence | null {
  if (item.confirmedKg === undefined || item.declaredKg <= 0) return null;
  const diffKg = round(item.confirmedKg - item.declaredKg, 3);
  const pct = diffKg / item.declaredKg;
  return { diffKg, pct, outOfTolerance: Math.abs(pct) > tolerance + 1e-9 };
}

export function collectionDivergence(c: Collection, tolerance = DEFAULT_WEIGHT_TOLERANCE): Divergence | null {
  if (c.items.some((i) => i.confirmedKg === undefined)) return null;
  const declared = c.items.reduce((a, i) => a + i.declaredKg, 0);
  const confirmed = c.items.reduce((a, i) => a + (i.confirmedKg ?? 0), 0);
  return itemDivergence({ materialId: '', declaredKg: declared, confirmedKg: confirmed }, tolerance);
}

export const declaredTotal = (c: Collection) => round(c.items.reduce((a, i) => a + i.declaredKg, 0), 3);
export const confirmedTotal = (c: Collection) =>
  c.items.every((i) => i.confirmedKg !== undefined) ? round(c.items.reduce((a, i) => a + (i.confirmedKg ?? 0), 0), 3) : null;

/** Retirado da empresa (não significa reciclado). */
export const isCollected = (c: Collection) =>
  c.status === 'realizada' || c.status === 'pesagem_conferida' || c.status === 'destinacao_documentada';

/** Somente destinação documentada conta como destinação comprovada. */
export const isDestinationProven = (c: Collection) => c.status === 'destinacao_documentada';

export interface TransitionPayload {
  collectedDate?: string;
  confirmedKg?: number[];
  destination?: string;
}

export function checkTransition(c: Collection, to: CollectionStatus, p: TransitionPayload): Check {
  if (!canTransition(c.status, to)) {
    return fail(`Não é possível passar de "${STATUS_LABEL[c.status]}" para "${STATUS_LABEL[to]}".`);
  }
  if (to === 'realizada' && !p.collectedDate) return fail('Informe a data da retirada.');
  // Retirada antecipada é permitida (reagendamento); a data real fica registrada.
  if (to === 'pesagem_conferida') {
    if (!p.confirmedKg || p.confirmedKg.length !== c.items.length) return fail('Informe o peso confirmado de cada item.');
    if (p.confirmedKg.some((v) => !(v >= 0))) return fail('Pesos confirmados devem ser números não negativos.');
  }
  if (to === 'destinacao_documentada') {
    const proves = c.documents.some((d) => DOCUMENT_KINDS.find((k) => k.id === d.kind)?.provesDestination);
    if (!proves) return fail('Anexe a referência de um documento que comprove a destinação (ex.: MTR ou CDF).');
    if (!(p.destination ?? c.destination)?.trim()) return fail('Descreva a destinação informada no documento.');
  }
  return ok;
}
