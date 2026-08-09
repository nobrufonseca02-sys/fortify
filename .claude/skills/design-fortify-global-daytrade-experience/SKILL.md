---
name: design-fortify-global-daytrade-experience
description: Audita, projeta e implementa landing pages e interfaces SaaS internacionais do FORTIFY para traders e prop firms, com design system, conversão responsável, dashboards financeiros, botões e ações modernas, responsividade, acessibilidade e performance.
---

# Skill: Design FORTIFY Global Daytrade Experience

Use esta skill com o agente `fortify-product-design-architect` para criar ou melhorar experiências do FORTIFY destinadas ao mercado internacional de day trade.

## Objetivos

Esta skill serve para:

- criar página de vendas internacional;
- revisar e melhorar identidade visual do SaaS;
- criar design system e tokens;
- redesenhar dashboard, onboarding, conexão MT5 e páginas de regras;
- criar componentes de CTA e botões flutuantes;
- melhorar responsividade;
- preparar internacionalização;
- aumentar clareza e conversão sem prometer lucro;
- transformar uma referência visual em código consistente com o projeto.

## Argumentos esperados

O pedido pode conter:

- rota ou tela;
- objetivo de negócio;
- público;
- referência visual;
- screenshot;
- arquivos específicos;
- copy disponível;
- limitações técnicas;
- prazo;
- critério de aceite.

Quando faltarem dados, inspecione o projeto antes de perguntar. Pergunte somente o que não puder ser resolvido pela base de código.

## Etapa 1 — Classifique a tarefa

Classifique como uma ou mais opções:

- `landing-page`;
- `sales-page`;
- `saas-dashboard`;
- `onboarding`;
- `account-connection`;
- `risk-rules`;
- `trade-history`;
- `design-system`;
- `component`;
- `responsive-fix`;
- `visual-bug`;
- `conversion-review`;
- `internationalization`.

## Etapa 2 — Faça auditoria objetiva

Localize:

- framework e versão;
- router;
- arquivo da rota;
- layout compartilhado;
- estilos globais;
- Tailwind config ou tokens;
- componentes de UI;
- bibliotecas de ícones e gráficos;
- dependências de animação;
- fontes;
- assets da marca;
- analytics;
- i18n;
- testes;
- comandos de lint, typecheck e build.

Produza uma tabela curta:

| Área | Estado atual | Problema | Impacto | Prioridade |
|---|---|---|---|---|

Não implemente antes de entender o escopo.

## Etapa 3 — Defina o contrato da tela

Antes do código, documente:

```text
Route:
Primary user:
Primary job:
Primary action:
Secondary action:
Critical data:
Data freshness requirement:
Empty state:
Error state:
Mobile behavior:
Analytics events:
Out of scope:
```

## Etapa 4 — Direção visual

Escolha uma única direção coerente, baseada na marca existente.

Defina:

- personalidade visual;
- hierarquia;
- grid;
- spacing;
- tipografia;
- radius;
- bordas;
- sombras;
- motion;
- iconografia;
- densidade;
- superfícies;
- accent color;
- estados semânticos.

Não apresente três estilos genéricos. Recomende uma direção e justifique.

## Etapa 5 — Design system mínimo

Crie ou consolide:

- tokens semânticos;
- `Button`;
- `IconButton`;
- `Badge`;
- `Card`;
- `MetricCard`;
- `StatusIndicator`;
- `Tooltip`;
- `Dialog` ou `Sheet`;
- `Input`;
- `Select`;
- `Tabs`;
- `Table`;
- `Skeleton`;
- `EmptyState`;
- `ErrorState`;
- `FloatingAction` somente quando necessário.

Não crie duplicatas se já existirem componentes equivalentes.

## Etapa 6 — Regras para botões modernos

### Hierarquia

- Primary: uma ação principal por contexto.
- Secondary: ação alternativa real.
- Ghost: ações de baixa ênfase.
- Destructive: somente para ações destrutivas.
- Link: navegação, não submissão.

### Estados

Implemente:

- hover;
- active;
- focus-visible;
- disabled;
- loading;
- success quando fizer sentido;
- destructive confirmation quando necessário.

### Botão flutuante

Antes de usar, responda:

1. A ação precisa estar sempre disponível?
2. é usada frequentemente?
3. A navegação atual não resolve?
4. Não cobre informação crítica?
5. Funciona por teclado e leitor de tela?
6. Funciona com teclado virtual e safe area no mobile?

Se alguma resposta for “não”, use CTA inline, sticky footer ou ação no header.

Padrão recomendado:

```tsx
<FloatingAction
  aria-label="Connect trading account"
  label="Connect account"
  icon={<LinkIcon aria-hidden="true" />}
  onClick={openConnectionFlow}
/>
```

O componente deve aceitar label visível no desktop e versão compacta no mobile somente se continuar compreensível.

## Etapa 7 — Landing page internacional

### Público

Priorize personas reais do FORTIFY:

- prop firm challenge trader;
- funded trader;
- trader com múltiplas contas;
- trader que precisa monitorar regras;
- gestor de equipe ou comunidade, somente se houver recurso correspondente.

### Mensagem central

A mensagem deve vender controle, clareza e monitoramento de risco. Não venda lucro.

Estrutura mínima:

```text
Hero
Product proof / interface preview
Problem
How it works
Risk rules visibility
Multi-account or account workflow, if confirmed
Benefits
Trust / security facts
FAQ
Final CTA
```

### Hero

Inclua:

- headline específica;
- subheadline explicando mecanismo;
- CTA primária;
- CTA secundária opcional;
- produto visível acima da dobra;
- microcopy de risco ou disponibilidade quando necessário.

Evite headline como “Trade smarter” sem explicar o produto.

### Prova

Use somente:

- screenshots reais;
- demonstração real;
- métricas confirmadas;
- depoimentos autorizados;
- integrações existentes;
- detalhes técnicos verificáveis.

Se não houver prova, crie seção de demonstração funcional em vez de inventar social proof.

### FAQ internacional

Cubra, quando aplicável:

- supported brokers / MT5;
- data refresh;
- security;
- read-only access;
- supported prop firm rules;
- timezone;
- open positions;
- account disconnection;
- cancellation;
- disclaimer de que não fornece aconselhamento ou sinais.

Não afirme compatibilidade universal.

## Etapa 8 — UX específica de day trade

### Dados críticos

Sempre deixe claro:

- account name/number mascarado;
- broker/server;
- account currency;
- balance;
- equity;
- floating P&L;
- daily loss;
- max loss;
- drawdown type quando confirmado;
- remaining buffer;
- last sync;
- timezone;
- connection status.

### Proximidade de limite

Não use apenas percentuais abstratos. Exiba:

- valor atual;
- limite;
- restante;
- barra ou escala;
- label textual;
- regra de cálculo resumida;
- timestamp.

### Status sugeridos

- `safe`;
- `attention`;
- `near-limit`;
- `violated`;
- `pending-data`;
- `stale`;
- `disconnected`.

Mapeie para os status reais do domínio. Não introduza estados que alterem regras de negócio.

### Gráficos

- eixo e unidade visíveis;
- tooltip com data, timezone e valor;
- linha de threshold;
- legenda clara;
- não use área decorativa que esconda volatilidade;
- forneça resumo textual;
- valide valores negativos, zero e dados ausentes.

## Etapa 9 — Internacionalização

Implemente ou prepare:

- strings externalizadas;
- pluralização;
- locale;
- timezone;
- moeda por conta;
- números com casas decimais corretas;
- datas sem ambiguidade;
- expansão de texto;
- labels sem abreviações locais incompreensíveis;
- `lang` no documento;
- SEO por locale quando houver landing pages localizadas.

Use APIs `Intl` ou biblioteca já instalada.

Exemplo:

```ts
const money = new Intl.NumberFormat(locale, {
  style: "currency",
  currency: accountCurrency,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
```

Não converta moeda silenciosamente.

## Etapa 10 — Acessibilidade e interação

Verifique:

- headings;
- landmarks;
- labels;
- aria somente quando semântica nativa não resolve;
- foco visível;
- focus trap em modal/drawer;
- escape para fechar;
- retorno de foco;
- target mínimo;
- contraste;
- teclado;
- leitor de tela;
- `prefers-reduced-motion`;
- mensagens de erro;
- feedback de carregamento;
- gráficos acessíveis.

## Etapa 11 — Performance

### Landing page

- priorize o ativo LCP;
- evite vídeos pesados autoplay no hero;
- use poster e carregamento posterior;
- comprima imagens;
- evite renderizar dashboard inteiro como imagem enorme;
- minimize scripts de terceiros;
- preserve CLS próximo de zero.

### SaaS

- não bloqueie navegação por gráfico pesado;
- lazy load módulos secundários;
- evite re-render global por hover ou filtros locais;
- considere virtualização somente com volume que justifique;
- preserve skeleton dimensions;
- não faça polling adicional por causa de UI.

## Etapa 12 — Implementação

Faça mudanças incrementais:

1. tokens;
2. primitives;
3. layout;
4. componentes de domínio;
5. estados;
6. responsividade;
7. acessibilidade;
8. analytics;
9. testes.

Não misture redesign com refatoração de backend.

## Etapa 13 — Testes obrigatórios

### Visual

- 320x568;
- 375x812;
- 768x1024;
- 1024x768;
- 1440x900;
- zoom 200%;
- texto longo;
- modo escuro e claro, se existentes.

### Dados

- valor positivo;
- valor negativo;
- zero;
- nulo;
- número muito grande;
- moeda diferente;
- timezone diferente;
- conta sem trades;
- conta desconectada;
- sync atrasado;
- regra violada;
- múltiplas contas.

### Interação

- teclado;
- leitor de tela básico;
- loading;
- clique duplicado;
- erro de API;
- retry;
- modal/drawer;
- botão flutuante;
- tooltip;
- mobile menu.

### Engenharia

Execute os comandos existentes:

- lint;
- typecheck;
- unit tests;
- integration tests;
- build.

Não alegue que executou se não executou.

## Saída final obrigatória

```text
## Diagnóstico
## Direção visual
## Plano mínimo
## Implementação
## Arquivos alterados
## Componentes criados/reutilizados
## Estados cobertos
## Acessibilidade
## Performance
## Testes executados
## Riscos restantes
## Critérios de aceite
## Próximo passo mínimo
```

## Critérios de aceite da skill

A tarefa só está concluída quando:

- o design está alinhado Ã  marca FORTIFY;
- a tela comunica confiança sem exagero;
- a ação principal é clara;
- desktop e mobile funcionam;
- botão flutuante, se usado, não obstrui conteúdo;
- os dados financeiros são legíveis e contextualizados;
- estados de loading, empty, stale, error e disconnected estão tratados quando aplicáveis;
- a interface não depende apenas de cor;
- o foco é visível;
- strings e formatos estão preparados para mercado internacional;
- não há promessas de lucro;
- auth, RLS, MT5, MetaApi e regras financeiras não sofreram regressão;
- lint, typecheck e build passam, quando disponíveis;
- mudanças fora do escopo foram evitadas.
