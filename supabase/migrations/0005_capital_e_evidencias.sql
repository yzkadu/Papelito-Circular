-- Etapa Papelito -> Capital Reciclaveis: conciliacao, rastreabilidade e evidencias reais.
-- Nao cria nenhuma entidade, peso, documento ou usuario ficticio.

-- IMPORTACAO SEGURA: chave da linha de origem, preservada na repeticao da planilha.
alter table public.circular_entries
  add column if not exists import_source text not null default 'manual',
  add column if not exists source_ref text;
alter table public.circular_entries drop constraint if exists circular_entries_source_consistency;
alter table public.circular_entries add constraint circular_entries_source_consistency
 check ((import_source='manual' and source_ref is null)
     or (import_source='csv' and length(trim(coalesce(source_ref,''))) between 3 and 140));
create unique index if not exists circular_entries_source_ref_unique
on public.circular_entries(source_ref) where source_ref is not null;

-- CONFIRMACAO DO RECEBIMENTO, SEM ALTERAR PESO ORIGINAL OU DUPLICAR ESTOQUE.
create table if not exists public.circular_pickup_confirmations (
  id uuid primary key default gen_random_uuid(),
  pickup_id uuid not null unique references public.circular_pickups(id) on delete restrict,
  received_on date not null,
  received_kg numeric(14,3) not null check (received_kg > 0),
  receipt_reference text not null check (length(trim(receipt_reference)) between 3 and 180),
  notes text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists circular_confirmation_created_idx on public.circular_pickup_confirmations(created_at desc);

create or replace function app_private.validate_capital_receipt()
returns trigger language plpgsql set search_path = '' as $$
declare v_partner text; v_date date;
begin
  select p.partner, p.occurred_on into v_partner,v_date
  from public.circular_pickups p where p.id=new.pickup_id;
  if not found then raise exception 'Coleta de origem nao encontrada'; end if;
  if lower(trim(v_partner)) not in ('capital reciclaveis','capital recicláveis') then
    raise exception 'Somente retiradas da Capital Reciclaveis podem ser confirmadas por este perfil';
  end if;
  if new.received_on < v_date then raise exception 'Data do recebimento anterior a retirada'; end if;
  return new;
end $$;
revoke all on function app_private.validate_capital_receipt() from public,anon,authenticated;
drop trigger if exists validate_capital_receipt_trigger on public.circular_pickup_confirmations;
create trigger validate_capital_receipt_trigger before insert on public.circular_pickup_confirmations
  for each row execute function app_private.validate_capital_receipt();

alter table public.circular_pickup_confirmations enable row level security;
revoke all on public.circular_pickup_confirmations from anon,authenticated;
grant select,insert on public.circular_pickup_confirmations to authenticated;
drop policy if exists "capital_confirmation_read" on public.circular_pickup_confirmations;
create policy "capital_confirmation_read" on public.circular_pickup_confirmations for select to authenticated
using ((select public.current_role_app()) in ('admin','supervisor','ambiental','financeiro','capital'));
drop policy if exists "capital_confirmation_insert" on public.circular_pickup_confirmations;
create policy "capital_confirmation_insert" on public.circular_pickup_confirmations for insert to authenticated
with check ((select public.current_role_app()) = 'capital' and created_by = (select auth.uid()));

-- EVIDENCIAS DO PROJETO ACADEMICO, DE ACESSO EXCLUSIVO A ADMINISTRACAO.
create table if not exists public.circular_academic_evidence (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in (
    'necessidade','diagnostico','aceite','planejamento','execucao','frequencia','devolutiva','relatorio','depoimento'
  )),
  title text not null check (length(trim(title)) between 4 and 150),
  description text not null check (length(trim(description)) between 8 and 2500),
  occurred_on date not null,
  document_reference text,
  storage_path text unique,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.circular_academic_evidence enable row level security;
revoke all on public.circular_academic_evidence from anon,authenticated;
grant select,insert on public.circular_academic_evidence to authenticated;
drop policy if exists "circular_evidence_select" on public.circular_academic_evidence;
create policy "circular_evidence_select" on public.circular_academic_evidence for select to authenticated
using ((select public.current_role_app())='admin');
drop policy if exists "circular_evidence_insert" on public.circular_academic_evidence;
create policy "circular_evidence_insert" on public.circular_academic_evidence for insert to authenticated
with check ((select public.current_role_app())='admin' and created_by=(select auth.uid()));

-- BUCKET PRIVADO. Arquivos nunca recebem URL publica.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('papelito-circular-evidencias','papelito-circular-evidencias',false,10485760,
array['application/pdf','image/png','image/jpeg'])
on conflict (id) do update set public=false, file_size_limit=10485760,
 allowed_mime_types=array['application/pdf','image/png','image/jpeg'];

drop policy if exists "papelito_evidences_storage_read" on storage.objects;
create policy "papelito_evidences_storage_read" on storage.objects for select to authenticated
using (bucket_id='papelito-circular-evidencias'
 and (select public.current_role_app())='admin');

drop policy if exists "papelito_evidences_storage_insert" on storage.objects;
create policy "papelito_evidences_storage_insert" on storage.objects for insert to authenticated
with check (bucket_id='papelito-circular-evidencias'
 and (select public.current_role_app())='admin'
 and split_part(name,'/',1)=(select auth.uid())::text
 and name ~ '^[0-9a-f-]+/[0-9a-f-]+\.(pdf|png|jpg|jpeg)$');

drop policy if exists "papelito_evidences_storage_cleanup" on storage.objects;
create policy "papelito_evidences_storage_cleanup" on storage.objects for delete to authenticated
using (bucket_id='papelito-circular-evidencias'
 and (select public.current_role_app())='admin'
 and split_part(name,'/',1)=(select auth.uid())::text);
