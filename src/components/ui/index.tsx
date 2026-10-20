import { AlertTriangle, Database, Info, Loader2, RefreshCw } from 'lucide-react';
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

// ------------------------------------------------------------------ Botões
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-ink-soft shadow-sm',
  secondary: 'bg-white text-ink border border-paper-line hover:border-neutral-300 hover:bg-neutral-50',
  ghost: 'text-neutral-600 hover:bg-neutral-100 hover:text-ink',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-sm' : 'h-10 px-4 text-sm',
        VARIANTS[variant],
        className,
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

// ------------------------------------------------------------------ Cartões
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx('min-w-0 rounded-xl border border-paper-line bg-white shadow-card', className)}>{children}</section>;
}

export function CardHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-paper-line px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-neutral-500">{description}</p>}
      </div>
      {actions && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: string; actions?: ReactNode; eyebrow?: string }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-medium uppercase tracking-[0.08em] text-brand-700">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-[28px]">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-neutral-600 md:text-[15px]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

// ------------------------------------------------------------------ Selos
type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'blue' | 'violet';
const TONES: Record<Tone, string> = {
  neutral: 'bg-neutral-100 text-neutral-700 ring-neutral-200',
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-sky-50 text-sky-800 ring-sky-200',
  violet: 'bg-violet-50 text-violet-800 ring-violet-200',
};
export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', TONES[tone], className)}>
      {children}
    </span>
  );
}

export function DemoTag({ className }: { className?: string }) {
  return (
    <Badge tone="amber" className={className}>
      <Database className="h-3 w-3" aria-hidden /> Dados fictícios
    </Badge>
  );
}

// ------------------------------------------------------------------ Formulários
const control =
  'block w-full rounded-lg border border-paper-line bg-white px-3 text-[15px] text-ink placeholder:text-neutral-400 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-neutral-50 aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-red-100';

export function Field({ label, error, hint, children, htmlFor, className }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor: string; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-neutral-800">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-neutral-500">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} {...p} className={cx(control, 'h-10', className)} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...p }, ref) {
  return (
    <select ref={ref} {...p} className={cx(control, 'h-10 max-w-full pr-8', className)}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} rows={3} {...p} className={cx(control, 'py-2', className)} />;
});

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

// ------------------------------------------------------------------ Estados
export function LoadingState({ label = 'Carregando dados…' }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-neutral-500">
      <Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-paper text-neutral-400">
        <Info className="h-5 w-5" aria-hidden />
      </div>
      <p className="font-medium text-ink">{title}</p>
      {description && <p className="max-w-md text-sm text-neutral-500">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
      <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden />
      <p className="font-medium text-red-800">Não foi possível carregar os dados</p>
      <p className="text-sm text-red-700">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" /> Tentar novamente
        </Button>
      )}
    </div>
  );
}

export function Notice({ tone = 'blue', title, children }: { tone?: 'blue' | 'amber' | 'red'; title?: string; children: ReactNode }) {
  const t = { blue: 'border-sky-200 bg-sky-50 text-sky-900', amber: 'border-amber-200 bg-amber-50 text-amber-900', red: 'border-red-200 bg-red-50 text-red-900' }[tone];
  return (
    <div className={cx('flex gap-3 rounded-lg border px-4 py-3 text-sm', t)}>
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Tabela
export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export function DataTable<T>({ rows, columns, rowKey, empty, caption, maxRows }: { rows: T[]; columns: Column<T>[]; rowKey: (r: T) => string; empty?: ReactNode; caption?: string; maxRows?: number }) {
  if (rows.length === 0) return <>{empty ?? <EmptyState title="Nenhum registro encontrado" description="Ajuste os filtros ou faça um novo lançamento." />}</>;
  const shown = maxRows ? rows.slice(0, maxRows) : rows;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-paper-line bg-paper/60 text-xs uppercase tracking-wide text-neutral-500">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cx('px-4 py-2.5 font-medium', c.align === 'right' && 'text-right', c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-paper-line">
          {shown.map((r) => (
            <tr key={rowKey(r)} className="hover:bg-paper/50">
              {columns.map((c) => (
                <td key={c.key} className={cx('px-4 py-2.5 align-top text-neutral-800', c.align === 'right' && 'text-right tabular-nums', c.className)}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {maxRows && rows.length > maxRows && (
        <p className="border-t border-paper-line px-4 py-2 text-xs text-neutral-500">
          Exibindo {maxRows} de {rows.length} registros. Use os filtros para refinar.
        </p>
      )}
    </div>
  );
}
