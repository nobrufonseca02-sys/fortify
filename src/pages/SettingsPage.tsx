import { useAuth } from "@/hooks/useAuth";
import { LogOut, Settings, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const SettingsPage = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-lg font-black text-foreground">Configurações</h1>
        <p className="text-xs text-muted-foreground">Gerencie sua conta e preferências.</p>
      </motion.div>

      {/* Profile */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-lg shadow-background/30">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Perfil</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">Nome</p>
            <p className="text-sm text-foreground font-semibold">
              {user?.user_metadata?.full_name || "Nao definido"}
            </p>
          </div>
          <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">E-mail</p>
            <p className="text-sm text-foreground font-mono">{user?.email || "—"}</p>
          </div>
        </div>
      </motion.div>

      {/* Preferences */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-border bg-card p-6 shadow-lg shadow-background/30">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preferencias</h2>
        </div>
        <p className="text-sm text-muted-foreground">Notificacoes, idioma e integracoes em breve.</p>
      </motion.div>

      {/* Logout */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl border border-destructive/15 bg-destructive/5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">Sair da conta</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Encerrar sessao atual no Fortify.</p>
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
      </motion.div>
    </div>
  );
};

export default SettingsPage;
