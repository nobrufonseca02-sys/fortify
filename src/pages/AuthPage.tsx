import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { GlobeAnimation } from "@/components/GlobeAnimation";
import fortifyLogo from "@/assets/fortify-eagle.png";
import { Shield, Lock, Mail, User, ArrowRight, Eye, EyeOff, ChevronRight, CheckCircle2 } from "lucide-react";

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

  const bullets = [
    "Controle quanto ainda pode perder hoje",
    "Veja a regra mais próxima de violação",
    "Monitore múltiplas contas em um único lugar",
    "Tome decisões com clareza antes do próximo trade",
  ];

  return (
    <div className="min-h-screen relative flex bg-background">
      {/* Subtle grid overlay */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      
      {/* Radial glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full bg-primary/[0.03] blur-[100px] pointer-events-none" />

      {/* LEFT — Copy */}
      <div className="hidden lg:flex flex-col justify-between w-[55%] relative z-10 p-12 xl:p-16">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center gap-3">
            <img src={fortifyLogo} alt="Fortify" className="w-10 h-10 invert mix-blend-screen opacity-90" />
            <h1 className="text-lg font-bold text-foreground tracking-[0.12em] uppercase">Fortify</h1>
          </div>
        </motion.div>

        <div className="flex-1 flex flex-col justify-center max-w-xl">
          <motion.h2
            className="text-4xl xl:text-5xl font-black leading-[1.1] text-foreground mb-5"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="text-gradient-primary">Proteja</span> sua conta antes que a regra te elimine.
          </motion.h2>

          <motion.p
            className="text-base text-muted-foreground mb-10 leading-relaxed max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            O FORTIFY monitora risco, drawdown e regras de prop firms em um painel claro, profissional e feito para decisao rapida.
          </motion.p>

          <div className="space-y-4">
            {bullets.map((b, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
              >
                <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                </div>
                <p className="text-sm text-foreground/80">{b}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.p
          className="text-[11px] text-muted-foreground/50 font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          &copy; 2026 Fortify. Controle total sobre suas operacoes.
        </motion.p>
      </div>

      {/* RIGHT — Globe + Auth form */}
      <div className="flex-1 flex items-center justify-center relative z-10 p-6 lg:p-12">
        {/* Globe behind form (desktop only) */}
        <div className="hidden lg:block absolute inset-0 opacity-40 pointer-events-none overflow-hidden">
          <GlobeAnimation />
        </div>

        <motion.div
          className="w-full max-w-[420px] relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <img src={fortifyLogo} alt="Fortify" className="w-8 h-8 invert mix-blend-screen" />
            <h1 className="text-lg font-bold text-foreground tracking-[0.12em] uppercase">Fortify</h1>
          </div>

          {/* Auth card */}
          <div className="card-premium rounded-2xl p-8 space-y-6 backdrop-blur-sm">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-foreground">
                    {mode === "login" && "Entrar no painel"}
                    {mode === "signup" && "Criar conta"}
                    {mode === "forgot" && "Recuperar senha"}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    {mode === "login" && "Acesse seu painel de monitoramento"}
                    {mode === "signup" && "Comece a monitorar suas contas agora"}
                    {mode === "forgot" && "Enviaremos um link para redefinir sua senha"}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === "signup" && (
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs text-muted-foreground font-medium">Nome completo</Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                        <Input
                          id="name"
                          className="pl-10"
                          placeholder="Seu nome"
                          value={form.name}
                          onChange={(e) => updateField("name", e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs text-muted-foreground font-medium">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input
                        id="email"
                        type="email"
                        className="pl-10"
                        placeholder="seu@email.com"
                        value={form.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {mode !== "forgot" && (
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-xs text-muted-foreground font-medium">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          className="pl-10 pr-10"
                          placeholder="••••••••"
                          value={form.password}
                          onChange={(e) => updateField("password", e.target.value)}
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
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
                        className="text-xs text-primary/80 hover:text-primary transition-colors"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    variant="premium"
                    size="lg"
                    className="w-full gap-2 group"
                  >
                    {loading ? (
                      <motion.div
                        className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <>
                        {mode === "login" && "Entrar no painel"}
                        {mode === "signup" && "Criar Conta"}
                        {mode === "forgot" && "Enviar Link"}
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="pt-4 text-center">
                  {mode === "login" && (
                    <p className="text-sm text-muted-foreground">
                      Nao tem conta?{" "}
                      <button onClick={() => setMode("signup")} className="text-primary font-semibold hover:text-primary/80 transition-colors">
                        Criar conta
                      </button>
                    </p>
                  )}
                  {mode === "signup" && (
                    <p className="text-sm text-muted-foreground">
                      Ja tem conta?{" "}
                      <button onClick={() => setMode("login")} className="text-primary font-semibold hover:text-primary/80 transition-colors">
                        Entrar
                      </button>
                    </p>
                  )}
                  {mode === "forgot" && (
                    <button onClick={() => setMode("login")} className="text-sm text-primary font-semibold hover:text-primary/80 transition-colors flex items-center gap-1 mx-auto">
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
            className="mt-6 flex items-center justify-center gap-6 text-[10px] text-muted-foreground/40 uppercase tracking-wider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <span className="flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> SSL Encryption
            </span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
            <span className="flex items-center gap-1.5">
              <Shield className="h-3 w-3" /> Data Protected
            </span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
