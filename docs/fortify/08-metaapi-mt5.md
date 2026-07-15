# MetaApi e MT5

## Papel da integração

MetaApi é a ponte entre o Fortify e contas MetaTrader 5. O gateway usa o provedor para provisionar/deployar uma conta, consultar estado e sincronizar saldo, equity, posições e trades. O Fortify transforma esses dados em visão de risco; não executa ordens.

## Por que o controle de custo é obrigatório

Uma conta MetaApi implantada ou consultada pode gerar custo para o Fortify. O acesso técnico precisa seguir a receita:

> Sem plano pago válido, sem período pago vigente e sem limite disponível, não existe autorização para gerar custo MetaApi.

`beta_free`, ausência de assinatura, período expirado e status inválidos não liberam conexão nem sync. O frontend não pode substituir essa regra.

## Entitlement

`getUserEntitlement` no gateway considera:

- assinatura existente;
- plano diferente de `beta_free`;
- plano com limite de conta positivo;
- status pago aceito (`active` ou `trialing` no código atual);
- `paid_until` ou fallback `current_period_end` no futuro;
- limite base mais quantidade ativa de add-ons.

Qualquer status desconhecido falha fechado. Em produção, `FORTIFY_ALLOW_BETA_FALLBACK` deve permanecer `false`; a proteção adicional impede ativação acidental sem flag explícita de produção.

## Fluxo de conexão

Rota: `POST /metaapi/connect`.

1. Rate limit e JWT.
2. Validação dos dados de conexão e identificadores.
3. Entitlement antes do provisionamento.
4. Contagem de conexões ativas contra o limite.
5. Criação ou reutilização segura no MetaApi.
6. Deploy e espera controlada pelo limite de tentativas/tempo.
7. Upsert de `trading_accounts` e `mt5_connections`.
8. Erros persistidos de forma operacional, sem senha MT5.

Se o entitlement estiver inválido, o gateway tenta suspender contas do usuário e responde sem iniciar provisionamento pago.

## Fluxo de sincronização

Rota: `POST /metaapi/sync`.

1. Rate limit, JWT e ownership.
2. Entitlement antes da chamada ao provedor.
3. Validação de conexão e provider account.
4. Consulta de estado/snapshot/posições/trades no MetaApi.
5. Atualização de `trading_accounts` e `mt5_connections`.
6. Persistência em `mt5_account_snapshots`, `mt5_positions` e `mt5_trades`.
7. Atualização de horários e erros de sync.
8. Avaliações de regras usam dados reais persistidos.

## Suspensão e undeploy

`suspendUserMetaApiAccounts` deve ser idempotente:

- pula conexões já suspensas, pendentes, removidas ou desconectadas por billing;
- tenta undeploy apenas quando necessário;
- marca a assinatura e a conexão com horário/motivo;
- preserva conta, histórico e vínculo do usuário;
- se o provedor falhar, marca `suspension_pending` e registra erro sanitizado;
- chamadas futuras/reconcile podem tentar novamente.

Não delete dados para interromper custo. Exclusão destrutiva não substitui undeploy.

## Reativação

Pagamento confirmado e período futuro podem reabilitar o acesso lógico. A reativação não deve duplicar contas MetaApi. Antes de redeploy, confirme identidade da conexão, estado atual e ownership.

## Cancelamento e falha de pagamento

- Webhook atualiza assinatura e datas.
- Entitlement passa a bloquear quando status/período deixam de ser válidos.
- `invoice.payment_failed` registra falha e pode suspender conforme cobertura restante.
- Reconciliador interno revisa divergências e tenta suspensões pendentes.
- `cancel_at_period_end` permite acesso até o fim pago quando a assinatura continua válida; depois disso, bloqueia.

## Falhas comuns

| Sintoma | Significado | Conduta |
| --- | --- | --- |
| Saldo MetaApi insuficiente | Provedor não aceita nova operação | Não repetir em loop; resolver saldo/conta. |
| Conta `undeployed` | Conta não está ativa no provedor | Redeploy somente com entitlement e intenção válida. |
| Authentication error | Login/senha/servidor MT5 incorretos | Mostrar “Corrigir conexão”; não logar senha. |
| Sync failed | Provedor ou conta indisponível | Preservar último dado e marcar desatualizado. |
| Account limit exceeded | Uso atingiu plano + add-ons | Bloquear antes de criar conta; orientar upgrade. |
| `suspension_pending` | Undeploy falhou | Reconcile tenta novamente; não apagar dados. |
| Provider account duplicada | Retry não idempotente | Reutilizar IDs existentes e revisar transação. |

## QA

- [ ] Sem JWT: connect e sync retornam 401.
- [ ] Sem plano, `beta_free` e período expirado: bloqueio antes do MetaApi.
- [ ] `past_due`, `unpaid`, `canceled`, `incomplete` e falha de pagamento não liberam custo.
- [ ] Plano ativo com período futuro conecta dentro do limite.
- [ ] Conta adicional acima do limite retorna bloqueio sem provisionar.
- [ ] Sync de conta de outro usuário é rejeitado.
- [ ] Suspensão repetida não repete trabalho concluído.
- [ ] Falha no undeploy vira pendência e preserva dados.
- [ ] Senha, token e IDs completos não aparecem em logs.
- [ ] Dados sincronizados alimentam snapshots, posições e trades.
