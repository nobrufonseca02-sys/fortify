import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
            <Route path="/mt5" element={<MT5Dashboard />} />
            <Route path="/mt5/connect" element={<ConnectMT5 />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
