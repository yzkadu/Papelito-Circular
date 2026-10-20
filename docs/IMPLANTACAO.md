# Implantação e publicação

## Ambiente local
1. Instale o **Node.js 20 LTS** (https://nodejs.org).
2. `npm install` → `npm run dev` → abra http://localhost:5173.
3. `npm test` executa os testes; `npm run build` gera `dist/`.

## Publicação demonstrativa no GitHub Pages
1. Crie um repositório **novo** (não usar o ReciclaLito), ex.: `papelito-circular`.
2. Envie o código **com o `package-lock.json`** gerado pelo `npm install` (o workflow usa `npm ci`).
3. Em *Settings → Pages*, selecione **Source: GitHub Actions**.
4. Cada push na branch `main` executa `.github/workflows/deploy.yml`: testes → build → publicação.
5. O build usa base relativa (`./`) e `HashRouter`, então funciona em `https://<usuário>.github.io/papelito-circular/` sem configuração extra.

A versão publicada **é somente demonstração**: dados fictícios no navegador de cada visitante, sem autenticação.

## Variáveis de ambiente
Veja `.env.example`. Na Fase 1 nenhuma é obrigatória. Nunca versione `.env` com valores reais. No frontend só pode existir a chave pública `anon` do Supabase; a `service_role` nunca sai do servidor.

## Fase 2 — checklist para dados reais
- [ ] Projeto Supabase criado por conta institucional; acesso de administração com 2FA.
- [ ] `supabase db push` com as migrações revisadas.
- [ ] Usuários criados pelo administrador; perfis atribuídos.
- [ ] Testes de RLS por perfil aprovados.
- [ ] `VITE_DATA_MODE=supabase` e chaves públicas configuradas como *secrets* do GitHub Actions.
- [ ] Backup e retenção configurados.
- [ ] Revisão de LGPD (dados de usuários) e de segurança antes do piloto.

## Situação em 20/10/2026
- **GitHub:** repositório público `yzkadu/Papelito-Circular`; GitHub Pages ativado com origem "GitHub Actions" (https://yzkadu.github.io/Papelito-Circular/).
- **Supabase:** projeto `papelito-circular` (região us-east-1, plano gratuito). Migrações `0001_schema_inicial.sql` e `0002_unidades_padrao.sql` aplicadas pelo SQL Editor. Verificado: 21 tabelas no esquema `public`, todas com RLS ativo, políticas por perfil, gatilhos de auditoria e 9 unidades de medida.
- **Ainda não feito:** o aplicativo continua em modo demonstração (não lê nem grava no Supabase); não há usuários nem perfis cadastrados; inserções no estoque dependem da função RPC prevista na Fase 2.
- **Atenção à região:** o projeto foi criado nos EUA. Para dados reais da operação, avaliar recriar em São Paulo (`sa-east-1`) por latência e LGPD antes de cadastrar qualquer informação.
