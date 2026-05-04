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
import RiskCalculator from "./pages/RiskCalculator";

import SessionPlanner from "./pages/SessionPlanner";
import PostSessionReview from "./pages/PostSessionReview";
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
        <Route path="/calculator" element={<RiskCalculator />} />
        
        <Route path="/planner" element={<SessionPlanner />} />
        <Route path="/review" element={<PostSessionReview />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/accounts/new" element={<CreateAccount />} />
        <Route path="/accounts/:id" element={<AccountDashboard />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/rules" element={<AccountRules />} />
        <Route path="/rules/manage" element={<RuleManager />} />
        <Route path="/library" element={<PropFirmLibrary />} />
        <Route path="/history" element={<AccountHistory />} />
        <Route path="/integrations/mt5" element={<Navigate to="/mt5" replace />} />
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
