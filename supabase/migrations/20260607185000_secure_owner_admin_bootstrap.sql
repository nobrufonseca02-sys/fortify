-- Fortify secure admin bootstrap.
-- Additive only: preserves existing roles and grants owner admin safely.

do $$
begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'app_role') then
    create type public.app_role as enum ('admin', 'moderator', 'user');
  end if;
end
$$;

alter type public.app_role add value if not exists 'support';

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, role)
);

alter table public.user_roles
  add column if not exists updated_at timestamptz not null default now();

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

drop policy if exists "Users can read own roles" on public.user_roles;
create policy "Users can read own roles"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Admins can manage roles" on public.user_roles;
create policy "Admins can manage roles"
on public.user_roles
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.ensure_owner_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_email constant text := 'nobrufonseca01@hotmail.com';
  jwt_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null or jwt_email <> owner_email then
    return false;
  end if;

  insert into public.user_roles (user_id, role)
  values (auth.uid(), 'admin')
  on conflict (user_id, role) do nothing;

  return true;
end;
$$;

grant execute on function public.ensure_owner_admin() to authenticated;

drop trigger if exists user_roles_set_updated_at on public.user_roles;
create trigger user_roles_set_updated_at
before update on public.user_roles
for each row execute function public.set_updated_at();

insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where lower(email) = 'nobrufonseca01@hotmail.com'
on conflict (user_id, role) do nothing;
