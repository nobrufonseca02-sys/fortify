import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Activity, BarChart3, Cloud, Maximize2, RefreshCw, X } from "lucide-react";
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
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-3 rounded-full border border-cyan-300/35 bg-[#06111f]/95 px-4 py-3 text-xs font-black text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_12px_42px_rgba(8,145,178,0.28)] backdrop-blur hover:border-cyan-300/60 hover:bg-[#082033] hover:text-white transition-all"
        title="Abrir TradingView dentro do Fortify"
        aria-label="Abrir TradingView dentro do Fortify"
      >
        <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-200">
          <Cloud className="h-5 w-5" />
          <Activity className="absolute h-3 w-3 translate-x-1 translate-y-1 text-cyan-50" />
        </span>
        <span className="tracking-wide">TradingView</span>
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
  const widgetIdRef = useRef(`fortify-tv-${Math.random().toString(36).slice(2)}`);
  const [manualSymbol, setManualSymbol] = useState(symbol);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const reloadChart = () => setReloadKey((value) => value + 1);
  const loadManualSymbol = () => {
    const nextSymbol = manualSymbol.trim().toUpperCase();
    if (!nextSymbol) return;
    setSymbol(nextSymbol);
    reloadChart();
  };

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
    const widgetId = widgetIdRef.current;
    container.innerHTML = "";
    container.className = "tradingview-widget-container h-full w-full";

    const wrapper = document.createElement("div");
    wrapper.id = widgetId;
    wrapper.className = "tradingview-widget-container__widget";
    wrapper.style.height = "100%";
    wrapper.style.width = "100%";
    container.appendChild(wrapper);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.onerror = () => setLoadFailed(true);
    script.innerHTML = JSON.stringify({
      autosize: true,
      container_id: widgetId,
      symbol,
      interval: "15",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "br",
      allow_symbol_change: false,
      hide_side_toolbar: false,
      save_image: false,
      details: true,
      hotlist: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    const timer = window.setTimeout(() => {
      if (!container.querySelector("iframe")) setLoadFailed(true);
    }, 8000);

    return () => {
      window.clearTimeout(timer);
      container.innerHTML = "";
    };
  }, [open, reloadKey, symbol]);

  if (!open) return null;

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
                if (event.key === "Enter") loadManualSymbol();
              }}
              className="h-9 w-40 text-xs"
              placeholder="Ex.: OANDA:XAUUSD"
            />
            <Button type="button" size="sm" variant="outline" onClick={loadManualSymbol}>
              Carregar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={reloadChart}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Recarregar gráfico
            </Button>
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
          <div ref={widgetRef} className="tradingview-widget-container h-full w-full" />
          {loadFailed ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/90 p-6 text-center">
              <div className="max-w-md rounded-lg border border-border bg-card p-5">
                <Maximize2 className="mx-auto mb-3 h-6 w-6 text-primary" />
                <p className="text-sm font-semibold text-foreground">Não foi possível carregar o gráfico embutido.</p>
                <p className="mt-2 text-xs text-muted-foreground">Verifique o símbolo e tente recarregar.</p>
                <Button
                  type="button"
                  size="sm"
                  onClick={reloadChart}
                  className="mt-4 gap-2"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Recarregar gráfico
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
