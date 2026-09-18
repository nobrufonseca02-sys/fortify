import { LayoutDashboard, PlusCircle, Settings, BarChart3, Shield, BookOpen, LogOut, Calculator, CreditCard } from "lucide-react";
import { FortifyMark } from "@/components/brand/FortifyMark";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";

const groups = [
  {
    label: "Operação",
    items: [
      // Biblioteca de Mesas is the platform's landing page now — it owns "/".
      { title: "Biblioteca", url: "/", icon: BookOpen },
      { title: "Painel", url: "/dashboard", icon: LayoutDashboard },
      { title: "Calculadora de Risco", url: "/risk-calculator", icon: Calculator },

    ],
  },
  {
    label: "Contas",
    items: [
      { title: "Contas", url: "/accounts", icon: PlusCircle },
      { title: "Desempenho", url: "/performance", icon: BarChart3 },
    ],
  },
  {
    label: "Recursos",
    items: [
      { title: "Planos", url: "/pricing", icon: CreditCard },
      { title: "Configurações", url: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isAdmin } = useUserRole();
  const { signOut, user } = useAuth();
  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    "Minha conta";
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "F";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarContent className="pt-4 flex flex-col h-full bg-sidebar">
        {/* Brand */}
        <div className={`px-4 mb-6 ${collapsed ? "px-2" : ""}`}>
          <div className="flex items-center gap-3">
            <FortifyMark className="h-9 w-9 shrink-0 text-foreground opacity-95" />
            {!collapsed && (
              <div className="flex min-w-0 flex-col leading-none">
                <h1 className="text-sm font-bold text-foreground tracking-[0.14em] uppercase">Fortify</h1>
                <span className="mt-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Sistema de gestão de risco</span>
              </div>
            )}
          </div>
        </div>

        {!collapsed && <div className="mx-4 divider-glow mb-3" />}

        <div className="flex-1 overflow-y-auto">
          {groups.map((group) => (
            <SidebarGroup key={group.label} className="py-1">
              {!collapsed && (
                <SidebarGroupLabel className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/70 px-3">
                  {group.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === "/"}
                          activeClassName=""
                        >
                          <item.icon className="mr-2 h-4 w-4" />
                          {!collapsed && <span className="text-[12px] font-medium tracking-wide">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
          {isAdmin && (
            <SidebarGroup className="py-1">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/adm" activeClassName="">
                        <Shield className="mr-2 h-4 w-4" />
                        {!collapsed && <span className="text-[12px] font-medium tracking-wide">ADM</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </div>

        <div className={`px-3 pb-4 pt-2 border-t border-sidebar-border/60 ${collapsed ? "px-2" : ""}`}>
          {/* Perfil do usuário conectado — dados reais da sessão Supabase */}
          {user && (
            <div className={`mb-2 flex items-center gap-2 rounded-lg px-2 py-2 ${collapsed ? "justify-center px-0" : "bg-sidebar-accent/40"}`}>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary"
                title={user.email || displayName}
              >
                {initials}
              </span>
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-[12px] font-medium text-sidebar-accent-foreground">{displayName}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
                  </div>
                  <NavLink
                    to="/settings"
                    className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Configurações da conta"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </NavLink>
                </>
              )}
            </div>
          )}

          {!collapsed && (
            <div className="px-2 pb-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-success" aria-hidden="true" />
                Conexão estável
              </div>
            </div>
          )}
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
