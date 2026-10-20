import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type DefaultValues, type FieldValues } from 'react-hook-form';
import type { ZodType } from 'zod';

/** useForm já ligado ao esquema Zod, com validação ao sair do campo e a cada alteração após o envio. */
export function useZodForm<T extends FieldValues>(schema: ZodType<T, any, any>, defaultValues: DefaultValues<T>) {
  return useForm<T>({ resolver: zodResolver(schema), defaultValues, mode: 'onTouched' });
}

/** Mensagem do primeiro erro de um campo (inclusive aninhado). */
export const errMsg = (e: unknown): string | undefined =>
  e && typeof e === 'object' && 'message' in e ? String((e as { message?: string }).message ?? '') || undefined : undefined;
