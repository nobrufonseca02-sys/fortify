import { LayoutDashboard, ScrollText, PlusCircle, Settings, BarChart3, Shield, BookOpen, Archive, LogOut } from "lucide-react";
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
  { title: "Painel", url: "/", icon: LayoutDashboard },
  { title: "Minhas Contas", url: "/accounts", icon: PlusCircle },
  { title: "Performance", url: "/performance", icon: BarChart3 },
  { title: "Regras da Conta", url: "/rules", icon: ScrollText },
  { title: "Prop Firm Library", url: "/library", icon: BookOpen },
  { title: "Histórico", url: "/history", icon: Archive },
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isAdmin } = useUserRole();
  const { signOut } = useAuth();

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <SidebarContent className="pt-4 flex flex-col h-full">
        <div className={`px-4 mb-6 ${collapsed ? 'px-2' : ''}`}>
          <div className="flex items-center gap-2.5">
            <img src={fortifyLogo} alt="Fortify" className="w-7 h-7 flex-shrink-0 invert mix-blend-screen" />
            {!collapsed && (
              <h1 className="text-sm font-bold text-foreground tracking-[0.08em]">FORTIFY</h1>
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
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/admin"
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout */}
        <div className={`px-3 pb-4 ${collapsed ? 'px-2' : ''}`}>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
