import { LayoutDashboard, ScrollText, PlusCircle, Settings, BarChart3, Shield, BookOpen, Archive } from "lucide-react";
import fortifyLogo from "@/assets/fortify-logo.png";
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
          <div className="flex items-center gap-2.5">
            <img src={fortifyLogo} alt="Fortify" className="w-7 h-7 flex-shrink-0 mix-blend-screen" />
            {!collapsed && (
              <h1 className="text-sm font-bold text-foreground tracking-[0.08em]">FORTIFY</h1>
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
