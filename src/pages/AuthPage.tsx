import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FortifyMark } from "@/components/brand/FortifyMark";
import { trackSignUp } from "@/lib/analytics";
import { Lock, Mail, User, ArrowRight, Eye, EyeOff, ChevronRight, Loader2, LogIn, UserPlus, KeyRound } from "lucide-react";
import { firmLogos } from "@/data/firmLogos";

type AuthMode = "login" | "signup" | "forgot";

// Same real, first-party logo set the prop-firm library carousel uses (see
// src/data/firmLogos.ts) — duplicated once so the strip can loop seamlessly.
const firmLogoEntries = Object.entries(firmLogos) as [string, string][];
const marqueeLogos = [...firmLogoEntries, ...firmLogoEntries];

// Proporção acima de ~6:1 não cabe na caixa padrão sem virar um fio. O arquivo
// da FundedNext é 898x87 (10,32:1) e não tem UMA coluna de margem para aparar —
// medido no bitmap. Caixa mais larga para a altura subir de 12px para 16px, que
// é o melhor possível sem um asset compacto da marca.
const WIDE_MARKS = new Set(["FundedNext"]);

// Static comet-streak background from the reference layout, self-hosted at
// public/backgrounds/auth-comet.jpg instead of hotlinked from the demo's own
// asset host, so this page never depends on a third party's storage bucket.
function AuthBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden bg-background" aria-hidden="true">
      <img
        src="/backgrounds/auth-comet.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 ring-1 ring-black/30" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background via-background/55 to-transparent" />
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

// The same real prop-firm logos shown in the library's coverflow carousel,
// scrolling continuously in a strip pinned to the bottom of the viewport —
// fixed positioning (like the header) so it never adds page height, and
// always reads as "the end of the page" regardless of card height/mode.
// No chip/tile behind each mark (the user asked for bare logos, not the
// PropFirmLibrary carousel's boxed treatment) — a soft white drop-shadow
// keeps the darker marks readable against the background image without
// drawing a visible rectangle. FundingPips' source file is a flat JPEG with
// no transparency, so that one still renders as a small square regardless —
// an artifact of that asset, not something CSS can undo.
//
// A faixa translúcida com blur fica; o que saiu foi só a borda de cima, que
// desenhava uma linha separando a tira do resto da tela.
function FirmLogoMarquee({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-20 bg-background/45 py-3 backdrop-blur-md">
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className={`flex w-max items-center gap-6 ${reduceMotion ? "" : "animate-marquee"}`}>
          {marqueeLogos.map(([name, src], index) => (
            <img
              key={`${name}-${index}`}
              src={src}
              alt={name}
              /* Caixa IGUAL para toda marca, com object-contain: é o que padroniza.
                 Só travar a altura não resolvia — com a proporção indo de 1:1
                 (BrightFunded, FundingPips, NP Future) a 10,3:1 (FundedNext), a
                 mesma altura de 24px produzia larguras de 24px a 248px, 10x de
                 diferença. Agora cada logo ocupa 120x28 e se ajusta dentro disso:
                 wordmark largo limita pela largura, marca quadrada pela altura. */
              className={`h-7 ${WIDE_MARKS.has(name) ? "w-[168px]" : "w-[120px]"} shrink-0 object-contain [filter:drop-shadow(0_0_1px_rgba(255,255,255,0.5))_drop-shadow(0_0_5px_rgba(255,255,255,0.2))]`}
            />
          ))}
        </div>
      </div>
    </footer>
  );
}

/**
 * Provedores externos que o projeto Supabase tem LIGADOS.
 *
 * Existe porque `signInWithOAuth` não devolve erro quando o provedor está
 * desligado: ele monta a URL de autorização e o navegador segue, e quem
 * clicava caía num 400 do Supabase. O toast de "ainda não está configurado"
 * logo abaixo nunca disparava — o erro acontece depois de sair da página.
 *
 * Lido do endpoint público de settings, então no dia em que o Google for
 * habilitado no painel o botão volta sozinho, sem tocar no código. Enquanto a
 * resposta não chega o botão fica escondido, para não piscar um caminho que
 * pode não existir.
 */
function useProvedoresExternos() {
  const [provedores, setProvedores] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL?.trim();
    const chave = (
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
    )?.trim();
    if (!url || !chave) return;

    let ativo = true;
    fetch(`${url}/auth/v1/settings`, { headers: { apikey: chave } })
      .then((r) => (r.ok ? r.json() : null))
      .then((dados) => {
        if (ativo && dados) setProvedores(dados.external ?? {});
      })
      .catch(() => {
        // Sem resposta, fica só o login por e-mail. Melhor um caminho a menos
        // que um botão que leva a uma tela de erro.
      });
    return () => {
      ativo = false;
    };
  }, []);

  return provedores;
}

export default function AuthPage() {
  const shouldReduceMotion = useReducedMotion();
  const { search } = useLocation();
  const provedoresExternos = useProvedoresExternos();

  // `?intent=signup` abre direto o cadastro. É para onde apontam os CTAs
  // "Começar agora" e "Criar conta" da landing: quem chega por ali ainda não
  // tem conta, e cair num formulário de login pedindo senha é um muro.
  // Só o valor `signup` abre o cadastro; qualquer outro intent cai no login.
  const [mode, setMode] = useState<AuthMode>(() =>
    new URLSearchParams(search).get("intent") === "signup" ? "signup" : "login",
  );
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const supportWhatsAppUrl =
    "https://wa.me/5521994177491?text=Ol%C3%A1%2C%20preciso%20de%20suporte%20no%20Fortify.";

  // Motion helpers — collapse offsets/durations to ~0 when the user prefers
  // reduced motion. The global CSS rule in index.css only catches
  // CSS-`animation`-based motion, not Framer/Motion's WAAPI-driven
  // transitions, so this page opts in explicitly per WCAG 2.2.
  const rise = (px: number) => (shouldReduceMotion ? 0 : px);
  const dur = (seconds: number) => (shouldReduceMotion ? 0.01 : seconds);
  const wait = (seconds: number) => (shouldReduceMotion ? 0 : seconds);

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
      trackSignUp();
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

  // The header's CTA pill mirrors the reference banner's single highlighted
  // nav action — here it always offers the *other* mode, so it also serves
  // as the way back to login from the forgot-password screen.
  const headerCtaMode: AuthMode = mode === "login" ? "signup" : "login";
  const headerCtaLabel = mode === "login" ? "Criar conta" : "Entrar";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <AuthBackground />

      <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between px-5 pt-4 sm:px-8 sm:pt-6 lg:px-16">
        <div className="flex items-center gap-3">
          <FortifyMark className="h-9 w-9 shrink-0 text-foreground opacity-95 sm:h-10 sm:w-10" />
          <div className="hidden flex-col leading-none sm:flex">
            <span className="text-sm font-bold uppercase tracking-[0.14em] text-foreground">Fortify</span>
            <span className="mt-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              Sistema de gestão de risco
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-border bg-background/50 p-1 backdrop-blur-md">
          <a
            href={supportWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground sm:px-4 sm:text-sm"
          >
            Suporte
          </a>
          <button
            type="button"
            onClick={() => setMode(headerCtaMode)}
            className="pill-btn-primary flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs sm:px-4 sm:text-sm"
          >
            {headerCtaLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 pb-24 pt-20 sm:px-8">
        <motion.div
          layout={!shouldReduceMotion}
          initial={{ opacity: 0, y: rise(20) }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur(0.6), delay: wait(0.1) }}
          className="relative w-full max-w-sm overflow-hidden rounded-lg border border-border bg-background/60 p-6 shadow-lg backdrop-blur-md sm:p-7"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: rise(10) }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: rise(-10) }}
              transition={{ duration: dur(0.25) }}
              className="flex flex-col items-center text-center"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-background/80">
                {mode === "login" && <LogIn className="h-5 w-5 text-foreground" />}
                {mode === "signup" && <UserPlus className="h-5 w-5 text-foreground" />}
                {mode === "forgot" && <KeyRound className="h-5 w-5 text-foreground" />}
              </div>

              <h2 className="text-xl font-bold text-foreground">
                {mode === "login" && "Entrar no Fortify"}
                {mode === "signup" && "Criar conta grátis"}
                {mode === "forgot" && "Recuperar senha"}
              </h2>
              <p className="mt-1.5 max-w-[260px] text-sm text-muted-foreground">
                {mode === "login" && "Acesse o painel de risco da sua conta."}
                {mode === "signup" && "Comece a monitorar as regras da sua prop firm agora."}
                {mode === "forgot" && "Enviaremos um link de redefinição para o seu e-mail."}
              </p>

              <form onSubmit={handleSubmit} className="mt-6 w-full space-y-3 text-left">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs text-muted-foreground font-medium">Nome completo</Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
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
                      className="text-xs text-primary/85 transition-colors hover:text-primary"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="pill-btn pill-btn-primary w-full justify-center gap-2 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {mode === "login" && "Entrar"}
                      {mode === "signup" && "Criar conta"}
                      {mode === "forgot" && "Enviar link"}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {mode !== "forgot" && provedoresExternos?.google && (
                <>
                  <div className="my-4 flex w-full items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">ou continue com</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading || loading}
                    className="pill-btn w-full justify-center gap-2 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
                    {googleLoading ? "Abrindo Google..." : "Continuar com Google"}
                  </button>
                </>
              )}

              <div className="pt-4 text-center">
                {mode === "login" && (
                  <p className="text-sm text-muted-foreground">
                    Não tem conta?{" "}
                    <button onClick={() => setMode("signup")} className="text-primary font-semibold transition-colors hover:text-primary/80">
                      Criar conta grátis
                    </button>
                  </p>
                )}
                {mode === "signup" && (
                  <p className="text-sm text-muted-foreground">
                    Já tem conta?{" "}
                    <button onClick={() => setMode("login")} className="text-primary font-semibold transition-colors hover:text-primary/80">
                      Já tenho conta
                    </button>
                  </p>
                )}
                {mode === "forgot" && (
                  <button onClick={() => setMode("login")} className="text-sm text-primary font-semibold transition-colors hover:text-primary/80 flex items-center gap-1 mx-auto">
                    <ChevronRight className="h-3 w-3 rotate-180" />
                    Voltar ao login
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </main>

      <FirmLogoMarquee reduceMotion={!!shouldReduceMotion} />
    </div>
  );
}
