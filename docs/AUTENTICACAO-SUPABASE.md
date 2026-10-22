# Autenticação real — Papelito Circular

## Situação desta entrega
O código agora suporta **Supabase Auth (e-mail e senha)**, seis papéis cadastrados em `public.profiles` e página **Usuários e permissões** só para administradores. No modo Supabase, não existe botão para alternar livremente de perfil. O módulo de produção ainda usa o repositório demonstrativo no navegador; **não usar para produção real**.

## Preparação
1. Projeto Supabase já identificado: `vvptifpffubgmrecfujd`. O esquema base já está instalado e a migração de proteção dos perfis já foi aplicada em 21/10/2026.
2. A migração `supabase/migrations/0002_admin_profiles.sql` foi aplicada no projeto. Não reaplique sem revisar o estado atual.
3. Em **Authentication → Providers → Email**, habilite login por e-mail/senha e desabilite cadastro público. Mantenha confirmação de e-mail se forem usar convites.
4. Em **Authentication → Users**, convide/crie o usuário da administração. Copie o UUID do usuário (não a senha).
5. No **SQL Editor**, execute, substituindo o UUID real e o nome:
   ```sql
   insert into public.profiles (id, display_name, role, active)
   values ('UUID_DO_USUARIO_EXISTENTE', 'Administrador Papelito Circular', 'admin', true)
   on conflict (id) do update
   set display_name = excluded.display_name, role = excluded.role, active = true;
   ```
   Faça isso apenas com acesso administrativo ao SQL Editor.
6. O workflow do GitHub já contém, como valores públicos de fallback, a URL e a chave **publishable** do projeto. Essas duas configurações podem ser substituídas por variáveis do GitHub Actions. Para ativar a autenticação, altere `VITE_AUTH_MODE` de `demo` para `supabase` no workflow ou configure a variável do repositório com esse valor; faça isso **somente depois de vincular o primeiro usuário admin e testar**. Nunca use a chave `service_role` no frontend ou no repositório.
7. Em **Supabase → Authentication → URL Configuration** configure:
   - Site URL: `https://yzkadu.github.io/Papelito-Circular/`
   - Redirect URL permitida: `https://yzkadu.github.io/Papelito-Circular/`
   (o aplicativo usa `HashRouter`).
8. Faça o merge do PR após testes e configurações validadas. O GitHub Pages atualizará a versão publicada.

## Contas por área — modelo simplificado do piloto
- A proposta é uma **conta funcional por área**: Administração (admin), Indústria (supervisor), Operação (operador), Gestão Ambiental (ambiental), Capital Recicláveis (capital) e Financeiro (financeiro).
- Cada conta é criada em **Supabase Authentication → Users** com um e-mail funcional controlado pela organização e depois vinculada a um perfil em **Acessos por área** no aplicativo.
- Esse modelo usa o login Supabase existente; não há senha mestre gravada no código. Nunca adicione senhas ao GitHub.
- **Contas de administrador individuais são altamente recomendadas**: uma conta compartilhada de admin impede saber qual pessoa alterou dados ou permissões. Para ações sensíveis, use MFA e credenciais próprias.
- Contas compartilhadas de outros setores também perdem rastreabilidade individual. Restringir permissões, usar cofre de senhas e trocar credenciais em desligamentos. A auditoria mostra a área, não a pessoa.
- Contas sem perfil ativo em public.profiles permanecem bloqueadas.
- A autenticação funciona somente quando VITE_AUTH_MODE=supabase e as variáveis públicas são configuradas.
- Os módulos de produção continuam em modo demonstrativo/localStorage: ainda não usar dados reais.

## Limitações e segurança
- As telas industriais ainda usam `DemoRepository` + `localStorage`. O login não transforma essas telas em banco operacional multiusuário e **não protege os dados que forem colocados no armazenamento local do navegador**.
- Não coloque dados reais, pessoais ou confidenciais até implementar o `SupabaseRepository`, políticas RLS transacionais para os módulos e testes de autorização.
- Produção manual foi retirada da **navegação**, mas o código legado e as regras correspondentes ainda precisam ser removidos na refatoração das aparas/perdas.
- Para a futura operação, será necessário revisar RLS em todas as tabelas, inclusive updates restritos por coluna para a Capital Recicláveis, definir escopo por setor, guardar documentos em Storage privado e criar logs confiáveis.
- Mudanças de permissão podem exigir novo carregamento da sessão ou página para refletir a atribuição.

## Testes sugeridos
1. Usuário inexistente ou senha errada não entra.
2. Usuário autenticado sem perfil ativo não vê o app.
3. Perfil Capital acessa apenas coletas.
4. Perfil Financeiro vê indicadores financeiros, mas não a área de usuários.
5. Somente Admin vê **Usuários e permissões**.
6. Desativar um usuário impede acesso em nova consulta de perfil.
7. Tentar mudar perfil via ferramentas do navegador não muda as políticas RLS.
8. Login/deslogar, página atualizada e múltiplas abas.
