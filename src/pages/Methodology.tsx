import { Card, CardHeader, Notice, PageHeader } from '../components/ui';
import { INDICATORS } from '../domain/indicators';
import { WASTE_CLASSES } from '../domain/waste';

export default function Methodology() {
  return (
    <>
      <PageHeader
        eyebrow="Transparência"
        title="Metodologia dos indicadores"
        description="Fórmula, unidade e origem de cada número exibido. Todos os indicadores são calculados a partir dos lançamentos — nenhum valor é digitado diretamente nos gráficos."
      />
      <div className="mb-6">
        <Notice title="Regras gerais">
          Quantidades em unidades diferentes nunca são somadas. Conversões só ocorrem dentro da mesma grandeza (ex.: g → kg) ou com fator cadastrado no produto
          (ex.: 1 caixa = 50 unidades). Pesos são armazenados com 3 casas decimais; valores em reais com 2.
        </Notice>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {INDICATORS.map((i) => (
          <Card key={i.id}>
            <CardHeader title={i.label} description={`Unidade: ${i.unit}`} />
            <dl className="space-y-2 px-5 py-4 text-sm">
              <div><dt className="font-medium text-neutral-500">Fórmula</dt><dd>{i.formula}</dd></div>
              <div><dt className="font-medium text-neutral-500">Origem dos dados</dt><dd>{i.source}</dd></div>
              {i.notes && <div><dt className="font-medium text-neutral-500">Observações</dt><dd className="text-neutral-700">{i.notes}</dd></div>}
            </dl>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <CardHeader title="Classificação de resíduos" />
        <ul className="divide-y divide-paper-line">
          {WASTE_CLASSES.map((w) => (
            <li key={w.id} className="px-5 py-3 text-sm"><p className="font-medium">{w.label}</p><p className="text-neutral-600">{w.description}</p></li>
          ))}
        </ul>
      </Card>
    </>
  );
}
