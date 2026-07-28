---
name: deploy
description: Use esta skill quando o usuário quiser fazer deploy do Fortify, atualizar produção, configurar variáveis de ambiente ou publicar uma migration/edge function no Supabase.
---

# Deploy — Fortify

Diferente de um projeto com infra já fechada, **o Fortify ainda não tem um alvo de deploy de
produção 100% definido para o gateway** — confirme o estado atual antes de assumir algo (rode
`git log`/pergunte ao usuário), não invente infraestrutura que não existe.

## Estado conhecido (confirme antes de agir, isso muda com o tempo)

- **Frontend**: sem deploy de produção confirmado neste momento; plano declarado do usuário é
  eventualmente usar a Vercel.
- **Gateway (`services/metaapi-gateway`)**: hoje roda **só local** via `npm run dev` /
  `npm run dev:gateway`. Não existe processo de deploy de produção ainda.
- **Banco**: Supabase gerenciado (projeto `qnllfibexyxexweyorli`), já em produção — é o único
  componente que já está "no ar" de verdade.

## Checklist obrigatório antes de qualquer deploy

- [ ] Variáveis de ambiente configuradas no ambiente de destino (nunca copie `.env` local pro
      controle de versão)
- [ ] `.env` está no `.gitignore` (já está)
- [ ] Nenhuma credencial hardcoded no código
- [ ] `npm run lint && npm run typecheck && npm run test && npm run build` passam limpos
- [ ] CORS do gateway configurado com a URL de produção real, não `*`

## Deploy de migration/edge function no Supabase (o que já funciona hoje)

A CLI do Supabase não está instalada globalmente — use sempre `npx supabase`, autenticado via
variável de ambiente (não interativo):

```sh
$env:SUPABASE_ACCESS_TOKEN = "sbp_..."   # gerado em supabase.com/dashboard/account/tokens
npx supabase link --project-ref qnllfibexyxexweyorli
npx supabase db push                      # aplica migrations pendentes
npx supabase functions deploy <nome>      # publica uma edge function
```

Migrations pendentes devem ser aplicadas **antes** de qualquer deploy de código que dependa delas
— nunca inverta essa ordem.

## Ao planejar o deploy real do frontend/gateway (quando isso for decidido)

Não assuma Vercel+Coolify/Hostinger por padrão — isso era o padrão de outro projeto/pacote, não
uma decisão tomada para o Fortify. Pergunte ou confirme com o usuário antes de escrever
configuração de deploy nova (`vercel.json`, `Dockerfile`, CI de deploy) para o gateway.
