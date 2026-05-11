import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PageTransition } from "@/components/PageTransition";
import { Activity } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
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
                <span>System Online</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground/70">
              <Activity className="w-3 h-3 text-primary/70" />
              <span>Risk Console</span>
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
