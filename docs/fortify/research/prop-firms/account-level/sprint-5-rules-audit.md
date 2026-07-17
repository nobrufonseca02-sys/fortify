# Sprint 5 — Auditoria final do motor de regras

Última auditoria: 2026-07-17

## Resumo executivo

O dataset preserva as Sprints 1 a 4 e permanece coerente com os números publicados:

- 16 mesas;
- 54 registros totais;
- 52 programas ativos/auditáveis;
- 255 tamanhos ou variantes operacionais;
- 2 perfis indisponíveis, sem contas operacionais fictícias.

A auditoria confirmou a separação entre CFD/Forex, Futures, MT5 e BlackArrow. Programas Futures e BlackArrow não possuem regras classificadas como `automatic_mt5`. Todos os programas ativos têm fontes oficiais HTTPS, evidência, confiança, completude e monitorabilidade.

Foram encontradas e corrigidas três lacunas internas:

1. programas normalizados não expunham `programSlug` e `officialSourceUrls`;
2. versões de regra não possuíam identificador estável;
3. MyFundedFX e Fundscap ainda podiam parecer comparáveis na interface, apesar de indisponíveis.

Também foi removido o hífen genérico usado como fallback no drawer. Campos desconhecidos operacionais continuam usando somente:

- `Verificar no site oficial`;
- `Não informado publicamente`;
- `Não aplicável`.

## Integridade do dataset

| Verificação | Resultado |
| --- | --- |
| Mesas canônicas | 16/16 |
| Registros totais | 54 |
| Programas ativos | 52 |
| Variantes operacionais | 255 |
| IDs de programa duplicados | 0 |
| Slugs de programa duplicados | 0 |
| Labels duplicados dentro do programa | 0 |
| Campos críticos vazios | 0 |
| Fontes não HTTPS em contas ativas | 0 |
| Contas fictícias em perfis indisponíveis | 0 |
| Futures classificados como MT5 automático | 0 |
| BlackArrow classificado como MT5 automático | 0 |

## Coerência por mesa

### Suficientes para o MVP

- FTMO
- FundingPips
- The Trading Pit
- FundedNext
- The5ers
- BrightFunded
- Apex Trader Funding
- Topstep
- Hantec Trader
- Alpha Capital Group
- ASAP Funding Prop
- NP Future

Essas mesas permitem selecionar ao menos um programa e uma variante com metas, limites de perda, drawdown, fontes e monitorabilidade explícitos. Futures e BlackArrow permanecem utilizáveis como referência manual até existirem conectores próprios.

### Boas, com lacunas localizadas

- **FXIFY:** cinco programas têm tamanhos explícitos; Two Phase Classic e Instant Funding usam faixa, enquanto Lightning depende do checkout.
- **E8 Markets:** produtos Signature e Zero têm grades publicadas; E8 One é customizável e E8 Pro depende do checkout. Os limites de contratos do E8 Zero não estão publicamente completos.

As variantes incompletas não devem ser oferecidas como seleção exata até confirmação no checkout oficial. Isso não invalida os demais programas dessas mesas.

### Lacunas críticas

- **MyFundedFX:** operação encerrada/catálogo oficial indisponível.
- **Fundscap:** catálogo prop e rulebook público vigente indisponíveis.

Ambas permanecem como perfis de status, com zero contas operacionais.

## Lacunas por tipo

| Tipo | Estado auditado | Impacto |
| --- | --- | --- |
| Preço | 249/255 variantes sem preço público estável; somente Topstep e Prime Futures têm grade registrada | Informativo; consultar checkout |
| Tamanho de conta | 7 variantes representam faixa, customização ou checkout | Bloqueia seleção exata nessas variantes |
| Daily loss | Explícito nas 255 variantes | Pronto para vínculo |
| Max loss/drawdown | Explícito nas 255 variantes | Pronto para vínculo |
| Drawdown type/cálculo | Explícito nas 255 variantes | Pronto para vínculo, respeitando versão |
| Target por fase | Explícito nas 255 variantes | Pronto para vínculo |
| Payout | Split ou `Não aplicável` explícito nas 255 variantes | Elegibilidade continua manual |
| Contratos Futures | 10 variantes de 3 programas sem limite público exato | Manual; não converter para lotes |
| Lotes CFD | 163 variantes de 34 programas sem lote máximo público | Não impede limites de drawdown |
| Alavancagem | 7 variantes de um programa sem valor público estável | Confirmar no checkout |
| Notícias | Regra textual explícita; calendário externo não integrado | Manual/not supported |
| Final de semana | 20 variantes de 3 programas sem regra pública estável | Verificação manual |
| Consistência | Explícita nas 255 variantes | Automática apenas quando derivável do MT5 |
| KYC | Explícito ou `Não aplicável` | Sempre manual |
| Versão/data de compra | 12 programas têm mais de uma versão registrada | Seleção deve considerar data e condição |

## Lacunas corrigíveis agora

- Identificadores estáveis do programa e da versão.
- Lista consolidada de links oficiais por programa.
- Unknowns de apresentação na interface.
- Estado visual e bloqueio de comparação para perfis indisponíveis.
- Testes de integridade, monitorabilidade e busca por campos aninhados.

## Lacunas bloqueadas externamente

- preços que só aparecem no checkout;
- tamanhos customizados ou dependentes de sessão;
- documentos privados, contratos após compra e regras por add-on;
- confirmação de payout, KYC, país, VPN, copy trading e titularidade;
- calendário oficial de notícias;
- dados Futures/BlackArrow sem conector;
- alterações futuras sem página oficial pública versionada.

## Prontidão para vínculo com contas MT5

### Veredito

**Parcial.** O dataset está pronto para alimentar seletores de mesa, programa, tamanho, plataforma e versão. A persistência atual ainda não garante um vínculo completo, estável e auditável entre a conta do cliente e o snapshot de regras.

### Seleções já suportadas pelo dataset

1. Mesa: `firm` + `firmSlug`.
2. Programa: `programName` + `programSlug`.
3. Tamanho/variante: `accountLevelRules[].id`, `label` e `initialBalance`.
4. Plataforma: `accountLevelRules[].platforms`.
5. Versão: `accountLevelRules[].versions[].id`, datas e condição.
6. Drawdown: `drawdownType` + `drawdownCalculation`.
7. Automático: `monitorability.automatic_mt5`.
8. Manual/não suportado: `manual_check` e `not_supported_yet`.

### Campos necessários na conta do cliente

- `prop_firm_slug`;
- `program_slug`;
- `account_variant_id`;
- `selected_platform`;
- `rule_version_id` ou chave estável equivalente;
- `phase`;
- `initial_balance`;
- `rules_reviewed_at`;
- status da seleção;
- snapshot/hash opcional dos parâmetros aplicados.

### Estado do banco atual

`trading_accounts` já possui `prop_firm`, `program`, `account_type`, `phase`, `start_balance`, `rule_set_id`, `selected_prop_firm_id`, `selected_program_id`, `account_size`, `detected_platform` e `rule_selection_status`.

`mt5_connections` possui dados da conexão, `prop_firm` e `account_type`, mas não possui metadata/config JSON para guardar o vínculo completo.

Não existe campo metadata/config genérico em `trading_accounts` ou `mt5_connections`. Os tipos Supabase gerados também não refletem todos os campos adicionados pela migration de gerenciamento de regras.

Os campos `selected_prop_firm_id`, `selected_program_id` e `rule_set_id` apontam para o catálogo relacional baseado em UUID. O dataset estático usa chaves textuais e cobre mais programas/variantes do que os seeds atuais do banco. Portanto, não se deve gravar os slugs estáticos nesses campos UUID nem reutilizar `rule_set_id` sem sincronizar o catálogo.

### Migration necessária

**Sim, para um vínculo completo e auditável.** A próxima sprint deve:

1. sincronizar `prop_firms`, `programs` e `rule_set_versions` com o catálogo canônico atual;
2. adicionar chaves estáveis de variante/versão ou uma estrutura `rule_binding` versionada;
3. atualizar os tipos Supabase;
4. manter um snapshot ou hash da regra aplicada para evitar alteração retroativa silenciosa;
5. validar que a plataforma escolhida é compatível com a conexão MT5.

Nenhuma migration ou fluxo de cadastro foi alterado nesta sprint.

## Priorização de produto

1. Sincronizar o catálogo relacional com os 52 programas ativos.
2. Criar persistência versionada do vínculo por conta.
3. Expor seleção somente para variantes com saldo exato.
4. Aplicar automaticamente daily loss, max loss, target e drawdown compatíveis com MT5.
5. Manter KYC, payout, notícias, copy trading e regras contratuais como checklist manual.
6. Adicionar conectores Futures/BlackArrow antes de promover essas regras a automáticas.

> As regras podem mudar sem aviso. Confirme sempre os termos oficiais da mesa antes de operar.
