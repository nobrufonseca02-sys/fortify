import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target, Shield, AlertTriangle, TrendingUp, Calendar, Activity, Pause } from 'lucide-react';
import { AccountSelector } from '@/components/AccountSelector';
import { useAccountsStore } from '@/hooks/useAccountsStore';
import { MOCK_EVALUATIONS } from '@/data/mockData';
import { TradingAccount } from '@/types/fortify';

const fmt = (v: number) => `$${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

const ChallengeControl = () => {
  const { accounts } = useAccountsStore();
  const [selectedAccount, setSelectedAccount] = useState<TradingAccount>(accounts[0]);

  const evals = MOCK_EVALUATIONS.filter(e => e.tradingAccountId === selectedAccount?.id);
  const profitTarget = evals.find(e => e.rule.type === 'PROFIT_TARGET');
  const minDays = evals.find(e => e.rule.type === 'MIN_TRADING_DAYS');
  const consistency = evals.find(e => e.rule.type === 'CONSISTENCY_BEST_DAY_CAP');
  const dailyLoss = evals.find(e => e.rule.type === 'MAX_DAILY_LOSS');
  const maxLoss = evals.find(e => e.rule.type === 'MAX_TOTAL_LOSS') || evals.find(e => e.rule.type === 'TRAILING_MAX_LOSS');

  const balance = selectedAccount?.startBalance ?? 0;
  const equity = selectedAccount?.currentEquity ?? 0;
  const pnl = equity - balance;

  const targetValue = profitTarget?.limitValue ?? balance * 0.1;
  const currentProfit = Math.max(0, profitTarget?.currentValue ?? pnl);
  const remaining = Math.max(0, targetValue - currentProfit);
  const progressPct = targetValue > 0 ? Math.min(100, (currentProfit / targetValue) * 100) : 0;

  const daysCompleted = minDays?.currentValue ?? 0;
  const daysRequired = minDays?.limitValue ?? 0;
  const daysRemaining = Math.max(0, daysRequired - daysCompleted);

  const avgDailyNeeded = daysRemaining > 0 ? remaining / Math.max(daysRemaining, 5) : 0;

  const dailyRemaining = dailyLoss ? Math.max(0, dailyLoss.limitValue - dailyLoss.currentValue) : 0;
  const maxRemaining = maxLoss ? Math.max(0, maxLoss.limitValue - maxLoss.currentValue) : 0;

  // Challenge status
  const getStatus = () => {
    if (maxLoss && maxLoss.progressPct > 80) return { label: 'Pausar Operação', color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20', icon: Pause };
    if (dailyLoss && dailyLoss.progressPct > 60) return { label: 'Atenção', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', icon: AlertTriangle };
    if (progressPct >= 80) return { label: 'Quase Lá', color: 'text-success', bg: 'bg-success/10', border: 'border-success/20', icon: Target };
    return { label: 'No Caminho', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', icon: Shield };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  if (!selectedAccount) {
    return <div className="p-6 text-center text-muted-foreground">Nenhuma conta cadastrada.</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Challenge Control</h1>
        </div>
        <p className="text-xs text-muted-foreground">Acompanhe o progresso da sua challenge com foco em sobrevivência e aprovação.</p>
      </div>

      <AccountSelector accounts={accounts} selected={selectedAccount} onSelect={setSelectedAccount} />

      {/* Status Banner */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl border ${status.border} ${status.bg} p-6 flex items-center gap-4`}>
        <StatusIcon className={`w-8 h-8 ${status.color}`} />
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Status da Challenge</p>
          <p className={`text-2xl font-bold font-mono tracking-wider ${status.color}`}>{status.label}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {status.label === 'Pausar Operação' && 'Seu drawdown está muito próximo do limite. Proteja sua conta.'}
            {status.label === 'Atenção' && 'Limite diário sendo consumido. Reduza a exposição.'}
            {status.label === 'Quase Lá' && 'Você está próximo da meta. Mantenha a disciplina.'}
            {status.label === 'No Caminho' && 'Continue operando com consistência e proteção.'}
          </p>
        </div>
      </motion.div>

      {/* Progress to Target */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Meta de Lucro</p>
          <p className="font-mono text-sm font-bold text-foreground">{Math.round(progressPct)}%</p>
        </div>
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 1 }}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Lucro Atual</p>
            <p className={`font-mono font-bold text-lg ${currentProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(currentProfit)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Faltam</p>
            <p className="font-mono font-bold text-lg text-foreground">{fmt(remaining)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Meta Total</p>
            <p className="font-mono font-bold text-lg text-muted-foreground">{fmt(targetValue)}</p>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily Average Needed */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Ganho Médio Necessário</p>
          </div>
          <p className="text-2xl font-mono font-black text-foreground">{fmt(avgDailyNeeded)}</p>
          <p className="text-xs text-muted-foreground">por dia de operação restante</p>
        </motion.div>

        {/* Trading Days */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Dias Mínimos</p>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-mono font-black text-foreground">{daysCompleted}</p>
            <p className="text-sm text-muted-foreground font-mono mb-1">/ {daysRequired}</p>
          </div>
          {daysRemaining > 0 ? (
            <p className="text-xs text-muted-foreground">Faltam {daysRemaining} dias de operação</p>
          ) : (
            <p className="text-xs text-success">Dias mínimos cumpridos</p>
          )}
          {daysRequired > 0 && (
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (daysCompleted / daysRequired) * 100)}%` }} />
            </div>
          )}
        </motion.div>
      </div>

      {/* Consistency & Survival */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {consistency && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Consistência</p>
            </div>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-mono font-black text-foreground">{consistency.currentValue}%</p>
              <p className="text-sm text-muted-foreground font-mono mb-1">/ {consistency.limitValue}% máx</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {consistency.currentValue > consistency.limitValue * 0.8
                ? 'Cuidado: seu melhor dia está muito concentrado. Distribua os lucros.'
                : 'Seus lucros estão bem distribuídos. Continue assim.'}
            </p>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${consistency.currentValue > consistency.limitValue * 0.8 ? 'bg-warning' : 'bg-success'}`}
                style={{ width: `${Math.min(100, (consistency.currentValue / consistency.limitValue) * 100)}%` }}
              />
            </div>
          </motion.div>
        )}

        {/* Survival Margin */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Margem de Sobrevivência</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Diário Restante</p>
              <p className="font-mono font-bold text-lg text-warning">{fmt(dailyRemaining)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Drawdown Restante</p>
              <p className="font-mono font-bold text-lg text-foreground">{fmt(maxRemaining)}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ChallengeControl;
