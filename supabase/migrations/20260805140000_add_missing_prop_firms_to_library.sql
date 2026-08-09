-- The curated static library (src/data/propFirmRules.ts, aggregated from
-- src/data/prop-firms/*.ts — used by PropFirmLibrary.tsx) has 14 firms, but
-- the operational prop_firms table used by CreateAccount.tsx's firm picker
-- (usePropFirms(), filtered to status = 'active') was missing four of them:
-- ASAP Funding Prop, BrightFunded, NP Future and FXIFY. Adds them following
-- the same starter-placeholder pattern as the 20260606123000 migration: one
-- generic evaluation program plus a draft "Starter Rules" rule_set_version
-- that needs manual verification against official firm materials before
-- activation (no rule_instances yet, same as the other placeholder firms).

with seed_prop_firms(name, slug, category, status, color) as (
  values
    ('ASAP Funding Prop', 'asap-funding-prop', 'forex'::public.prop_firm_category, 'active'::public.prop_firm_status, '#2f8fff'),
    ('BrightFunded', 'brightfunded', 'forex'::public.prop_firm_category, 'active'::public.prop_firm_status, '#f2cc0d'),
    ('NP Future', 'np-future', 'futures'::public.prop_firm_category, 'active'::public.prop_firm_status, '#be123c'),
    ('FXIFY', 'fxify', 'forex'::public.prop_firm_category, 'active'::public.prop_firm_status, '#1aa1e6')
)
insert into public.prop_firms (name, slug, category, status, color)
select spf.name, spf.slug, spf.category, spf.status, spf.color
from seed_prop_firms spf
where not exists (
  select 1 from public.prop_firms pf
  where pf.slug = spf.slug
);

with firm_programs(slug, name, account_type, market_type, modality, phase, account_size, notes, review_status) as (
  values
    ('asap-funding-prop', 'Evaluation / Funded', 'evaluation', 'forex', 'challenge', 'evaluation', null::numeric, 'Starter placeholder. Verify product-specific rules before activation.', 'needs_review'),
    ('brightfunded', 'Evaluation / Funded', 'evaluation', 'forex', 'challenge', 'evaluation', null::numeric, 'Starter placeholder. Verify product-specific rules before activation.', 'needs_review'),
    ('np-future', 'Futures Evaluation', 'evaluation', 'futures', 'challenge', 'evaluation', null::numeric, 'Starter placeholder. Verify official futures rules before activation.', 'needs_review'),
    ('fxify', 'Evaluation / Funded', 'evaluation', 'forex', 'challenge', 'evaluation', null::numeric, 'Starter placeholder. Verify product-specific rules before activation.', 'needs_review')
)
insert into public.programs (prop_firm_id, name, account_type, market_type, modality, phase, account_size, notes, review_status)
select pf.id, fp.name, fp.account_type, fp.market_type, fp.modality, fp.phase, fp.account_size, fp.notes, fp.review_status
from firm_programs fp
join public.prop_firms pf on pf.slug = fp.slug
where not exists (
  select 1 from public.programs p
  where p.prop_firm_id = pf.id and p.name = fp.name
);

insert into public.rule_set_versions (
  program_id,
  name,
  start_date,
  source_url,
  status,
  account_size,
  phase,
  modality,
  source_notes,
  review_status,
  is_user_custom
)
select
  p.id,
  p.name || ' Starter Rules',
  current_date,
  null,
  'draft'::public.rule_set_status,
  p.account_size,
  p.phase,
  p.modality,
  'Needs manual verification from official prop firm materials before activation.',
  'needs_review',
  false
from public.programs p
join public.prop_firms pf on pf.id = p.prop_firm_id
where pf.slug in ('asap-funding-prop', 'brightfunded', 'np-future', 'fxify')
  and not exists (
    select 1 from public.rule_set_versions rsv
    where rsv.program_id = p.id
      and rsv.name = p.name || ' Starter Rules'
  );
