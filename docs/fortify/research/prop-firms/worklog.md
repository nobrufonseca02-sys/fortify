# Worklog - Prop Firm Rules Library

## 2026-07-15 - Sprint 2

- HEAD inicial confirmado em `b82a1459de9d2132bcc7eb3f3868a46181553f3e`.
- Sprint 1 preservado: ASAP Funding Prop e NP Future não foram alterados.
- Fontes oficiais revisadas para FTMO, Apex Trader Funding, Hantec Trader, Topstep, The Trading Pit, FundingPips, FundedNext e The5ers.
- Entradas legadas de FTMO/Apex/Hantec foram substituídas somente no agregador público por módulos auditáveis; o histórico fonte permanece no arquivo legado.
- Campos normalizados: `firmSlug`, `evidenceStatus`, `dataCompleteness`, fontes, conflitos, práticas proibidas e monitorabilidade.
- Mesas sem pesquisa nesta sprint permanecem no backlog e não receberam programas fictícios.

### Decisões de precedência

- FAQ/página específica do programa prevalece sobre página comercial ou genérica.
- FundedNext 1-Step: adotados 2 dias da FAQ específica; divergência da página de add-ons foi preservada.
- Produtos temporários/Labs/Legacy não foram promovidos a programa padrão.
- Campos não encontrados foram marcados como `Não informado publicamente` ou `Verificar no site oficial`.

### Arquivos locais alheios

- Alterações preexistentes em assets, `supabase/.temp`, `crm-jp-main/` e `docs/standards/` foram ignoradas e não devem ser staged.

### Validação

- `npx vitest run src/test/propFirmRules.test.ts src/test/AccountRules.test.tsx`: 9 testes aprovados.
- `npx tsc --noEmit`: aprovado.
- `npm run build`: aprovado; somente avisos preexistentes de `caniuse-lite` e tamanho de chunk.
- `http://localhost:8080/rules`: resposta HTTP 200 confirmada.
- Validação visual interativa: bloqueada porque o controle do navegador não conseguiu assumir a aba local nesta sessão; nenhum defeito visual foi inferido ou mascarado.
