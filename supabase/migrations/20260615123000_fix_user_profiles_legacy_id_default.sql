-- Fortify settings save compatibility.
-- Some existing projects have public.user_profiles.id as a required auth user FK.
-- Default it to auth.uid() so user_id-based upserts can create the first row.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_profiles'
      and column_name = 'id'
  ) then
    execute 'alter table public.user_profiles alter column id set default auth.uid()';
  end if;
end $$;

drop policy if exists user_profiles_select_own on public.user_profiles;
create policy user_profiles_select_own on public.user_profiles
for select to authenticated
using (auth.uid() = user_id);

drop policy if exists user_profiles_insert_own on public.user_profiles;
create policy user_profiles_insert_own on public.user_profiles
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists user_profiles_update_own on public.user_profiles;
create policy user_profiles_update_own on public.user_profiles
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

