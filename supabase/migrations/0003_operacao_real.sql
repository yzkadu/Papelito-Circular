-- Papelito Circular: operacao real inicial, sem seed demonstrativa.
-- Entidades novas para nao apagar o historico nem autenticao existente.
create table if not exists public.circular_machines (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (length(trim(code)) between 2 and 40),
  name text not null check (length(trim(name)) >= 2),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.circular_materials (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (length(trim(code)) between 2 and 40),
  name text not null check (length(trim(name)) >= 2),
  recyclable boolean not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.circular_scrap_standards (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.circular_machines(id),
  material_id uuid not null references public.circular_materials(id),
  expected_pct numeric(8,4) not null check (expected_pct >= 0 and expected_pct <= 100),
  source text not null check (length(trim(source)) >= 3),
  valid_from date not null,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(machine_id, material_id, valid_from)
);
create table if not exists public.circular_entries (
  id uuid primary key default gen_random_uuid(),
  occurred_on date not null,
  machine_id uuid not null references public.circular_machines(id),
  material_id uuid not null references public.circular_materials(id),
  batch_ref text not null check (length(trim(batch_ref)) >= 1),
  origin_class text not null check (origin_class in ('apara_normal','perda_anormal')),
  destination text not null check (destination in ('reciclagem','reuso','rejeito')),
  quantity_kg numeric(14,3) not null check (quantity_kg > 0),
  reason text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint loss_reason_required check (origin_class <> 'perda_anormal' or length(trim(coalesce(reason,''))) >= 3)
);
create table if not exists public.circular_pickups (
  id uuid primary key default gen_random_uuid(),
  occurred_on date not null,
  material_id uuid not null references public.circular_materials(id),
  quantity_kg numeric(14,3) not null check (quantity_kg > 0),
  partner text not null check (length(trim(partner)) >= 2),
  document_ref text,
  notes text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists circular_entries_material_idx on public.circular_entries(material_id, occurred_on);
create index if not exists circular_entries_machine_idx on public.circular_entries(machine_id, occurred_on);
create index if not exists circular_pickups_material_idx on public.circular_pickups(material_id, occurred_on);

-- Regras operacionais aplicadas no banco, nao apenas na interface.
create or replace function public.circular_validate_entry()
returns trigger language plpgsql set search_path = '' as $$
declare v_recyclable boolean;
begin
  if not exists (select 1 from public.circular_machines m where m.id = new.machine_id and m.active) then
    raise exception 'Maquina nao cadastrada ou inativa';
  end if;
  select m.recyclable into v_recyclable from public.circular_materials m where m.id = new.material_id and m.active;
  if not found then raise exception 'Material nao cadastrado ou inativo'; end if;
  if new.destination = 'reciclagem' and not v_recyclable then
    raise exception 'Material nao habilitado para reciclagem';
  end if;
  return new;
end $$;
drop trigger if exists circular_validate_entry_trigger on public.circular_entries;
create trigger circular_validate_entry_trigger
before insert on public.circular_entries
for each row execute function public.circular_validate_entry();

-- Trava por material: duas coletas simultaneas nao podem retirar o mesmo saldo.
create or replace function public.circular_validate_pickup()
returns trigger language plpgsql set search_path = '' as $$
declare v_in numeric; v_out numeric;
begin
  perform 1 from public.circular_materials m where m.id = new.material_id and m.active and m.recyclable for update;
  if not found then raise exception 'Material inativo ou nao reciclavel'; end if;
  select coalesce(sum(e.quantity_kg),0) into v_in
    from public.circular_entries e where e.material_id=new.material_id and e.destination='reciclagem' and e.occurred_on <= new.occurred_on;
  select coalesce(sum(p.quantity_kg),0) into v_out
    from public.circular_pickups p where p.material_id=new.material_id and p.occurred_on <= new.occurred_on;
  if new.quantity_kg > v_in-v_out then
    raise exception 'Saldo insuficiente para a coleta nesta data';
  end if;
  return new;
end $$;
drop trigger if exists circular_validate_pickup_trigger on public.circular_pickups;
create trigger circular_validate_pickup_trigger
before insert on public.circular_pickups
for each row execute function public.circular_validate_pickup();

-- Trigger registra UUID da conta autenticada mesmo que o cliente envie outro valor.
create or replace function public.circular_stamp_creator()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Login necessario'; end if;
  new.created_by := (select auth.uid());
  return new;
end $$;
drop trigger if exists circular_stamp_standards on public.circular_scrap_standards;
create trigger circular_stamp_standards before insert on public.circular_scrap_standards
for each row execute function public.circular_stamp_creator();
drop trigger if exists circular_stamp_entries on public.circular_entries;
create trigger circular_stamp_entries before insert on public.circular_entries
for each row execute function public.circular_stamp_creator();
drop trigger if exists circular_stamp_pickups on public.circular_pickups;
create trigger circular_stamp_pickups before insert on public.circular_pickups
for each row execute function public.circular_stamp_creator();

do $$
declare t text;
begin
 foreach t in array array['circular_machines','circular_materials','circular_scrap_standards','circular_entries','circular_pickups']
 loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on table public.%I from anon',t);
  execute format('revoke all on table public.%I from authenticated',t);
  execute format('grant select on table public.%I to authenticated',t);
 end loop;
end $$;
grant insert,update on public.circular_machines,public.circular_materials to authenticated;
grant insert on public.circular_scrap_standards,public.circular_entries,public.circular_pickups to authenticated;

drop policy if exists "circular_machines_read" on public.circular_machines;
create policy "circular_machines_read" on public.circular_machines for select to authenticated
using ((select public.current_role_app()) is not null);
drop policy if exists "circular_machines_insert" on public.circular_machines;
create policy "circular_machines_insert" on public.circular_machines for insert to authenticated
with check ((select public.current_role_app()) in ('admin','supervisor'));
drop policy if exists "circular_machines_update" on public.circular_machines;
create policy "circular_machines_update" on public.circular_machines for update to authenticated
using ((select public.current_role_app()) in ('admin','supervisor'))
with check ((select public.current_role_app()) in ('admin','supervisor'));

drop policy if exists "circular_materials_read" on public.circular_materials;
create policy "circular_materials_read" on public.circular_materials for select to authenticated
using ((select public.current_role_app()) is not null);
drop policy if exists "circular_materials_insert" on public.circular_materials;
create policy "circular_materials_insert" on public.circular_materials for insert to authenticated
with check ((select public.current_role_app()) in ('admin','supervisor','ambiental'));
drop policy if exists "circular_materials_update" on public.circular_materials;
create policy "circular_materials_update" on public.circular_materials for update to authenticated
using ((select public.current_role_app()) in ('admin','supervisor','ambiental'))
with check ((select public.current_role_app()) in ('admin','supervisor','ambiental'));

drop policy if exists "circular_standards_read" on public.circular_scrap_standards;
create policy "circular_standards_read" on public.circular_scrap_standards for select to authenticated
using ((select public.current_role_app()) in ('admin','supervisor','ambiental','financeiro'));
drop policy if exists "circular_standards_insert" on public.circular_scrap_standards;
create policy "circular_standards_insert" on public.circular_scrap_standards for insert to authenticated
with check ((select public.current_role_app()) in ('admin','supervisor') and created_by=(select auth.uid()));

drop policy if exists "circular_entries_read" on public.circular_entries;
create policy "circular_entries_read" on public.circular_entries for select to authenticated
using ((select public.current_role_app()) in ('admin','supervisor','ambiental','financeiro','operador'));
drop policy if exists "circular_entries_insert" on public.circular_entries;
create policy "circular_entries_insert" on public.circular_entries for insert to authenticated
with check ((select public.current_role_app()) in ('admin','supervisor','ambiental','operador') and created_by=(select auth.uid()));

drop policy if exists "circular_pickups_read" on public.circular_pickups;
create policy "circular_pickups_read" on public.circular_pickups for select to authenticated
using ((select public.current_role_app()) in ('admin','supervisor','ambiental','financeiro','capital'));
drop policy if exists "circular_pickups_insert" on public.circular_pickups;
create policy "circular_pickups_insert" on public.circular_pickups for insert to authenticated
with check ((select public.current_role_app()) in ('admin','ambiental') and created_by=(select auth.uid()));

revoke execute on function public.circular_validate_entry() from public,anon,authenticated;
revoke execute on function public.circular_validate_pickup() from public,anon,authenticated;
revoke execute on function public.circular_stamp_creator() from public,anon,authenticated;
