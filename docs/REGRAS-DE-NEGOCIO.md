# Regras de negócio

Todas as regras abaixo estão implementadas em `src/domain` / `src/data/operations.ts` e cobertas por testes em `__tests__`.

## Produção por máquina
1. **Balanço:** produzido = aprovado + rejeitado + retrabalho, na unidade da ordem de produção.
2. A unidade do lançamento deve ser a mesma da ordem; a ordem deve estar aberta e não ser exclusivamente manual.
3. Consumo de matéria-prima é informado em kg e deve ser > 0.
4. Rejeição ou retrabalho exigem motivo ou descrição da ocorrência.
5. Lançamentos nascem **pendentes** e são **validados** pelo supervisor.

## Produção manual
1. Concluído + rejeitado + retrabalho ≤ recebido.
2. **Sem dupla contagem:** em ordens "máquina + etapa manual", o recebido na etapa manual não pode superar o saldo aprovado nas máquinas ainda não recebido.
3. A **produção final** é contada uma única vez: aprovado na máquina (ordens só-máquina) ou concluído na etapa manual (ordens com etapa manual).
4. Não há identificação individual nem ranking de trabalhadores.

## Perdas e aparas — quatro classificações obrigatórias
| Classificação | Entra no estoque de resíduos? | Entra no custo de perdas? |
| --- | --- | --- |
| Apara normal do processo | Sim | **Não** |
| Perda anormal / evitável | Sim | **Sim** |
| Retrabalho / reaproveitamento | Não (volta ao processo) | Não |
| Rejeito sem recuperação no processo | Sim (para destinação) | Não (exibido à parte) |

- Peso líquido > 0 em unidade de massa (convertido para kg no estoque).
- O motivo precisa ser compatível com a classificação.
- Origem "máquina" exige máquina do setor informado.

## Estoque de resíduos
1. Final = inicial + entradas − reutilizações − coletas ± ajustes (transferências só mudam o local).
2. **Nenhuma movimentação pode deixar saldo negativo**, nem na data informada nem em datas posteriores (movimentações retroativas).
3. Ajuste exige justificativa; transferência exige destino diferente da origem.
4. Movimentações não são apagadas; correções são feitas por ajuste.

## Coletas — Capital Recicláveis
1. Fluxo: **agendada → realizada → pesagem conferida → destinação documentada** (ou agendada → cancelada). Não é possível pular etapas.
2. Agendar não baixa estoque. **Realizada** baixa o estoque pelo peso informado pela Papelito, validando o saldo.
3. **Divergência** = confirmado − informado; percentual sobre o informado. Acima da tolerância (provisória: 2%) é sinalizada.
4. Material retirado **não** é considerado reciclado. Só conta como destinação comprovada com documento do tipo MTR ou CDF associado e destinação descrita.
5. O sistema registra referências de documentos; **não substitui** o MTR/SINIR.

## Finanças
1. Custos são informados manualmente, com vigência e origem; vigências não podem se sobrepor.
2. Custo bruto de perdas evitáveis = Σ kg de perda anormal × custo/kg da matéria-prima de origem vigente na data.
3. Valor recuperável = Σ kg de perda anormal × valor de venda do resíduo vigente.
4. Custo líquido = bruto − recuperável.
5. Valor recuperado com coletas usa somente peso **confirmado**.
6. Quantidades sem custo vigente são excluídas e sinalizadas — o sistema nunca estima preço.
7. Na demonstração, todos os custos são marcados como fictícios.

## Unidades
- Nunca somar unidades diferentes. Conversão só na mesma grandeza com fator fixo, ou por fator cadastrado no produto (caixa, bobina).
