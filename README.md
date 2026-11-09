# Papelito Circular — ambiente operacional

Sistema para registrar aparas normais, perdas anormais, materiais recicláveis e retiradas com **dados reais**, sob autenticação Supabase. Hospedado no GitHub Pages.

## Integração Papelito–Capital e comprovação acadêmica
- **Coletas e conferência**: a Papelito registra o peso retirado do estoque; a conta funcional da Capital confirma o peso recebido, data e comprovante. O aplicativo calcula a diferença sem alterar a pesagem original e sem somar novamente material físico.
- **Importação CSV real**: modelos exportados do Excel são validados contra máquinas/materiais ativos; exige identificador único por linha para evitar importação duplicada, e grava até 300 registros por confirmação no Supabase.
- **Extensão & evidências**: a administração registra o diagnóstico de necessidade, aceite, execução, frequência, devolutivas e documentos; anexos PDF/JPG/PNG ficam em bucket privado, com link temporário.
- O formato da parceria **Papelito (instituição executora) → Capital Recicláveis (beneficiária operacional)** foi informado pelo estudante como aceito pela faculdade. A aprovação do formato não substitui a execução real nem os comprovantes previstos no plano de ensino.
- **Requisito operacional**: a conta funcional `capital` precisa ser criada e autorizada no Supabase para confirmar recebimentos. Administração e ambiental não podem registrar uma confirmação em nome da Capital.

## Estado da versão
- Não existe mais carregamento de dados demonstrativos no aplicativo publicado.
- Os módulos operacionais foram recriados com base nas tabelas `public.circular_*` do Supabase.
- Tabelas operacionais iniciam **vazias**. Apenas contas reais autorizadas podem incluir dados.
- O armazenamento `localStorage` usado pela demonstração anterior é limpo no navegador; **os dados da demonstração não são transferidos automaticamente**.
- A conta administrativa, os registros técnicos de auditoria e estruturas legadas do Supabase são preservados.
- Ainda **não** há sincronização de ERP, importação automática de Excel/CSV, confirmação externa da Capital, custos financeiros homologados ou estoque por lote/local. Não atribua esses controles a esta primeira versão.

## Ordem recomendada de implantação
1. Em **Cadastros**, cadastrar máquinas e materiais verdadeiros (com código e descrição usados na indústria).
2. Em **Aparas previstas**, cadastrar apenas percentuais homologados por máquina/material, com fonte e início de vigência. Essas referências são independentes das ocorrências.
3. Em **Lançar aparas e perdas**, registrar a data, equipamento, material, ordem/lote, origem (apara normal ou perda anormal), destino do material e peso em kg.
4. Em **Estoque reciclável**, verificar o saldo derivado das entradas com destino reciclagem menos retiradas já registradas.
5. Em **Coletas**, registrar retirada real conforme saldo disponível. **Não confundir a retirada interna com a confirmação externa do parceiro.**
6. Em **Conferir CSV**, validar estrutura de planilhas localmente; essa ferramenta **ainda não persiste** arquivos no Supabase.

## Modelo de relacionamento

| Entidade | Chave e relacionamentos | Critério |
| --- | --- | --- |
| Máquinas | `circular_machines.id` | Código único, cadastro ativo/inativo |
| Materiais | `circular_materials.id` | Reciclável ou não reciclável |
| Padrões | `machine_id`, `material_id`, `valid_from` | Percentual previsto e fonte homologada, histórico preservado |
| Ocorrências | `machine_id`, `material_id`, `batch_ref` | Peso físico lançado uma única vez, com **origem** separada do **destino** |
| Retiradas | `material_id`, data, quantidade | Não ultrapassar saldo em estoque; transação bloqueia retiradas simultâneas conflitantes |

**Classificação de origem** e **destinação física** não são duas pesagens. Por exemplo, uma perda anormal enviada à reciclagem entra apenas uma vez no registro físico, e sua retirada diminui o estoque.

## Segurança e auditabilidade
Todas as novas tabelas têm RLS. Contas e perfis são gerenciados em Supabase Auth e `public.profiles`. Operadores registram ocorrências; supervisores e administração cadastram máquinas; ambiental também cadastra materiais e retiradas. Capital Recicláveis tem acesso inicial somente de consulta às retiradas. Cada registro contém `created_by` do usuário Supabase, mas contas compartilhadas não permitem identificar a pessoa física.

Lançamentos são imutáveis nessa fase (sem edição/exclusão disponível no cliente); a implementação de correções rastreáveis exige aprovação industrial antes de permitir ajustes.

## Ferramentas
React + TypeScript + Vite + Supabase Auth/Postgres/RLS + GitHub Pages.

Para executar localmente:
```bash
npm install
npm run dev
npm test
npm run build
```
Configure localmente `VITE_AUTH_MODE=supabase`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`; nunca exponha uma service role key.

O sistema não substitui MTR, CDF ou demais obrigações legais de rastreabilidade e destinação ambiental.
