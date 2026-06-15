-- Fortify account settings profile data.
-- Additive only: stores editable user profile fields without touching auth data.

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_profiles'
      and column_name = 'id'
  ) then
    execute 'update public.user_profiles set user_id = id where user_id is null';
  end if;

  if not exists (
    select 1 from public.user_profiles where user_id is null
  ) then
    execute 'alter table public.user_profiles alter column user_id set not null';
  end if;
end $$;

create unique index if not exists user_profiles_user_id_unique_idx
  on public.user_profiles(user_id);

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

alter table public.user_profiles enable row level security;

drop policy if exists user_profiles_select_own on public.user_profiles;
create policy user_profiles_select_own on public.user_profiles
for select to authenticated
using (user_id = auth.uid());

drop policy if exists user_profiles_insert_own on public.user_profiles;
create policy user_profiles_insert_own on public.user_profiles
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists user_profiles_update_own on public.user_profiles;
create policy user_profiles_update_own on public.user_profiles
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
