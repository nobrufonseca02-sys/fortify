import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_TRADINGVIEW_SYMBOL, TRADINGVIEW_SYMBOLS, mapFortifyToTradingView } from "./tradingViewSymbols";

type TradingViewContextValue = {
  openChart: (symbol?: string) => void;
};

const TradingViewContext = createContext<TradingViewContextValue | null>(null);

function TradingViewLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2" aria-hidden="true">
      <svg
        width="30"
        height="22"
        viewBox="0 0 30 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <path
          d="M9.8 17.6h12.4a5.7 5.7 0 0 0 .5-11.37 7.35 7.35 0 0 0-13.8-1.9A6.75 6.75 0 0 0 9.8 17.6Z"
          fill="white"
        />
        <path
          d="M9.1 11.25h3.3l2.15-3.6 2.35 6.65 2.1-3.05h3.3"
          stroke="#0B1220"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!compact ? <span className="text-sm font-black tracking-tight text-white">TradingView</span> : null}
    </span>
  );
}

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
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#05060a]/95 px-4 py-2.5 text-white shadow-[0_0_0_1px_rgba(96,165,250,0.12),0_16px_46px_rgba(37,99,235,0.28)] backdrop-blur transition-all hover:-translate-y-0.5 hover:border-sky-300/45 hover:bg-[#0a1020] hover:shadow-[0_0_0_1px_rgba(125,211,252,0.2),0_18px_56px_rgba(79,70,229,0.34)]"
        title="Abrir TradingView dentro do Fortify"
        aria-label="Abrir TradingView dentro do Fortify"
      >
        <TradingViewLogo />
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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm">
      <div className="absolute inset-0 md:inset-x-[5vw] md:inset-y-[6vh] overflow-hidden rounded-none border border-white/10 bg-[#05060a] shadow-[0_28px_90px_rgba(0,0,0,0.75)] md:rounded-xl flex flex-col">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_25%_0%,rgba(56,189,248,0.20),transparent_38%),radial-gradient(circle_at_72%_0%,rgba(124,58,237,0.18),transparent_34%)]" />
        <div className="relative flex flex-col gap-3 border-b border-white/10 bg-[#070914]/92 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <TradingViewLogo />
              <div className="h-8 w-px bg-white/10" />
              <div>
                <h2 className="text-sm font-black text-white">TradingView</h2>
                <p className="text-[11px] font-medium text-slate-400">Análise gráfica dentro do Fortify</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-400">Ferramenta apenas para análise. Ordens não são executadas pelo Fortify.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <select
              value={symbol}
              onChange={(event) => setSymbol(event.target.value)}
              className="h-9 rounded-md border border-white/10 bg-white/[0.08] px-3 text-xs text-white outline-none transition-colors hover:border-sky-300/35"
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
              className="h-9 w-40 border-white/10 bg-white/[0.08] text-xs text-white placeholder:text-slate-500"
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-slate-400 transition-colors hover:border-white/25 hover:text-white"
              aria-label="Fechar TradingView"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="relative min-h-0 flex-1 bg-[#05070b] p-0">
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
