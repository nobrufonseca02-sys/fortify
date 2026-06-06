-- Rule definition enum extensions used by the account rule-management layer.
-- Kept separate because Postgres requires enum additions to commit before use.

alter type public.rule_definition_key add value if not exists 'trade_value_score_max_percent';
alter type public.rule_definition_key add value if not exists 'average_lot_limit';
alter type public.rule_definition_key add value if not exists 'max_lot';
alter type public.rule_definition_key add value if not exists 'stop_loss_required';
alter type public.rule_definition_key add value if not exists 'end_of_day_trailing_drawdown';
alter type public.rule_definition_key add value if not exists 'intraday_equity_drawdown';
alter type public.rule_definition_key add value if not exists 'static_drawdown';
alter type public.rule_definition_key add value if not exists 'payout_min_days';
alter type public.rule_definition_key add value if not exists 'custom_boolean';
alter type public.rule_definition_key add value if not exists 'custom_numeric_threshold';
alter type public.rule_definition_key add value if not exists 'custom_text_rule';
