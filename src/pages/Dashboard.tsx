import { AlertTriangle, Boxes, CheckCircle2, Coins, Factory, Gauge, Hand, Recycle, Scissors, Truck, Weight } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useProfile } from '../auth/ProfileContext';
import { AXIS, GRID, SERIES, TOOLTIP_STYLE, WASTE_COLORS } from '../components/charts';
import { FilterBar, useFilters } from '../components/Filters';
import { Card, CardHeader, DataTable, DemoTag, EmptyState, PageHeader } from '../components/ui';
import { KpiCard } from '../components/ui/Kpi';
import { useSnapshot } from '../data/DataProvider';
import { fmtByUnit, fmtDate, fmtKg, fmtMoney, fmtNumber, fmtPct } from '../domain/format';
import { computeDashboard } from '../domain/indicators';
import { WASTE_CLASSES } from '../domain/waste';

const PAPELITO_IMG = 'https://cms.papelito.com/wp-content/uploads/2025/10/home-who-we-are-1024x1014.png';

const shortDate = (d: string) => d.slice(8, 10) + '/' + d.slice(5, 7);

export default function Dashboard() {
  const s = useSnapshot();
  const { can } = useProfile();
  const [filters, setFilters] = useFilters(s, 30);
  const d = useMemo(() => computeDashboard(s, filters), [s, filters]);
  const matName = (id: string) => s.materials.find((m) => m.id === id)?.name ?? id;

  const stockData = [...d.stockByMaterial.entries()]
    .filter(([, kg]) => kg > 0)
    .map(([id, kg]) => ({ name: s.materials.find((m) => m.id === id)?.code ?? id, full: matName(id), kg: Math.round(kg) }));
  const machineData = d.byMachine.map((m) => ({ name: m.code, rate: m.rate === null ? 0 : +(m.rate * 100).toFixed(1), mpKg: m.mpKg }));

  return (
    <>
      <PageHeader
        eyebrow="Visão geral"
        title="Dashboard industrial"
        description="Produção, geração de aparas, estoque de resíduos e coletas — todos os números são calculados a partir dos lançamentos."
        actions={<DemoTag />}
      />

      <div className="mb-6 grid overflow-hidden rounded-2xl bg-black text-white md:grid-cols-[1fr_260px]">
        <div className="p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.12em] text-brand-300">Papelito Brasil · Capital Recicláveis</p>
          <h2 className="mt-2 text-xl font-medium tracking-tight md:text-2xl">
            Da matéria-prima à <em className="font-serif text-[1.1em] font-normal text-neutral-400">destinação comprovada</em>
          </h2>
          <p className="mt-2 max-w-xl text-sm text-neutral-400">
            Rastreie o caminho do material: consumo na produção → aparas e perdas classificadas → estoque de resíduos → coleta → pesagem conferida → documento de destinação.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {['Produção', 'Aparas', 'Estoque', 'Coleta', 'Pesagem', 'Destinação'].map((step, i) => (
              <span key={step} className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 py-1">
                <span className="tabular-nums text-neutral-500">{i + 1}</span> {step}
              </span>
            ))}
          </div>
        </div>
        <div className="relative hidden md:block">
          <img
            src={PAPELITO_IMG}
            alt="Imagem institucional Papelito"
            className="absolute inset-0 h-full w-full object-cover opacity-90"
            loading="lazy"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        </div>
      </div>

      <FilterBar s={s} value={filters} onChange={setFilters} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard indicator="mp_processada" icon={<Weight className="h-4 w-4" />} value={fmtKg(d.mpKg)} sub={`${d.filtered.machineRecords.length} registros de máquina`} />
        <KpiCard indicator="producao_aprovada" icon={<CheckCircle2 className="h-4 w-4" />} value={<span className="text-lg md:text-xl">{fmtByUnit(d.finalOutput, s.units)}</span>} sub="Separado por unidade de medida" />
        <KpiCard indicator="producao_manual" icon={<Hand className="h-4 w-4" />} value={<span className="text-lg md:text-xl">{fmtByUnit(d.manualOutput, s.units)}</span>} sub={`${d.filtered.manualRecords.length} lançamentos manuais`} />
        <KpiCard indicator="aparas" icon={<Scissors className="h-4 w-4" />} value={fmtKg(d.aparasKg)} sub={d.mpKg > 0 ? `${fmtPct(d.aparasKg / d.mpKg)} da matéria-prima` : undefined} />
        <KpiCard indicator="perdas_anormais" tone="warn" icon={<AlertTriangle className="h-4 w-4" />} value={fmtKg(d.perdasKg)} sub={d.mpKg > 0 ? `${fmtPct(d.perdasKg / d.mpKg)} da matéria-prima` : undefined} />
        <KpiCard indicator="estoque_atual" icon={<Boxes className="h-4 w-4" />} value={fmtKg(d.estoqueKg)} sub={`Saldo em ${fmtDate(filters.to)}`} />
        <KpiCard indicator="enviado_reciclagem" icon={<Truck className="h-4 w-4" />} value={fmtKg(d.enviadoKg)} sub="Retirado ≠ reciclado" />
        <KpiCard indicator="destinacao_comprovada" icon={<Recycle className="h-4 w-4" />} value={fmtKg(d.comprovadoKg)} sub="Somente com documento" />
        <KpiCard indicator="aproveitamento" icon={<Gauge className="h-4 w-4" />} value={fmtPct(d.aproveitamento)} sub="Base: kg de matéria-prima" />
        {can('financeiro:ver') ? (
          <KpiCard
            indicator="custo_perdas"
            tone="warn"
            icon={<Coins className="h-4 w-4" />}
            value={fmtMoney(d.lossCost.value)}
            sub={d.lossCost.usesDemoValues ? 'Custos FICTÍCIOS de demonstração' : undefined}
          />
        ) : (
          <KpiCard indicator="custo_perdas" icon={<Coins className="h-4 w-4" />} value="—" sub="Restrito à gestão e ao financeiro" />
        )}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Matéria-prima processada (kg)" description={`Por ${d.granularity}`} />
          <div className="h-64 px-2 pb-3 pt-4">
            {d.mpKg === 0 ? (
              <EmptyState title="Sem produção no período" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.timeSeries} margin={{ left: 8, right: 16 }}>
                  <defs>
                    <linearGradient id="mpFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES[0]} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={SERIES[0]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} minTickGap={24} />
                  <YAxis {...AXIS} width={56} tickFormatter={(v) => fmtNumber(v, 0)} />
                  <Tooltip {...TOOLTIP_STYLE} labelFormatter={(l) => fmtDate(String(l))} formatter={(v) => [fmtKg(Number(v)), 'Matéria-prima']} />
                  <Area type="monotone" dataKey="mpKg" stroke={SERIES[0]} strokeWidth={2} fill="url(#mpFill)" activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Resíduos gerados por classificação (kg)" description="Aparas, perdas, retrabalho e rejeitos nunca são somados como uma coisa só" />
          <div className="h-64 px-2 pb-3 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.timeSeries} margin={{ left: 8, right: 16 }} barCategoryGap={2}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} minTickGap={24} />
                <YAxis {...AXIS} width={48} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(l) => fmtDate(String(l))} formatter={(v, n) => [fmtKg(Number(v)), WASTE_CLASSES.find((w) => w.id === n)?.short ?? n]} />
                <Legend formatter={(v) => <span className="text-xs text-neutral-700">{WASTE_CLASSES.find((w) => w.id === v)?.short}</span>} iconType="circle" iconSize={8} />
                {WASTE_CLASSES.map((w) => (
                  <Bar key={w.id} dataKey={w.id} stackId="w" fill={WASTE_COLORS[w.id]} stroke="#fff" strokeWidth={1} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Índice de aprovação por máquina (%)" description="Aprovado ÷ produzido — comparável entre máquinas com unidades diferentes" />
          <div className="h-56 px-2 pb-3 pt-4">
            {machineData.length === 0 ? (
              <EmptyState title="Sem registros de máquina no filtro" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={machineData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid {...GRID} horizontal={false} vertical />
                  <XAxis type="number" domain={[80, 100]} {...AXIS} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" {...AXIS} width={56} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${fmtNumber(Number(v), 1)}%`, 'Aprovação']} />
                  <Bar dataKey="rate" fill={SERIES[2]} radius={[0, 4, 4, 0]} barSize={18} label={{ position: 'right', fontSize: 12, fill: '#52514e', formatter: (v: number) => `${fmtNumber(v, 1)}%` }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Estoque atual de resíduos (kg)" description={`Por material, em ${fmtDate(filters.to)}`} actions={<Link to="/app/estoque" className="text-sm text-brand-700 hover:underline">Ver estoque</Link>} />
          <div className="h-56 px-2 pb-3 pt-4">
            {stockData.length === 0 ? (
              <EmptyState title="Sem saldo em estoque" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockData} margin={{ left: 8, right: 16 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="name" {...AXIS} />
                  <YAxis {...AXIS} width={56} tickFormatter={(v) => fmtNumber(v, 0)} />
                  <Tooltip {...TOOLTIP_STYLE} labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ''} formatter={(v) => [fmtKg(Number(v)), 'Saldo']} />
                  <Bar dataKey="kg" fill={SERIES[0]} radius={[4, 4, 0, 0]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Produção por máquina"
          description="Quantidades na unidade do produto; consumo em kg"
          actions={<Link to="/app/producao/maquinas" className="text-sm text-brand-700 hover:underline">Lançar produção</Link>}
        />
        <DataTable
          caption="Produção por máquina"
          rows={d.byMachine}
          rowKey={(r) => r.machineId}
          columns={[
            { key: 'm', header: 'Máquina', cell: (r) => (<span className="inline-flex items-center gap-2"><Factory className="h-4 w-4 text-neutral-400" /> <strong>{r.code}</strong> <span className="text-neutral-500">{r.name}</span></span>) },
            { key: 'p', header: 'Produzido', align: 'right', cell: (r) => fmtByUnit(r.produced, s.units) },
            { key: 'a', header: 'Aprovado', align: 'right', cell: (r) => fmtByUnit(r.approved, s.units) },
            { key: 'r', header: 'Aprovação', align: 'right', cell: (r) => fmtPct(r.rate) },
            { key: 'k', header: 'Matéria-prima', align: 'right', cell: (r) => fmtKg(r.mpKg) },
            { key: 'n', header: 'Registros', align: 'right', cell: (r) => r.records },
          ]}
        />
      </Card>
      {d.pendingRecords > 0 && (
        <p className="mt-3 text-sm text-neutral-600">
          {d.pendingRecords} lançamento(s) de produção no período aguardam validação do supervisor.
        </p>
      )}
    </>
  );
}
