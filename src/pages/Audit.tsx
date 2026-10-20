import { useState } from 'react';
import { roleLabel } from '../auth/roles';
import { Card, CardHeader, DataTable, DemoTag, EmptyState, Notice, PageHeader, Select } from '../components/ui';
import { useSnapshot } from '../data/DataProvider';
import { fmtDateTime } from '../domain/format';

export default function Audit() {
  const s = useSnapshot();
  const [entity, setEntity] = useState('');
  const entities = [...new Set(s.audit.map((a) => a.entity))];
  const rows = s.audit.filter((a) => !entity || a.entity === entity);
  return (
    <>
      <PageHeader eyebrow="Gestão" title="Histórico e auditoria" description="Toda criação, edição, validação e mudança de status feita pela interface é registrada." actions={<DemoTag />} />
      <div className="mb-4">
        <Notice tone="amber">
          Na demonstração, a trilha fica apenas neste navegador e registra o <strong>perfil simulado</strong>, não uma pessoa. Na Fase 2 ela será gravada no banco por gatilho
          (não editável pela aplicação) e vinculada ao usuário autenticado.
        </Notice>
      </div>
      <Card>
        <CardHeader
          title="Eventos"
          description={`${rows.length} eventos`}
          actions={
            <Select aria-label="Filtrar por entidade" className="h-9 w-auto" value={entity} onChange={(e) => setEntity(e.target.value)}>
              <option value="">Todas as entidades</option>
              {entities.map((e) => <option key={e} value={e}>{e}</option>)}
            </Select>
          }
        />
        <DataTable
          caption="Trilha de auditoria"
          rows={rows}
          maxRows={200}
          rowKey={(r) => r.id}
          empty={<EmptyState title="Nenhum evento ainda" description="Faça um lançamento em qualquer módulo para vê-lo aqui." />}
          columns={[
            { key: 't', header: 'Quando', cell: (r) => fmtDateTime(r.at) },
            { key: 'p', header: 'Perfil', cell: (r) => roleLabel(r.role) },
            { key: 'a', header: 'Ação', cell: (r) => r.action },
            { key: 'e', header: 'Entidade', cell: (r) => r.entity },
            { key: 's', header: 'Resumo', cell: (r) => r.summary },
          ]}
        />
      </Card>
    </>
  );
}
