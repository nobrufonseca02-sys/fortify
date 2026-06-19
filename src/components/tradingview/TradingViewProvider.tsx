import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, ExternalLink, Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_TRADINGVIEW_SYMBOL, TRADINGVIEW_SYMBOLS, mapFortifyToTradingView } from "./tradingViewSymbols";

type TradingViewContextValue = {
  openChart: (symbol?: string) => void;
};

const TradingViewContext = createContext<TradingViewContextValue | null>(null);

export function useTradingView() {
  const value = useContext(TradingViewContext);
  if (!value) {
    return {
      openChart: () => undefined,
    };
  }
  return value;
}

export function TradingViewProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState(DEFAULT_TRADINGVIEW_SYMBOL);

  const openChart = useCallback((nextSymbol?: string) => {
    if (nextSymbol) setSymbol(mapFortifyToTradingView(nextSymbol));
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openChart }), [openChart]);

  return (
    <TradingViewContext.Provider value={value}>
      {children}
      <button
        type="button"
        onClick={() => openChart()}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-primary/35 bg-background/95 px-4 py-3 text-xs font-bold text-primary shadow-2xl shadow-black/40 backdrop-blur hover:bg-primary/10 transition-colors"
        title="Abrir gráfico"
        aria-label="Abrir gráfico TradingView"
      >
        <BarChart3 className="h-4 w-4" />
        <span className="hidden sm:inline">TradingView</span>
      </button>
      <TradingViewPanel open={open} onClose={() => setOpen(false)} symbol={symbol} setSymbol={setSymbol} />
    </TradingViewContext.Provider>
  );
}

function TradingViewPanel({
  open,
  onClose,
  symbol,
  setSymbol,
}: {
  open: boolean;
  onClose: () => void;
  symbol: string;
  setSymbol: (value: string) => void;
}) {
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const [manualSymbol, setManualSymbol] = useState(symbol);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setManualSymbol(symbol);
  }, [symbol]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open || !widgetRef.current) return;
    setLoadFailed(false);
    const container = widgetRef.current;
    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container__widget h-full w-full";
    container.appendChild(wrapper);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.onerror = () => setLoadFailed(true);
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: "15",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "br",
      allow_symbol_change: true,
      hide_side_toolbar: false,
      save_image: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    const timer = window.setTimeout(() => {
      if (container.childElementCount <= 1) setLoadFailed(true);
    }, 7000);

    return () => {
      window.clearTimeout(timer);
      container.innerHTML = "";
    };
  }, [open, symbol]);

  if (!open) return null;

  const tradingViewUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm">
      <div className="absolute inset-2 md:inset-8 rounded-none md:rounded-lg border border-border bg-background shadow-2xl overflow-hidden flex flex-col">
        <div className="flex flex-col gap-3 border-b border-border bg-card/95 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">TradingView — Análise gráfica</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Ferramenta apenas para análise. Ordens não são executadas pelo Fortify.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={symbol}
              onChange={(event) => setSymbol(event.target.value)}
              className="h-9 rounded-md border border-border bg-muted px-3 text-xs text-foreground outline-none"
            >
              {TRADINGVIEW_SYMBOLS.map((option) => (
                <option key={option.tradingViewSymbol} value={option.tradingViewSymbol}>
                  {option.label}
                </option>
              ))}
            </select>
            <Input
              value={manualSymbol}
              onChange={(event) => setManualSymbol(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && manualSymbol.trim()) setSymbol(manualSymbol.trim().toUpperCase());
              }}
              className="h-9 w-40 text-xs"
              placeholder="Ex.: OANDA:XAUUSD"
            />
            <Button type="button" size="sm" variant="outline" onClick={() => manualSymbol.trim() && setSymbol(manualSymbol.trim().toUpperCase())}>
              Carregar
            </Button>
            <a
              href={tradingViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir no TradingView
            </a>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground"
              aria-label="Fechar TradingView"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="relative min-h-0 flex-1 bg-[#05070b]">
          <div ref={widgetRef} className="h-full w-full" />
          {loadFailed ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/90 p-6 text-center">
              <div className="max-w-md rounded-lg border border-border bg-card p-5">
                <Maximize2 className="mx-auto mb-3 h-6 w-6 text-primary" />
                <p className="text-sm font-semibold text-foreground">Não foi possível carregar o gráfico embutido.</p>
                <p className="mt-2 text-xs text-muted-foreground">Tente abrir diretamente no TradingView ou informe outro símbolo.</p>
                <a
                  href={tradingViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
                >
                  Abrir no TradingView
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
