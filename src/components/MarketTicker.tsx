import { BarChart3, Gem, Landmark, type LucideIcon } from 'lucide-react';

type MarketTickerAsset = {
  symbol: string;
  name: string;
  category: 'Forex' | 'Commodities' | 'Índices';
  price: string;
  changePercent: string;
  direction: 'up' | 'down' | 'flat';
  logoClass: string;
};

// Nenhum destes é uma empresa com marca própria (par de câmbio, commodity,
// índice) — "logo" aqui é um selo colorido por categoria, não um logotipo
// real inventado. A cor varia por ativo só pra dar a mesma leitura rápida
// "cada item tem o seu selo" do print de referência.
const assets: MarketTickerAsset[] = [
  { symbol: 'EUR/USD', name: 'Euro / Dólar', category: 'Forex', price: '1.0832', changePercent: '+0.12%', direction: 'up', logoClass: 'bg-sky-500' },
  { symbol: 'GBP/USD', name: 'Libra / Dólar', category: 'Forex', price: '1.2714', changePercent: '-0.08%', direction: 'down', logoClass: 'bg-indigo-500' },
  { symbol: 'USD/JPY', name: 'Dólar / Iene', category: 'Forex', price: '157.42', changePercent: '+0.21%', direction: 'up', logoClass: 'bg-rose-500' },
  { symbol: 'USD/CHF', name: 'Dólar / Franco', category: 'Forex', price: '0.8941', changePercent: '0.00%', direction: 'flat', logoClass: 'bg-red-600' },
  { symbol: 'AUD/USD', name: 'Aussie / Dólar', category: 'Forex', price: '0.6628', changePercent: '+0.09%', direction: 'up', logoClass: 'bg-teal-500' },
  { symbol: 'USD/CAD', name: 'Dólar / Canadense', category: 'Forex', price: '1.3718', changePercent: '-0.05%', direction: 'down', logoClass: 'bg-red-500' },
  { symbol: 'NZD/USD', name: 'Kiwi / Dólar', category: 'Forex', price: '0.6112', changePercent: '+0.04%', direction: 'up', logoClass: 'bg-blue-500' },
  { symbol: 'XAU/USD', name: 'Ouro', category: 'Commodities', price: '2341.20', changePercent: '-0.31%', direction: 'down', logoClass: 'bg-amber-500' },
  { symbol: 'XAG/USD', name: 'Prata', category: 'Commodities', price: '29.42', changePercent: '+0.18%', direction: 'up', logoClass: 'bg-slate-400' },
  { symbol: 'WTI', name: 'Petróleo WTI', category: 'Commodities', price: '78.36', changePercent: '-0.24%', direction: 'down', logoClass: 'bg-stone-600' },
  { symbol: 'BRENT', name: 'Brent', category: 'Commodities', price: '82.11', changePercent: '+0.07%', direction: 'up', logoClass: 'bg-stone-500' },
  { symbol: 'NATGAS', name: 'Gás Natural', category: 'Commodities', price: '2.91', changePercent: '-0.16%', direction: 'down', logoClass: 'bg-orange-500' },
  { symbol: 'US100', name: 'Nasdaq 100', category: 'Índices', price: '18420.5', changePercent: '+0.44%', direction: 'up', logoClass: 'bg-violet-500' },
  { symbol: 'US500', name: 'S&P 500', category: 'Índices', price: '5481.3', changePercent: '+0.19%', direction: 'up', logoClass: 'bg-emerald-600' },
  { symbol: 'US30', name: 'Dow Jones', category: 'Índices', price: '39118.8', changePercent: '-0.11%', direction: 'down', logoClass: 'bg-blue-600' },
  { symbol: 'GER40', name: 'DAX', category: 'Índices', price: '18640.2', changePercent: '-0.18%', direction: 'down', logoClass: 'bg-neutral-700' },
  { symbol: 'UK100', name: 'FTSE', category: 'Índices', price: '8247.6', changePercent: '+0.06%', direction: 'up', logoClass: 'bg-indigo-600' },
  { symbol: 'HK50', name: 'Hang Seng', category: 'Índices', price: '18112.4', changePercent: '-0.27%', direction: 'down', logoClass: 'bg-rose-600' },
  { symbol: 'JP225', name: 'Nikkei', category: 'Índices', price: '38612.9', changePercent: '+0.33%', direction: 'up', logoClass: 'bg-pink-600' },
];

const directionClass: Record<MarketTickerAsset['direction'], string> = {
  up: 'text-success',
  down: 'text-destructive',
  flat: 'text-muted-foreground',
};

const categoryIcon: Record<MarketTickerAsset['category'], LucideIcon> = {
  Forex: Landmark,
  Commodities: Gem,
  Índices: BarChart3,
};

function TickerItem({ asset }: { asset: MarketTickerAsset }) {
  const Icon = categoryIcon[asset.category];
  return (
    <div className="flex h-10 min-w-max items-center gap-2 border-r border-border/40 px-3">
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${asset.logoClass}`} aria-hidden="true">
        <Icon className="h-3 w-3 text-white" strokeWidth={2.5} />
      </span>
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
