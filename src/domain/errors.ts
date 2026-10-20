/** Violação de regra de negócio — mensagem pensada para ser exibida ao usuário. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export type Check = { ok: true } | { ok: false; error: string };

export const ok: Check = { ok: true };
export const fail = (error: string): Check => ({ ok: false, error });

export function assertCheck(check: Check): void {
  if (!check.ok) throw new DomainError(check.error);
}
