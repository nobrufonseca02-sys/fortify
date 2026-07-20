import { LayoutDashboard, PlusCircle, Settings, BarChart3, Shield, BookOpen, Archive, LogOut, Server, Calculator, CreditCard } from "lucide-react";
import fortifyIcon from "@/assets/brand/fortify-f-standalone-white.svg";
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
      { title: "Painel", url: "/", icon: LayoutDashboard },
      { title: "Calculadora de Risco", url: "/risk-calculator", icon: Calculator },
      
    ],
  },
  {
    label: "Contas",
    items: [
      { title: "Contas", url: "/accounts", icon: PlusCircle },
      { title: "Contas MT5", url: "/mt5", icon: Server },
      { title: "Desempenho", url: "/performance", icon: BarChart3 },
    ],
  },
  {
    label: "Recursos",
    items: [
      { title: "Biblioteca", url: "/library", icon: BookOpen },
      { title: "Planos", url: "/pricing", icon: CreditCard },
      { title: "Histórico", url: "/history", icon: Archive },
      { title: "Configurações", url: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isAdmin } = useUserRole();
  const { signOut } = useAuth();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarContent className="pt-4 flex flex-col h-full bg-sidebar">
        {/* Brand */}
        <div className={`px-4 mb-6 ${collapsed ? "px-2" : ""}`}>
          <div className="flex items-center gap-3">
            <img src={fortifyIcon} alt="Fortify" className="h-9 w-9 object-contain opacity-95" />
            {!collapsed && (
              <div className="flex min-w-0 flex-col leading-none">
                <h1 className="text-[14px] font-black text-foreground tracking-[0.24em] uppercase">FORTIFY</h1>
                <span className="mt-1 text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground/70">SISTEMA DE RISCO • V1</span>
              </div>
            )}
          </div>
        </div>

        {!collapsed && <div className="mx-4 divider-glow mb-3" />}

        <div className="flex-1 overflow-y-auto">
          {groups.map((group) => (
            <SidebarGroup key={group.label} className="py-1">
              {!collapsed && (
                <SidebarGroupLabel className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground/50 px-3">
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
          {!collapsed && (
            <div className="px-2 pb-3">
              <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground/60">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
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
