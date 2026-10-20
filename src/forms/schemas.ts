/**
 * Esquemas de validação dos formulários (Zod).
 * Validam formato e preenchimento; as regras que dependem do estado (saldo, ordem, roteiro)
 * ficam no domínio e são verificadas novamente ao gravar.
 */
import { z } from 'zod';

const required = (msg: string) => z.string({ required_error: msg }).trim().min(1, msg);
const optionalText = (max = 500) => z.string().trim().max(max, `Máximo de ${max} caracteres`).optional().or(z.literal(''));
const num = () => z.coerce.number({ invalid_type_error: 'Informe um número' }).refine(Number.isFinite, 'Informe um número');
const nonNeg = () => num().pipe(z.number().min(0, 'Não pode ser negativo'));
const positive = (msg = 'Deve ser maior que zero') => num().pipe(z.number().gt(0, msg));
const date = () => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida');

export const SHIFTS = ['A', 'B', 'C'] as const;

export const machineRecordSchema = z
  .object({
    date: date(),
    shift: z.enum(SHIFTS, { errorMap: () => ({ message: 'Selecione o turno' }) }),
    machineId: required('Selecione a máquina'),
    orderId: required('Selecione a ordem de produção'),
    producedQty: positive('A quantidade produzida deve ser maior que zero'),
    approvedQty: nonNeg(),
    rejectedQty: nonNeg(),
    reworkQty: nonNeg(),
    rawMaterialId: required('Selecione a matéria-prima'),
    rawMaterialKg: positive('Informe o consumo em kg'),
    lossReasonId: z.string().optional(),
    occurrence: optionalText(),
  })
  .superRefine((v, ctx) => {
    const sum = v.approvedQty + v.rejectedQty + v.reworkQty;
    if (Math.abs(sum - v.producedQty) > 1e-6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['approvedQty'],
        message: `Aprovado + rejeitado + retrabalho (${sum}) precisa ser igual ao produzido (${v.producedQty})`,
      });
    }
    if ((v.rejectedQty > 0 || v.reworkQty > 0) && !v.lossReasonId && !v.occurrence) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['lossReasonId'], message: 'Informe o motivo ou descreva a ocorrência das rejeições' });
    }
  });
export type MachineRecordForm = z.infer<typeof machineRecordSchema>;

export const manualRecordSchema = z
  .object({
    date: date(),
    shift: z.enum(SHIFTS, { errorMap: () => ({ message: 'Selecione o turno' }) }),
    sectorId: required('Selecione o setor'),
    activityType: required('Informe o tipo de atividade'),
    orderId: required('Selecione a ordem de produção'),
    receivedQty: positive('A quantidade recebida deve ser maior que zero'),
    completedQty: nonNeg(),
    rejectedQty: nonNeg(),
    reworkQty: nonNeg(),
    notes: optionalText(),
  })
  .refine((v) => v.completedQty + v.rejectedQty + v.reworkQty <= v.receivedQty + 1e-6, {
    path: ['completedQty'],
    message: 'Concluído + rejeitado + retrabalho não pode superar o recebido',
  });
export type ManualRecordForm = z.infer<typeof manualRecordSchema>;

export const WASTE_CLASS_IDS = ['apara_normal', 'perda_anormal', 'retrabalho', 'rejeito'] as const;

export const wasteSchema = z
  .object({
    date: date(),
    materialId: required('Selecione o material'),
    origin: z.enum(['maquina', 'manual', 'outro']),
    sectorId: required('Selecione o setor'),
    machineId: z.string().optional(),
    netWeight: positive('O peso líquido deve ser maior que zero'),
    unitId: required('Selecione a unidade'),
    classification: z.enum(WASTE_CLASS_IDS, { errorMap: () => ({ message: 'Selecione a classificação' }) }),
    reasonId: required('Selecione o motivo'),
    locationId: required('Selecione o local de armazenamento'),
    lotId: z.string().optional(),
  })
  .refine((v) => v.origin !== 'maquina' || !!v.machineId, { path: ['machineId'], message: 'Selecione a máquina de origem' });
export type WasteForm = z.infer<typeof wasteSchema>;

export const MOVEMENT_FORM_TYPES = ['entrada', 'reutilizacao', 'transferencia', 'ajuste', 'saldo_inicial'] as const;

export const movementSchema = z
  .object({
    date: date(),
    type: z.enum(MOVEMENT_FORM_TYPES),
    materialId: required('Selecione o material'),
    locationId: required('Selecione o local'),
    toLocationId: z.string().optional(),
    quantityKg: num(),
    reference: required('Informe a identificação da movimentação'),
    note: optionalText(),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'ajuste') {
      if (v.quantityKg === 0) ctx.addIssue({ code: 'custom', path: ['quantityKg'], message: 'O ajuste não pode ser zero' });
      if (!v.note) ctx.addIssue({ code: 'custom', path: ['note'], message: 'Justifique o ajuste de inventário' });
    } else if (!(v.quantityKg > 0)) {
      ctx.addIssue({ code: 'custom', path: ['quantityKg'], message: 'A quantidade deve ser maior que zero' });
    }
    if (v.type === 'transferencia') {
      if (!v.toLocationId) ctx.addIssue({ code: 'custom', path: ['toLocationId'], message: 'Selecione o destino' });
      else if (v.toLocationId === v.locationId) ctx.addIssue({ code: 'custom', path: ['toLocationId'], message: 'Destino igual à origem' });
    }
  });
export type MovementForm = z.infer<typeof movementSchema>;

export const collectionSchema = z.object({
  number: required('Informe o número da coleta'),
  scheduledDate: date(),
  locationId: required('Selecione o local de retirada'),
  items: z
    .array(z.object({ materialId: required('Selecione o material'), lotId: z.string().optional(), declaredKg: positive('Peso maior que zero') }))
    .min(1, 'Inclua ao menos um material'),
  notes: optionalText(),
});
export type CollectionForm = z.infer<typeof collectionSchema>;

export const costSchema = z
  .object({
    kind: z.enum(['materia_prima', 'venda_residuo']),
    materialId: required('Selecione o material'),
    valuePerKg: nonNeg(),
    validFrom: date(),
    validTo: z.string().optional().or(z.literal('')),
    source: z.string().trim().min(3, 'Informe a origem do valor (cotação, nota fiscal, estimativa…)'),
  })
  .refine((v) => !v.validTo || v.validTo >= v.validFrom, { path: ['validTo'], message: 'O fim deve ser posterior ao início' });
export type CostForm = z.infer<typeof costSchema>;

export const orderSchema = z.object({
  number: required('Informe o número da ordem'),
  productId: required('Selecione o produto'),
  route: z.enum(['maquina', 'maquina_manual', 'manual']),
  unitId: required('Selecione a unidade'),
  plannedQty: positive('A quantidade planejada deve ser maior que zero'),
  openedAt: date(),
});
export type OrderForm = z.infer<typeof orderSchema>;

const code = () => z.string().trim().min(2, 'Mínimo de 2 caracteres').max(20, 'Máximo de 20 caracteres');
const name = () => z.string().trim().min(3, 'Mínimo de 3 caracteres').max(80, 'Máximo de 80 caracteres');

export const sectorSchema = z.object({ code: code(), name: name(), kind: z.enum(['mecanizado', 'manual', 'apoio']) });
export const machineSchema = z.object({ code: code(), name: name(), sectorId: required('Selecione o setor'), notes: optionalText(200) });
export const unitSchema = z.object({
  code: code(),
  name: name(),
  dimension: z.enum(['massa', 'contagem', 'comprimento', 'volume']),
  factorToBase: z.union([z.literal(''), z.coerce.number().gt(0, 'Fator deve ser maior que zero')]).optional(),
});
export const productSchema = z
  .object({
    code: code(),
    name: name(),
    unitId: required('Selecione a unidade-padrão'),
    altUnitId: z.string().optional(),
    altFactor: z.union([z.literal(''), z.coerce.number().gt(0, 'Fator deve ser maior que zero')]).optional(),
  })
  .refine((v) => !v.altUnitId || (v.altFactor !== '' && v.altFactor !== undefined), { path: ['altFactor'], message: 'Informe quantas unidades-padrão cabem na unidade alternativa' });
