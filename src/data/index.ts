import { DemoRepository } from './demoRepository';
import type { DataRepository } from './repository';

/**
 * Ponto único de escolha da fonte de dados.
 * Fase 2: quando VITE_DATA_MODE=supabase, instanciar aqui o SupabaseRepository
 * (mesmo contrato DataRepository). Nenhuma tela precisa ser alterada.
 */
export function createRepository(): DataRepository {
  const mode = import.meta.env.VITE_DATA_MODE ?? 'demo';
  if (mode === 'supabase') {
    console.warn('[Papelito Circular] Modo Supabase ainda não implementado (Fase 2). Usando dados demonstrativos.');
  }
  return new DemoRepository({ persist: true, latencyMs: 250 });
}

export type { DataRepository };
