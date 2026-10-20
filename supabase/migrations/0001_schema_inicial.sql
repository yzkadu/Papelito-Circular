-- Papelito Circular — esquema inicial (Fase 2)
-- Espelha src/domain/types.ts. Quantidades em numeric (sem erro de ponto flutuante).
-- Pesos: numeric(14,3) em kg. Valores monetários: numeric(14,4) por kg.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- Perfis e usuários
create type app_role as enum ('operador', 'supervisor', 'ambiental', 'capital', 'financeiro', 'admin');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  role app_role not null default 'operador',
  sector_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function current_role_app() returns app_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and active
$$;

-- ---------------------------------------------------------------- Cadastros
create type unit_dimension as enum ('massa', 'contagem', 'comprimento', 'volume');
create table units (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  dimension unit_dimension not null,
  factor_to_base numeric(18,6) check (factor_to_base is null or factor_to_base > 0),
  active boolean not null default true
);

create type sector_kind as enum ('mecanizado', 'manual', 'apoio');
create table sectors (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  kind sector_kind not null,
  active boolean not null default true
);
alter table profiles add constraint profiles_sector_fk foreign key (sector_id) references sectors (id);

create table machines (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  sector_id uuid not null references sectors (id),
  notes text,
  active boolean not null default true
);

create table products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  unit_id uuid not null references units (id),
  active boolean not null default true
);

create table product_conversions (
  product_id uuid not null references products (id) on delete cascade,
  unit_id uuid not null references units (id),
  factor numeric(18,6) not null check (factor > 0),
  primary key (product_id, unit_id)
);

create type material_use as enum ('materia_prima', 'residuo');
create table materials (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  use material_use not null,
  category text not null,
  recyclable boolean not null,
  source_material_id uuid references materials (id),
  active boolean not null default true
);

create type waste_class as enum ('apara_normal', 'perda_anormal', 'retrabalho', 'rejeito');
create table loss_reasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  applies_to waste_class[] not null,
  active boolean not null default true
);

create table storage_locations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  active boolean not null default true
);

create table waste_lots (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,            -- conteúdo da etiqueta QR Code
  material_id uuid not null references materials (id),
  location_id uuid not null references storage_locations (id),
  container text not null,
  active boolean not null default true
);

-- ---------------------------------------------------------------- Produção
create type order_route as enum ('maquina', 'maquina_manual', 'manual');
create table production_orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  product_id uuid not null references products (id),
  route order_route not null,
  planned_qty numeric(14,3) not null check (planned_qty > 0),
  unit_id uuid not null references units (id),
  status text not null default 'aberta' check (status in ('aberta', 'encerrada')),
  opened_at date not null
);

create table machine_production_records (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  shift text not null check (shift in ('A', 'B', 'C')),
  machine_id uuid not null references machines (id),
  order_id uuid not null references production_orders (id),
  unit_id uuid not null references units (id),
  produced_qty numeric(14,3) not null check (produced_qty > 0),
  approved_qty numeric(14,3) not null check (approved_qty >= 0),
  rejected_qty numeric(14,3) not null check (rejected_qty >= 0),
  rework_qty numeric(14,3) not null check (rework_qty >= 0),
  raw_material_id uuid not null references materials (id),
  raw_material_kg numeric(14,3) not null check (raw_material_kg > 0),
  occurrence text,
  loss_reason_id uuid references loss_reasons (id),
  status text not null default 'pendente' check (status in ('pendente', 'validado')),
  created_by uuid not null default auth.uid() references profiles (id),
  created_at timestamptz not null default now(),
  constraint balance check (produced_qty = approved_qty + rejected_qty + rework_qty)
);

create table manual_production_records (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  shift text not null check (shift in ('A', 'B', 'C')),
  sector_id uuid not null references sectors (id),
  activity_type text not null,
  order_id uuid not null references production_orders (id),
  product_id uuid not null references products (id),
  unit_id uuid not null references units (id),
  received_qty numeric(14,3) not null check (received_qty > 0),
  completed_qty numeric(14,3) not null check (completed_qty >= 0),
  rejected_qty numeric(14,3) not null check (rejected_qty >= 0),
  rework_qty numeric(14,3) not null check (rework_qty >= 0),
  notes text,
  status text not null default 'pendente' check (status in ('pendente', 'validado')),
  created_by uuid not null default auth.uid() references profiles (id),
  created_at timestamptz not null default now(),
  constraint balance check (completed_qty + rejected_qty + rework_qty <= received_qty)
);
-- TODO Fase 2: trigger que limita received_qty ao saldo aprovado nas máquinas (ordens maquina_manual).

-- ---------------------------------------------------------------- Resíduos e estoque
create table waste_records (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  material_id uuid not null references materials (id),
  origin text not null check (origin in ('maquina', 'manual', 'outro')),
  sector_id uuid not null references sectors (id),
  machine_id uuid references machines (id),
  net_weight numeric(14,3) not null check (net_weight > 0),
  unit_id uuid not null references units (id),
  classification waste_class not null,
  reason_id uuid not null references loss_reasons (id),
  location_id uuid not null references storage_locations (id),
  lot_id uuid references waste_lots (id),
  production_record_id uuid references machine_production_records (id),
  created_by uuid not null default auth.uid() references profiles (id),
  created_at timestamptz not null default now(),
  check (origin <> 'maquina' or machine_id is not null)
);

create type movement_type as enum ('saldo_inicial', 'entrada', 'reutilizacao', 'transferencia', 'coleta', 'ajuste');
create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  type movement_type not null,
  material_id uuid not null references materials (id),
  location_id uuid not null references storage_locations (id),
  to_location_id uuid references storage_locations (id),
  quantity_kg numeric(14,3) not null,
  reference text not null,
  source_id uuid,
  note text,
  created_by uuid not null default auth.uid() references profiles (id),
  created_at timestamptz not null default now(),
  check (type = 'ajuste' or quantity_kg > 0),
  check (type <> 'ajuste' or (quantity_kg <> 0 and note is not null)),
  check (type <> 'transferencia' or (to_location_id is not null and to_location_id <> location_id))
);
-- TODO Fase 2: função RPC transacional que valida saldo (equivalente a checkMovement) com lock por material/local.

-- ---------------------------------------------------------------- Coletas
create type collection_status as enum ('agendada', 'realizada', 'pesagem_conferida', 'destinacao_documentada', 'cancelada');
create table collections (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  company text not null,
  scheduled_date date not null,
  collected_date date,
  location_id uuid not null references storage_locations (id),
  status collection_status not null default 'agendada',
  destination text,
  notes text
);
create table collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references collections (id) on delete cascade,
  material_id uuid not null references materials (id),
  lot_id uuid references waste_lots (id),
  declared_kg numeric(14,3) not null check (declared_kg > 0),
  confirmed_kg numeric(14,3) check (confirmed_kg >= 0)
);
create table collection_events (
  id bigserial primary key,
  collection_id uuid not null references collections (id) on delete cascade,
  status collection_status not null,
  at timestamptz not null default now(),
  actor uuid not null default auth.uid() references profiles (id)
);
create table documents (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references collections (id),
  kind text not null,
  name text not null,
  reference text not null,
  storage_path text,                   -- arquivo no Supabase Storage (bucket privado)
  added_by uuid not null default auth.uid() references profiles (id),
  added_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- Custos
create table costs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('materia_prima', 'venda_residuo')),
  material_id uuid not null references materials (id),
  value_per_kg numeric(14,4) not null check (value_per_kg >= 0),
  valid_from date not null,
  valid_to date,
  source text not null,
  check (valid_to is null or valid_to >= valid_from)
);
create extension if not exists btree_gist;
alter table costs add constraint costs_no_overlap exclude using gist (
  kind with =, material_id with =, daterange(valid_from, coalesce(valid_to, 'infinity'), '[]') with &&
);

-- ---------------------------------------------------------------- Auditoria (somente inserção por trigger)
create table audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor uuid default auth.uid(),
  table_name text not null,
  row_id text not null,
  action text not null,
  old_data jsonb,
  new_data jsonb
);

create or replace function audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    insert into audit_log (table_name, row_id, action, old_data)
    values (tg_table_name, to_jsonb(old) ->> 'id', tg_op, to_jsonb(old));
    return old;
  end if;
  insert into audit_log (table_name, row_id, action, old_data, new_data)
  values (tg_table_name, to_jsonb(new) ->> 'id', tg_op,
          case when tg_op = 'UPDATE' then to_jsonb(old) end, to_jsonb(new));
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['sectors','machines','products','units','materials','production_orders',
    'machine_production_records','manual_production_records','waste_records','stock_movements',
    'collections','collection_items','documents','costs']
  loop
    execute format('create trigger audit_%1$s after insert or update or delete on %1$s for each row execute function audit_trigger()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- RLS (Row Level Security)
-- Princípio: tudo bloqueado por padrão; políticas explícitas por perfil.
alter table profiles enable row level security;
alter table machine_production_records enable row level security;
alter table manual_production_records enable row level security;
alter table waste_records enable row level security;
alter table stock_movements enable row level security;
alter table collections enable row level security;
alter table collection_items enable row level security;
alter table documents enable row level security;
alter table costs enable row level security;
alter table audit_log enable row level security;

create policy "perfil próprio" on profiles for select using (id = auth.uid() or current_role_app() = 'admin');

create policy "produção: leitura interna" on machine_production_records for select
  using (current_role_app() in ('operador','supervisor','ambiental','financeiro','admin'));
create policy "produção: lançamento" on machine_production_records for insert
  with check (current_role_app() in ('operador','supervisor','admin') and created_by = auth.uid());
create policy "produção: validação" on machine_production_records for update
  using (current_role_app() in ('supervisor','admin'));

create policy "manual: leitura interna" on manual_production_records for select
  using (current_role_app() in ('operador','supervisor','ambiental','financeiro','admin'));
create policy "manual: lançamento" on manual_production_records for insert
  with check (current_role_app() in ('operador','supervisor','admin') and created_by = auth.uid());

create policy "resíduos: leitura" on waste_records for select
  using (current_role_app() in ('operador','supervisor','ambiental','financeiro','admin'));
create policy "resíduos: lançamento" on waste_records for insert
  with check (current_role_app() in ('operador','supervisor','ambiental','admin') and created_by = auth.uid());

create policy "estoque: leitura" on stock_movements for select
  using (current_role_app() in ('operador','supervisor','ambiental','financeiro','admin'));
-- Inserções no estoque somente pela função RPC (security definer) que valida saldo.

-- Capital Recicláveis: apenas coletas e itens/documentos de coletas.
create policy "coletas: leitura" on collections for select
  using (current_role_app() in ('supervisor','ambiental','capital','financeiro','admin'));
create policy "coletas: gestão" on collections for all
  using (current_role_app() in ('ambiental','admin'));
create policy "itens: leitura" on collection_items for select
  using (current_role_app() in ('supervisor','ambiental','capital','financeiro','admin'));
create policy "itens: confirmação de peso" on collection_items for update
  using (current_role_app() in ('ambiental','capital','admin'));
create policy "documentos: leitura" on documents for select
  using (current_role_app() in ('ambiental','capital','financeiro','admin'));
create policy "documentos: inclusão" on documents for insert
  with check (current_role_app() in ('ambiental','capital','admin') and added_by = auth.uid());

create policy "custos: somente gestão" on costs for select using (current_role_app() in ('financeiro','admin'));
create policy "custos: edição" on costs for all using (current_role_app() in ('financeiro','admin'));

create policy "auditoria: leitura" on audit_log for select
  using (current_role_app() in ('supervisor','ambiental','financeiro','admin'));
-- Nenhuma política de insert/update/delete em audit_log: só o trigger (security definer) escreve.

-- ---------------------------------------------------------------- RLS dos cadastros
-- Sem RLS, a API pública do Supabase permitiria leitura E escrita anônima nestas tabelas.
do $$
declare t text;
begin
  foreach t in array array['units','sectors','machines','products','product_conversions','materials','loss_reasons',
    'storage_locations','waste_lots','production_orders','collection_events']
  loop
    execute format('alter table %I enable row level security', t);
    execute format($p$create policy "leitura: usuários ativos" on %I for select using (current_role_app() is not null)$p$, t);
    execute format($p$create policy "edição: administrador" on %I for all using (current_role_app() = 'admin') with check (current_role_app() = 'admin')$p$, t);
  end loop;
end $$;

-- Ordens de produção também podem ser abertas por quem registra produção.
create policy "ordens: abertura" on production_orders for insert
  with check (current_role_app() in ('operador','supervisor','admin'));
-- Histórico de status das coletas: inclusão por quem gerencia ou confirma coletas.
create policy "eventos de coleta: inclusão" on collection_events for insert
  with check (current_role_app() in ('ambiental','capital','admin') and actor = auth.uid());

create policy "perfis: administrador" on profiles for all
  using (current_role_app() = 'admin') with check (current_role_app() = 'admin');
