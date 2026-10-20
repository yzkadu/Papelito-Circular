import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppRoutes, Providers } from '../../App';
import { DemoRepository } from '../../data/demoRepository';
import type { Role } from '../../domain/types';
import { demo } from '../../test/fixtures';

function renderApp(path: string, role: Role = 'admin') {
  const repo = new DemoRepository({ initial: structuredClone(demo()), latencyMs: 0 });
  render(
    <Providers repository={repo} initialRole={role}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </Providers>,
  );
  return repo;
}

beforeEach(() => localStorage.clear());

describe('navegação', () => {
  it('abre a página inicial com chamada para a demonstração', () => {
    renderApp('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/apara reciclada/);
    expect(screen.getAllByRole('link', { name: 'Acessar demonstração' }).length).toBeGreaterThan(0);
  });

  it('mostra o dashboard e navega entre módulos', async () => {
    const user = userEvent.setup();
    renderApp('/app');
    expect(await screen.findByRole('heading', { name: 'Dashboard industrial' })).toBeInTheDocument();
    expect(screen.getByText(/Modo demonstração/)).toBeInTheDocument();
    expect(screen.getByTestId('kpi-mp_processada').textContent).toMatch(/kg/);

    await user.click(screen.getAllByRole('link', { name: /Perdas e aparas/ })[0]);
    expect(await screen.findByRole('heading', { name: 'Perdas e aparas' })).toBeInTheDocument();
    await user.click(screen.getAllByRole('link', { name: /Estoque de resíduos/ })[0]);
    expect(await screen.findByRole('heading', { name: 'Estoque de resíduos' })).toBeInTheDocument();
    expect(screen.getByText('Razão consistente')).toBeInTheDocument();
    await user.click(screen.getAllByRole('link', { name: /Coletas/ })[0]);
    expect(await screen.findByRole('heading', { name: /Coletas · Capital/ })).toBeInTheDocument();
  });
});

describe('perfis simulados', () => {
  it('bloqueia o financeiro para o operador', async () => {
    renderApp('/app/financeiro', 'operador');
    expect(await screen.findByText('Área restrita')).toBeInTheDocument();
    expect(screen.queryAllByRole('link', { name: /Indicadores financeiros/ })).toHaveLength(0);
  });

  it('Capital Recicláveis vai direto às coletas', async () => {
    renderApp('/app', 'capital');
    expect(await screen.findByRole('heading', { name: /Coletas · Capital/ })).toBeInTheDocument();
  });

  it('financeiro vê os indicadores e o aviso de valores fictícios', async () => {
    renderApp('/app/financeiro', 'financeiro');
    expect(await screen.findByRole('heading', { name: 'Indicadores financeiros' })).toBeInTheDocument();
    expect(screen.getByText('Valores fictícios')).toBeInTheDocument();
  });
});

describe('formulários', () => {
  it('produção por máquina: valida e registra', async () => {
    const user = userEvent.setup();
    const repo = renderApp('/app/producao/maquinas', 'operador');
    const form = await screen.findByRole('form', { name: 'Registrar produção por máquina' });
    await user.click(within(form).getByRole('button', { name: 'Registrar produção' }));
    expect(await within(form).findByText('Selecione a máquina')).toBeInTheDocument();

    const before = (await repo.load()).machineRecords.length;
    await user.selectOptions(within(form).getByLabelText('Máquina'), 'mq-01');
    const orderSelect = within(form).getByLabelText('Ordem de produção') as HTMLSelectElement;
    const opt = [...orderSelect.options].find((o) => /Produto A/.test(o.text))!;
    await user.selectOptions(orderSelect, opt.value);
    await user.selectOptions(within(form).getByLabelText('Matéria-prima'), 'mp-01');
    await user.type(within(form).getByLabelText('Consumo de matéria-prima (kg)'), '440');
    await user.type(within(form).getByLabelText('Produzido'), '400');
    await user.type(within(form).getByLabelText('Aprovado'), '390');
    await user.type(within(form).getByLabelText('Rejeitado'), '6');
    await user.type(within(form).getByLabelText('Retrabalho'), '4');
    await user.selectOptions(within(form).getByLabelText('Motivo de perda (se houver)'), 'mot-setup');
    await user.click(within(form).getByRole('button', { name: 'Registrar produção' }));

    expect(await screen.findByText(/Produção registrada/)).toBeInTheDocument();
    await waitFor(async () => expect((await repo.load()).machineRecords.length).toBe(before + 1));
  });

  it('perdas e aparas: valida campos e registra com entrada no estoque', async () => {
    const user = userEvent.setup();
    renderApp('/app/residuos', 'operador');
    const form = await screen.findByRole('form', { name: 'Registrar perda ou apara' });
    await user.click(within(form).getByRole('button', { name: 'Registrar' }));
    expect(await within(form).findByText('Selecione a classificação')).toBeInTheDocument();
    expect(within(form).getByText('Selecione o material')).toBeInTheDocument();

    await user.click(within(form).getByLabelText(/Apara normal do processo/));
    await user.selectOptions(within(form).getByLabelText('Material'), 'rs-01');
    await user.selectOptions(within(form).getByLabelText('Setor'), 'set-ma');
    await user.selectOptions(within(form).getByLabelText('Motivo da geração'), 'mot-refile');
    await user.type(within(form).getByLabelText('Peso líquido'), '3.5');
    await user.selectOptions(within(form).getByLabelText('Local de armazenamento'), 'loc-01');
    await user.click(within(form).getByRole('button', { name: 'Registrar' }));
    expect(await within(form).findByText('Selecione a máquina de origem')).toBeInTheDocument();

    await user.selectOptions(within(form).getByLabelText('Máquina'), 'mq-01');
    await user.click(within(form).getByRole('button', { name: 'Registrar' }));
    expect(await screen.findByText(/entrada gerada no estoque/)).toBeInTheDocument();
  });

  it('estoque: impede retirada maior que o saldo', async () => {
    const user = userEvent.setup();
    renderApp('/app/estoque', 'ambiental');
    const form = await screen.findByRole('form', { name: 'Nova movimentação de estoque' });
    await user.selectOptions(within(form).getByLabelText('Tipo'), 'reutilizacao');
    await user.selectOptions(within(form).getByLabelText('Material'), 'rs-05');
    await user.selectOptions(within(form).getByLabelText('Local'), 'loc-02');
    await user.type(within(form).getByLabelText('Quantidade (kg)'), '999999');
    await user.type(within(form).getByLabelText('Identificação / referência'), 'teste');
    await user.click(within(form).getByRole('button', { name: 'Registrar movimentação' }));
    expect(await screen.findByText(/Saldo insuficiente/)).toBeInTheDocument();
  });
});
