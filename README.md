# Papelito Circular

Plataforma web para gestão da **produção industrial**, **perdas e aparas**, **estoque de resíduos** e **coletas** realizadas pela Capital Recicláveis — desenvolvida para a Papelito Brasil, com dimensão de extensão universitária.

> **Situação atual: Fase 1 — protótipo funcional.**
> Todos os dados são **fictícios** e gerados no navegador. **Não há autenticação real**: o perfil é escolhido livremente para fins de demonstração. O sistema **não está validado para operação industrial**.

## O que já funciona

| Módulo | Situação |
| --- | --- |
| Dashboard industrial (10 indicadores, filtros por período/setor/máquina/produto/material, gráficos) | Funcional com dados fictícios |
| Produção por máquina (ordens, turnos, aprovado/rejeitado/retrabalho, consumo de MP, ocorrências, validação) | Funcional |
| Produção manual (etapa pós-máquina sem dupla contagem, atividades exclusivamente manuais) | Funcional |
| Perdas e aparas (4 classificações obrigatórias, motivos, local, lote) | Funcional — gera entrada no estoque automaticamente |
| Estoque de resíduos (inicial, entradas, reutilização, transferência, coleta, ajuste, demonstrativo, razão auditável) | Funcional — impede saldo negativo |
| Coletas Capital Recicláveis (agendada → realizada → pesagem conferida → destinação documentada, divergências, documentos) | Funcional — referência de documento, sem upload de arquivo |
| Indicadores financeiros (custo médio de MP, perdas evitáveis, recuperado, líquido, comparação de períodos, tabela de custos) | Funcional com **custos fictícios** |
| Cadastros (setores, máquinas, produtos, unidades), auditoria, metodologia | Funcional |
| Perfis (operador, supervisor, ambiental, Capital, financeiro, admin) | **Simulados** — somente interface |

Os indicadores são **calculados a partir dos lançamentos**, nunca digitados nos gráficos. A fórmula e a origem de cada indicador aparecem no botão "Como é calculado" e na página **Metodologia**.

## Executar localmente

Pré-requisito: **Node.js 20 LTS** ou superior (inclui o npm).

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes automatizados (Vitest + Testing Library)
npm run build      # compilação de produção em dist/
npm run preview    # serve o build localmente
```

Os lançamentos feitos na demonstração ficam no `localStorage` do navegador. Para recomeçar, use **"Recriar dados fictícios"** no menu lateral (perfil Administrador).

## Estrutura

```
src/
  domain/      Regras de negócio puras (unidades, produção, resíduos, estoque, coletas, finanças, indicadores)
  data/        Contrato DataRepository, repositório demonstrativo, operações e gerador de dados fictícios
  auth/        Perfis e matriz de permissões (simulados nesta fase)
  forms/       Esquemas Zod dos formulários
  components/  Layout, UI e paleta de gráficos
  pages/       Telas (uma por módulo)
supabase/migrations/   Esquema PostgreSQL + RLS planejado para a Fase 2 (rascunho, não aplicado)
docs/                  Arquitetura, modelo de dados, regras, roadmap, levantamento e implantação
.github/workflows/     Testes + publicação no GitHub Pages
```

## Documentação

- [Arquitetura](docs/ARQUITETURA.md)
- [Modelo de dados](docs/MODELO-DE-DADOS.md)
- [Regras de negócio](docs/REGRAS-DE-NEGOCIO.md)
- [Roadmap](docs/ROADMAP.md)
- [Levantamento industrial — pendências a confirmar](docs/LEVANTAMENTO-INDUSTRIAL.md)
- [Implantação e publicação](docs/IMPLANTACAO.md)

## Referências

Projeto independente. Usa como referência de organização o projeto [ReciclaLito](https://github.com/yzkadu/ReciclaLito) (não modificado). Sites institucionais: [Papelito](https://www.papelito.com) · [Capital Recicláveis](https://capitalreciclaveis.com.br). Imagens institucionais exibidas são carregadas do site da Papelito.

O sistema **não substitui** o MTR/SINIR nem outros registros ambientais oficiais.
