/**
 * Separação site/app por domínio: o mesmo build responde nos dois hosts.
 *
 * No domínio raiz (ou em qualquer host não listado aqui, incluindo localhost
 * e o domínio de preview da Vercel), quem cai em "/" sem sessão vê o site de
 * vendas — é o comportamento de sempre. No subdomínio do produto (ex.:
 * app.fortify.com.br), quem cai em "/" sem sessão vai direto para o login: um
 * visitante desse host já é usuário, não alguém que precisa ver o pitch.
 *
 * `VITE_APP_HOSTS` fica vazia até existir domínio configurado — enquanto
 * isso, `isAppHost` sempre retorna falso e nada muda.
 */
const APP_HOSTS = (import.meta.env.VITE_APP_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);

export function isAppHost(hostname: string = window.location.hostname) {
  return APP_HOSTS.includes(hostname.toLowerCase());
}
