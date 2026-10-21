-- Papelito Circular: cadastro de perfis por area e RLS de administracao.
-- Sem contas ficticias e sem credenciais no codigo.
create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;

create or replace function app_private.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.active and p.role = 'admin'::public.app_role
  )
$$;
revoke all on function app_private.is_admin() from public, anon;
grant execute on function app_private.is_admin() to authenticated;

create or replace function public.current_role_app()
returns public.app_role
language sql stable security definer
set search_path = ''
as $$
  select p.role from public.profiles p
  where p.id = (select auth.uid()) and p.active
$$;
revoke execute on function public.current_role_app() from public, anon;
grant execute on function public.current_role_app() to authenticated;

alter table public.profiles enable row level security;
drop policy if exists "perfil próprio" on public.profiles;
drop policy if exists "perfis: administrador" on public.profiles;
drop policy if exists "ler perfil autorizado" on public.profiles;
drop policy if exists "criar perfil: admin" on public.profiles;
drop policy if exists "editar perfil: admin" on public.profiles;

create policy "ler perfil autorizado" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select app_private.is_admin()));

create policy "criar perfil: admin" on public.profiles
  for insert to authenticated
  with check ((select app_private.is_admin()));

create policy "editar perfil: admin" on public.profiles
  for update to authenticated
  using ((select app_private.is_admin()))
  with check ((select app_private.is_admin()));

revoke all on public.profiles from anon;
revoke delete, truncate, references, trigger on public.profiles from authenticated;
grant select, insert, update on public.profiles to authenticated;

-- Um administrador nao pode remover os proprios privilegios sem substituto.
create or replace function public.protect_admin_profiles()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.id = (select auth.uid())
     and (new.role <> old.role or new.active <> old.active)
     and old.role = 'admin'::public.app_role then
    raise exception 'Nao e permitido alterar o proprio perfil administrativo';
  end if;
  if old.role = 'admin'::public.app_role and old.active
    and (new.role <> 'admin'::public.app_role or not new.active)
    and (select count(*) from public.profiles p where p.role = 'admin'::public.app_role and p.active) <= 1 then
    raise exception 'O ultimo administrador ativo nao pode ser desativado';
  end if;
  return new;
end
$$;

drop trigger if exists protect_admin_profiles_trigger on public.profiles;
create trigger protect_admin_profiles_trigger
before update on public.profiles
for each row execute function public.protect_admin_profiles();

-- Funcoes acionadas apenas por gatilhos nao devem ser endpoints RPC.
revoke execute on function public.audit_trigger() from public, anon, authenticated;
revoke execute on function public.check_manual_stage() from public, anon, authenticated;
revoke execute on function public.set_created_by_role() from public, anon, authenticated;
revoke execute on function public.protect_admin_profiles() from public, anon, authenticated;

-- Evita search_path implicito em funcoes simples existentes.
alter function public._fmt_kg(numeric) set search_path = '';
alter function public._collection_status_label(public.collection_status) set search_path = '';
alter function public.guard_collection_status() set search_path = '';
