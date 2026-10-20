import { Calculator } from 'lucide-react';
import type { ReactNode } from 'react';
import { indicatorDef } from '../../domain/indicators';
import { cx } from './index';

/**
 * Cartão de indicador. Todo indicador mostra a fórmula e a origem dos dados
 * (botão "Como é calculado") — exigência do projeto.
 */
export function KpiCard({
  indicator,
  value,
  sub,
  icon,
  tone = 'default',
  footer,
}: {
  indicator: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: 'default' | 'warn';
  footer?: ReactNode;
}) {
  const def = indicatorDef(indicator);
  return (
    <div className="group relative flex flex-col rounded-xl border border-paper-line bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium leading-tight text-neutral-600">{def.label}</p>
        {icon && <span className={cx('grid h-8 w-8 shrink-0 place-items-center', tone === 'warn' ? 'bg-flame text-white' : 'bg-brand-500 text-ink')}>{icon}</span>}
      </div>
      <p className="mt-2 text-[22px] font-semibold leading-tight tracking-tight text-ink tabular-nums md:text-2xl" data-testid={`kpi-${indicator}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-neutral-500">{sub}</p>}
      <div className="mt-auto pt-3">
        {footer}
        <details className="text-xs text-neutral-500">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded text-neutral-500 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            <Calculator className="h-3.5 w-3.5" aria-hidden /> Como é calculado
          </summary>
          <div className="mt-2 space-y-1 rounded-lg bg-paper p-2.5 leading-relaxed text-neutral-700">
            <p>
              <span className="font-medium">Fórmula:</span> {def.formula}
            </p>
            <p>
              <span className="font-medium">Origem:</span> {def.source}
            </p>
            {def.notes && <p className="text-neutral-500">{def.notes}</p>}
          </div>
        </details>
      </div>
    </div>
  );
}
