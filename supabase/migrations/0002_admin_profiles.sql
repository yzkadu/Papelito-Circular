-- Papelito Circular: permissões de administração (executar após 0001_schema_inicial.sql).
-- Não cria contas nem administradores automaticamente.
-- O primeiro admin deve ser cadastrado manualmente com UUID existente em auth.users.
create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.active and p.role = 'admin'
  )
$$;

-- Administradores somente podem gerenciar usuários existentes no Supabase Auth.
-- O FK profiles.id -> auth.users.id impede criar perfis para IDs inexistentes.
drop policy if exists "perfis: administrador" on public.profiles;
create policy "perfis: administrador" on public.profiles
  for all to authenticated
  using ((select public.is_app_admin()))
  with check ((select public.is_app_admin()));

-- Uma conta não pode criar elevação de acesso no primeiro login.
-- Nenhuma política INSERT é liberada para usuários comuns.
-- A função current_role_app() já retorna NULL para contas sem perfil ativo.

-- Perfis: proibir o administrador de remover o próprio cargo/ativação por engano
-- e impedir a exclusão do último administrador ativo.
create or replace function public.protect_admin_profiles()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.id = (select auth.uid()) then
      raise exception 'O administrador não pode excluir o próprio perfil';
    end if;
    if old.role = 'admin' and old.active and
       (select count(*) from public.profiles where role = 'admin' and active) <= 1 then
      raise exception 'Não é permitido excluir o último administrador ativo';
    end if;
    return old;
  end if;
  if old.id = (select auth.uid()) and (new.role <> 'admin' or not new.active) then
    raise exception 'O administrador não pode desativar ou rebaixar o próprio perfil';
  end if;
  if old.role = 'admin' and old.active and (new.role <> 'admin' or not new.active) and
     (select count(*) from public.profiles where role = 'admin' and active) <= 1 then
    raise exception 'Não é permitido desativar o último administrador ativo';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_admin_profiles_trigger on public.profiles;
create trigger protect_admin_profiles_trigger
before update or delete on public.profiles
for each row execute function public.protect_admin_profiles();
