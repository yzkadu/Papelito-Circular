import { useMemo, useState } from 'react';
import { addDays } from '../domain/dates';
import type { DashboardFilters } from '../domain/indicators';
import type { Snapshot } from '../domain/types';
import { cx } from './ui';

export function useFilters(s: Snapshot, days = 30) {
  const ref = s.meta.referenceDate;
  const [f, setF] = useState<DashboardFilters>({ from: addDays(ref, -(days - 1)), to: ref });
  return [f, setF] as const;
}

type Dim = 'sector' | 'machine' | 'product' | 'material';

const sel =
  'h-9 max-w-full rounded-lg border border-paper-line bg-white px-2.5 text-sm text-ink shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20';

/** Filtros em uma única linha acima dos gráficos. */
export function FilterBar({
  s,
  value,
  onChange,
  dims = ['sector', 'machine', 'product', 'material'],
}: {
  s: Snapshot;
  value: DashboardFilters;
  onChange: (f: DashboardFilters) => void;
  dims?: Dim[];
}) {
  const ref = s.meta.referenceDate;
  const presets = [7, 30, 90].map((d) => ({ d, from: addDays(ref, -(d - 1)) }));
  const machines = useMemo(
    () => s.machines.filter((m) => !value.sectorId || m.sectorId === value.sectorId),
    [s.machines, value.sectorId],
  );
  const set = (patch: Partial<DashboardFilters>) => onChange({ ...value, ...patch });

  return (
    <div className="mb-6 flex flex-wrap items-end gap-2 rounded-xl border border-paper-line bg-white p-3 shadow-card" role="group" aria-label="Filtros">
      <div className="flex rounded-lg border border-paper-line p-0.5" role="radiogroup" aria-label="Período rápido">
        {presets.map((p) => {
          const active = value.from === p.from && value.to === ref;
          return (
            <button
              key={p.d}
              role="radio"
              aria-checked={active}
              onClick={() => set({ from: p.from, to: ref })}
              className={cx('rounded-md px-3 py-1.5 text-sm', active ? 'bg-ink text-white' : 'text-neutral-600 hover:bg-neutral-100')}
            >
              {p.d} dias
            </button>
          );
        })}
      </div>
      <label className="flex min-w-0 max-w-full flex-col text-xs text-neutral-500">
        De
        <input type="date" className={sel} value={value.from} max={value.to} onChange={(e) => e.target.value && set({ from: e.target.value })} />
      </label>
      <label className="flex min-w-0 max-w-full flex-col text-xs text-neutral-500">
        Até
        <input type="date" className={sel} value={value.to} min={value.from} onChange={(e) => e.target.value && set({ to: e.target.value })} />
      </label>
      {dims.includes('sector') && (
        <label className="flex min-w-0 max-w-full flex-col text-xs text-neutral-500">
          Setor
          <select className={sel} value={value.sectorId ?? ''} onChange={(e) => set({ sectorId: e.target.value || undefined, machineId: undefined })}>
            <option value="">Todos</option>
            {s.sectors.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {dims.includes('machine') && (
        <label className="flex min-w-0 max-w-full flex-col text-xs text-neutral-500">
          Máquina
          <select className={sel} value={value.machineId ?? ''} onChange={(e) => set({ machineId: e.target.value || undefined })}>
            <option value="">Todas</option>
            {machines.map((x) => (
              <option key={x.id} value={x.id}>
                {x.code}
              </option>
            ))}
          </select>
        </label>
      )}
      {dims.includes('product') && (
        <label className="flex min-w-0 max-w-full flex-col text-xs text-neutral-500">
          Produto
          <select className={sel} value={value.productId ?? ''} onChange={(e) => set({ productId: e.target.value || undefined })}>
            <option value="">Todos</option>
            {s.products.map((x) => (
              <option key={x.id} value={x.id}>
                {x.code} — {x.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {dims.includes('material') && (
        <label className="flex min-w-0 max-w-full flex-col text-xs text-neutral-500">
          Material
          <select className={sel} value={value.materialId ?? ''} onChange={(e) => set({ materialId: e.target.value || undefined })}>
            <option value="">Todos</option>
            {s.materials.map((x) => (
              <option key={x.id} value={x.id}>
                {x.code} — {x.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {(value.sectorId || value.machineId || value.productId || value.materialId) && (
        <button
          className="h-9 rounded-lg px-3 text-sm text-neutral-600 hover:bg-neutral-100"
          onClick={() => onChange({ from: value.from, to: value.to })}
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
