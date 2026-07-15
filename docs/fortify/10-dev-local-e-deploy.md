# Desenvolvimento local e deploy

## Comandos atuais

Execute na raiz `C:\Projects\fortify`:

| Comando | Resultado |
| --- | --- |
| `npm run dev` | Inicia frontend e gateway com `scripts/dev-all.mjs`. |
| `npm run dev:all` | Alias da stack local completa. |
| `npm run dev:app` | Inicia somente Vite em `0.0.0.0:8080`. |
| `npm run dev:gateway` | Inicia somente `services/metaapi-gateway`. |
| `npm run build` | Gera build Vite do frontend. |
| `npm test` | Executa Vitest uma vez. |

URLs locais:

- Frontend: `http://localhost:8080`
- Gateway: `http://localhost:3001`
- Health: `http://localhost:3001/health`

Para checkout, portal, MT5 ou ADM, prefira `npm run dev`; frontend isolado não atende esses fluxos.

## Validação local básica

```powershell
npm run dev
```

Em outro terminal:

```powershell
Invoke-RestMethod -Method Get -Uri http://localhost:3001/health
```

Validação estática:

```powershell
npm run build
npx tsc --noEmit --project services/metaapi-gateway/tsconfig.json
```

Não mantenha o servidor rodando em sessão de automação sem necessidade. Ao testar webhook local, o gateway e o `stripe listen` precisam estar ativos ao mesmo tempo.

## Configuração local

- `.env` da raiz contém apenas configuração de frontend/publicável.
- `services/metaapi-gateway/.env` contém segredos de servidor.
- Use `.env.example` como lista de nomes, nunca como local para segredo real.
- URLs de sucesso/cancelamento/portal precisam usar a porta real do frontend (`8080` no runtime atual).
- Em dev, o proxy `/api` reduz problemas de CORS.

## Troubleshooting

### Localhost não abre

1. Confira se `npm run dev` continua executando.
2. Verifique mensagens de porta ocupada.
3. Abra `http://localhost:8080/auth` diretamente.
4. Não altere a porta sem alinhar Vite e URLs Stripe.

### Checkout indisponível

1. Valide `/health`.
2. Confirme que a stack completa está ativa.
3. Revise base URL pública/local sem imprimir secrets.
4. Confirme plano e Price ID no banco.

### Gateway offline

1. Rode `npm run dev:gateway`.
2. Execute o health check.
3. Confira `services/metaapi-gateway/.env` e logs sanitizados.

### Porta ocupada

Descubra o PID dono de `8080` ou `3001` e confirme que pode encerrá-lo. Não mate todos os processos Node; pode haver outro projeto ou trabalho do usuário.

### Stripe CLI não está rodando

Para webhook local:

```powershell
stripe listen --forward-to localhost:3001/billing/webhook
```

Use o webhook secret emitido somente no `.env` local. Cada listener pode fornecer um segredo diferente.

### Webhook não funciona

- gateway está ativo na porta esperada;
- CLI está autenticada e encaminhando para a rota exata;
- `STRIPE_WEBHOOK_SECRET` corresponde ao listener/endpoint;
- corpo bruto não foi alterado;
- evento está na lista tratada.

## Checklist de deploy

- [ ] Frontend buildado e servido por HTTPS.
- [ ] URL pública do gateway em HTTPS configurada no frontend.
- [ ] CORS de produção usa allowlist, sem wildcard permissivo.
- [ ] Supabase de produção e migrations aprovadas estão alinhados.
- [ ] Chaves Stripe **live** estão apenas no cofre do backend.
- [ ] Webhook Stripe live aponta para `/billing/webhook` público.
- [ ] Eventos necessários estão habilitados e assinatura validada.
- [ ] URLs de sucesso, cancelamento e portal usam domínio de produção.
- [ ] Token e região MetaApi de produção estão no cofre.
- [ ] `INTERNAL_CRON_SECRET` forte está configurado.
- [ ] Reconcile é agendado com header secreto.
- [ ] `FORTIFY_ALLOW_BETA_FALLBACK=false`.
- [ ] `FORTIFY_ENABLE_PRODUCTION_BETA_FALLBACK=false`.
- [ ] Rate limits, RLS, roles ADM e logs foram revisados.
- [ ] Teste real em modo test foi concluído antes do live.
- [ ] Monitoramento de falha de webhook, sync e suspensão existe.

## Não executar sem autorização

- migrations remotas;
- criação de Products/Prices Stripe;
- alteração de endpoint webhook live;
- deploy/undeploy massivo MetaApi;
- troca de chaves ou secrets de produção;
- reset, seed destrutivo ou limpeza de banco.
