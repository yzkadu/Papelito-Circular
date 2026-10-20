# Arquitetura

## Visão geral

```
┌──────────────┐   usa   ┌─────────────────┐  contrato  ┌──────────────────────┐
│ Telas (React)│ ──────► │ DataProvider    │ ─────────► │ DataRepository       │
│ pages/*      │         │ (estado + ações)│            │  ├ DemoRepository  ✔ │
└──────┬───────┘         └─────────────────┘            │  └ SupabaseRepo  (F2)│
       │ cálculos                                       └──────────┬───────────┘
       ▼                                                           │ valida com
┌──────────────────────────────────────────────┐                   ▼
│ domain/ — regras puras e testáveis           │ ◄──────── data/operations.ts
│ units · production · waste · stock ·         │
│ collections · finance · indicators           │
└──────────────────────────────────────────────┘
```

- **Stack:** React 18 + TypeScript + Vite 5, Tailwind CSS 3, lucide-react, Recharts 2, React Hook Form + Zod, Vitest + Testing Library. Roteamento com `HashRouter` (compatível com GitHub Pages sem configuração de servidor).
- **Domínio puro (`src/domain`)**: nenhuma dependência de React. Toda regra (balanço de produção, conversão de unidades, saldo de estoque, fluxo de coleta, custos) é uma função testável.
- **Operações (`src/data/operations.ts`)**: funções `(snapshot, entrada, contexto) → novo snapshot` que validam regras e registram auditoria. São usadas **tanto pela interface quanto pelo gerador de dados fictícios** — por isso a base demonstrativa obedece às mesmas regras.
- **Contrato de dados (`src/data/repository.ts`)**: as telas só conhecem `DataRepository`. Na Fase 2, um `SupabaseRepository` implementa o mesmo contrato e é escolhido em `src/data/index.ts` pela variável `VITE_DATA_MODE`. Nenhuma tela precisa mudar.
- **Indicadores (`src/domain/indicators.ts`)**: registro único `INDICATORS` com fórmula, unidade e origem; `computeDashboard` calcula tudo a partir dos registros filtrados.

## Segurança

| Aspecto | Fase 1 (atual) | Fase 2 (planejado) |
| --- | --- | --- |
| Autenticação | **Nenhuma.** Perfil simulado, trocável por qualquer pessoa | Supabase Auth (e-mail corporativo / SSO) |
| Autorização | Somente na interface (`auth/roles.ts`) | RLS no PostgreSQL + funções RPC `security definer` |
| Auditoria | Lista local no navegador, por perfil | Trigger no banco, tabela sem permissão de escrita para a aplicação |
| Dados | Fictícios, no `localStorage` | PostgreSQL gerenciado; arquivos em bucket privado |
| Segredos | Nenhum | Apenas a chave pública `anon` no frontend; `service_role` nunca no repositório |

A matriz de permissões de `auth/roles.ts` é a especificação das políticas RLS em `supabase/migrations/0001_schema_inicial.sql`.

## Decisões

- **Sem soma de unidades incompatíveis**: produção é sempre exibida agrupada por unidade; indicadores comparáveis entre máquinas usam razões adimensionais (índice de aprovação) ou kg.
- **Sem exclusão física**: cadastros são desativados; estoque é corrigido por ajuste justificado.
- **Valores em `numeric`** no banco; no frontend, arredondamento explícito (`round`) com 3 casas para quantidades e 2 para reais.
- **Imagens institucionais** são carregadas do site da Papelito (com fallback se indisponíveis); o vídeo da página inicial vem de URL externa informada no briefing.
