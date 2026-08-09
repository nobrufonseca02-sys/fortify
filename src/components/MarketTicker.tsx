type MarketTickerAsset = {
  symbol: string;
  name: string;
  category: 'Forex' | 'Commodities' | 'Índices';
  price: string;
  changePercent: string;
  direction: 'up' | 'down' | 'flat';
};

const assets: MarketTickerAsset[] = [
  { symbol: 'EUR/USD', name: 'Euro / Dólar', category: 'Forex', price: '1.0832', changePercent: '+0.12%', direction: 'up' },
  { symbol: 'GBP/USD', name: 'Libra / Dólar', category: 'Forex', price: '1.2714', changePercent: '-0.08%', direction: 'down' },
  { symbol: 'USD/JPY', name: 'Dólar / Iene', category: 'Forex', price: '157.42', changePercent: '+0.21%', direction: 'up' },
  { symbol: 'USD/CHF', name: 'Dólar / Franco', category: 'Forex', price: '0.8941', changePercent: '0.00%', direction: 'flat' },
  { symbol: 'AUD/USD', name: 'Aussie / Dólar', category: 'Forex', price: '0.6628', changePercent: '+0.09%', direction: 'up' },
  { symbol: 'USD/CAD', name: 'Dólar / Canadense', category: 'Forex', price: '1.3718', changePercent: '-0.05%', direction: 'down' },
  { symbol: 'NZD/USD', name: 'Kiwi / Dólar', category: 'Forex', price: '0.6112', changePercent: '+0.04%', direction: 'up' },
  { symbol: 'XAU/USD', name: 'Ouro', category: 'Commodities', price: '2341.20', changePercent: '-0.31%', direction: 'down' },
  { symbol: 'XAG/USD', name: 'Prata', category: 'Commodities', price: '29.42', changePercent: '+0.18%', direction: 'up' },
  { symbol: 'WTI', name: 'Petróleo WTI', category: 'Commodities', price: '78.36', changePercent: '-0.24%', direction: 'down' },
  { symbol: 'BRENT', name: 'Brent', category: 'Commodities', price: '82.11', changePercent: '+0.07%', direction: 'up' },
  { symbol: 'NATGAS', name: 'Gás Natural', category: 'Commodities', price: '2.91', changePercent: '-0.16%', direction: 'down' },
  { symbol: 'US100', name: 'Nasdaq 100', category: 'Índices', price: '18420.5', changePercent: '+0.44%', direction: 'up' },
  { symbol: 'US500', name: 'S&P 500', category: 'Índices', price: '5481.3', changePercent: '+0.19%', direction: 'up' },
  { symbol: 'US30', name: 'Dow Jones', category: 'Índices', price: '39118.8', changePercent: '-0.11%', direction: 'down' },
  { symbol: 'GER40', name: 'DAX', category: 'Índices', price: '18640.2', changePercent: '-0.18%', direction: 'down' },
  { symbol: 'UK100', name: 'FTSE', category: 'Índices', price: '8247.6', changePercent: '+0.06%', direction: 'up' },
  { symbol: 'HK50', name: 'Hang Seng', category: 'Índices', price: '18112.4', changePercent: '-0.27%', direction: 'down' },
  { symbol: 'JP225', name: 'Nikkei', category: 'Índices', price: '38612.9', changePercent: '+0.33%', direction: 'up' },
];

const directionClass: Record<MarketTickerAsset['direction'], string> = {
  up: 'text-success',
  down: 'text-destructive',
  flat: 'text-muted-foreground',
};

function TickerItem({ asset }: { asset: MarketTickerAsset }) {
  return (
    <div className="flex h-10 min-w-max items-center gap-2 border-r border-border/40 px-3">
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
      <div
        className="hidden shrink-0 items-center border-r border-border/50 px-3 text-[11px] uppercase tracking-wide text-muted-foreground sm:flex"
        title="Cotações simuladas para visualização. Dados reais serão integrados em uma próxima versão."
      >
        Dados simulados
      </div>
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
