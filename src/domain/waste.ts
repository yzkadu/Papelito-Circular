import { fail, ok, type Check } from './errors';
import { isMassUnit } from './units';
import type { Snapshot, WasteClass, WasteRecord } from './types';

export const WASTE_CLASSES: { id: WasteClass; label: string; short: string; description: string }[] = [
  {
    id: 'apara_normal',
    label: 'Apara normal do processo',
    short: 'Apara normal',
    description: 'Gerada de forma inerente e esperada pelo processo (refile, início/fim de bobina). Não é perda financeira por si só.',
  },
  {
    id: 'perda_anormal',
    label: 'Perda anormal / evitável',
    short: 'Perda anormal',
    description: 'Geração acima do esperado ou por falha (ajuste, quebra, erro de setup). Entra no custo estimado de perdas.',
  },
  {
    id: 'retrabalho',
    label: 'Retrabalho / reaproveitamento',
    short: 'Retrabalho',
    description: 'Material que retorna ao processo. Não entra no estoque de resíduos nem é contado como perda.',
  },
  {
    id: 'rejeito',
    label: 'Rejeito sem recuperação no processo',
    short: 'Rejeito',
    description: 'Sem possibilidade de recuperação no processo considerado. Vai ao estoque de resíduos para destinação.',
  },
];

export const wasteClassLabel = (c: WasteClass) => WASTE_CLASSES.find((w) => w.id === c)?.short ?? c;

/** Retrabalho volta ao processo; os demais são armazenados para destinação. */
export const entersWasteStock = (c: WasteClass) => c !== 'retrabalho';

/** Somente perdas anormais compõem o custo estimado de perdas evitáveis. */
export const isAvoidableLoss = (c: WasteClass) => c === 'perda_anormal';

export type WasteInput = Omit<WasteRecord, 'id' | 'createdAt'>;

export function checkWasteRecord(s: Snapshot, w: WasteInput): Check {
  if (!(w.netWeight > 0)) return fail('O peso líquido deve ser maior que zero.');
  if (!isMassUnit(w.unitId, s.units)) {
    return fail('Aparas e perdas devem ser pesadas em unidade de massa (kg, g, t).');
  }
  const material = s.materials.find((m) => m.id === w.materialId);
  if (!material) return fail('Material não encontrado.');
  if (material.use !== 'residuo') return fail('Selecione um material do tipo resíduo.');
  const reason = s.lossReasons.find((r) => r.id === w.reasonId);
  if (!reason) return fail('Motivo não encontrado.');
  if (!reason.appliesTo.includes(w.classification)) {
    return fail(`O motivo "${reason.name}" não se aplica à classificação "${wasteClassLabel(w.classification)}".`);
  }
  if (w.origin === 'maquina') {
    const machine = s.machines.find((m) => m.id === w.machineId);
    if (!machine) return fail('Informe a máquina de origem.');
    if (machine.sectorId !== w.sectorId) return fail('A máquina informada não pertence ao setor selecionado.');
  }
  if (!s.locations.some((l) => l.id === w.locationId)) return fail('Local de armazenamento não encontrado.');
  return ok;
}
