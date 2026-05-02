import { LayoutDashboard, ScrollText, PlusCircle, Settings, BarChart3, Shield, BookOpen, Archive, LogOut, Server, Calculator, ClipboardList, FileCheck } from "lucide-react";
import fortifyLogo from "@/assets/fortify-eagle.png";
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
    label: "Cockpit",
    items: [
      { title: "Risk Panel", url: "/", icon: LayoutDashboard },
      { title: "Calculadora", url: "/calculator", icon: Calculator },
      { title: "Challenge", url: "/challenge", icon: Target },
    ],
  },
  {
    label: "Contas & Regras",
    items: [
      { title: "Minhas Contas", url: "/accounts", icon: PlusCircle },
      { title: "Regras", url: "/rules", icon: ScrollText },
      { title: "Performance", url: "/performance", icon: BarChart3 },
    ],
  },
  {
    label: "Disciplina",
    items: [
      { title: "Plano de Sessão", url: "/planner", icon: ClipboardList },
      { title: "Revisão", url: "/review", icon: FileCheck },
    ],
  },
  {
    label: "Recursos",
    items: [
      { title: "Prop Firm Library", url: "/library", icon: BookOpen },
      { title: "Contas MT5", url: "/mt5", icon: Server },
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
            <div className="relative w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-primary/15 to-primary/0 border border-primary/20">
              <img src={fortifyLogo} alt="Fortify" className="w-5 h-5 invert mix-blend-screen opacity-90" />
              <div className="absolute inset-0 rounded-lg bg-primary/20 blur-md -z-10" />
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-none">
                <h1 className="text-[13px] font-bold text-foreground tracking-[0.22em] uppercase font-display">Fortify</h1>
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70 mt-1">Risk OS · v1</span>
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
                      <NavLink to="/admin" activeClassName="">
                        <Shield className="mr-2 h-4 w-4" />
                        {!collapsed && <span className="text-[12px] font-medium tracking-wide">Admin</span>}
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
