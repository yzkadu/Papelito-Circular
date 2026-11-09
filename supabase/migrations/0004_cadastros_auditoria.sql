-- Papelito Circular: auditoria automatica de cadastros industriais.
-- Mantem historico de inclusoes, edicoes e ativacao/desativacao.
create table if not exists public.circular_master_audit (
  id bigint generated always as identity primary key,
  entity_type text not null check (entity_type in ('machine','material')),
  entity_id uuid not null,
  operation text not null check (operation in ('insert','update')),
  old_data jsonb,
  new_data jsonb not null,
  changed_by uuid references public.profiles(id),
  changed_at timestamptz not null default now()
);
alter table public.circular_master_audit enable row level security;
revoke all on public.circular_master_audit from public, anon, authenticated;
grant select on public.circular_master_audit to authenticated;

drop policy if exists "circular_master_audit_read" on public.circular_master_audit;
create policy "circular_master_audit_read" on public.circular_master_audit
for select to authenticated
using ((select public.current_role_app()) in ('admin','supervisor','ambiental'));

create or replace function app_private.circular_audit_master()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_kind text;
begin
  if (select auth.uid()) is null then raise exception 'Login obrigatorio para alterar cadastros'; end if;
  v_kind := case tg_table_name
    when 'circular_machines' then 'machine'
    when 'circular_materials' then 'material'
    else null end;
  if v_kind is null then raise exception 'Tabela de auditoria nao autorizada'; end if;
  if tg_op = 'INSERT' then
    insert into public.circular_master_audit(entity_type, entity_id, operation, old_data, new_data, changed_by)
    values (v_kind, new.id, 'insert', null, to_jsonb(new), (select auth.uid()));
  elsif tg_op = 'UPDATE' and to_jsonb(new) is distinct from to_jsonb(old) then
    insert into public.circular_master_audit(entity_type, entity_id, operation, old_data, new_data, changed_by)
    values (v_kind, new.id, 'update', to_jsonb(old), to_jsonb(new), (select auth.uid()));
  end if;
  return new;
end $$;
revoke execute on function app_private.circular_audit_master() from public,anon,authenticated;
drop trigger if exists circular_machines_audit on public.circular_machines;
create trigger circular_machines_audit
after insert or update on public.circular_machines
for each row execute function app_private.circular_audit_master();
drop trigger if exists circular_materials_audit on public.circular_materials;
create trigger circular_materials_audit
after insert or update on public.circular_materials
for each row execute function app_private.circular_audit_master();
