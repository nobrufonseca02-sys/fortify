-- Fortify Guard: vídeo de instalação só para quem tem plano pago em dia.
--
-- O arquivo fica num bucket PRIVADO. O site pede uma URL assinada
-- (storage.createSignedUrl), e o Storage só assina se a política abaixo deixar
-- o usuário ler o objeto. A regra repete a do gateway (getUserEntitlement em
-- services/metaapi-gateway/src/server.ts): assinatura mais recente, plano que
-- não seja beta_free, limite de contas > 0, status active/trialing e
-- paid_until (ou current_period_end) no futuro.

create or replace function public.has_active_paid_plan(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with latest as (
    select s.plan_id, s.status, s.account_limit, coalesce(s.paid_until, s.current_period_end) as paid_until
    from public.user_subscriptions s
    where s.user_id = p_user_id
    order by s.updated_at desc nulls last
    limit 1
  )
  select exists (
    select 1
    from latest l
    left join public.plans p on p.id = l.plan_id or p.slug = l.plan_id
    where l.plan_id is not null
      and lower(coalesce(p.slug, l.plan_id)) <> 'beta_free'
      and coalesce(l.account_limit, p.account_limit, 0) > 0
      and lower(coalesce(l.status, '')) in ('active', 'trialing')
      and l.paid_until is not null
      and l.paid_until > now()
  );
$$;

revoke all on function public.has_active_paid_plan(uuid) from public, anon;
grant execute on function public.has_active_paid_plan(uuid) to authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fortify-guard', 'fortify-guard', false, 26214400, array['video/mp4'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "fortify_guard_video_paid_read" on storage.objects;
create policy "fortify_guard_video_paid_read"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'fortify-guard' and public.has_active_paid_plan(auth.uid()));
