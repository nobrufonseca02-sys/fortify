import { useState } from "react";
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

const visualCards = [
  "Daily Loss",
  "Max Drawdown",
  "Floating P/L",
  "MT5 Sync",
  "Risk Score",
  "Prop Rules",
  "Open Positions",
  "Next Action",
];

const showcaseMetrics = [
  { label: "Fortify Score", value: "92", detail: "Zona segura", bar: "92%" },
  { label: "Daily Loss Buffer", value: "74%", detail: "Limite preservado", bar: "74%" },
  { label: "Drawdown Guard", value: "OK", detail: "Sem violação", bar: "66%" },
  { label: "MT5 Sync", value: "Live", detail: "Monitoramento ativo", bar: "88%" },
];

function AuthBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden bg-[#030712]" aria-hidden="true">
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes fortify-drift {
            0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
            50% { transform: translate3d(18px, -22px, 0) scale(1.03); }
          }
          @keyframes fortify-descend {
            0% { transform: translate3d(0, -45%, 0); }
            100% { transform: translate3d(0, 0, 0); }
          }
          @keyframes fortify-pulse-line {
            0%, 100% { opacity: .34; transform: scaleX(.82); }
            50% { opacity: .86; transform: scaleX(1); }
          }
        }
      `}</style>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_22%,rgba(56,189,248,0.16),transparent_34%),radial-gradient(circle_at_78%_36%,rgba(124,58,237,0.22),transparent_34%),linear-gradient(135deg,#030712_0%,#07111f_48%,#020617_100%)]" />
      <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(148,163,184,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.16)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="absolute left-[8%] top-[14%] h-[420px] w-[420px] rounded-full border border-cyan-300/10 bg-[conic-gradient(from_140deg,rgba(14,165,233,0.3),rgba(124,58,237,0.24),rgba(2,6,23,0),rgba(14,165,233,0.22))] blur-[1px] motion-safe:animate-[fortify-drift_12s_ease-in-out_infinite]" />
      <div className="absolute left-[12%] top-[20%] h-[310px] w-[310px] rounded-full border border-white/10 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.16),rgba(34,211,238,0.08)_32%,rgba(124,58,237,0.08)_54%,rgba(2,6,23,0)_72%)]" />
      <div className="absolute bottom-[-20%] right-[-8%] h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.16),transparent_64%)]" />
      <div className="absolute right-[5%] top-[-18%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.14),transparent_68%)]" />

      <div className="absolute left-[4%] top-0 hidden h-[150vh] w-64 motion-safe:animate-[fortify-descend_24s_linear_infinite] lg:block">
        {[...visualCards, ...visualCards].map((card, index) => (
          <div
            key={`${card}-${index}`}
            className="mb-4 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 shadow-2xl shadow-cyan-950/20 backdrop-blur"
            style={{ marginLeft: `${(index % 3) * 18}px` }}
          >
            <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-cyan-100/70">{card}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full origin-left rounded-full bg-gradient-to-r from-cyan-300 to-violet-300 motion-safe:animate-[fortify-pulse-line_3.5s_ease-in-out_infinite]"
                style={{ width: `${48 + (index % 5) * 9}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskShowcasePanel() {
  return (
    <motion.aside
      className="relative hidden min-h-[620px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl xl:block"
      initial={{ opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, delay: 0.25 }}
      aria-hidden="true"
    >
      <div className="absolute inset-x-10 top-8 h-56 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.22),rgba(124,58,237,0.12),transparent_70%)] blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-cyan-100/70">Risk Command Center</p>
            <h2 className="mt-2 text-2xl font-black text-white">Seu painel de risco para contas MT5.</h2>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
            <Shield className="h-5 w-5 text-cyan-100" />
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-slate-950/70 p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-slate-400">Fortify Score</p>
              <p className="mt-1 text-5xl font-black text-white">92</p>
            </div>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
              Seguro
            </span>
          </div>
          <div className="mt-5 grid grid-cols-7 gap-1">
            {Array.from({ length: 21 }).map((_, index) => (
              <span
                key={index}
                className={`h-9 rounded-md ${index < 18 ? "bg-cyan-300/80" : "bg-white/10"}`}
              />
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {showcaseMetrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{metric.label}</p>
                  <p className="mt-1 text-xs text-slate-400">{metric.detail}</p>
                </div>
                <span className="text-sm font-bold text-cyan-100">{metric.value}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300" style={{ width: metric.bar }} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">Próxima ação</p>
          <p className="mt-2 text-sm text-amber-50/85">Revisar exposição antes de aumentar lote.</p>
        </div>
      </div>
    </motion.aside>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
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

  const choosePaidPlan = () => {
    window.sessionStorage.setItem("fortify_intended_plan", "pro_monthly");
    window.sessionStorage.setItem("intended_plan_slug", "pro_monthly");
    setMode("signup");
  };

  const openPlans = () => {
    navigate("/pricing");
  };

  const bullets = [
    "Controle de limite diário",
    "Monitoramento de drawdown",
    "Alertas para regras críticas",
    "Calculadora de risco integrada",
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030712] text-white">
      <AuthBackground />

      <main className="relative z-10 grid min-h-screen items-center gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(420px,560px)_1fr] lg:px-12 xl:px-16">
        <section className="mx-auto w-full max-w-[520px]">
          <motion.div
            className="mb-8 flex items-center gap-3"
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
            <h1 className="mt-4 text-4xl font-black leading-tight text-white sm:text-5xl">Entre no Fortify</h1>
            <p className="mt-4 text-lg font-semibold text-cyan-100">Proteja sua conta antes do próximo trade.</p>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
              Monitore risco, drawdown, regras críticas e posições MT5 em um único painel.
            </p>
          </motion.div>

          <div className="mb-6 grid gap-2 sm:grid-cols-2">
            {bullets.map((bullet, index) => (
              <motion.div
                key={bullet}
                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-sm text-slate-200 backdrop-blur"
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
            className="relative overflow-hidden rounded-[1.75rem] border border-white/12 bg-slate-950/70 p-6 shadow-2xl shadow-cyan-950/35 backdrop-blur-xl sm:p-8"
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

        <RiskShowcasePanel />
      </main>
    </div>
  );
}
