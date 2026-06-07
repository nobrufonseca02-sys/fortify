import { CheckCircle2, Circle, CreditCard, LayoutDashboard, Link2, RefreshCw, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAccountsStore } from '@/hooks/useAccountsStore';
import { useSubscriptionPlan } from '@/hooks/useSubscriptionPlan';

export function SaaSOnboardingChecklist() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { accounts } = useAccountsStore();
  const { hasActivePlan, activeAccountCount } = useSubscriptionPlan();

  const hasRules = accounts.some((account) => Boolean(account.ruleSetId));
  const hasSync = accounts.some((account) => Boolean(account.mt5LastSyncAt));
  const hasDashboard = hasRules && hasSync;

  const items = [
    { label: 'Criar conta Fortify', done: Boolean(user?.id), icon: LayoutDashboard, action: '/settings' },
    { label: 'Escolher plano ou beta', done: hasActivePlan, icon: CreditCard, action: '/settings' },
    { label: 'Conectar MT5 próprio', done: activeAccountCount > 0, icon: Link2, action: '/mt5' },
    { label: 'Configurar regras', done: hasRules, icon: Shield, action: accounts[0]?.id ? `/accounts/${accounts[0].id}/rules` : '/accounts' },
    { label: 'Rodar primeiro sync', done: hasSync, icon: RefreshCw, action: accounts[0]?.id ? `/accounts/${accounts[0].id}` : '/mt5' },
    { label: 'Ver painel de risco', done: hasDashboard, icon: LayoutDashboard, action: accounts[0]?.id ? `/accounts/${accounts[0].id}` : '/dashboard' },
  ];

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Jornada do cliente Fortify</p>
        <p className="text-xs text-muted-foreground mt-1">
          Login Fortify abre o dashboard. Login, servidor e senha MT5 conectam apenas a conta de trading via backend seguro.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.action)}
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-left hover:border-primary/40 transition-colors"
            >
              {item.done ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
              <Icon className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-foreground">{item.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
