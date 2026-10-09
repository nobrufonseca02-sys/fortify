import { BarChart3, Gem, Fuel, Flame, type LucideIcon } from 'lucide-react';
import flagEu from 'flag-icons/flags/1x1/eu.svg';
import flagUs from 'flag-icons/flags/1x1/us.svg';
import flagGb from 'flag-icons/flags/1x1/gb.svg';
import flagJp from 'flag-icons/flags/1x1/jp.svg';
import flagCh from 'flag-icons/flags/1x1/ch.svg';
import flagAu from 'flag-icons/flags/1x1/au.svg';
import flagCa from 'flag-icons/flags/1x1/ca.svg';
import flagNz from 'flag-icons/flags/1x1/nz.svg';
// Logos reais dos provedores de índice, baixados das próprias páginas
// oficiais (ver task report) — S&P 500 e Dow Jones ficam de fora porque
// spglobal.com/spdji.com bloqueiam todo acesso automatizado (Cloudflare) e
// dowjones.com não publica um wordmark em imagem, só texto estilizado.
import logoNasdaq from '@/assets/market/nasdaq.svg';
import logoDax from '@/assets/market/dax-deutsche-boerse.png';
import logoFtse from '@/assets/market/ftse-russell.svg';
import logoHangSeng from '@/assets/market/hang-seng.png';
import logoNikkei from '@/assets/market/nikkei.svg';

type MarketTickerAsset = {
  symbol: string;
  name: string;
  category: 'Forex' | 'Commodities' | 'Índices';
  price: string;
  changePercent: string;
  direction: 'up' | 'down' | 'flat';
  // Par de câmbio: as duas bandeiras reais (base, cotação) — o equivalente
  // honesto a um "logo" aqui, já que a própria moeda não tem marca própria.
  flags?: [string, string];
  // Índice/commodity: logo real da entidade (bolsa/provedor do índice), só
  // quando uma fonte oficial foi encontrada — ver nota abaixo de cada item
  // sem `logo` (commodities não têm marca própria; alguns índices ainda sem
  // fonte confirmada caem no ícone de categoria).
  logo?: string;
  logoBg?: string;
};

const assets: MarketTickerAsset[] = [
  { symbol: 'EUR/USD', name: 'Euro / Dólar', category: 'Forex', price: '1.0832', changePercent: '+0.12%', direction: 'up', flags: [flagEu, flagUs] },
  { symbol: 'GBP/USD', name: 'Libra / Dólar', category: 'Forex', price: '1.2714', changePercent: '-0.08%', direction: 'down', flags: [flagGb, flagUs] },
  { symbol: 'USD/JPY', name: 'Dólar / Iene', category: 'Forex', price: '157.42', changePercent: '+0.21%', direction: 'up', flags: [flagUs, flagJp] },
  { symbol: 'USD/CHF', name: 'Dólar / Franco', category: 'Forex', price: '0.8941', changePercent: '0.00%', direction: 'flat', flags: [flagUs, flagCh] },
  { symbol: 'AUD/USD', name: 'Aussie / Dólar', category: 'Forex', price: '0.6628', changePercent: '+0.09%', direction: 'up', flags: [flagAu, flagUs] },
  { symbol: 'USD/CAD', name: 'Dólar / Canadense', category: 'Forex', price: '1.3718', changePercent: '-0.05%', direction: 'down', flags: [flagUs, flagCa] },
  { symbol: 'NZD/USD', name: 'Kiwi / Dólar', category: 'Forex', price: '0.6112', changePercent: '+0.04%', direction: 'up', flags: [flagNz, flagUs] },
  // Ouro/prata/petróleo/gás são commodities físicas — não existe "empresa
  // dona" delas, então não há logo real para buscar. Fica o ícone por tipo.
  { symbol: 'XAU/USD', name: 'Ouro', category: 'Commodities', price: '2341.20', changePercent: '-0.31%', direction: 'down', logoBg: 'bg-amber-500' },
  { symbol: 'XAG/USD', name: 'Prata', category: 'Commodities', price: '29.42', changePercent: '+0.18%', direction: 'up', logoBg: 'bg-slate-400' },
  { symbol: 'WTI', name: 'Petróleo WTI', category: 'Commodities', price: '78.36', changePercent: '-0.24%', direction: 'down', logoBg: 'bg-stone-600' },
  { symbol: 'BRENT', name: 'Brent', category: 'Commodities', price: '82.11', changePercent: '+0.07%', direction: 'up', logoBg: 'bg-stone-500' },
  { symbol: 'NATGAS', name: 'Gás Natural', category: 'Commodities', price: '2.91', changePercent: '-0.16%', direction: 'down', logoBg: 'bg-orange-500' },
  { symbol: 'US100', name: 'Nasdaq 100', category: 'Índices', price: '18420.5', changePercent: '+0.44%', direction: 'up', logo: logoNasdaq },
  // Sem logo: spglobal.com / spdji.com bloqueiam acesso automatizado
  // (Cloudflare, HTTP 403 mesmo com User-Agent de navegador) nas duas
  // fontes oficiais possíveis (S&P Dow Jones Indices administra os dois).
  { symbol: 'US500', name: 'S&P 500', category: 'Índices', price: '5481.3', changePercent: '+0.19%', direction: 'up', logoBg: 'bg-emerald-600' },
  { symbol: 'US30', name: 'Dow Jones', category: 'Índices', price: '39118.8', changePercent: '-0.11%', direction: 'down', logoBg: 'bg-blue-600' },
  // Logo é da Deutsche Börse Group (operadora do índice via Qontigo) — o
  // DAX em si não tem wordmark separado publicado no site oficial.
  { symbol: 'GER40', name: 'DAX', category: 'Índices', price: '18640.2', changePercent: '-0.18%', direction: 'down', logo: logoDax },
  { symbol: 'UK100', name: 'FTSE', category: 'Índices', price: '8247.6', changePercent: '+0.06%', direction: 'up', logo: logoFtse },
  { symbol: 'HK50', name: 'Hang Seng', category: 'Índices', price: '18112.4', changePercent: '-0.27%', direction: 'down', logo: logoHangSeng },
  { symbol: 'JP225', name: 'Nikkei', category: 'Índices', price: '38612.9', changePercent: '+0.33%', direction: 'up', logo: logoNikkei },
];

const directionClass: Record<MarketTickerAsset['direction'], string> = {
  up: 'text-success',
  down: 'text-destructive',
  flat: 'text-muted-foreground',
};

const categoryIcon: Record<MarketTickerAsset['category'], LucideIcon> = {
  Forex: Gem,
  Commodities: Gem,
  Índices: BarChart3,
};

const commodityIcon: Record<string, LucideIcon> = {
  'XAU/USD': Gem,
  'XAG/USD': Gem,
  WTI: Fuel,
  BRENT: Fuel,
  NATGAS: Flame,
};

function AssetBadge({ asset }: { asset: MarketTickerAsset }) {
  if (asset.flags) {
    const [base, quote] = asset.flags;
    return (
      <span className="relative flex h-5 w-7 shrink-0 items-center" aria-hidden="true">
        <img src={base} alt="" className="absolute left-0 h-4 w-4 rounded-full border border-border object-cover" />
        <img src={quote} alt="" className="absolute left-2.5 h-4 w-4 rounded-full border border-border object-cover" />
      </span>
    );
  }
  if (asset.logo) {
    // bg-brand-chip is the same fixed-dark, theme-independent chip FirmCard
    // uses for single-color/white-fill brand marks — several of these index
    // logos are white-on-transparent and would disappear on an adaptive
    // light-mode background otherwise.
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-brand-chip-border bg-brand-chip p-0.5" aria-hidden="true">
        <img src={asset.logo} alt="" className="h-full w-full object-contain" />
      </span>
    );
  }
  const Icon = commodityIcon[asset.symbol] || categoryIcon[asset.category];
  return (
    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${asset.logoBg || 'bg-muted-foreground/40'}`} aria-hidden="true">
      <Icon className="h-3 w-3 text-white" strokeWidth={2.5} />
    </span>
  );
}

function TickerItem({ asset }: { asset: MarketTickerAsset }) {
  return (
    <div className="flex h-10 min-w-max items-center gap-2 border-r border-border/40 px-3">
      <AssetBadge asset={asset} />
      <span className="font-mono text-xs font-bold text-foreground">{asset.symbol}</span>
      <span className="hidden text-[10px] text-muted-foreground sm:inline">{asset.name}</span>
      <span className="font-mono text-xs font-semibold text-foreground">{asset.price}</span>
      <span className={`font-mono text-[10px] font-bold ${directionClass[asset.direction]}`}>{asset.changePercent}</span>
    </div>
  );
}

export function MarketTicker() {
  const tickerItems = [...assets, ...assets];

  return (
    <section className="flex h-11 overflow-hidden rounded-xl border border-border bg-card/80 shadow-sm shadow-background/20">
      <div className="group relative min-w-0 flex-1 overflow-hidden">
        <div className="flex w-max animate-[ticker-scroll_62s_linear_infinite] group-hover:[animation-play-state:paused]">
          {tickerItems.map((asset, index) => (
            <TickerItem key={`${asset.symbol}-${index}`} asset={asset} />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
