-- Circuito de Festivais — esquema de persistência segura para Supabase.
-- Execute no SQL Editor de um projeto novo. Não contém segredos.
-- O único administrador é a identidade GitHub imutável 337477512
-- (nome público atual: circuitofestivais).

create extension if not exists pgcrypto;

create table if not exists public.admin_github_accounts (
  github_user_id bigint primary key check (github_user_id > 0),
  github_username text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.admin_github_accounts (github_user_id, github_username, active)
values (337477512, 'circuitofestivais', true)
on conflict (github_user_id) do update
set github_username = excluded.github_username,
    active = excluded.active;

alter table public.admin_github_accounts enable row level security;

create or replace function public.is_circuito_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.admin_github_accounts admins
    join auth.identities identities
      on identities.user_id = auth.uid()
     and identities.provider = 'github'
    where admins.github_user_id::text = identities.provider_id
      and admins.active = true
  );
$$;

revoke all on function public.is_circuito_admin() from public;
grant execute on function public.is_circuito_admin() to authenticated;

create table if not exists public.festivals (
  id text primary key,
  source_number integer not null unique check (source_number > 0),
  source_row integer,
  position integer not null check (position > 0),
  payload jsonb not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  constraint payload_id_matches check (payload ->> 'id' = id)
);

create index if not exists festivals_public_position_idx
  on public.festivals (position)
  where deleted_at is null;

create table if not exists public.festival_history (
  history_id bigint generated always as identity primary key,
  festival_id text not null,
  action text not null check (action in ('create', 'update', 'archive', 'restore')),
  old_payload jsonb,
  new_payload jsonb,
  old_deleted_at timestamptz,
  new_deleted_at timestamptz,
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users(id)
);

create or replace function public.touch_festival()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists festivals_touch on public.festivals;
create trigger festivals_touch
before insert or update on public.festivals
for each row execute function public.touch_festival();

create or replace function public.log_festival_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_action text;
begin
  if tg_op = 'INSERT' then
    event_action := 'create';
  elsif old.deleted_at is null and new.deleted_at is not null then
    event_action := 'archive';
  elsif old.deleted_at is not null and new.deleted_at is null then
    event_action := 'restore';
  else
    event_action := 'update';
  end if;

  insert into public.festival_history (
    festival_id, action, old_payload, new_payload,
    old_deleted_at, new_deleted_at, changed_by
  ) values (
    new.id, event_action,
    case when tg_op = 'INSERT' then null else old.payload end,
    new.payload,
    case when tg_op = 'INSERT' then null else old.deleted_at end,
    new.deleted_at,
    auth.uid()
  );
  return new;
end;
$$;

drop trigger if exists festivals_history on public.festivals;
create trigger festivals_history
after insert or update on public.festivals
for each row execute function public.log_festival_change();

alter table public.festivals enable row level security;
alter table public.festival_history enable row level security;

drop policy if exists "public reads active festivals" on public.festivals;
create policy "public reads active festivals"
on public.festivals for select
to anon, authenticated
using (deleted_at is null);

drop policy if exists "admins read all festivals" on public.festivals;
create policy "admins read all festivals"
on public.festivals for select
to authenticated
using (public.is_circuito_admin());

drop policy if exists "admins insert festivals" on public.festivals;
create policy "admins insert festivals"
on public.festivals for insert
to authenticated
with check (public.is_circuito_admin());

drop policy if exists "admins update festivals" on public.festivals;
create policy "admins update festivals"
on public.festivals for update
to authenticated
using (public.is_circuito_admin())
with check (public.is_circuito_admin());

drop policy if exists "admins read history" on public.festival_history;
create policy "admins read history"
on public.festival_history for select
to authenticated
using (public.is_circuito_admin());

drop policy if exists "admins read GitHub allowlist" on public.admin_github_accounts;
create policy "admins read GitHub allowlist"
on public.admin_github_accounts for select
to authenticated
using (public.is_circuito_admin());

grant select on public.festivals to anon, authenticated;
grant insert, update on public.festivals to authenticated;
grant select on public.festival_history to authenticated;
grant select on public.admin_github_accounts to authenticated;

-- A autorização usa auth.identities.provider_id, mantido pelo Supabase Auth.
-- Ela não usa e-mail, nome de usuário ou user_metadata alterável pelo usuário.
