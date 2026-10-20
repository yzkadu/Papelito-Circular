/**
 * Paleta categórica validada (ordem fixa — a cor segue a entidade, nunca a posição).
 * Fonte: paleta de referência de visualização de dados (CVD-safe nas posições adjacentes).
 */
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'] as const;

/** Cores fixas por classificação de resíduo (identidade estável em todas as telas). */
export const WASTE_COLORS = {
  apara_normal: SERIES[0],
  perda_anormal: SERIES[1],
  retrabalho: SERIES[2],
  rejeito: SERIES[3],
} as const;

export const AXIS = { stroke: '#a8a59c', fontSize: 12, tickLine: false, axisLine: false } as const;
export const GRID = { stroke: '#e9e7e0', strokeDasharray: '0', vertical: false } as const;
export const TOOLTIP_STYLE = {
  contentStyle: { borderRadius: 10, border: '1px solid #e6e3da', boxShadow: '0 6px 20px rgba(0,0,0,0.08)', fontSize: 13 },
  labelStyle: { color: '#111', fontWeight: 600, marginBottom: 4 },
  cursor: { fill: 'rgba(17,17,17,0.04)' },
} as const;
