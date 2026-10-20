# Modelo de dados

Fonte: `src/domain/types.ts` (frontend) e `supabase/migrations/0001_schema_inicial.sql` (banco, Fase 2).

## Entidades

| Entidade | Chave | Relações principais | Restrições |
| --- | --- | --- | --- |
| `profiles` (usuários e perfis) | id = auth.users.id | setor (opcional) | perfil ∈ 6 papéis |
| `units` | id | — | código único; fator > 0 ou nulo (embalagem) |
| `sectors` | id | — | código único; tipo mecanizado/manual/apoio |
| `machines` | id | setor | código único |
| `products` / `product_conversions` | id / (produto, unidade) | unidade-padrão | fator > 0 |
| `materials` | id | matéria-prima de origem (resíduos) | uso: matéria-prima ou resíduo |
| `loss_reasons` | id | — | lista de classificações aplicáveis |
| `storage_locations`, `waste_lots` | id | material, local | código do lote único (QR Code) |
| `production_orders` | id | produto, unidade | roteiro: máquina / máquina+manual / manual |
| `machine_production_records` | id | máquina, ordem, matéria-prima, motivo | produzido = aprovado + rejeitado + retrabalho |
| `manual_production_records` | id | setor, ordem, produto | concluído + rejeitado + retrabalho ≤ recebido |
| `waste_records` | id | material, setor, máquina, motivo, local, lote, registro de produção | peso > 0 em massa; máquina obrigatória se origem = máquina |
| `stock_movements` | id | material, local, local destino, origem (`source_id`) | quantidade > 0 (ajuste ≠ 0 com justificativa) |
| `collections` / `collection_items` / `collection_events` | id | local, material, lote | número único; peso informado > 0 |
| `documents` | id | coleta | referência obrigatória; arquivo em storage privado |
| `costs` | id | material | vigências não sobrepostas por (tipo, material) |
| `audit_log` | id | ator | escrita somente por trigger |

## Rastreabilidade

```
matéria-prima (materials, uso = MP)
   └─► machine_production_records.raw_material_id / raw_material_kg
          └─► waste_records.production_record_id  (resíduo cujo material.source_material_id = MP)
                 └─► stock_movements (entrada, source_id = waste_record)
                        └─► stock_movements (transferência / coleta, source_id = collection)
                               └─► collections → collection_items (lote) → documents (destinação)
```

## Precisão e unidades

- Quantidades e pesos: `numeric(14,3)`; custos: `numeric(14,4)` R$/kg.
- Cada grandeza tem uma unidade-base (kg, un, m, L). Conversão geral só dentro da mesma grandeza; caixas e bobinas só convertem com fator do produto.
- Resíduos e estoque sempre em massa (kg). Produção na unidade da ordem.
