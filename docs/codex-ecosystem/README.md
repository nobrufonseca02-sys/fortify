# Ecossistema Codex Bravy + Fortify

Este setup organiza o Codex para trabalhar profissionalmente em dois modos:

- Bravy: gestao de tecnologia, Hoppe, workshops, automacoes, agentes, skills e entregaveis executivos.
- Fortify: produto, engenharia, risco, Supabase, MT5/MetaAPI, billing e experiencia do usuario.

## Camadas

| Camada | Onde fica | Para que serve |
| --- | --- | --- |
| Memoria global | `C:\Users\nobru\.codex\AGENTS.md` | Regras permanentes de Bravy, Fortify, tom e criterios de entrega |
| Agentes globais | `C:\Users\nobru\.codex\agents\` | Especialistas reutilizaveis em qualquer projeto |
| Skills globais | `C:\Users\nobru\.agents\skills\` | Playbooks Bravy para processos, agentes, automacoes e entregas comerciais |
| Memoria do Fortify | `C:\Projects\fortify\AGENTS.md` | Regras especificas do repo Fortify |
| Config do Fortify | `C:\Projects\fortify\.codex\config.toml` | Limites e defaults de subagentes neste projeto |
| Agentes do Fortify | `C:\Projects\fortify\.codex\agents\` | Especialistas de exploracao, implementacao, review e banco |
| Skills do Fortify | `C:\Projects\fortify\.agents\skills\` | Workflows para feature delivery, regras de risco e MT5 |

## Como usar no dia a dia

Use prompts diretos:

```text
Use $bravy-process-map para mapear este processo comercial e propor automacoes.
```

```text
Use $bravy-agent-builder para desenhar agentes, skills e tools para esta operacao.
```

```text
Use $fortify-feature-delivery para implementar esta melhoria no Fortify.
```

```text
Use $fortify-risk-rules para revisar esta regra de prop firm e atualizar os testes.
```

Use agentes quando quiser trabalho especializado ou paralelo:

```text
Use o agente bravy_process_mapper para mapear esta operacao e o agente bravy_automation_architect para propor a arquitetura. Espere os dois e consolide.
```

```text
Use fortify_explorer para encontrar os arquivos relevantes, depois fortify_implementer para fazer a mudanca e fortify_reviewer para revisar o diff.
```

## Tools, MCP e conectores

Nao ative MCPs sem necessidade real. Use esta regra:

- Skill quando o trabalho e metodo.
- Agent quando o trabalho precisa de especialista.
- MCP/tool quando precisa acessar ou alterar sistema externo.
- Plugin quando quiser distribuir skills + conectores como pacote instalavel.
- Hook quando uma regra precisa ser executada sempre, sem depender de lembranca do agente.

## MCPs recomendados para evoluir

| Tool/MCP | Uso |
| --- | --- |
| Hoppe MCP | Criar tarefas, consultar projetos, atualizar status e gerar relatorios operacionais |
| Supabase MCP | Consultar schema, validar RLS e inspecionar dados com seguranca |
| GitHub plugin/MCP | Issues, PRs, reviews e historico de implementacao |
| Google Drive plugin | Buscar materiais Bravy, propostas, decks e documentos de clientes |
| Slack/Teams plugin | Resumos, handoffs e acompanhamento operacional |
| Notion plugin | Bases de conhecimento, playbooks e documentacao de clientes |

## Ordem recomendada para novos projetos

1. Criar ou revisar `AGENTS.md`.
2. Criar skills para os workflows repetidos.
3. Criar agentes para especialistas recorrentes.
4. Adicionar MCP somente quando houver sistema externo claro.
5. Empacotar como plugin quando o setup precisar ser distribuido para equipe ou clientes.

## Prompt de bootstrap

```text
Leia o AGENTS.md aplicavel, identifique quais skills e agentes deste ecossistema devem ser usados, proponha um plano curto, execute a primeira etapa e valide o resultado.
```
