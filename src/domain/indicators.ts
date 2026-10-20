import { isCollected, isDestinationProven } from './collections';
import { addDays, daysBetween, weekStart } from './dates';
import { avoidableLossCost } from './finance';
import { approvalRate, finalOutputByUnit } from './production';
import { balanceByMaterial } from './stock';
import { round, sumByUnit } from './units';
import type { ID, ISODate, Snapshot, WasteClass } from './types';

export interface DashboardFilters {
  from: ISODate;
  to: ISODate;
  sectorId?: ID;
  machineId?: ID;
  productId?: ID;
  materialId?: ID;
}

export interface IndicatorDef {
  id: string;
  label: string;
  unit: string;
  formula: string;
  source: string;
  notes?: string;
}

/** Registro único das fórmulas — exibido na tela "Metodologia" e nos cartões do dashboard. */
export const INDICATORS: IndicatorDef[] = [
  {
    id: 'mp_processada',
    label: 'Matéria-prima processada',
    unit: 'kg',
    formula: 'Σ consumo de matéria-prima (kg) dos registros de produção por máquina no período',
    source: 'Produção por máquina → campo "Consumo de matéria-prima (kg)"',
    notes: 'Depende do apontamento do consumo por registro. A forma real de medição precisa ser confirmada.',
  },
  {
    id: 'producao_aprovada',
    label: 'Produção final aprovada',
    unit: 'por unidade (un, cx, bob…)',
    formula: 'Ordens "máquina": Σ aprovado na máquina. Ordens com etapa manual: Σ concluído na etapa manual',
    source: 'Produção por máquina + Produção manual + roteiro da ordem de produção',
    notes: 'Exibida separadamente por unidade. Nunca somamos caixas com unidades ou bobinas.',
  },
  {
    id: 'producao_maquina',
    label: 'Produção por máquina',
    unit: 'unidade do produto + % aprovação',
    formula: 'Por máquina: Σ produzido, Σ aprovado e índice de aprovação = Σ aprovado ÷ Σ produzido',
    source: 'Produção por máquina',
  },
  {
    id: 'producao_manual',
    label: 'Produção manual concluída',
    unit: 'por unidade',
    formula: 'Σ quantidade concluída nos registros de produção manual',
    source: 'Produção manual',
    notes: 'Sem ranking individual: os registros são por setor/atividade, não por trabalhador.',
  },
  {
    id: 'aparas',
    label: 'Aparas normais geradas',
    unit: 'kg',
    formula: 'Σ peso líquido (kg) dos registros classificados como "apara normal do processo"',
    source: 'Perdas e aparas',
    notes: 'Aparas normais não são tratadas como perda financeira.',
  },
  {
    id: 'perdas_anormais',
    label: 'Perdas anormais',
    unit: 'kg',
    formula: 'Σ peso líquido (kg) dos registros classificados como "perda anormal / evitável"',
    source: 'Perdas e aparas',
  },
  {
    id: 'estoque_atual',
    label: 'Estoque de resíduos',
    unit: 'kg',
    formula: 'Σ (estoque inicial + entradas − reutilizações − coletas ± ajustes) até a data final, todos os locais',
    source: 'Estoque de resíduos (movimentações)',
  },
  {
    id: 'enviado_reciclagem',
    label: 'Retirado para reciclagem',
    unit: 'kg',
    formula: 'Σ peso informado das coletas com retirada realizada no período',
    source: 'Coletas Capital Recicláveis',
    notes: 'Retirado ≠ reciclado. A destinação comprovada é exibida à parte, somente com documento.',
  },
  {
    id: 'destinacao_comprovada',
    label: 'Destinação comprovada',
    unit: 'kg',
    formula: 'Σ peso confirmado das coletas com status "destinação documentada" no período',
    source: 'Coletas Capital Recicláveis + documentos',
  },
  {
    id: 'aproveitamento',
    label: 'Índice de aproveitamento de materiais',
    unit: '%',
    formula: '1 − (aparas + perdas anormais + rejeitos de origem "máquina", kg) ÷ matéria-prima processada (kg)',
    source: 'Produção por máquina + Perdas e aparas',
    notes: 'Retrabalho não reduz o índice (volta ao processo). Supõe que os resíduos de máquina vêm da matéria-prima apontada — a confirmar.',
  },
  {
    id: 'custo_perdas',
    label: 'Custo estimado das perdas evitáveis',
    unit: 'R$',
    formula: 'Σ kg de perda anormal × custo/kg da matéria-prima de origem vigente na data',
    source: 'Perdas e aparas + tabela de custos (manual)',
    notes: 'Na demonstração os custos são FICTÍCIOS. Registros sem custo cadastrado são excluídos e sinalizados.',
  },
];

export const indicatorDef = (id: string) => INDICATORS.find((i) => i.id === id)!;

/** Aplica os filtros do dashboard a cada conjunto de registros. */
export function applyFilters(s: Snapshot, f: DashboardFilters) {
  const inRange = (d?: string) => !!d && d >= f.from && d <= f.to;
  const machineSector = new Map(s.machines.map((m) => [m.id, m.sectorId]));
  const orderProduct = new Map(s.orders.map((o) => [o.id, o.productId]));
  const material = f.materialId ? s.materials.find((m) => m.id === f.materialId) : undefined;
  const rawFilter = material ? (material.use === 'materia_prima' ? material.id : material.sourceMaterialId) : undefined;

  const machineRecords = s.machineRecords.filter(
    (r) =>
      inRange(r.date) &&
      (!f.machineId || r.machineId === f.machineId) &&
      (!f.sectorId || machineSector.get(r.machineId) === f.sectorId) &&
      (!f.productId || orderProduct.get(r.orderId) === f.productId) &&
      (!material || r.rawMaterialId === rawFilter),
  );
  const manualRecords = s.manualRecords.filter(
    (r) =>
      inRange(r.date) &&
      !f.machineId &&
      (!f.sectorId || r.sectorId === f.sectorId) &&
      (!f.productId || r.productId === f.productId) &&
      !material,
  );
  const wasteMatches = (materialId: ID) =>
    !material || materialId === material.id || (material.use === 'materia_prima' && s.materials.find((m) => m.id === materialId)?.sourceMaterialId === material.id);
  const wasteRecords = s.wasteRecords.filter(
    (w) =>
      inRange(w.date) &&
      (!f.machineId || w.machineId === f.machineId) &&
      (!f.sectorId || w.sectorId === f.sectorId) &&
      wasteMatches(w.materialId),
  );
  const collections = s.collections.filter(
    (c) => inRange(c.collectedDate ?? c.scheduledDate) && (!material || c.items.some((i) => wasteMatches(i.materialId))),
  );
  const movements = s.movements.filter((m) => wasteMatches(m.materialId));
  return { machineRecords, manualRecords, wasteRecords, collections, movements, wasteMatches };
}

const kgOf = (ws: { classification: WasteClass; netWeight: number }[], c: WasteClass) =>
  round(ws.filter((w) => w.classification === c).reduce((a, w) => a + w.netWeight, 0), 3);

export function computeDashboard(s: Snapshot, f: DashboardFilters) {
  const d = applyFilters(s, f);
  const mpKg = round(d.machineRecords.reduce((a, r) => a + r.rawMaterialKg, 0), 3);
  const aparasKg = kgOf(d.wasteRecords, 'apara_normal');
  const perdasKg = kgOf(d.wasteRecords, 'perda_anormal');
  const retrabalhoKg = kgOf(d.wasteRecords, 'retrabalho');
  const rejeitoKg = kgOf(d.wasteRecords, 'rejeito');
  const machineWasteKg = d.wasteRecords
    .filter((w) => w.origin === 'maquina' && w.classification !== 'retrabalho')
    .reduce((a, w) => a + w.netWeight, 0);

  const stockByMaterial = balanceByMaterial(d.movements, f.to);
  const estoqueKg = round([...stockByMaterial.values()].reduce((a, v) => a + v, 0), 3);

  const collected = d.collections.filter(isCollected);
  const enviadoKg = round(
    collected.reduce((a, c) => a + c.items.filter((i) => d.wasteMatches(i.materialId)).reduce((x, i) => x + i.declaredKg, 0), 0),
    3,
  );
  const comprovadoKg = round(
    d.collections
      .filter(isDestinationProven)
      .reduce((a, c) => a + c.items.filter((i) => d.wasteMatches(i.materialId)).reduce((x, i) => x + (i.confirmedKg ?? 0), 0), 0),
    3,
  );

  const byMachine = s.machines
    .map((m) => {
      const recs = d.machineRecords.filter((r) => r.machineId === m.id);
      return {
        machineId: m.id,
        code: m.code,
        name: m.name,
        produced: sumByUnit(recs, (r) => r.unitId, (r) => r.producedQty),
        approved: sumByUnit(recs, (r) => r.unitId, (r) => r.approvedQty),
        rate: approvalRate(recs),
        mpKg: round(recs.reduce((a, r) => a + r.rawMaterialKg, 0), 1),
        records: recs.length,
      };
    })
    .filter((m) => m.records > 0);

  // Série temporal: diária até 45 dias; semanal acima disso.
  const span = daysBetween(f.from, f.to);
  const bucket = (date: ISODate) => (span > 45 ? weekStart(date) : date);
  const series = new Map<string, { date: string; mpKg: number; apara_normal: number; perda_anormal: number; retrabalho: number; rejeito: number }>();
  const ensure = (k: string) => {
    if (!series.has(k)) series.set(k, { date: k, mpKg: 0, apara_normal: 0, perda_anormal: 0, retrabalho: 0, rejeito: 0 });
    return series.get(k)!;
  };
  for (let day = f.from; day <= f.to; day = addDays(day, 1)) ensure(bucket(day));
  for (const r of d.machineRecords) ensure(bucket(r.date)).mpKg += r.rawMaterialKg;
  for (const w of d.wasteRecords) ensure(bucket(w.date))[w.classification] += w.netWeight;
  const timeSeries = [...series.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => ({
      ...p,
      mpKg: round(p.mpKg, 1),
      apara_normal: round(p.apara_normal, 1),
      perda_anormal: round(p.perda_anormal, 1),
      retrabalho: round(p.retrabalho, 1),
      rejeito: round(p.rejeito, 1),
    }));

  return {
    filtered: d,
    granularity: span > 45 ? ('semana' as const) : ('dia' as const),
    mpKg,
    finalOutput: finalOutputByUnit(s.orders, d.machineRecords, d.manualRecords),
    manualOutput: sumByUnit(d.manualRecords, (r) => r.unitId, (r) => r.completedQty),
    byMachine,
    aparasKg,
    perdasKg,
    retrabalhoKg,
    rejeitoKg,
    estoqueKg,
    stockByMaterial,
    enviadoKg,
    comprovadoKg,
    aproveitamento: mpKg > 0 ? 1 - machineWasteKg / mpKg : null,
    lossCost: avoidableLossCost(d.wasteRecords, s.materials, s.costs),
    timeSeries,
    pendingRecords:
      d.machineRecords.filter((r) => r.status === 'pendente').length +
      d.manualRecords.filter((r) => r.status === 'pendente').length,
  };
}

export type DashboardData = ReturnType<typeof computeDashboard>;
