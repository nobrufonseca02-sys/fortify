
-- ================================================
-- 1. INSERT PROP FIRMS
-- ================================================

-- Alpha Capital Group
INSERT INTO prop_firms (id, name, slug, category, status, website, color)
VALUES (
  'a1b2c3d4-0001-4000-8000-000000000001',
  'Alpha Capital Group',
  'alphacapitalgroup',
  'forex',
  'active',
  'https://alphacapitalgroup.uk',
  '210 80% 50%'
);

-- The Trading Pit
INSERT INTO prop_firms (id, name, slug, category, status, website, color)
VALUES (
  'a1b2c3d4-0002-4000-8000-000000000002',
  'The Trading Pit',
  'thetradingpit',
  'multi_asset',
  'active',
  'https://www.thetradingpit.com',
  '45 85% 55%'
);

-- FundingPips
INSERT INTO prop_firms (id, name, slug, category, status, website, color)
VALUES (
  'a1b2c3d4-0003-4000-8000-000000000003',
  'FundingPips',
  'fundingpips',
  'forex',
  'active',
  'https://www.fundingpips.com',
  '160 70% 45%'
);

-- ================================================
-- 2. INSERT PROGRAMS
-- ================================================

-- Alpha Capital Group Programs
INSERT INTO programs (id, prop_firm_id, name, account_type, market_type, notes)
VALUES
  ('b1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'Alpha One (1-Step)', 'evaluation', 'forex', 'Avaliação em 1 fase com 10% de profit target e 6% de drawdown máximo'),
  ('b1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000001', 'Alpha Pro 10% (2-Step)', 'evaluation', 'forex', 'Avaliação em 2 fases. Fase 1: 10% PT, Fase 2: 5% PT. Drawdown máximo de 10%'),
  ('b1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0001-4000-8000-000000000001', 'Alpha Pro 8% (2-Step)', 'evaluation', 'forex', 'Avaliação em 2 fases. Fase 1: 8% PT, Fase 2: 5% PT. Drawdown máximo de 8%'),
  ('b1b2c3d4-0004-4000-8000-000000000004', 'a1b2c3d4-0001-4000-8000-000000000001', 'Alpha Pro 6% (2-Step)', 'evaluation', 'forex', 'Avaliação em 2 fases. Fase 1: 6% PT, Fase 2: 6% PT. Drawdown máximo de 6%');

-- The Trading Pit Programs
INSERT INTO programs (id, prop_firm_id, name, account_type, market_type, notes)
VALUES
  ('b1b2c3d4-0005-4000-8000-000000000005', 'a1b2c3d4-0002-4000-8000-000000000002', 'CFD Prime (1-Phase)', 'evaluation', 'forex', 'Avaliação em 1 fase para CFDs. Drawdown estático. Min 3 dias lucrativos com ≥0.5% do saldo inicial'),
  ('b1b2c3d4-0006-4000-8000-000000000006', 'a1b2c3d4-0002-4000-8000-000000000002', 'CFD Classic (2-Phase)', 'evaluation', 'forex', 'Avaliação em 2 fases para CFDs. Drawdown estático. Min 5 dias de trading. Regra de consistência 40%'),
  ('b1b2c3d4-0007-4000-8000-000000000007', 'a1b2c3d4-0002-4000-8000-000000000002', 'Futures Prime', 'evaluation', 'futures', 'Avaliação para futuros. Sem overnight. Regra de consistência 40%. News trading permitido'),
  ('b1b2c3d4-0008-4000-8000-000000000008', 'a1b2c3d4-0002-4000-8000-000000000002', 'Futures Classic', 'evaluation', 'futures', 'Avaliação para futuros. Sem weekend holding. News trading restrito. Min 3 dias de trading');

-- FundingPips Programs
INSERT INTO programs (id, prop_firm_id, name, account_type, market_type, notes)
VALUES
  ('b1b2c3d4-0009-4000-8000-000000000009', 'a1b2c3d4-0003-4000-8000-000000000003', '2-Step Evaluation', 'evaluation', 'forex', 'Avaliação em 2 fases. PT1: 8%, PT2: 5%. Daily loss 4%, Total loss 8%. Min 3 dias de trading'),
  ('b1b2c3d4-0010-4000-8000-000000000010', 'a1b2c3d4-0003-4000-8000-000000000003', '1-Step Evaluation', 'evaluation', 'forex', 'Avaliação em 1 fase. PT: 10%. Daily loss 3%, Total loss 6%. Min 3 dias de trading');

-- ================================================
-- 3. INSERT RULE SET VERSIONS
-- ================================================

-- Alpha Capital Group Rule Set Versions
INSERT INTO rule_set_versions (id, program_id, name, status, source_url, start_date)
VALUES
  ('c1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0001-4000-8000-000000000001', 'Alpha One v2025', 'active', 'https://help.alphacapitalgroup.uk', '2025-01-01'),
  ('c1b2c3d4-0002-4000-8000-000000000002', 'b1b2c3d4-0002-4000-8000-000000000002', 'Alpha Pro 10% v2025', 'active', 'https://help.alphacapitalgroup.uk', '2025-01-01'),
  ('c1b2c3d4-0003-4000-8000-000000000003', 'b1b2c3d4-0003-4000-8000-000000000003', 'Alpha Pro 8% v2025', 'active', 'https://help.alphacapitalgroup.uk', '2025-01-01'),
  ('c1b2c3d4-0004-4000-8000-000000000004', 'b1b2c3d4-0004-4000-8000-000000000004', 'Alpha Pro 6% v2025', 'active', 'https://help.alphacapitalgroup.uk', '2025-01-01');

-- The Trading Pit Rule Set Versions
INSERT INTO rule_set_versions (id, program_id, name, status, source_url, start_date)
VALUES
  ('c1b2c3d4-0005-4000-8000-000000000005', 'b1b2c3d4-0005-4000-8000-000000000005', 'CFD Prime v2025', 'active', 'https://www.thetradingpit.com/trading-rules', '2025-01-01'),
  ('c1b2c3d4-0006-4000-8000-000000000006', 'b1b2c3d4-0006-4000-8000-000000000006', 'CFD Classic v2025', 'active', 'https://www.thetradingpit.com/trading-rules', '2025-01-01'),
  ('c1b2c3d4-0007-4000-8000-000000000007', 'b1b2c3d4-0007-4000-8000-000000000007', 'Futures Prime v2025', 'active', 'https://www.thetradingpit.com/trading-rules', '2025-01-01'),
  ('c1b2c3d4-0008-4000-8000-000000000008', 'b1b2c3d4-0008-4000-8000-000000000008', 'Futures Classic v2025', 'active', 'https://www.thetradingpit.com/trading-rules', '2025-01-01');

-- FundingPips Rule Set Versions
INSERT INTO rule_set_versions (id, program_id, name, status, source_url, start_date)
VALUES
  ('c1b2c3d4-0009-4000-8000-000000000009', 'b1b2c3d4-0009-4000-8000-000000000009', '2-Step v2025', 'active', 'https://fundingpips.com', '2025-01-01'),
  ('c1b2c3d4-0010-4000-8000-000000000010', 'b1b2c3d4-0010-4000-8000-000000000010', '1-Step v2025', 'active', 'https://fundingpips.com', '2025-01-01');

-- ================================================
-- 4. INSERT RULE INSTANCES
-- ================================================

-- === ALPHA ONE (1-Step) ===
INSERT INTO rule_instances (rule_set_version_id, rule_definition_id, mode, limit_value, severity, enabled, includes_floating, daily_reset, base_calculation)
VALUES
  ('c1b2c3d4-0001-4000-8000-000000000001', '979eec4c-9632-40c3-b50c-65130b306ac8', 'percent', 4, 'hard', true, true, true, 'initial_balance'),   -- max_daily_loss 4%
  ('c1b2c3d4-0001-4000-8000-000000000001', '001dcf3d-982d-4bcf-bcaf-661a896b68ca', 'percent', 6, 'hard', true, true, false, 'initial_balance'),  -- max_total_loss 6%
  ('c1b2c3d4-0001-4000-8000-000000000001', 'bc29b3a9-03e2-4162-bc2a-1b9cec75695e', 'percent', 10, 'hard', true, false, false, 'initial_balance'), -- profit_target 10%
  ('c1b2c3d4-0001-4000-8000-000000000001', 'daf708d7-65c5-4ea7-8ffd-f0ce392494ae', 'value', 30, 'hard', true, false, false, null),               -- inactivity 30 days
  ('c1b2c3d4-0001-4000-8000-000000000001', '81e89747-e5ce-43dd-9a17-dd396260d670', 'percent', 40, 'soft', true, false, false, null),               -- consistency 40%
  ('c1b2c3d4-0001-4000-8000-000000000001', 'b2859f29-e51e-4002-a77d-0f81f6a5d7e7', 'percent', 80, 'soft', true, false, false, null);               -- profit_split 80%

-- === ALPHA PRO 10% (2-Step) ===
INSERT INTO rule_instances (rule_set_version_id, rule_definition_id, mode, limit_value, severity, enabled, includes_floating, daily_reset, base_calculation)
VALUES
  ('c1b2c3d4-0002-4000-8000-000000000002', '979eec4c-9632-40c3-b50c-65130b306ac8', 'percent', 5, 'hard', true, true, true, 'initial_balance'),
  ('c1b2c3d4-0002-4000-8000-000000000002', '001dcf3d-982d-4bcf-bcaf-661a896b68ca', 'percent', 10, 'hard', true, true, false, 'initial_balance'),
  ('c1b2c3d4-0002-4000-8000-000000000002', 'bc29b3a9-03e2-4162-bc2a-1b9cec75695e', 'percent', 10, 'hard', true, false, false, 'initial_balance'),
  ('c1b2c3d4-0002-4000-8000-000000000002', 'daf708d7-65c5-4ea7-8ffd-f0ce392494ae', 'value', 30, 'hard', true, false, false, null),
  ('c1b2c3d4-0002-4000-8000-000000000002', '81e89747-e5ce-43dd-9a17-dd396260d670', 'percent', 40, 'soft', true, false, false, null),
  ('c1b2c3d4-0002-4000-8000-000000000002', 'b2859f29-e51e-4002-a77d-0f81f6a5d7e7', 'percent', 80, 'soft', true, false, false, null);

-- === ALPHA PRO 8% (2-Step) ===
INSERT INTO rule_instances (rule_set_version_id, rule_definition_id, mode, limit_value, severity, enabled, includes_floating, daily_reset, base_calculation)
VALUES
  ('c1b2c3d4-0003-4000-8000-000000000003', '979eec4c-9632-40c3-b50c-65130b306ac8', 'percent', 4, 'hard', true, true, true, 'initial_balance'),
  ('c1b2c3d4-0003-4000-8000-000000000003', '001dcf3d-982d-4bcf-bcaf-661a896b68ca', 'percent', 8, 'hard', true, true, false, 'initial_balance'),
  ('c1b2c3d4-0003-4000-8000-000000000003', 'bc29b3a9-03e2-4162-bc2a-1b9cec75695e', 'percent', 8, 'hard', true, false, false, 'initial_balance'),
  ('c1b2c3d4-0003-4000-8000-000000000003', 'daf708d7-65c5-4ea7-8ffd-f0ce392494ae', 'value', 30, 'hard', true, false, false, null),
  ('c1b2c3d4-0003-4000-8000-000000000003', 'b2859f29-e51e-4002-a77d-0f81f6a5d7e7', 'percent', 80, 'soft', true, false, false, null);

-- === ALPHA PRO 6% (2-Step) ===
INSERT INTO rule_instances (rule_set_version_id, rule_definition_id, mode, limit_value, severity, enabled, includes_floating, daily_reset, base_calculation)
VALUES
  ('c1b2c3d4-0004-4000-8000-000000000004', '979eec4c-9632-40c3-b50c-65130b306ac8', 'percent', 3, 'hard', true, true, true, 'initial_balance'),
  ('c1b2c3d4-0004-4000-8000-000000000004', '001dcf3d-982d-4bcf-bcaf-661a896b68ca', 'percent', 6, 'hard', true, true, false, 'initial_balance'),
  ('c1b2c3d4-0004-4000-8000-000000000004', 'bc29b3a9-03e2-4162-bc2a-1b9cec75695e', 'percent', 6, 'hard', true, false, false, 'initial_balance'),
  ('c1b2c3d4-0004-4000-8000-000000000004', 'daf708d7-65c5-4ea7-8ffd-f0ce392494ae', 'value', 30, 'hard', true, false, false, null),
  ('c1b2c3d4-0004-4000-8000-000000000004', 'b2859f29-e51e-4002-a77d-0f81f6a5d7e7', 'percent', 80, 'soft', true, false, false, null);

-- === THE TRADING PIT - CFD PRIME (1-Phase) ===
INSERT INTO rule_instances (rule_set_version_id, rule_definition_id, mode, limit_value, severity, enabled, includes_floating, daily_reset, base_calculation)
VALUES
  ('c1b2c3d4-0005-4000-8000-000000000005', '979eec4c-9632-40c3-b50c-65130b306ac8', 'percent', 3, 'hard', true, true, true, 'initial_balance'),   -- daily loss 3%
  ('c1b2c3d4-0005-4000-8000-000000000005', '001dcf3d-982d-4bcf-bcaf-661a896b68ca', 'percent', 6, 'hard', true, true, false, 'initial_balance'),  -- max total loss 6% (static)
  ('c1b2c3d4-0005-4000-8000-000000000005', 'bc29b3a9-03e2-4162-bc2a-1b9cec75695e', 'percent', 10, 'hard', true, false, false, 'initial_balance'), -- profit target 10%
  ('c1b2c3d4-0005-4000-8000-000000000005', '4cd43adb-38d6-4e0e-aa6f-83a248b3bf65', 'value', 3, 'hard', true, false, false, null),                -- 3 profitable days
  ('c1b2c3d4-0005-4000-8000-000000000005', 'daf708d7-65c5-4ea7-8ffd-f0ce392494ae', 'value', 21, 'hard', true, false, false, null),               -- inactivity 21 days
  ('c1b2c3d4-0005-4000-8000-000000000005', '53c2ff92-6c0e-40c6-b293-bb61a55995a1', 'value', 2, 'hard', true, false, false, null),                -- news restriction 2min
  ('c1b2c3d4-0005-4000-8000-000000000005', '81e89747-e5ce-43dd-9a17-dd396260d670', 'percent', 40, 'soft', true, false, false, null),               -- consistency 40%
  ('c1b2c3d4-0005-4000-8000-000000000005', 'b2859f29-e51e-4002-a77d-0f81f6a5d7e7', 'percent', 80, 'soft', true, false, false, null);               -- profit split 80%

-- === THE TRADING PIT - CFD CLASSIC (2-Phase) ===
INSERT INTO rule_instances (rule_set_version_id, rule_definition_id, mode, limit_value, severity, enabled, includes_floating, daily_reset, base_calculation)
VALUES
  ('c1b2c3d4-0006-4000-8000-000000000006', '979eec4c-9632-40c3-b50c-65130b306ac8', 'percent', 5, 'hard', true, true, true, 'initial_balance'),
  ('c1b2c3d4-0006-4000-8000-000000000006', '001dcf3d-982d-4bcf-bcaf-661a896b68ca', 'percent', 10, 'hard', true, true, false, 'initial_balance'),
  ('c1b2c3d4-0006-4000-8000-000000000006', 'bc29b3a9-03e2-4162-bc2a-1b9cec75695e', 'percent', 8, 'hard', true, false, false, 'initial_balance'),
  ('c1b2c3d4-0006-4000-8000-000000000006', 'f454efd7-1fd9-45af-8e98-04a461bfc9f1', 'value', 5, 'hard', true, false, false, null),
  ('c1b2c3d4-0006-4000-8000-000000000006', 'daf708d7-65c5-4ea7-8ffd-f0ce392494ae', 'value', 21, 'hard', true, false, false, null),
  ('c1b2c3d4-0006-4000-8000-000000000006', '53c2ff92-6c0e-40c6-b293-bb61a55995a1', 'value', 2, 'hard', true, false, false, null),
  ('c1b2c3d4-0006-4000-8000-000000000006', '81e89747-e5ce-43dd-9a17-dd396260d670', 'percent', 40, 'soft', true, false, false, null),
  ('c1b2c3d4-0006-4000-8000-000000000006', 'b2859f29-e51e-4002-a77d-0f81f6a5d7e7', 'percent', 80, 'soft', true, false, false, null);

-- === THE TRADING PIT - FUTURES PRIME ===
INSERT INTO rule_instances (rule_set_version_id, rule_definition_id, mode, limit_value, severity, enabled, includes_floating, daily_reset, base_calculation)
VALUES
  ('c1b2c3d4-0007-4000-8000-000000000007', '979eec4c-9632-40c3-b50c-65130b306ac8', 'percent', 3, 'hard', true, true, true, 'initial_balance'),
  ('c1b2c3d4-0007-4000-8000-000000000007', 'a8084044-5db3-4913-b74c-39a1b6ed69d4', 'percent', 6, 'hard', true, true, false, 'initial_balance'),  -- trailing drawdown
  ('c1b2c3d4-0007-4000-8000-000000000007', 'bc29b3a9-03e2-4162-bc2a-1b9cec75695e', 'percent', 6, 'hard', true, false, false, 'initial_balance'),
  ('c1b2c3d4-0007-4000-8000-000000000007', 'f454efd7-1fd9-45af-8e98-04a461bfc9f1', 'value', 3, 'hard', true, false, false, null),
  ('c1b2c3d4-0007-4000-8000-000000000007', 'daf708d7-65c5-4ea7-8ffd-f0ce392494ae', 'value', 21, 'hard', true, false, false, null),
  ('c1b2c3d4-0007-4000-8000-000000000007', '81e89747-e5ce-43dd-9a17-dd396260d670', 'percent', 40, 'soft', true, false, false, null),
  ('c1b2c3d4-0007-4000-8000-000000000007', 'b2859f29-e51e-4002-a77d-0f81f6a5d7e7', 'percent', 80, 'soft', true, false, false, null),
  ('c1b2c3d4-0007-4000-8000-000000000007', 'dd37a616-b7fb-4252-8e77-f97e51a8a502', 'value', 0, 'hard', true, false, false, null);                -- no overnight (weekend holding = not allowed)

-- === THE TRADING PIT - FUTURES CLASSIC ===
INSERT INTO rule_instances (rule_set_version_id, rule_definition_id, mode, limit_value, severity, enabled, includes_floating, daily_reset, base_calculation)
VALUES
  ('c1b2c3d4-0008-4000-8000-000000000008', '979eec4c-9632-40c3-b50c-65130b306ac8', 'percent', 5, 'hard', true, true, true, 'initial_balance'),
  ('c1b2c3d4-0008-4000-8000-000000000008', 'a8084044-5db3-4913-b74c-39a1b6ed69d4', 'percent', 10, 'hard', true, true, false, 'initial_balance'),
  ('c1b2c3d4-0008-4000-8000-000000000008', 'bc29b3a9-03e2-4162-bc2a-1b9cec75695e', 'percent', 8, 'hard', true, false, false, 'initial_balance'),
  ('c1b2c3d4-0008-4000-8000-000000000008', 'f454efd7-1fd9-45af-8e98-04a461bfc9f1', 'value', 3, 'hard', true, false, false, null),
  ('c1b2c3d4-0008-4000-8000-000000000008', 'daf708d7-65c5-4ea7-8ffd-f0ce392494ae', 'value', 21, 'hard', true, false, false, null),
  ('c1b2c3d4-0008-4000-8000-000000000008', '53c2ff92-6c0e-40c6-b293-bb61a55995a1', 'value', 2, 'hard', true, false, false, null),
  ('c1b2c3d4-0008-4000-8000-000000000008', '81e89747-e5ce-43dd-9a17-dd396260d670', 'percent', 40, 'soft', true, false, false, null),
  ('c1b2c3d4-0008-4000-8000-000000000008', 'b2859f29-e51e-4002-a77d-0f81f6a5d7e7', 'percent', 80, 'soft', true, false, false, null),
  ('c1b2c3d4-0008-4000-8000-000000000008', 'dd37a616-b7fb-4252-8e77-f97e51a8a502', 'value', 0, 'hard', true, false, false, null);

-- === FUNDINGPIPS - 2-STEP ===
INSERT INTO rule_instances (rule_set_version_id, rule_definition_id, mode, limit_value, severity, enabled, includes_floating, daily_reset, base_calculation)
VALUES
  ('c1b2c3d4-0009-4000-8000-000000000009', '979eec4c-9632-40c3-b50c-65130b306ac8', 'percent', 4, 'hard', true, true, true, 'initial_balance'),
  ('c1b2c3d4-0009-4000-8000-000000000009', '001dcf3d-982d-4bcf-bcaf-661a896b68ca', 'percent', 8, 'hard', true, true, false, 'initial_balance'),
  ('c1b2c3d4-0009-4000-8000-000000000009', 'bc29b3a9-03e2-4162-bc2a-1b9cec75695e', 'percent', 8, 'hard', true, false, false, 'initial_balance'),
  ('c1b2c3d4-0009-4000-8000-000000000009', 'f454efd7-1fd9-45af-8e98-04a461bfc9f1', 'value', 3, 'hard', true, false, false, null),
  ('c1b2c3d4-0009-4000-8000-000000000009', 'b2859f29-e51e-4002-a77d-0f81f6a5d7e7', 'percent', 80, 'soft', true, false, false, null),
  ('c1b2c3d4-0009-4000-8000-000000000009', 'cc40ccda-2560-4270-a92e-f2432217d4af', 'value', 14, 'soft', true, false, false, null);                -- payout every 14 days

-- === FUNDINGPIPS - 1-STEP ===
INSERT INTO rule_instances (rule_set_version_id, rule_definition_id, mode, limit_value, severity, enabled, includes_floating, daily_reset, base_calculation)
VALUES
  ('c1b2c3d4-0010-4000-8000-000000000010', '979eec4c-9632-40c3-b50c-65130b306ac8', 'percent', 3, 'hard', true, true, true, 'initial_balance'),
  ('c1b2c3d4-0010-4000-8000-000000000010', '001dcf3d-982d-4bcf-bcaf-661a896b68ca', 'percent', 6, 'hard', true, true, false, 'initial_balance'),
  ('c1b2c3d4-0010-4000-8000-000000000010', 'bc29b3a9-03e2-4162-bc2a-1b9cec75695e', 'percent', 10, 'hard', true, false, false, 'initial_balance'),
  ('c1b2c3d4-0010-4000-8000-000000000010', 'f454efd7-1fd9-45af-8e98-04a461bfc9f1', 'value', 3, 'hard', true, false, false, null),
  ('c1b2c3d4-0010-4000-8000-000000000010', 'b2859f29-e51e-4002-a77d-0f81f6a5d7e7', 'percent', 80, 'soft', true, false, false, null),
  ('c1b2c3d4-0010-4000-8000-000000000010', 'cc40ccda-2560-4270-a92e-f2432217d4af', 'value', 14, 'soft', true, false, false, null);
