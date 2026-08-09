-- Fundscap, MyFundedFX and True Forex Funds have all ceased prop-trading
-- operations. Mark them inactive so they drop out of the CreateAccount.tsx
-- firm picker (usePropFirms() filters status = 'active') without deleting
-- the rows, which would cascade-delete any programs/rule_set_versions still
-- referenced by existing trading accounts.
UPDATE public.prop_firms
SET status = 'inactive'
WHERE slug IN ('fundscap', 'myfundedfx', 'true-forex-funds');
