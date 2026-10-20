-- Unidades de medida genéricas (não são dados da Papelito). Demais cadastros serão feitos pelo administrador.
insert into units (code, name, dimension, factor_to_base) values
  ('KG', 'Quilograma', 'massa', 1),
  ('G', 'Grama', 'massa', 0.001),
  ('T', 'Tonelada', 'massa', 1000),
  ('UN', 'Unidade', 'contagem', 1),
  ('MIL', 'Milheiro', 'contagem', 1000),
  ('CX', 'Caixa', 'contagem', null),
  ('BOB', 'Bobina', 'contagem', null),
  ('M', 'Metro', 'comprimento', 1),
  ('L', 'Litro', 'volume', 1)
on conflict (code) do nothing;
