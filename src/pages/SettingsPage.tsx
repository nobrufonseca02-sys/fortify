import { useAuth } from "@/hooks/useAuth";
import { LogOut, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";

const SettingsPage = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">Configurações</h1>
        <p className="text-xs text-muted-foreground">Gerencie sua conta e preferências.</p>
      </div>

      {/* Profile */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Perfil</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Nome</p>
            <p className="text-sm text-foreground font-medium">
              {user?.user_metadata?.full_name || "Não definido"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">E-mail</p>
            <p className="text-sm text-foreground font-mono">{user?.email || "—"}</p>
          </div>
        </div>
      </div>

      {/* Preferences placeholder */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preferências</h2>
        </div>
        <p className="text-sm text-muted-foreground">Notificações, idioma e integrações em breve.</p>
      </div>

      {/* Logout */}
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Sair da conta</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Encerrar sessão atual no Fortify.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/30 text-destructive hover:bg-destructive/10 gap-2"
            onClick={() => signOut()}
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
