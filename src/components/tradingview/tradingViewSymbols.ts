export type TradingViewSymbolOption = {
  fortifySymbol: string;
  tradingViewSymbol: string;
  label: string;
};

export const DEFAULT_TRADINGVIEW_SYMBOL = "OANDA:XAUUSD";

export const TRADINGVIEW_SYMBOLS: TradingViewSymbolOption[] = [
  { fortifySymbol: "EUR/USD", tradingViewSymbol: "OANDA:EURUSD", label: "EUR/USD" },
  { fortifySymbol: "GBP/USD", tradingViewSymbol: "OANDA:GBPUSD", label: "GBP/USD" },
  { fortifySymbol: "USD/JPY", tradingViewSymbol: "OANDA:USDJPY", label: "USD/JPY" },
  { fortifySymbol: "USD/CHF", tradingViewSymbol: "OANDA:USDCHF", label: "USD/CHF" },
  { fortifySymbol: "AUD/USD", tradingViewSymbol: "OANDA:AUDUSD", label: "AUD/USD" },
  { fortifySymbol: "USD/CAD", tradingViewSymbol: "OANDA:USDCAD", label: "USD/CAD" },
  { fortifySymbol: "NZD/USD", tradingViewSymbol: "OANDA:NZDUSD", label: "NZD/USD" },
  { fortifySymbol: "XAU/USD", tradingViewSymbol: "OANDA:XAUUSD", label: "XAU/USD" },
  { fortifySymbol: "XAG/USD", tradingViewSymbol: "OANDA:XAGUSD", label: "XAG/USD" },
  { fortifySymbol: "US100", tradingViewSymbol: "CAPITALCOM:US100", label: "US100" },
  { fortifySymbol: "US500", tradingViewSymbol: "CAPITALCOM:US500", label: "US500" },
  { fortifySymbol: "US30", tradingViewSymbol: "CAPITALCOM:US30", label: "US30" },
  { fortifySymbol: "GER40", tradingViewSymbol: "CAPITALCOM:DE40", label: "GER40" },
  { fortifySymbol: "UK100", tradingViewSymbol: "CAPITALCOM:UK100", label: "UK100" },
  { fortifySymbol: "HK50", tradingViewSymbol: "CAPITALCOM:HK50", label: "HK50" },
  { fortifySymbol: "JP225", tradingViewSymbol: "CAPITALCOM:JP225", label: "JP225" },
  { fortifySymbol: "WTI", tradingViewSymbol: "TVC:USOIL", label: "WTI" },
  { fortifySymbol: "BRENT", tradingViewSymbol: "TVC:UKOIL", label: "BRENT" },
  { fortifySymbol: "NATGAS", tradingViewSymbol: "TVC:NATGAS", label: "NATGAS" },
];

export function mapFortifyToTradingView(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  return TRADINGVIEW_SYMBOLS.find((item) => item.fortifySymbol.toUpperCase() === normalized)?.tradingViewSymbol || normalized || DEFAULT_TRADINGVIEW_SYMBOL;
}
