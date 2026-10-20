import type { OpContext } from '../data/operations';
import { baseMasterData, emptySnapshot, generateDemoSnapshot } from '../data/seed';
import type { Snapshot } from '../domain/types';

export const REF = '2026-10-15';

let n = 0;
export const ctx = (role: OpContext['role'] = 'admin'): OpContext => ({
  role,
  now: () => `2026-10-15T10:00:${String(n++ % 60).padStart(2, '0')}.000Z`,
  newId: (p) => `${p}-t${++n}`,
});

/** Cadastros base, sem lançamentos. */
export const blank = (): Snapshot => baseMasterData(emptySnapshot(REF));

let cached: Snapshot | null = null;
/** Base demonstrativa completa (gerada uma vez por arquivo de teste). */
export const demo = (): Snapshot => (cached ??= generateDemoSnapshot(REF));
