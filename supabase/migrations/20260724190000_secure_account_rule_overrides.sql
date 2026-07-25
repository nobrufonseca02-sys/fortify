-- account_rule_overrides checked auth.uid() = user_id on insert/update but never
-- validated that trading_account_id actually belongs to that same user. Any
-- authenticated user could insert a row with their own user_id but someone
-- else's trading_account_id, and the gateway (which loads overrides filtered
-- only by trading_account_id, via the service-role key) would apply it to the
-- victim's rule evaluation. This mirrors the ownership check already used by
-- account_rule_bindings_insert_own.

drop policy if exists account_rule_overrides_insert_own on public.account_rule_overrides;
create policy account_rule_overrides_insert_own on public.account_rule_overrides
for insert with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.trading_accounts account
    where account.id = trading_account_id
      and account.user_id = auth.uid()
  )
);

drop policy if exists account_rule_overrides_update_own on public.account_rule_overrides;
create policy account_rule_overrides_update_own on public.account_rule_overrides
for update using (
  auth.uid() = user_id
) with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.trading_accounts account
    where account.id = trading_account_id
      and account.user_id = auth.uid()
  )
);
