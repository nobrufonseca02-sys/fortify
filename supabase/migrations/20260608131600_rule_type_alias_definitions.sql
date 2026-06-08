-- Additive definitions for rule-type aliases used by the professional rule library.
-- Exact external prop-firm values should remain needs_review until an admin verifies sources.

insert into public.rule_definitions (key, name, description, category)
values
  ('daily_loss_percent', 'Limite diario percentual', 'Perda diaria maxima calculada em percentual da base configurada.', 'risk'),
  ('daily_loss_fixed', 'Limite diario fixo', 'Perda diaria maxima configurada como valor fixo.', 'risk'),
  ('total_loss_percent', 'Perda maxima percentual', 'Perda maxima total calculada em percentual da base configurada.', 'risk'),
  ('total_loss_fixed', 'Perda maxima fixa', 'Perda maxima total configurada como valor fixo.', 'risk'),
  ('profit_target_percent', 'Meta de lucro percentual', 'Meta de lucro calculada em percentual da base configurada.', 'target'),
  ('profit_target_fixed', 'Meta de lucro fixa', 'Meta de lucro configurada como valor fixo.', 'target'),
  ('min_profitable_days', 'Dias lucrativos minimos', 'Quantidade minima de dias lucrativos exigida.', 'activity'),
  ('consistency_percent', 'Consistencia percentual', 'Limite de concentracao de resultado em percentual.', 'consistency'),
  ('inactivity_limit_days', 'Limite de inatividade', 'Quantidade maxima de dias sem operacao antes de alerta.', 'activity'),
  ('news_trading_block', 'Bloqueio por noticia', 'Restricao operacional relacionada a eventos de noticia.', 'restriction'),
  ('weekend_holding_block', 'Bloqueio de fim de semana', 'Restricao operacional para carregar posicoes no fim de semana.', 'restriction')
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category;
