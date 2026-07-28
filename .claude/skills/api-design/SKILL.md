---
name: api-design
description: Use esta skill quando precisar projetar uma rota nova no gateway (services/metaapi-gateway), decidir se algo deve ser uma rota de gateway ou acesso direto ao Supabase, ou padronizar respostas de API no Fortify.
---

# Design de API — Fortify

O Fortify **não tem uma camada de API REST tradicional pra CRUD comum** — a maior parte do
acesso a dado é direto do frontend pro Supabase via `@supabase/supabase-js`
(`supabase.from('trading_accounts').select()...`), com RLS controlando o que cada usuário pode
ver/alterar. Só existe uma API HTTP própria — o gateway Fastify — e ela só deve ter rota nova
quando a operação exige algo que o Supabase sozinho não resolve.

## Quando criar uma rota nova no gateway (`services/metaapi-gateway`)

Crie rota no gateway quando a operação precisa de:
- um segredo que não pode ir pro frontend (token da MetaApi, chave do Stripe)
- lógica que precisa rodar com a service-role key (bypassa RLS de propósito, ex.: criar linha em
  nome do usuário validando regras de negócio primeiro)
- chamar uma API externa (MetaApi, Stripe)

Se a operação é só ler/escrever uma tabela respeitando RLS, **não crie rota no gateway** — use o
cliente Supabase direto no frontend.

## Padrão de rota existente no gateway

```
POST /metaapi/connect      → provisiona conta na MetaApi + conecta
POST /metaapi/sync         → sincroniza saldo/posições/trades de uma conexão
POST /billing/*            → checkout, portal, reconciliação de assinatura Stripe
GET  /admin/*              → rotas restritas a user_roles.role = 'admin'
```

Note que não é CRUD genérico (`GET/POST/PUT/DELETE /recurso`) — cada rota é uma operação de
negócio específica, nomeada pelo verbo que faz. Siga esse padrão em vez de inventar rotas RESTful
genéricas.

## Autenticação de toda rota do gateway

Toda rota (exceto `/health`) exige `Authorization: Bearer <supabase_access_token>`, revalidado
contra `supabase.auth.getUser()` no servidor — nunca confie em um `userId` vindo só do body sem
essa revalidação (ver `verifyRequestUser`/`verifyAdminRequest` em `server.ts`).

## Padrão de resposta

```ts
// Sucesso
reply.status(200).send({ success: true, data: { ... } });

// Erro — sempre com um `code` estável, não só mensagem em texto livre
reply.status(400).send({ error: 'Mensagem legível', code: 'validation_error' });
```

O `code` é o que o frontend usa pra mapear mensagens amigáveis (veja
`getConnectErrorMessage`/`getSyncErrorMessage` em `src/lib/betaReadiness.ts`) — sempre que criar
um erro novo, dê um `code` estável em vez de só uma mensagem.

## Códigos HTTP — use corretamente

| Código | Quando usar |
|--------|-------------|
| `200` | Sucesso |
| `202` | Aceito, ainda processando (ex.: provisionamento MetaApi pendente) |
| `400` | Dado inválido enviado pelo cliente |
| `401` | Sessão Fortify ausente/inválida |
| `402` | Bloqueado por plano/entitlement (não é erro de pagamento HTTP puro, é convenção do projeto) |
| `403` | Autenticado mas sem permissão (conta de outro usuário, não-admin em rota admin) |
| `404` | Recurso não encontrado |
| `409` | Conflito (ex.: login MT5 já conectado a outro usuário) |
| `500` | Erro interno |
| `502` | Falha ao alcançar dependência externa (MetaApi, Stripe) |

## Regras

- Nunca exponha a service-role key ou qualquer segredo em uma resposta
- Toda rota que recebe `userId` no body deve revalidar contra o token, nunca confiar nele sozinho
- Timeouts e tratamento de erro em toda chamada externa (MetaApi, Stripe) — devolva um `code`
  específico em vez de deixar a exception estourar como 500 genérico
