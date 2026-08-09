import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PageTransition } from "@/components/PageTransition";
import { CreditCard, Headphones, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import { SUPPORT_WHATSAPP_URL } from "@/lib/support";
import { TradingViewProvider } from "@/components/tradingview/TradingViewProvider";

const supportLabels: Record<string, string> = {
  basic: "Suporte básico",
  standard: "Suporte padrão",
  priority: "Suporte prioritário",
  enterprise: "Suporte Enterprise",
};

const supportWhatsAppUrl = SUPPORT_WHATSAPP_URL;

export function AppLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { subscription, plans, activeAccountCount, accountLimit } = useSubscriptionPlan();
  const [theme, setTheme] = useState(() => window.localStorage.getItem("fortify_theme") || "dark");
  const currentPlan = plans.find((plan) => plan.id === subscription?.plan_id || plan.slug === subscription?.plan_id);
  const isEnterprise = String(currentPlan?.slug || currentPlan?.id || '').includes('enterprise');
  const showUpgrade = Boolean(session && !isEnterprise);
  const supportTier = String(subscription?.support_tier || currentPlan?.support_tier || "basic");
  const currentPlanName = currentPlan?.name || currentPlan?.plan_name || subscription?.plan_name || "Sem plano";
  const supportLabel = ["priority", "enterprise"].includes(supportTier)
    ? supportLabels[supportTier] || "Suporte prioritário"
    : "Suporte";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("fortify_theme", theme);
  }, [theme]);

  const handleUpgrade = () => {
    navigate(subscription?.stripe_customer_id ? '/subscription' : '/pricing');
  };

  return (
    <SidebarProvider>
      <TradingViewProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0 relative">

          <header className="h-14 flex items-center justify-between px-4 sticky top-0 z-30 glass-header">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {session ? (
                <div className="hidden lg:flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">{currentPlanName}</span>
                  <span className="h-3 w-px bg-border" />
                  <span>{activeAccountCount}/{accountLimit || 0} contas</span>
                  <span className="h-3 w-px bg-border" />
                  <a
                    href={supportWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                  >
                    <Headphones className="h-3 w-3" />
                    {supportLabel}
                  </a>
                </div>
              ) : null}
              {showUpgrade ? (
                <button
                  type="button"
                  onClick={handleUpgrade}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Fazer upgrade
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-colors"
                aria-label="Alternar modo noturno"
                title="Modo noturno"
              >
                {theme === "dark" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                <span className="hidden md:inline">{theme === "dark" ? "Modo noturno" : "Modo claro"}</span>
              </button>
            </div>
          </header>

            <main className="flex-1 overflow-auto">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </div>
      </TradingViewProvider>
    </SidebarProvider>
  );
}
