-- Additive rule-type aliases for paid beta rule management.
-- These names make the library clearer without changing existing rule data.

alter type public.rule_definition_key add value if not exists 'daily_loss_percent';
alter type public.rule_definition_key add value if not exists 'daily_loss_fixed';
alter type public.rule_definition_key add value if not exists 'total_loss_percent';
alter type public.rule_definition_key add value if not exists 'total_loss_fixed';
alter type public.rule_definition_key add value if not exists 'profit_target_percent';
alter type public.rule_definition_key add value if not exists 'profit_target_fixed';
alter type public.rule_definition_key add value if not exists 'min_profitable_days';
alter type public.rule_definition_key add value if not exists 'consistency_percent';
alter type public.rule_definition_key add value if not exists 'inactivity_limit_days';
alter type public.rule_definition_key add value if not exists 'news_trading_block';
alter type public.rule_definition_key add value if not exists 'weekend_holding_block';
