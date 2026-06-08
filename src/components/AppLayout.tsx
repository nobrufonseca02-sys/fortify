import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PageTransition } from "@/components/PageTransition";
import { Activity, CreditCard, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import { createPortalSession, isBillingEnabled } from "@/lib/billing";
import { toast } from "@/hooks/use-toast";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { subscription, plans } = useSubscriptionPlan();
  const [openingPortal, setOpeningPortal] = useState(false);
  const currentPlan = plans.find((plan) => plan.id === subscription?.plan_id || plan.slug === subscription?.plan_id);
  const isEnterprise = String(currentPlan?.slug || currentPlan?.id || '').includes('enterprise');
  const showUpgrade = Boolean(session && !isEnterprise);

  const handleUpgrade = async () => {
    if (subscription?.stripe_customer_id && isBillingEnabled() && session?.access_token) {
      setOpeningPortal(true);
      try {
        const portal = await createPortalSession(session.access_token);
        window.location.assign(portal.portal_url);
      } catch (error: any) {
        toast({ title: 'Portal indisponível', description: error?.message || 'Abrindo planos Fortify.' });
        navigate('/pricing');
      } finally {
        setOpeningPortal(false);
      }
      return;
    }
    navigate('/pricing');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* ambient backdrop glow */}
          <div className="pointer-events-none fixed inset-0 -z-10">
            <div className="absolute top-0 left-1/3 w-[800px] h-[600px] rounded-full bg-primary/[0.04] blur-[120px]" />
            <div className="absolute bottom-0 right-0 w-[600px] h-[500px] rounded-full bg-success/[0.025] blur-[120px]" />
          </div>

          <header className="h-12 flex items-center justify-between px-4 sticky top-0 z-30 glass-header">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
              <span className="hidden md:inline-flex h-4 w-px bg-border" />
              <div className="hidden md:flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span>Sistema online</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {showUpgrade ? (
                <button
                  type="button"
                  onClick={handleUpgrade}
                  disabled={openingPortal}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary hover:bg-primary/15 transition-colors disabled:opacity-60"
                >
                  {openingPortal ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
                  Fazer upgrade
                </button>
              ) : null}
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground/70">
                <Activity className="w-3 h-3 text-primary/70" />
                <span>Console de risco</span>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
