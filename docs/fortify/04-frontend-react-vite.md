# Frontend React e Vite

## Estrutura real

| Caminho | Responsabilidade |
| --- | --- |
| `src/main.tsx` | Entrada do React. |
| `src/App.tsx` | Providers, BrowserRouter, proteção de sessão e rotas. |
| `src/components/AppLayout.tsx` | Shell autenticado, sidebar e TradingView global. |
| `src/components/AppSidebar.tsx` | Navegação e marca Fortify. |
| `src/pages/` | Páginas da aplicação. |
| `src/components/` | Componentes de domínio e blocos visuais. |
| `src/components/ui/` | Primitivos de UI usados pelo design system atual. |
| `src/hooks/` | Auth, assinatura, MT5, contas, regras e papéis. |
| `src/lib/` | Billing, gateway, cálculos e helpers puros. |
| `src/integrations/supabase/` | Cliente e tipos do Supabase. |
| `src/data/` | Catálogos e dados estáticos controlados. |

## Rotas atuais

| Rota | Tela |
| --- | --- |
| `/auth` | Login/cadastro. |
| `/reset-password` | Redefinição de senha. |
| `/` e `/dashboard` | Painel. |
| `/risk-calculator` | Calculadora de Risco. |
| `/accounts`, `/accounts/new`, `/accounts/:id` | Contas. |
| `/accounts/:accountId/rules` | Gestão de regras da conta. |
| `/mt5`, `/mt5/:connectionId` | Conexões e detalhes MT5. |
| `/rules`, `/rules/manage` | Regras do usuário/gestão. |
| `/library` | Biblioteca de Mesas. |
| `/performance`, `/history` | Desempenho e histórico. |
| `/pricing` | Planos; pode ser aberta sem sessão. |
| `/settings` | Perfil e assinatura. |
| `/adm` | Administração protegida. |

`/calculator`, `/integrations/mt5` e `/admin` redirecionam para as rotas canônicas.

## Sessão e layout

`ProtectedRoutes` aguarda o estado de autenticação e redireciona para `/auth` sem sessão. `/pricing` tem tratamento próprio para permitir aquisição antes do login. Após autenticar, um plano guardado em `sessionStorage` pode retomar o fluxo de pricing.

`AppLayout` envolve as páginas autenticadas e mantém o `TradingViewProvider` disponível. Não duplique header, sidebar ou provider dentro de páginas.

## Comunicação com o gateway

Em desenvolvimento, `vite.config.ts` encaminha `/api/*` para `http://localhost:3001/*`. `src/lib/billing.ts` prefere URLs `VITE_BILLING_API_URL`, `VITE_API_URL`, `VITE_BACKEND_URL` ou `VITE_PUBLIC_BACKEND_URL`; sem configuração em dev, usa `/api`.

Nunca coloque `STRIPE_SECRET_KEY`, service role do Supabase, `METAAPI_TOKEN`, senha MT5 ou webhook secret em variável `VITE_*`.

## Tailwind e estilo Fortify

- Preserve o tema escuro, a densidade operacional e os tokens existentes.
- Use cores de status com significado consistente: sucesso, atenção, crítico e neutro.
- Cards devem representar ferramentas ou itens reais, não decorar cada seção.
- Use `lucide-react` para ações comuns quando o projeto já oferece o ícone.
- Garanta foco de teclado, `aria-label` em botões somente-ícone e contraste legível.
- Não altere tipografia, espaçamento global ou navegação em uma correção local.
- Texto visível permanece em português-BR.

## Como editar uma página com segurança

1. Leia a página completa e seus hooks/imports diretos.
2. Identifique quais consultas e estados já existem.
3. Defina explicitamente arquivos permitidos.
4. Preserve loading, erro e estado vazio.
5. Não crie dados falsos para esconder ausência de backend.
6. Faça a menor edição possível.
7. Execute `npm run build`; use `npx tsc --noEmit` quando solicitado ou quando a mudança for transversal.
8. Teste a rota em desktop e mobile.

## Áreas sensíveis

### Auth

`src/pages/AuthPage.tsx` usa o vídeo `/backgrounds/fortify-blackhole-auth.mp4`. Não troque mídia, overlay, formulário ou comportamento de sessão em uma tarefa que não seja explicitamente de Auth.

### Pricing

Compra chama Checkout; gerenciamento de assinante pago chama Portal. `src/lib/billing.ts` rejeita URL de compra que não contenha `checkout.stripe.com`. Não use `billing.stripe.com` para Beta Free ou nova compra.

### TradingView

O provider está em `src/components/tradingview/`. Preserve abertura interna, troca de símbolo, reload, handoff da calculadora e ausência de navegação externa. O widget é análise, não execução.

### Dashboard

Use somente contas, snapshots, posições, trades e avaliações disponíveis. Dados ausentes devem resultar em “Sem dados” ou estado vazio, nunca em números inventados.

## Checklist de QA visual

- [ ] A rota abre sem erro no console.
- [ ] Loading não pisca indefinidamente.
- [ ] Listas vazias e dados nulos não quebram a tela.
- [ ] Botões mostram estado de envio e voltam a habilitar.
- [ ] Textos cabem no mobile e desktop.
- [ ] Sidebar/header não se sobrepõem ao conteúdo.
- [ ] Pricing, Auth e TradingView continuam intactos quando fora do escopo.
- [ ] Nenhuma chave secreta apareceu no bundle ou diff.

## Falhas comuns

- **Failed to fetch:** gateway desligado ou base URL incorreta; rode `npm run dev` e valide `/health`.
- **401:** sessão ausente/expirada ou Bearer token não enviado.
- **RLS/permission denied:** consulta não respeita usuário ou política não cobre a ação.
- **Checkout abre portal:** decisão de CTA incorreta; nova compra deve chamar `createCheckoutSession`.
- **Tela vazia após mudança de rota:** rota foi adicionada no lugar errado ou perdeu o `AppLayout`.
