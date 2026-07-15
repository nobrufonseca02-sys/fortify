# Segurança e controle de custos

## Segredos que nunca entram no Git

- `STRIPE_SECRET_KEY` (`sk_test_...` ou `sk_live_...`);
- `STRIPE_WEBHOOK_SECRET` (`whsec_...`);
- Supabase service role/secret key;
- `METAAPI_TOKEN`;
- login/senha de MT5;
- `INTERNAL_CRON_SECRET`;
- qualquer API key privada.

Variável `VITE_*` é pública para o navegador. Nenhum segredo pode usar esse prefixo.

## Fronteiras de confiança

| Fronteira | Controle obrigatório |
| --- | --- |
| Browser → gateway | JWT, rate limit, input validation e ownership. |
| Stripe → webhook | Assinatura sobre corpo bruto. |
| Cron → reconcile | `x-internal-cron-secret`. |
| Gateway → Supabase | Service role somente no servidor + autorização explícita. |
| Usuário → Supabase | RLS por `auth.uid()`. |
| Gateway → MetaApi | Entitlement pago antes de custo. |
| Admin UI → gateway | JWT + papel admin no servidor. |

## Riscos financeiros

### Conta MetaApi deixada em deploy

Cancelamento, expiração ou inadimplência podem manter custo se a suspensão falhar. Mitigação: webhook, entitlement em cada connect/sync, suspensão idempotente e reconcile agendado.

### Sync sem entitlement

Uma tela escondida não impede chamada manual. O gateway verifica status e período antes de tocar no MetaApi.

### Beta fallback em produção

Pode transformar usuários gratuitos em custo recorrente. As flags de fallback devem ser `false` em produção e o health/admin deve permitir auditar somente o estado, nunca o secret.

### Prices Stripe duplicados

Criar Price para corrigir slug sem consultar catálogo pode fragmentar receita e portal. Resolva Product/Price existente e valide moeda, valor e recorrência.

### Retry não idempotente

Retries podem duplicar Customer, subscription ou provider account. Use IDs externos, chaves de conflito e estado persistido antes de repetir.

## Controles obrigatórios

- Chaves em secret manager ou `.env` ignorado.
- Webhook rejeita secret ausente, assinatura ausente e assinatura inválida.
- Reconcile rejeita segredo ausente, header ausente e valor incorreto.
- CORS de produção com origens específicas.
- RLS em toda tabela multiusuário.
- JWT e ownership em billing/MetaApi/contas.
- Papel admin verificado no gateway.
- Slugs, UUIDs, Stripe IDs e session IDs validados.
- Logs sem request body sensível e com IDs mascarados.
- Rate limiting em billing, MetaApi, admin e reconcile.
- Erro desconhecido de assinatura falha fechado.

## Varredura pré-commit

Primeiro revise o que será commitado:

```powershell
git status --short
git diff --cached --stat
```

Procure indicadores, sem abrir ou imprimir `.env`:

```powershell
git diff --cached | Select-String -Pattern 'sk_test|sk_live|whsec|service_role|METAAPI_TOKEN|MT5.*password|api[_-]?key' -CaseSensitive:$false
```

Um match precisa ser revisado. Placeholders documentais claramente falsos também devem ser minimizados para não esconder um vazamento real.

## Logs

Pode registrar:

- nome do evento;
- código de erro controlado;
- status;
- duração;
- IDs mascarados;
- contagens agregadas.

Não pode registrar:

- senha MT5, token, chave, webhook secret;
- header Authorization;
- payload completo de credenciais;
- dados pessoais desnecessários;
- Stripe IDs completos em UI pública.

## Checklist pré-lançamento

- [ ] `.env` e temporários não estão rastreados/staged.
- [ ] Bundle frontend não contém secrets.
- [ ] Auth e rotas protegidas foram verificadas.
- [ ] RLS impede leitura/escrita cruzada entre dois usuários de teste.
- [ ] Não-admin recebe 403 nas rotas administrativas.
- [ ] Webhook assinado funciona e requests falsos falham.
- [ ] Reconcile roda com segredo e resume resultados sem expor dados.
- [ ] Estados inválidos/expirados bloqueiam connect e sync.
- [ ] Suspensão pendente é monitorada e tentada novamente.
- [ ] CORS e URLs usam HTTPS de produção.
- [ ] Stripe test/live não estão misturados.
- [ ] Limites de plano e add-ons foram testados.
- [ ] Backups, observabilidade e plano de resposta estão definidos.

## Resposta a incidente de segredo

1. Revogue/rotacione o segredo no provedor imediatamente.
2. Remova-o do estado atual e do histórico conforme procedimento seguro.
3. Verifique logs, CI, artifacts e clones.
4. Atualize o cofre de todos os ambientes autorizados.
5. Teste os fluxos dependentes.
6. Registre causa e prevenção sem reproduzir o valor comprometido.
