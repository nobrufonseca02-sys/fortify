import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border/40 px-4 bg-background/70 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center justify-between w-full">
              <SidebarTrigger />
              <div className="hidden md:flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">FORTIFY</span>
                <span className="h-4 w-px bg-border/60" />
                <span className="text-[11px] text-muted-foreground">Proteção de regras e risco</span>
              </div>
              <div className="w-6" />
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-grid">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
