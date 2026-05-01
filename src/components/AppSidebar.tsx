import { LayoutDashboard, Wallet, PlusCircle, Calculator, ScrollText, LogOut } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";

const items = [
  { title: "Risk Panel", url: "/", icon: LayoutDashboard, end: true },
  { title: "Minhas Contas", url: "/accounts", icon: Wallet, end: false },
  { title: "Nova Conta", url: "/accounts/new", icon: PlusCircle, end: true },
  { title: "Regras", url: "/rules", icon: ScrollText, end: false },
  { title: "Calculadora de Risco", url: "/calculator", icon: Calculator, end: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
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
                      end={item.end}
                      className=""
                      activeClassName="border-l-2 border-primary"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span className="text-[13px]">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
