import { LayoutDashboard, ScrollText, PlusCircle, Settings, BarChart3, Shield, BookOpen, Archive, LogOut, Server, Calculator, Target, ClipboardList, FileCheck } from "lucide-react";
import fortifyLogo from "@/assets/fortify-eagle.png";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";

const items = [
  { title: "Risk Panel", url: "/", icon: LayoutDashboard },
  { title: "Calculadora", url: "/calculator", icon: Calculator },
  { title: "Challenge", url: "/challenge", icon: Target },
  { title: "Minhas Contas", url: "/accounts", icon: PlusCircle },
  { title: "Regras", url: "/rules", icon: ScrollText },
  { title: "Performance", url: "/performance", icon: BarChart3 },
  { title: "Plano de Sessão", url: "/planner", icon: ClipboardList },
  { title: "Revisão", url: "/review", icon: FileCheck },
  { title: "Prop Firm Library", url: "/library", icon: BookOpen },
  { title: "Contas MT5", url: "/mt5", icon: Server },
  { title: "Histórico", url: "/history", icon: Archive },
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isAdmin } = useUserRole();
  const { signOut } = useAuth();

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50 bg-sidebar">
      <SidebarContent className="pt-5 flex flex-col h-full">
        <div className={`px-4 mb-8 ${collapsed ? "px-2" : ""}`}>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <img src={fortifyLogo} alt="Fortify" className="w-7 h-7 flex-shrink-0 invert mix-blend-screen" />
              <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
            </div>
            {!collapsed && (
              <h1 className="text-sm font-bold text-foreground tracking-[0.12em] uppercase">Fortify</h1>
            )}
          </div>
        </div>

        <SidebarGroup className="flex-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className=""
                      activeClassName="border-l-2 border-primary"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span className="text-[13px]">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin" className="" activeClassName="border-l-2 border-primary">
                      <Shield className="mr-2 h-4 w-4" />
                      {!collapsed && <span className="text-[13px]">Admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className={`px-3 pb-5 ${collapsed ? "px-2" : ""}`}>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
