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

## 2026-07-15 - Sprint 3

- HEAD inicial confirmado em `7c10d55`; Sprints 1 e 2 preservadas sem alteração nos módulos concluídos.
- Fontes oficiais pesquisadas para FXIFY, E8 Markets, BrightFunded, Alpha Capital Group, MyFundedFX e Fundscap.
- Adicionados 26 programas auditáveis: 8 FXIFY, 9 E8 Markets, 3 BrightFunded e 6 Alpha Capital Group.
- Adicionadas duas fichas de indisponibilidade: MyFundedFX, cuja operação oficial está encerrada, e Fundscap, cuja migração não publica rulebook prop vigente.
- Nenhum dado histórico, review, afiliado, Reddit, YouTube ou concorrente foi usado para preencher lacunas.
- O agregador passou de 10 mesas/26 programas para 16 mesas/54 registros de programa ou status.

### Decisões de precedência

- Página específica e atual do programa prevalece sobre FAQ genérica, coleção legacy ou comunicação de lançamento.
- FXIFY Classic: mantidos os parâmetros da comparação oficial específica; conflito com a regra Standard registrado.
- FXIFY Lightning: usado o prazo atual de 5 dias; o lançamento com 7 dias permanece documentado como conflito.
- E8 One: usado o preset 3% daily/4% dynamic da página específica; contas customizadas continuam dependentes do checkout.
- E8 Signature: mantido como `partial` porque páginas de produto atuais coexistem com indicação de legado/disponibilidade conflitante.
- MyFundedFX e Fundscap: campos críticos marcados como `Indisponível em fonte oficial vigente`, sem reconstrução histórica.

### Escopo preservado

- Nenhuma alteração em UI, layout, assets, Supabase, CRM, motor de regras, autenticação, billing ou documentação fora de `docs/fortify/research/prop-firms/`.
- Alterações preexistentes em assets, `supabase/.temp`, `crm-jp-main/` e `docs/standards/` continuam ignoradas e não devem ser staged.

### Validação

- `npm test`: 12 testes aprovados em 3 arquivos.
- `npx tsc --noEmit`: aprovado.
- `npm run build`: aprovado; apenas avisos preexistentes de `caniuse-lite` e tamanho de chunk.
- `http://localhost:8080/rules`: carregou com 16 mesas, 54 programas e sem erro de console.
- Busca visual por `FXIFY`: 8 programas encontrados; filtros incluem as 6 mesas novas e o tipo `3-Step`.
- Drawer de evidências e comparação de até 3 programas: validados por `src/test/AccountRules.test.tsx` (3 testes aprovados). A automação visual do clique no drawer encontrou uma limitação do controlador após localizar o card; nenhum erro da aplicação foi observado.
