# Vínculo versionado de regras por conta

Última revisão: 2026-07-18

## Objetivo

Cada conta do cliente deve apontar para uma mesa, programa, variante, plataforma e versão auditados. O vínculo preserva um snapshot imutável dos parâmetros escolhidos e uma assinatura determinística, evitando que uma atualização futura do dataset altere silenciosamente o histórico da conta.

Esta camada não substitui ainda o catálogo UUID legado. Desde o Sprint 7, ela é a fonte de verdade do primeiro motor operacional para perda diária, drawdown máximo e meta de lucro compatíveis com MT5.

## Auditoria do fluxo anterior

O Fortify possui dois caminhos de cadastro:

1. `/accounts/new` cria `trading_accounts` diretamente no Supabase e, depois, chama `POST /metaapi/connect` com o ID criado.
2. `/mt5` chama `POST /metaapi/connect` sem ID. O gateway procura ou cria `trading_accounts` e então cria ou atualiza `mt5_connections`.

O gateway retorna `tradingAccountId` e o registro de `connection`. Contas antigas são listadas a partir de `trading_accounts`; a tela `/accounts/:accountId/rules` já é o ponto de configuração e recuperação.

Antes desta migration:

- `trading_accounts.rule_set_id` referenciava o catálogo UUID legado;
- o dataset auditado usava IDs textuais estáveis e cobria mais programas e variantes;
- `mt5_connections` e `trading_accounts` não tinham metadata JSON apropriada para o snapshot;
- uma conexão criada diretamente em `/mt5` podia terminar com `rule_selection_status = unconfigured`;
- o fallback de criação sem persistência não conseguia produzir vínculo auditável.

Por isso, slugs do dataset não são gravados em campos UUID legados.

## Modelo persistido

A migration `20260717120000_account_rule_bindings.sql` cria `public.account_rule_bindings`.

Campos principais:

| Campo | Finalidade |
| --- | --- |
| `user_id` | Proprietário protegido por RLS. |
| `trading_account_id` / `mt5_connection_id` | Pelo menos um vínculo real deve existir. |
| `prop_firm_slug`, `program_slug`, `account_size_id`, `platform` | Seleção estável do catálogo auditado. |
| `rule_version_id`, `rule_profile_id` | Identidade da versão aplicada. |
| `rule_snapshot` | Cópia dos limites, fases, monitorabilidade e evidências. |
| `rule_snapshot_hash` | SHA-256 em navegadores modernos; fallback FNV-1a 64 documentado. |
| `automatic_monitoring_enabled` | Verdadeiro somente para plataforma MT5 com regras `automatic_mt5`. |
| `manual_rule_acknowledgement`, `manual_rules_status` | Aceite explícito dos termos manuais. |
| `binding_status` | `active`, `superseded` ou `revoked`. |

Um trigger marca o vínculo anterior como `superseded` antes de inserir uma nova versão. Assim, existe no máximo um vínculo ativo por conta/conexão sem apagar o histórico. Outro trigger mantém `trading_accounts.rule_selection_status` como `configured` quando há vínculo ativo.

## Segurança e RLS

Usuários autenticados podem ler e inserir somente os próprios vínculos. Snapshots existentes são imutáveis para o cliente: não há política de `UPDATE` ou `DELETE`. A inserção de uma nova versão supersede a anterior por trigger `security definer`. As políticas também verificam que `trading_account_id` e `mt5_connection_id`, quando informados, pertencem ao mesmo `auth.uid()`.

Um vínculo `active` só é válido com aceite manual verdadeiro e status `acknowledged`. O snapshot precisa conter versão de schema, regras críticas, monitorabilidade e evidência.

## Snapshot

`src/lib/ruleBinding.ts` resolve a seleção por:

1. `propFirmSlug`;
2. `programSlug`;
3. `accountSizeId`;
4. `platform`;
5. `ruleVersionId`.

O snapshot inclui:

- mesa e programa;
- tamanho e saldo nominal;
- plataforma e versão;
- targets por fase;
- daily loss, max loss e cálculo de drawdown;
- consistência, notícias, fim de semana e payout;
- regras automáticas MT5;
- verificações manuais e itens não suportados;
- URLs oficiais, confiança, completude, conflitos e data da revisão.

A serialização ordena chaves antes do hash. O snapshot não contém timestamp de criação, evitando assinaturas diferentes para a mesma regra.

## UX e compatibilidade

`RuleBindingSelector` mostra somente programas operacionais com fonte oficial e variantes reais. MyFundedFX e Fundscap permanecem no dataset como evidência de indisponibilidade, mas não podem ser selecionadas.

Nos fluxos MT5, o seletor filtra plataformas compatíveis com MT5. O botão de criação/conexão permanece desabilitado até a seleção completa e o aceite manual.

Contas antigas não são alteradas ou removidas. Sem registro ativo em `account_rule_bindings`, aparecem como `Regra pendente de vínculo`, com a ação `Vincular regra agora` apontando para `/accounts/:accountId/rules`.

O catálogo UUID e suas avaliações continuam funcionando em paralelo, rotulados como legado na gestão da conta. O vínculo versionado é a fonte auditável do motor descrito em [Motor operacional de regras vinculadas](./rule-engine.md).

## Aplicação da migration

A migration foi aplicada e validada no Sprint 6.1. O teste remoto confirmou inserção própria, bloqueio de referências de outro usuário, imutabilidade do snapshot e superseding do vínculo anterior. Não execute reset.

## Limitações atuais

- não há bloqueio técnico de trade;
- o motor atual é uma avaliação frontend pura; o gateway ainda não persiste avaliações do snapshot;
- o catálogo UUID legado ainda não foi totalmente sincronizado com os 52 programas;
- Futures e BlackArrow continuam sem conector automático;
- a detecção de hash desatualizado já tem estado de domínio, mas a revisão periódica do dataset ainda não dispara atualização automática;
- a gravação acontece após o gateway retornar os IDs reais; falha de persistência mantém a conta visível como pendente para recuperação.

## Próxima etapa

Persistir resultados somente depois de modelar timezone/reset e revisar fixtures por mesa. Itens manuais continuam como checklist e nunca devem virar conclusão automática por inferência. Futures e BlackArrow exigem conector próprio.
