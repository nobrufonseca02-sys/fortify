import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { toast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha atualizada!", description: "Você já pode fazer login com a nova senha." });
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <AnimatedBackground />
      <div className="glass rounded-2xl p-8 w-full max-w-md relative z-10 space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground">Redefinir Senha</h2>
          <p className="text-sm text-muted-foreground mt-1">Insira sua nova senha abaixo</p>
        </div>
        {ready ? (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Nova senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  className="pl-10 bg-background/50 border-border/50 h-11"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11">
              {loading ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground text-center">Link inválido ou expirado.</p>
        )}
      </div>
    </div>
  );
}
