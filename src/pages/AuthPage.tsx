import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import fortifyIcon from "@/assets/brand/fortify-f-standalone-white.svg";
import { Shield, Lock, Mail, User, ArrowRight, Eye, EyeOff, ChevronRight, CheckCircle2 } from "lucide-react";

type AuthMode = "login" | "signup" | "forgot";

function AuthBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden bg-black" aria-hidden="true">
      <video
        className="absolute inset-0 h-full w-full object-cover object-center"
        src="/backgrounds/fortify-blackhole-auth.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_0%,transparent_36%,rgba(0,0,0,0.24)_58%,rgba(0,0,0,0.86)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.86)_0%,rgba(0,0,0,0.18)_35%,rgba(0,0,0,0.1)_52%,rgba(0,0,0,0.58)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black via-black/75 to-transparent" />
    </div>
  );
}

function GoogleMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.03h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.43Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.34l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.41 13.99A6 6 0 0 1 6.1 12c0-.69.11-1.36.31-1.99V7.42H3.06A10 10 0 0 0 2 12c0 1.61.39 3.13 1.06 4.58l3.35-2.59Z" />
      <path fill="#EA4335" d="M12 5.89c1.47 0 2.78.5 3.82 1.49l2.87-2.87C16.95 2.9 14.7 2 12 2a10 10 0 0 0-8.94 5.42l3.35 2.59C7.2 7.65 9.4 5.89 12 5.89Z" />
    </svg>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const authCardRef = useRef<HTMLDivElement | null>(null);
  const supportWhatsAppUrl =
    "https://wa.me/5521994177491?text=Ol%C3%A1%2C%20preciso%20de%20suporte%20no%20Fortify.";

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

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    setGoogleLoading(false);
    if (error) {
      toast({
        title: "Login com Google ainda não está configurado.",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const choosePaidPlan = () => {
    window.sessionStorage.setItem("fortify_intended_plan", "pro_monthly");
    window.sessionStorage.setItem("intended_plan_slug", "pro_monthly");
    setMode("signup");
  };

  const openPlans = () => {
    navigate("/pricing");
  };

  const focusLoginCard = () => {
    setMode("login");
    authCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      document.getElementById("email")?.focus();
    }, 250);
  };

  const bullets = [
    "Controle de limite diário",
    "Monitoramento de drawdown",
    "Alertas para regras críticas",
    "Calculadora de risco integrada",
    "TradingView integrado para análise gráfica",
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030712] text-white">
      <AuthBackground />

      <div className="fixed left-4 top-4 z-20 flex items-center gap-3 sm:left-7 sm:top-6">
        <img src={fortifyIcon} alt="Fortify" className="h-10 w-10 object-contain opacity-95 sm:h-12 sm:w-12" />
        <div className="flex flex-col leading-none">
          <span className="text-lg font-black uppercase tracking-[0.24em] text-white sm:text-2xl">FORTIFY</span>
          <span className="mt-1 text-[9px] font-mono uppercase tracking-[0.18em] text-cyan-100/70 sm:text-[11px]">
            Sistema de gestão de risco
          </span>
        </div>
      </div>

      <div className="fixed right-4 top-16 z-20 flex items-center gap-2 sm:right-7 sm:top-6">
        <a
          href={supportWhatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-white/12 bg-white/[0.055] px-4 py-2 text-xs font-semibold text-white backdrop-blur-xl transition-colors hover:border-cyan-200/30 hover:bg-cyan-200/10 sm:px-5 sm:text-sm"
        >
          Suporte
        </a>
        <button
          type="button"
          onClick={focusLoginCard}
          className="rounded-full border border-white/12 bg-white/[0.055] px-4 py-2 text-xs font-semibold text-white backdrop-blur-xl transition-colors hover:border-cyan-200/30 hover:bg-cyan-200/10 sm:px-5 sm:text-sm"
        >
          Login
        </button>
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-5 pb-12 pt-36 sm:px-8 sm:pt-36 lg:px-12 lg:pt-28">
        <section className="mx-auto flex w-full max-w-[900px] flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.12 }}
            className="mb-8"
          >
            <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-cyan-100/70">Risk command center</p>
            <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-black leading-tight text-white sm:text-6xl lg:text-7xl">
              Proteja sua conta antes do próximo trade.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-slate-200 sm:text-lg sm:leading-8">
              Monitore risco, drawdown, regras críticas e posições MT5 em um único painel.
            </p>
          </motion.div>

          <div className="mb-8 grid w-full max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {bullets.map((bullet, index) => (
              <motion.div
                key={bullet}
                className="flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-center text-xs font-medium leading-5 text-slate-100 backdrop-blur-md sm:text-sm lg:text-xs"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.22 + index * 0.06 }}
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-200" />
                {bullet}
              </motion.div>
            ))}
          </div>

          <motion.div
            ref={authCardRef}
            className="relative w-full max-w-[460px] overflow-hidden rounded-[1.75rem] border border-white/12 bg-slate-950/82 p-6 text-left shadow-2xl shadow-cyan-950/35 backdrop-blur-xl sm:p-8"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.28 }}
          >
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-white">
                    {mode === "login" && "Entre no Fortify"}
                    {mode === "signup" && "Criar conta"}
                    {mode === "forgot" && "Recuperar senha"}
                  </h2>
                  <p className="text-sm text-slate-400 mt-1.5">
                    {mode === "login" && "Monitore risco, drawdown e regras críticas antes do próximo trade."}
                    {mode === "signup" && "Comece a monitorar suas contas agora"}
                    {mode === "forgot" && "Enviaremos um link para redefinir sua senha"}
                  </p>
                </div>

                {mode !== "forgot" && (
                  <div className="mb-5 space-y-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGoogleLogin}
                      disabled={googleLoading || loading}
                      aria-label="Continuar com Google"
                      className="w-full gap-2 border-white/10 bg-white/[0.055] text-white hover:bg-white/10 hover:text-white"
                    >
                      <GoogleMark />
                      {googleLoading ? "Abrindo Google..." : "Continuar com Google"}
                    </Button>
                    <div className="flex items-center gap-3">
                      <span className="h-px flex-1 bg-white/10" />
                      <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">ou entre com e-mail</span>
                      <span className="h-px flex-1 bg-white/10" />
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === "signup" && (
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs text-slate-400 font-medium">Nome completo</Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          id="name"
                          className="border-white/10 bg-white/[0.055] pl-10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-300/30"
                          placeholder="Seu nome"
                          value={form.name}
                          onChange={(e) => updateField("name", e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs text-slate-400 font-medium">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input
                        id="email"
                        type="email"
                        className="border-white/10 bg-white/[0.055] pl-10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-300/30"
                        placeholder="seu@email.com"
                        value={form.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {mode !== "forgot" && (
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-xs text-slate-400 font-medium">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          className="border-white/10 bg-white/[0.055] pl-10 pr-10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-300/30"
                          placeholder="••••••••"
                          value={form.password}
                          onChange={(e) => updateField("password", e.target.value)}
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-white"
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
                        className="text-xs text-cyan-200/85 transition-colors hover:text-cyan-100"
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
                    className="w-full gap-2 group bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                  >
                    {loading ? (
                      <motion.div
                        className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <>
                        {mode === "login" && "Entrar"}
                        {mode === "signup" && "Criar conta"}
                        {mode === "forgot" && "Enviar link"}
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="pt-4 text-center">
                  {mode === "login" && (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-400">
                        Não tem conta?{" "}
                        <button onClick={() => setMode("signup")} className="text-cyan-200 font-semibold transition-colors hover:text-cyan-100">
                          Criar conta grátis
                        </button>
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={choosePaidPlan}>Assinar Fortify</Button>
                        <Button type="button" variant="outline" size="sm" onClick={openPlans}>Ver planos</Button>
                      </div>
                    </div>
                  )}
                  {mode === "signup" && (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-400">
                        Já tem conta?{" "}
                        <button onClick={() => setMode("login")} className="text-cyan-200 font-semibold transition-colors hover:text-cyan-100">
                          Já tenho conta
                        </button>
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setMode("signup")}>Começar pelo beta</Button>
                        <Button type="button" variant="outline" size="sm" onClick={openPlans}>Ver planos</Button>
                      </div>
                    </div>
                  )}
                  {mode === "forgot" && (
                    <button onClick={() => setMode("login")} className="text-sm text-cyan-200 font-semibold transition-colors hover:text-cyan-100 flex items-center gap-1 mx-auto">
                      <ChevronRight className="h-3 w-3 rotate-180" />
                      Voltar ao login
                    </button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          <motion.div
            className="mt-6 flex items-center justify-center gap-6 text-[10px] text-slate-500 uppercase tracking-wider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <span className="flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> Criptografia SSL
            </span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
            <span className="flex items-center gap-1.5">
              <Shield className="h-3 w-3" /> Dados protegidos
            </span>
          </motion.div>

          <motion.p
            className="mt-8 text-center text-[11px] text-slate-500 font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
          >
            &copy; 2026 Fortify. Controle total sobre suas operações.
          </motion.p>
        </section>
      </main>
    </div>
  );
}
