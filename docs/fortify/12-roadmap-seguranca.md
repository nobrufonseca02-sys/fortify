# Roadmap de segurança Fortify

Este documento organiza o hardening do Fortify em camadas. Segurança não é um estado absoluto: os controles abaixo reduzem probabilidade, impacto e tempo de resposta a incidentes.

## Fronteiras de confiança

| Origem | Destino | Controle mínimo |
| --- | --- | --- |
| Browser | Frontend | CSP, consentimento, dependências auditadas e ausência de segredos no bundle |
| Browser | Gateway | TLS, JWT, validação, rate limit, limite de payload e autorização por recurso |
| Gateway | Supabase | Service role somente no servidor, RLS como segunda barreira e logs sanitizados |
| Gateway | Stripe | Secret em cofre, assinatura de webhook, idempotência e processamento durável |
| Gateway | MetaApi | Entitlement, ownership por tag, credencial efêmera e suspensão por inadimplência |
| Cron/WhatsApp | Gateway | Segredo dedicado, comparação em tempo constante e isolamento de rede quando disponível |

## Sprint 1 - superfície HTTP e supply chain

- Headers de segurança no frontend publicado e no gateway.
- CSP sem scripts inline no HTML; GTM inicializado pelo bundle local.
- Worker PDF servido pelo próprio aplicativo, sem CDN em runtime.
- Fastify, Vite, Vitest, React Router, PDF.js e dependências transitivas atualizados.
- Auditoria `npm` obrigatória para app, gateway e agente WhatsApp.
- Actions fixadas por commit e Dependabot configurado.
- Limite global de corpo e limite específico para webhook Stripe.
- Rate limiter local com memória limitada e IP calculado somente por proxies explicitamente confiáveis.
- Headers e credenciais removidos dos logs por redaction.
- Erros inesperados retornam mensagens genéricas e logs estruturados sem corpo de provedor.
- Contas MetaApi existentes exigem tag do mesmo usuário antes de atualizar credenciais.
- Segredos internos comparados em tempo constante.

### Configuração de deploy

`TRUSTED_PROXY_ADDRESSES` deve ficar vazio quando o gateway recebe tráfego diretamente. Em produção, preencher somente com IPs ou CIDRs documentados do proxy que se conecta diretamente ao gateway. Nunca usar `true`, curingas ou confiar em todo `X-Forwarded-For`.

O limitador desta sprint é uma proteção local e limitada. Antes de escalar o gateway horizontalmente, substituir o armazenamento por Redis/Upstash ou pelo rate limiting do edge, mantendo limites por IP e por usuário.

## Sprint 2 - identidade, administração e RLS

- MFA TOTP obrigatório para administradores e verificação de AAL2 no gateway.
- Remover promoção automática baseada apenas em e-mail.
- Exigir confirmação de e-mail, senha forte, proteção contra senha vazada e CAPTCHA.
- Criar testes pgTAP com usuário A, usuário B, anônimo, gateway e administrador.
- Restringir por coluna os campos técnicos de `mt5_connections`.
- Endurecer funções `SECURITY DEFINER`, `search_path`, grants e privilégios padrão.

## Sprint 3 - sessão BFF e cookies

- Introduzir BFF no mesmo domínio do frontend.
- Retirar access token e refresh token do `localStorage`.
- Usar sessão opaca em cookie `__Host-fortify_session`, `Secure`, `HttpOnly`, `SameSite=Lax` e `Path=/`.
- Rotacionar sessão, limitar duração, revogar no logout e enviar `Clear-Site-Data`.
- Proteger operações mutáveis com token CSRF e validação de `Origin`.
- Manter cookies necessários separados de analytics e marketing.

## Sprint 4 - integrações financeiras e operacionais

- Persistir `event.id` do Stripe com constraint única e estado de processamento.
- Responder webhook rapidamente e processar efeitos por fila/outbox durável.
- Criar idempotency keys para provisionamento e mudanças de assinatura.
- Isolar endpoints internos por rede, allowlist ou mTLS, além do segredo.
- Remover service role do agente WhatsApp e oferecer API de privilégio mínimo.
- Armazenar sessão WhatsApp em volume cifrado e com acesso restrito.

## Sprint 5 - dados, detecção e recuperação

- Classificar identidade, cobrança, trading, IA e WhatsApp por sensibilidade.
- Definir retenção, exportação, exclusão e anonimização LGPD.
- Ativar backups/PITR e executar restauração controlada periodicamente.
- Centralizar auditoria de admin, falhas de login, webhook, RLS, rate limit e MetaApi.
- Criar alertas, playbook de incidente, rotação de segredos e RPO/RTO.
- Executar SAST, secret scanning, DAST em staging e revisão anual baseada no OWASP ASVS.

## Critérios de liberação

- Nenhum segredo rastreado ou incluído no bundle frontend.
- Zero vulnerabilidades críticas ou altas conhecidas nas dependências de produção.
- Usuário A não consegue ler ou alterar qualquer recurso do usuário B.
- Não-admin recebe `403` em todas as operações administrativas.
- Requisições sem autenticação, com assinatura inválida ou payload excessivo falham fechadas.
- Logs não contêm tokens, senhas, corpos de provedor ou identificadores completos de conta.
- Backups e restauração foram testados, não apenas configurados.
