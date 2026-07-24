import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider, useAuth, type AuthStartupError } from "@/hooks/useAuth";
import fortifyIcon from "@/assets/brand/fortify-f-standalone-white.svg";
import { DatabaseZap, ExternalLink, Monitor, RefreshCw, Server } from "lucide-react";
import { MotionConfig } from "motion/react";
import { fortifyMotionConfig } from "@/lib/motion";

const AuthPage = lazy(() => import("./pages/AuthPage"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Accounts = lazy(() => import("./pages/Accounts"));
const AccountRuleManagement = lazy(() => import("./pages/AccountRuleManagement"));
const AccountDashboard = lazy(() => import("./pages/AccountDashboard"));
const RuleManager = lazy(() => import("./pages/RuleManager"));
const Performance = lazy(() => import("./pages/Performance"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const CreateAccount = lazy(() => import("./pages/CreateAccount"));
const PropFirmLibrary = lazy(() => import("./pages/PropFirmLibrary"));
const AccountHistory = lazy(() => import("./pages/AccountHistory"));
const MT5Connections = lazy(() => import("./pages/MT5Connections"));
const MT5Dashboard = lazy(() => import("./pages/MT5Dashboard"));
const RiskCalculator = lazy(() => import("./pages/RiskCalculator"));
const RuleEngineDemo = lazy(() => import("./pages/RuleEngineDemo"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function AuthLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <img src={fortifyIcon} alt="Fortify" className="w-12 h-12 animate-pulse" />
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Carregando...</p>
      </div>
    </div>
  );
}

function SupabaseStartupDiagnostic({
  error,
  onRetry,
}: {
  error: AuthStartupError;
  onRetry: () => void;
}) {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground flex items-center justify-center">
      <section className="w-full max-w-2xl rounded-lg border border-destructive/35 bg-card p-6 shadow-2xl shadow-black/30 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-destructive/35 bg-destructive/10">
            <DatabaseZap className="h-5 w-5 text-destructive" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-destructive">Falha de inicialização</p>
            <h1 className="mt-1 text-xl font-semibold sm:text-2xl">Não foi possível conectar ao Supabase.</h1>
          </div>
        </div>

        <div className="mt-6 space-y-3 text-sm leading-6 text-muted-foreground">
          <p>
            Verifique se o projeto Supabase está ativo e se as variáveis VITE_SUPABASE_URL e
            VITE_SUPABASE_ANON_KEY estão corretas.
          </p>
          <p>
            Neste projeto, a chave pública também pode estar configurada como
            VITE_SUPABASE_PUBLISHABLE_KEY.
          </p>
          <p className="font-medium text-foreground">
            Frontend e Gateway estão rodando, mas a autenticação depende do Supabase.
          </p>
          {error.host && (
            <p className="break-all text-xs text-muted-foreground">
              Host configurado: <span className="font-mono text-foreground">{error.host}</span>
            </p>
          )}
        </div>

        <div className="mt-6 divide-y divide-border rounded-md border border-border bg-background/50">
          <a
            href="http://localhost:8080"
            className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-muted/40"
          >
            <span className="flex items-center gap-3"><Monitor className="h-4 w-4 text-primary" />Frontend local</span>
            <span className="font-mono text-xs text-muted-foreground">localhost:8080</span>
          </a>
          <a
            href="http://localhost:3001/health"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-muted/40"
          >
            <span className="flex items-center gap-3"><Server className="h-4 w-4 text-primary" />Gateway health</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
          <a
            href="https://supabase.com/dashboard/projects"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-muted/40"
          >
            <span className="flex items-center gap-3"><DatabaseZap className="h-4 w-4 text-primary" />Verificar projeto no Supabase</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Nenhuma credencial ou chave é exibida nesta tela.
          </p>
          <Button type="button" onClick={onRetry} className="sm:min-w-36">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </section>
    </main>
  );
}

function ProtectedRoutes() {
  const { session } = useAuth();

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <AppLayout>
      <Suspense fallback={<AuthLoadingScreen />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/calculator" element={<Navigate to="/risk-calculator" replace />} />
          <Route path="/risk-calculator" element={<RiskCalculator />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/accounts/new" element={<CreateAccount />} />
          <Route path="/accounts/:id" element={<AccountDashboard />} />
          <Route path="/accounts/:accountId/rules" element={<AccountRuleManagement />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/rules" element={<Navigate to="/library" replace />} />
          <Route path="/rules/demo" element={<RuleEngineDemo />} />
          <Route path="/rules/manage" element={<RuleManager />} />
          <Route path="/library" element={<PropFirmLibrary />} />
          <Route path="/history" element={<AccountHistory />} />
          <Route path="/integrations/mt5" element={<Navigate to="/mt5" replace />} />
          <Route path="/mt5" element={<MT5Connections />} />
          <Route path="/mt5/:connectionId" element={<MT5Dashboard />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/adm" element={<AdminPage />} />
          <Route path="/admin" element={<Navigate to="/adm" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}

function PricingRoute() {
  const { session } = useAuth();
  if (session) {
    return (
      <AppLayout>
        <PricingPage />
      </AppLayout>
    );
  }
  return <PricingPage />;
}

function AuthGuard() {
  const { session } = useAuth();
  if (session) {
    const intendedPlan = window.sessionStorage.getItem('intended_plan_slug') || window.sessionStorage.getItem('fortify_intended_plan');
    if (intendedPlan) {
      return <Navigate to={`/pricing?checkoutPlan=${encodeURIComponent(intendedPlan)}`} replace />;
    }
    return <Navigate to="/" replace />;
  }
  return <AuthPage />;
}

function AppContent() {
  const { loading, startupError, retryStartup } = useAuth();

  if (loading) return <AuthLoadingScreen />;
  if (startupError) return <SupabaseStartupDiagnostic error={startupError} onRetry={retryStartup} />;

  return (
    <BrowserRouter>
      <Suspense fallback={<AuthLoadingScreen />}>
        <Routes>
          <Route path="/pricing" element={<PricingRoute />} />
          <Route path="/auth" element={<AuthGuard />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

const App = () => (
  <MotionConfig transition={fortifyMotionConfig} reducedMotion="user">
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </MotionConfig>
);

export default App;
