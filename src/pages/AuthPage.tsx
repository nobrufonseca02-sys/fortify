import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import fortifyLogo from "@/assets/fortify-logo.png";
import { Shield, TrendingUp, BarChart3, Lock, Mail, User, ArrowRight, Eye, EyeOff, ChevronRight } from "lucide-react";

type AuthMode = "login" | "signup" | "forgot";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "" });

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: form.name },
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Conta criada!", description: "Verifique seu e-mail para confirmar o cadastro." });
      setMode("login");
    }
  };

  const handleForgot = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "E-mail enviado", description: "Verifique sua caixa de entrada para redefinir a senha." });
      setMode("login");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") handleLogin();
    else if (mode === "signup") handleSignup();
    else handleForgot();
  };

  const features = [
    { icon: Shield, title: "Controle de Risco", desc: "Monitore regras de prop firms em tempo real" },
    { icon: TrendingUp, title: "Performance", desc: "Acompanhe métricas e evolução da sua conta" },
    { icon: BarChart3, title: "Análise Inteligente", desc: "Dashboards completos com dados sincronizados" },
  ];

  return (
    <div className="min-h-screen relative flex">
      <AnimatedBackground />

      {/* LEFT — Branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 relative z-10 p-12">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center gap-4 mb-2">
            <img src={fortifyLogo} alt="Fortify" className="w-14 h-14 invert" />
            <h1 className="text-3xl font-bold text-foreground tracking-[0.08em]">FORTIFY</h1>
          </div>
        </motion.div>

        <div className="flex-1 flex flex-col justify-center max-w-lg">
          <motion.h2
            className="text-5xl font-extrabold leading-tight text-foreground mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Domine suas
            <br />
            <span className="text-gradient-primary">regras de risco.</span>
          </motion.h2>

          <motion.p
            className="text-lg text-muted-foreground mb-12 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            A plataforma completa para traders que operam em prop firms.
            Monitore, analise e proteja seu capital com inteligência.
          </motion.p>

          <div className="space-y-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="flex items-start gap-4 group"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 + i * 0.15 }}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.p
          className="text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          © 2026 Fortify. Controle total sobre suas operações.
        </motion.p>
      </div>

      {/* RIGHT — Auth form */}
      <div className="flex-1 flex items-center justify-center relative z-10 p-6 lg:p-12">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <img src={fortifyLogo} alt="Fortify" className="w-10 h-10 invert" />
            <h1 className="text-xl font-bold text-foreground tracking-[0.08em]">FORTIFY</h1>
          </div>

          {/* Glass card */}
          <div className="glass rounded-2xl p-8 space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-foreground">
                    {mode === "login" && "Bem-vindo de volta"}
                    {mode === "signup" && "Crie sua conta"}
                    {mode === "forgot" && "Recuperar senha"}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {mode === "login" && "Entre para acessar seu painel de controle"}
                    {mode === "signup" && "Comece a monitorar suas contas agora"}
                    {mode === "forgot" && "Enviaremos um link para redefinir sua senha"}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === "signup" && (
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs text-muted-foreground">Nome completo</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="name"
                          className="pl-10 bg-background/50 border-border/50 focus:border-primary/50 h-11"
                          placeholder="Seu nome"
                          value={form.name}
                          onChange={(e) => updateField("name", e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs text-muted-foreground">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        className="pl-10 bg-background/50 border-border/50 focus:border-primary/50 h-11"
                        placeholder="seu@email.com"
                        value={form.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {mode !== "forgot" && (
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-xs text-muted-foreground">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          className="pl-10 pr-10 bg-background/50 border-border/50 focus:border-primary/50 h-11"
                          placeholder="••••••••"
                          value={form.password}
                          onChange={(e) => updateField("password", e.target.value)}
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {mode === "login" && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 font-semibold text-sm gap-2 group relative overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {loading ? (
                        <motion.div
                          className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                      ) : (
                        <>
                          {mode === "login" && "Entrar"}
                          {mode === "signup" && "Criar Conta"}
                          {mode === "forgot" && "Enviar Link"}
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </span>
                  </Button>
                </form>

                <div className="pt-4 text-center">
                  {mode === "login" && (
                    <p className="text-sm text-muted-foreground">
                      Não tem conta?{" "}
                      <button onClick={() => setMode("signup")} className="text-primary font-medium hover:text-primary/80 transition-colors">
                        Criar conta grátis
                      </button>
                    </p>
                  )}
                  {mode === "signup" && (
                    <p className="text-sm text-muted-foreground">
                      Já tem conta?{" "}
                      <button onClick={() => setMode("login")} className="text-primary font-medium hover:text-primary/80 transition-colors">
                        Entrar
                      </button>
                    </p>
                  )}
                  {mode === "forgot" && (
                    <button onClick={() => setMode("login")} className="text-sm text-primary font-medium hover:text-primary/80 transition-colors flex items-center gap-1 mx-auto">
                      <ChevronRight className="h-3 w-3 rotate-180" />
                      Voltar ao login
                    </button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Trust indicators */}
          <motion.div
            className="mt-8 flex items-center justify-center gap-6 text-[10px] text-muted-foreground uppercase tracking-wider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <span className="flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> Criptografia SSL
            </span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <span className="flex items-center gap-1.5">
              <Shield className="h-3 w-3" /> Dados Protegidos
            </span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
