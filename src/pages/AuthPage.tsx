import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes fortify-accretion-spin {
            from { transform: translate(-50%, -50%) rotate(0deg) scaleX(1.82) scaleY(.34); }
            to { transform: translate(-50%, -50%) rotate(360deg) scaleX(1.82) scaleY(.34); }
          }
          @keyframes fortify-accretion-counter {
            from { transform: translate(-50%, -50%) rotate(360deg) scaleX(1.46) scaleY(.24); }
            to { transform: translate(-50%, -50%) rotate(0deg) scaleX(1.46) scaleY(.24); }
          }
          @keyframes fortify-lensing-shimmer {
            0%, 100% { opacity: .68; filter: blur(13px); }
            50% { opacity: .9; filter: blur(17px); }
          }
          @keyframes fortify-outer-glow-breathe {
            0%, 100% { opacity: .58; filter: blur(42px); }
            50% { opacity: .88; filter: blur(56px); }
          }
          @keyframes fortify-star-shift {
            0%, 100% { transform: translate3d(0, 0, 0); opacity: .6; }
            50% { transform: translate3d(-12px, 10px, 0); opacity: .85; }
          }
        }
      `}</style>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(56,189,248,0.12),transparent_22%),radial-gradient(circle_at_46%_44%,rgba(251,191,36,0.08),transparent_30%),radial-gradient(circle_at_58%_34%,rgba(109,40,217,0.15),transparent_34%),linear-gradient(180deg,#000_0%,#020617_58%,#000_100%)]" />
      <div className="absolute inset-0 opacity-70 motion-safe:animate-[fortify-star-shift_18s_ease-in-out_infinite] [background-image:radial-gradient(circle_at_12%_18%,rgba(255,255,255,.75)_0_1px,transparent_1.5px),radial-gradient(circle_at_34%_72%,rgba(125,211,252,.75)_0_1px,transparent_1.5px),radial-gradient(circle_at_68%_24%,rgba(216,180,254,.7)_0_1px,transparent_1.5px),radial-gradient(circle_at_82%_78%,rgba(255,255,255,.5)_0_1px,transparent_1.5px)] [background-size:180px_180px,240px_240px,210px_210px,300px_300px]" />
      <div className="absolute left-1/2 top-[44%] h-[860px] w-[860px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.18),rgba(250,204,21,0.1)_22%,rgba(88,28,135,0.12)_38%,transparent_68%)] motion-safe:animate-[fortify-outer-glow-breathe_12s_ease-in-out_infinite]" />
      <div className="absolute left-1/2 top-[44%] h-[560px] w-[560px] rounded-full bg-[conic-gradient(from_24deg,transparent_0deg,rgba(14,165,233,0.08)_22deg,rgba(125,211,252,0.92)_54deg,rgba(255,247,237,0.98)_78deg,rgba(217,119,6,0.66)_112deg,rgba(30,64,175,0.48)_148deg,transparent_206deg,rgba(147,197,253,0.78)_252deg,rgba(250,204,21,0.8)_300deg,transparent_360deg)] blur-[1px] motion-safe:animate-[fortify-accretion-spin_64s_linear_infinite]" />
      <div className="absolute left-1/2 top-[44%] h-[470px] w-[470px] rounded-full bg-[conic-gradient(from_180deg,transparent_0deg,rgba(59,130,246,0.7)_40deg,rgba(255,255,255,0.95)_72deg,rgba(245,158,11,0.72)_108deg,transparent_170deg,rgba(56,189,248,0.6)_230deg,rgba(251,191,36,0.72)_290deg,transparent_360deg)] blur-md opacity-80 motion-safe:animate-[fortify-accretion-counter_90s_linear_infinite]" />
      <div className="absolute left-1/2 top-[44%] h-[760px] w-[150px] -translate-x-1/2 -translate-y-1/2 rotate-[-7deg] bg-[linear-gradient(180deg,transparent_0%,rgba(29,78,216,0.06)_10%,rgba(125,211,252,0.32)_31%,rgba(255,255,255,0.76)_47%,rgba(251,191,36,0.5)_56%,rgba(56,189,248,0.26)_70%,transparent_100%)] mix-blend-screen motion-safe:animate-[fortify-lensing-shimmer_8s_ease-in-out_infinite]" />
      <div className="absolute left-1/2 top-[44%] h-[640px] w-[78px] -translate-x-1/2 -translate-y-1/2 rotate-[4deg] bg-[linear-gradient(180deg,transparent_0%,rgba(6,182,212,0.16)_22%,rgba(255,255,255,0.56)_45%,rgba(217,119,6,0.34)_58%,rgba(14,165,233,0.18)_78%,transparent_100%)] blur-xl mix-blend-screen" />
      <div className="absolute left-1/2 top-[44%] h-[430px] w-[650px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,transparent_28%,rgba(250,250,250,0.12)_34%,rgba(125,211,252,0.28)_43%,rgba(251,191,36,0.24)_52%,rgba(15,23,42,0.2)_62%,transparent_72%)] blur-[1px]" />
      <div className="absolute left-1/2 top-[44%] h-[248px] w-[248px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#000_0%,#000_58%,rgba(0,0,0,0.98)_65%,rgba(15,23,42,0.82)_72%,transparent_78%)] shadow-[0_0_110px_46px_rgba(0,0,0,0.98),0_0_34px_2px_rgba(255,255,255,0.18),inset_0_0_90px_rgba(0,0,0,1)]" />
      <div className="absolute left-1/2 top-[44%] h-[276px] w-[276px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black via-black/75 to-transparent" />
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

      <button
        type="button"
        onClick={focusLoginCard}
        className="fixed right-5 top-5 z-20 rounded-full border border-white/12 bg-white/[0.055] px-5 py-2 text-sm font-semibold text-white backdrop-blur-xl transition-colors hover:border-cyan-200/30 hover:bg-cyan-200/10"
      >
        Login
      </button>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-5 py-20 sm:px-8 lg:px-12">
        <section className="mx-auto flex w-full max-w-[720px] flex-col items-center text-center">
          <motion.div
            className="mb-7 flex items-center gap-3"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65 }}
          >
            <img src={fortifyIcon} alt="Fortify" className="h-10 w-10 opacity-95" />
            <div className="flex flex-col leading-none">
              <span className="text-lg font-black uppercase tracking-[0.22em] text-white">FORTIFY</span>
              <span className="mt-1 text-[9px] font-mono uppercase tracking-[0.18em] text-cyan-100/60">Sistema de risco</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.12 }}
            className="mb-8"
          >
            <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-cyan-100/70">Risk command center</p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-white sm:text-6xl">Entre no Fortify</h1>
            <p className="mt-4 text-lg font-semibold text-cyan-100">Proteja sua conta antes do próximo trade.</p>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              Monitore risco, drawdown, regras críticas e posições MT5 em um único painel.
            </p>
          </motion.div>

          <div className="mb-6 grid w-full max-w-2xl gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {bullets.map((bullet, index) => (
              <motion.div
                key={bullet}
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-sm text-slate-200 backdrop-blur"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.22 + index * 0.06 }}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-200" />
                {bullet}
              </motion.div>
            ))}
          </div>

          <motion.div
            ref={authCardRef}
            className="relative w-full max-w-[460px] overflow-hidden rounded-[1.75rem] border border-white/12 bg-slate-950/72 p-6 text-left shadow-2xl shadow-cyan-950/35 backdrop-blur-xl sm:p-8"
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
