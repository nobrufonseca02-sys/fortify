# Regras de mesas e cálculo de risco

## Objetivo

A Biblioteca de Mesas organiza regras oficiais por empresa, programa e versão. A Calculadora de Risco responde quanto um trade planejado pode perder e quanto consome dos limites informados. Juntas, ajudam o usuário a decidir antes de operar.

> Regras podem mudar sem aviso. O usuário deve confirmar os termos oficiais da prop firm antes de operar. O Fortify é apoio de gestão de risco, não garantia de conformidade ou aprovação.

## Modelo de conhecimento

| Entidade | Função |
| --- | --- |
| `prop_firms` | Empresa/mesa. |
| `programs` | Produto, avaliação ou conta financiada. |
| `rule_set_versions` | Versão imutável com fonte, vigência e verificação. |
| `rule_definitions` | Definição canônica: perda diária, drawdown etc. |
| `rule_instances` | Valor, unidade, escopo e parâmetros por programa. |
| `rule_evaluations` | Estado calculado para uma conta e momento. |

Cada regra publicada deve ter fonte oficial, URL, data de verificação, revisão humana e observações sobre ambiguidades. IA pode extrair candidatos; não deve publicar valores automaticamente.

## Famílias de regras

| Regra | Dados principais | Automação possível |
| --- | --- | --- |
| Perda diária máxima | valor/percentual, base, reset e timezone | Alta com snapshots/trades confiáveis. |
| Drawdown máximo | estático/trailing, balance/equity e referência | Alta, mas trailing exige semântica exata. |
| Trailing EOD/intraday | frequência e piso de referência | Possível com histórico adequado. |
| Consistência | melhor dia, janela e teto percentual | Possível com trades agregados corretos. |
| Profit target | valor/percentual e fase | Alta. |
| Dias mínimos | definição de dia válido | Possível após modelar a definição. |
| Notícias | janela, impacto e calendário oficial | Parcial; depende de calendário confiável. |
| Weekend holding | instrumentos e horário de corte | Parcial; confirmar timezone e feriados. |
| Inatividade | quantidade e definição de dias | Possível com calendário do programa. |
| Payout | dias, consistência e elegibilidade | Parcial; pode exigir confirmação externa. |
| Estratégias proibidas | descrição contratual | Normalmente informativa/manual. |

Não reduza uma regra textual ambígua a número sem registrar a interpretação. “Drawdown 5%” é insuficiente sem base, medida, frequência e comportamento de reset.

## Monitoramento automático

O Fortify pode calcular automaticamente quando possui:

- saldo/equity inicial e atual;
- snapshots com timestamps confiáveis;
- trades e posições normalizados;
- timezone e reset da regra;
- parâmetros versionados da mesa.

Quando um desses elementos falta, a avaliação deve ser “Sem dados”/informativa. Não invente conclusão.

## Confirmação manual

Exigem atenção humana ou fonte externa confiável:

- permissão durante notícias e exceções por instrumento;
- holding em fim de semana/feriado;
- copy trading, EA, arbitragem e estratégias proibidas;
- condições de payout e mudanças temporárias;
- termos específicos da conta adquirida pelo usuário.

## Calculadora de Risco

O núcleo está em `src/lib/riskCalculator.ts` e a UI em `src/pages/RiskCalculator.tsx`. Entradas típicas incluem equity/saldo, stop, valor por ponto, lote, risco pretendido, limite diário e drawdown total.

Regras de implementação:

- cálculos ficam em funções puras e tipadas;
- entradas inválidas produzem erro/estado seguro, não `NaN` visível;
- arredondamento e unidade devem ser explícitos;
- ausência de limite mostra “Sem dados”, não zero seguro;
- resultados não executam ordem e não substituem regra oficial;
- handoff para TradingView preserva somente contexto de análise.

## Princípios de UX inspirados em bons journals

Sem copiar TradeZella ou transformar Fortify em journal completo:

- risco e próxima ação aparecem antes de gráficos decorativos;
- vermelho significa intervenção, não apenas desempenho negativo;
- o usuário entende origem, limite, consumo e margem restante;
- tabelas são compactas e comparáveis;
- estados vazios dizem como gerar dados reais;
- histórico ajuda a reconhecer padrão, não incentiva overtrading.

## Processo para alimentar a biblioteca

1. Escolher mesas prioritárias por demanda.
2. Coletar página oficial, FAQ, termos e regras do programa.
3. Registrar documento, URL, data e versão.
4. Extrair regras candidatas com IA em estrutura controlada.
5. Revisar cada campo contra a fonte oficial.
6. Publicar nova versão sem sobrescrever a anterior.
7. Criar fixtures para cada fórmula automatizada.
8. Revisar fontes periodicamente e marcar conteúdo obsoleto.

## QA da biblioteca

- [ ] Mesa e programa corretos, sem misturar avaliação e funded.
- [ ] Fonte oficial e data de verificação visíveis.
- [ ] Valor, unidade, base, medida, reset e timezone definidos.
- [ ] Regra ambígua está marcada para confirmação.
- [ ] Versão anterior foi preservada.
- [ ] Conta do usuário aponta para a versão esperada.
- [ ] Avaliação automática tem fixture nos limites abaixo/no/acima.

## QA da calculadora

- [ ] Stop zero/negativo e entradas vazias são tratados.
- [ ] Conversão entre percentual e valor é consistente.
- [ ] Lote respeita casas decimais do instrumento informado.
- [ ] Perda no stop e consumo diário/drawdown batem com cálculo manual.
- [ ] Ausência de dados não aparece como situação segura.
- [ ] Mobile não corta valores ou CTAs.
- [ ] TradingView continua análise interna, sem ordem ou navegação externa.

## Dataset estático auditável do MVP

O agregador público fica em `src/data/propFirmRules.ts`; módulos revisados por mesa ficam em `src/data/prop-firms/`. Cada programa novo deve registrar:

- `lastReviewedAt`, `confidence` e `completeness`;
- todas as fontes oficiais com precedência;
- conflitos sem apagar o valor divergente;
- monitorabilidade em `automatic_mt5`, `manual_check` e `not_supported_yet`;
- fase e plataforma separadas quando as regras mudarem.

ASAP Funding Prop e NP Future foram normalizadas no Sprint 1. No Sprint 2, FTMO, Apex Trader Funding, Hantec Trader, Topstep, The Trading Pit, FundingPips, FundedNext e The5ers receberam módulos auditáveis, fontes oficiais e matriz de monitorabilidade. Evidências e lacunas ficam em `docs/fortify/research/prop-firms/`.

Entradas legadas de FTMO, Apex e Hantec não são mais publicadas pelo agregador. Mesas sem fonte oficial revisada permanecem sem programas no dataset. Para a NP Future, o regulamento prevalece sobre a apresentação comercial: o DD diário 200K adotado é $3.600, enquanto a apresentação ainda mostra $3.500. Para FundedNext 1-Step, a FAQ específica de 2 dias prevalece, mas a divergência da página genérica de add-ons permanece registrada.

O dataset estático informa e compara regras. Ele não substitui as versões persistidas no banco nem deve ativar automaticamente uma regra ambígua no motor de avaliação.

## Vínculo por conta

A seleção versionada por conta usa `account_rule_bindings`, com snapshot, hash, evidências, monitorabilidade automática/manual e histórico por status. O fluxo e as limitações estão documentados em [Vínculo versionado de regras por conta](./rule-binding.md).
