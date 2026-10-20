/**
 * Cores de gráfico a partir da paleta secundária do Guia de Marca Papelito 2025.
 * Ordem fixa validada (contraste, faixa de luminosidade, separação para daltonismo):
 * verde #10A958 · laranja #FF6019 · lilás #AE69FF · rosa #FF25B7 — todas as checagens PASS em fundo branco.
 * O amarelo da marca NÃO é usado como cor de dado (contraste insuficiente sobre branco).
 * Séries únicas usam o preto da marca.
 */
export const INK = '#231F20';
export const SERIES = ['#10A958', '#FF6019', '#AE69FF', '#FF25B7'] as const;

/** Cores fixas por classificação de resíduo (identidade estável em todas as telas). */
export const WASTE_COLORS = {
  apara_normal: SERIES[0],
  perda_anormal: SERIES[1],
  retrabalho: SERIES[2],
  rejeito: SERIES[3],
} as const;

export const AXIS = { stroke: '#8C8687', fontSize: 12, tickLine: false, axisLine: false } as const;
export const GRID = { stroke: '#ECE8DD', strokeDasharray: '0', vertical: false } as const;
export const TOOLTIP_STYLE = {
  contentStyle: { borderRadius: 3, border: '1px solid #231F20', boxShadow: '4px 4px 0 #FCD930', fontSize: 13 },
  labelStyle: { color: '#231F20', fontWeight: 700, marginBottom: 4 },
  cursor: { fill: 'rgba(252,217,48,0.18)' },
} as const;
