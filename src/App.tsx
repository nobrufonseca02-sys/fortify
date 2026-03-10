import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import fortifyLogo from "@/assets/fortify-eagle.png";
import AuthPage from "./pages/AuthPage";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import AccountRules from "./pages/AccountRules";
import AccountDashboard from "./pages/AccountDashboard";
import RuleManager from "./pages/RuleManager";
import Performance from "./pages/Performance";
import SettingsPage from "./pages/SettingsPage";
import AdminPage from "./pages/AdminPage";
import CreateAccount from "./pages/CreateAccount";
import PropFirmLibrary from "./pages/PropFirmLibrary";
import AccountHistory from "./pages/AccountHistory";
import MT5Connections from "./pages/MT5Connections";
import MT5Dashboard from "./pages/MT5Dashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <img src={fortifyLogo} alt="Fortify" className="w-12 h-12 animate-pulse invert mix-blend-screen" />
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/accounts/new" element={<CreateAccount />} />
        <Route path="/accounts/:id" element={<AccountDashboard />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/rules" element={<AccountRules />} />
        <Route path="/rules/manage" element={<RuleManager />} />
        <Route path="/library" element={<PropFirmLibrary />} />
        <Route path="/history" element={<AccountHistory />} />
        <Route path="/mt5" element={<MT5Connections />} />
        <Route path="/mt5/:connectionId" element={<MT5Dashboard />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

function AuthGuard() {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (session) return <Navigate to="/" replace />;
  return <AuthPage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthGuard />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>

        <a
          className="whatsapp-fab"
          href="https://wa.me/5521994566198"
          target="_blank"
          rel="noreferrer"
          aria-label="Falar no WhatsApp"
          title="Falar no WhatsApp"
        >
          <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
            <path
              fill="currentColor"
              d="M19.11 17.59c-.27-.14-1.58-.78-1.83-.87-.25-.09-.43-.14-.61.14-.18.27-.7.87-.86 1.05-.16.18-.32.2-.59.07-.27-.14-1.14-.42-2.17-1.34-.8-.71-1.34-1.6-1.5-1.87-.16-.27-.02-.41.12-.55.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.48-.84-2.03-.22-.53-.45-.46-.61-.47l-.52-.01c-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.27s.98 2.64 1.11 2.82c.14.18 1.92 2.93 4.65 4.11.65.28 1.16.44 1.56.56.65.21 1.24.18 1.71.11.52-.08 1.58-.64 1.8-1.26.22-.62.22-1.15.16-1.26-.07-.11-.25-.18-.52-.32z"
            />
            <path
              fill="currentColor"
              d="M16.04 5.33c-5.86 0-10.62 4.74-10.62 10.57 0 1.86.5 3.68 1.46 5.29L5.33 26.67l5.66-1.48c1.56.85 3.32 1.3 5.05 1.3 5.86 0 10.62-4.74 10.62-10.57S21.9 5.33 16.04 5.33zm0 19.33c-1.6 0-3.17-.43-4.53-1.25l-.32-.19-3.36.88.9-3.27-.21-.34a8.71 8.71 0 0 1-1.35-4.57c0-4.82 3.95-8.74 8.87-8.74s8.87 3.92 8.87 8.74-3.95 8.74-8.87 8.74z"
            />
          </svg>
        </a>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
