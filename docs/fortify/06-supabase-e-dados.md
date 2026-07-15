# Supabase e dados

## Responsabilidade atual

Supabase fornece autenticação e PostgreSQL. O frontend usa a sessão e consultas permitidas por RLS; o gateway usa service role para operações confiáveis. A service role nunca pertence ao browser.

## Tabelas críticas

| Tabela | Conteúdo |
| --- | --- |
| `plans` | Catálogo, preço, limites, Stripe Product/Price e suporte. |
| `user_subscriptions` | Assinatura atual, período, Stripe IDs e suspensão. |
| `subscription_addons` | Contas extras vinculadas à assinatura base. |
| `user_profiles` | Nome e telefone do usuário. |
| `trading_accounts` | Conta de negócio Fortify e limites/regras associados. |
| `mt5_connections` | Estado técnico da integração MetaApi/MT5. |
| `mt5_account_snapshots` | Séries de saldo, equity e métricas. |
| `mt5_positions` | Posições abertas sincronizadas. |
| `mt5_trades` | Histórico de trades sincronizado. |
| `prop_firms` | Mesas proprietárias. |
| `programs` | Programas/desafios de uma mesa. |
| `rule_set_versions` | Versões, fonte e verificação das regras. |
| `rule_definitions` | Tipos canônicos de regra. |
| `rule_instances` | Valores de regra por versão/programa. |
| `rule_evaluations` | Resultado calculado por conta. |

## Auth e isolamento

- O usuário autentica pelo Supabase Auth.
- `auth.uid()` deve ser comparado a `user_id` em políticas de dados pessoais.
- Tabelas multiusuário precisam de RLS habilitada e políticas explícitas.
- O gateway deve verificar ownership mesmo usando service role, pois a service role ignora RLS.
- ADM é uma autorização de servidor; esconder o menu não protege a rota.

## Ciclo da assinatura

Campos centrais em `user_subscriptions`:

- `user_id`, `plan_id`, `status` e `account_limit`;
- `stripe_customer_id` e `stripe_subscription_id`;
- `current_period_start` e `current_period_end`;
- `paid_until` e `activated_at`;
- `cancel_at_period_end`;
- status/horários do último pagamento;
- horários e motivos de suspensão Fortify/MetaApi.

`paid_until` é a data operacional de cobertura; o gateway pode usar `current_period_end` como fallback de compatibilidade. Uma assinatura só libera MetaApi quando plano, status e período são válidos. `cancel_at_period_end=true` não significa corte imediato: o acesso pode continuar até o período pago acabar, desde que o status ainda seja aceito.

## Integridade de dados

- `user_subscriptions.user_id` deve ser único para upsert da assinatura atual.
- Stripe Price ID deve apontar para um plano ativo e compatível.
- Uma conexão MT5 deve pertencer ao mesmo usuário de sua conta Fortify.
- Sync substitui posições abertas conforme o estado do provedor, mas preserva histórico de trades/snapshots conforme a estratégia existente.
- Versões de regras não devem ser sobrescritas sem rastreabilidade de fonte e data.
- Suspensão técnica não deve apagar trades, snapshots ou a conta do usuário.

## Migrations

1. Inspecione migrations existentes e o schema remoto antes de propor mudança.
2. Crie migration aditiva com timestamp novo.
3. Use `if exists`/`if not exists` quando isso tornar a aplicação segura e repetível.
4. Crie índices e constraints que sustentem o fluxo.
5. Habilite RLS e inclua políticas da nova tabela.
6. Não execute migration sem autorização explícita e ambiente confirmado.
7. Nunca edite ou apague dados para “alinhar” uma UI.

## Checklist de RLS

- [ ] RLS está habilitada?
- [ ] Usuário autenticado lê apenas as próprias linhas?
- [ ] Insert exige `auth.uid() = user_id`?
- [ ] Update mantém `auth.uid() = user_id` no `using` e `with check`?
- [ ] Delete é necessário e protegido?
- [ ] Operações administrativas ocorrem no gateway e validam admin?
- [ ] Nenhuma política usa condição permissiva global por engano?

## Checklist de integridade

- [ ] Datas são `timestamptz` e comparadas em UTC.
- [ ] Status desconhecido falha fechado para entitlement.
- [ ] `beta_free` não é tratado como assinatura paga.
- [ ] Limite base e add-ons ativos não são contados duas vezes.
- [ ] IDs Stripe são armazenados no backend e mascarados na UI administrativa.
- [ ] Erros de sync não removem dados úteis.
- [ ] Migration tem caminho de compatibilidade com linhas existentes.

## Falhas comuns

- **Row violates RLS:** política não cobre insert/update ou `user_id` está errado.
- **Tabela/coluna ausente:** migration não aplicada no ambiente; não contorne com `any` e silêncio.
- **Assinatura duplicada:** constraint/upsert incompatível com a chave de conflito.
- **Período nulo:** webhook incompleto ou dado legado; entitlement deve bloquear até reconciliação segura.
- **Tipos gerados desatualizados:** atualize tipos apenas após schema aprovado e preserve o diff focado.
