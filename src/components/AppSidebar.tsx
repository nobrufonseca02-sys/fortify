import { LayoutDashboard, ScrollText, PlusCircle, Settings, BarChart3, Shield, BookOpen, Archive } from "lucide-react";
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

const items = [
  { title: "Painel", url: "/", icon: LayoutDashboard },
  { title: "Minhas Contas", url: "/accounts", icon: PlusCircle },
  { title: "Performance", url: "/performance", icon: BarChart3 },
  { title: "Regras da Conta", url: "/rules", icon: ScrollText },
  { title: "Prop Firm Library", url: "/library", icon: BookOpen },
  
  { title: "Histórico", url: "/history", icon: Archive },
  { title: "Configuração", url: "/settings", icon: Settings },
  { title: "Admin", url: "/admin", icon: Shield },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <SidebarContent className="pt-4">
        <div className={`px-4 mb-6 ${collapsed ? 'px-2' : ''}`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold text-sm">F</span>
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-sm font-bold text-foreground tracking-tight">FORTIFY</h1>
                <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Controle de Risco</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
