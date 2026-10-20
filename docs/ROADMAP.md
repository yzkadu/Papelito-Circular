# Roadmap

## Fase 1 — Protótipo funcional ✅ (esta entrega)
- Aplicação navegável, identidade visual, navegação desktop/celular.
- Dashboard com indicadores calculados e documentados.
- Cadastros, produção por máquina e manual, perdas e aparas, estoque, coletas, finanças demonstrativas.
- Dados fictícios centralizados (`src/data/seed.ts`), testes automatizados, publicação no GitHub Pages.

## Fase 2 — Persistência e operação real
- [ ] Criar projeto Supabase (região Brasil) e aplicar `supabase/migrations`.
- [ ] Implementar `SupabaseRepository` (mesmo contrato `DataRepository`).
- [ ] Supabase Auth + cadastro de usuários pelo administrador.
- [ ] Funções RPC transacionais para estoque e transição de coletas (validação de saldo no servidor).
- [ ] Trigger de limite da etapa manual (dupla contagem) no banco.
- [ ] Upload de documentos em bucket privado com URLs assinadas.
- [ ] Testes de políticas RLS por perfil (pgTAP ou testes de integração).
- [ ] Política de retenção de dados e LGPD (dados de usuários).

## Fase 3 — Piloto industrial
- [ ] Uma máquina ou setor, uma atividade manual, um tipo de apara, o fluxo de coleta.
- [ ] Comparar registros digitais com controles existentes (planilhas, cadernos, tickets).
- [ ] Coletar feedback de operadores, supervisores, área ambiental e Capital Recicláveis.
- [ ] Documentar resultados e ajustes.

## Fase 4 — Expansão
- [ ] Outros setores e materiais.
- [ ] QR Code em lotes/recipientes e pesagem por celular.
- [ ] Exportação Excel/PDF e importação validada de planilhas.
- [ ] Integração com Protheus (sujeita a disponibilidade e autorização das interfaces).
- [ ] Indicadores ambientais e relatórios de sustentabilidade.
