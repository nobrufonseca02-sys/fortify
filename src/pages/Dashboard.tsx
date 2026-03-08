import { MOCK_EVALUATIONS, RULE_SET_TEMPLATES } from '@/data/mockData';
import { useAccountsStore } from '@/hooks/useAccountsStore';
import { TradingAccount } from '@/types/fortify';
import {
  AlertTriangle, Shield, ShieldAlert, ShieldX, Target, Lightbulb,
  TrendingUp, TrendingDown, Activity, Zap, ChevronRight, ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

// === Helpers ===
const fmt = (v: number) => `$${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
const pct = (v: number, t: number) => t > 0 ? Math.min(100, (v / t) * 100) : 0;

function getAccountData(account: TradingAccount) {
  const evals = MOCK_EVALUATIONS.filter(e => e.tradingAccountId === account.id);
  const ruleSet = RULE_SET_TEMPLATES.find(r => r.id === account.ruleSetId);

  const dailyLoss = evals.find(e => e.rule.type === 'MAX_DAILY_LOSS');
  const totalLoss = evals.find(e => e.rule.type === 'MAX_TOTAL_LOSS') || evals.find(e => e.rule.type === 'TRAILING_MAX_LOSS');
  const profitTarget = evals.find(e => e.rule.type === 'PROFIT_TARGET');

  const dailyRemaining = dailyLoss ? Math.max(0, dailyLoss.limitValue - dailyLoss.currentValue) : 0;
  const maxLossRemaining = totalLoss ? Math.max(0, totalLoss.limitValue - totalLoss.currentValue) : 0;

  const riskEvals = evals.filter(e => ['MAX_DAILY_LOSS', 'MAX_TOTAL_LOSS', 'TRAILING_MAX_LOSS'].includes(e.rule.type));
  const closestRule = riskEvals.length > 0 ? riskEvals.reduce((a, b) => a.progressPct > b.progressPct ? a : b) : null;

  const hasViolation = evals.some(e => e.status === 'VIOLATED');
  const hasWarning = evals.some(e => e.status === 'WARNING');
  const status = hasViolation ? 'VIOLATED' as const : hasWarning ? 'WARNING' as const : 'SAFE' as const;

  const avgRisk = riskEvals.length > 0 ? riskEvals.reduce((s, e) => s + e.progressPct, 0) / riskEvals.length : 0;
  const healthScore = Math.max(0, Math.round(100 - avgRisk));

  let action = 'Manter risco atual';
  if (avgRisk > 85) action = 'Parar de operar imediatamente';
  else if (avgRisk > 65) action = 'Reduzir lote significativamente';
  else if (avgRisk > 45) action = 'Reduzir tamanho do lote';
  else if (avgRisk > 30) action = 'Recuperação gradual';

  let insight = '';
  if (dailyLoss && dailyLoss.progressPct > 50) {
    insight = `Já usou ${fmt(dailyLoss.currentValue)} do limite diário. Restam ${fmt(Math.max(0, dailyLoss.limitValue - dailyLoss.currentValue))}`;
  } else if (profitTarget && profitTarget.currentValue < 0) {
    insight = `Precisa de ${fmt(profitTarget.limitValue - profitTarget.currentValue)} para atingir a meta`;
  } else if (totalLoss && totalLoss.progressPct > 30) {
    insight = `Margem de perda restante: ${fmt(Math.max(0, totalLoss.limitValue - totalLoss.currentValue))}`;
  } else if (profitTarget) {
    insight = `Faltam ${fmt(profitTarget.limitValue - Math.max(0, profitTarget.currentValue))} para a meta de lucro`;
  } else {
    insight = 'Conta dentro dos limites seguros';
  }

  return {
    evals, ruleSet, dailyLoss, totalLoss, profitTarget,
    dailyRemaining, maxLossRemaining, closestRule,
    status, healthScore, action, insight, avgRisk,
  };
}

type AccountStatus = 'SAFE' | 'WARNING' | 'VIOLATED';

const statusConfig: Record<AccountStatus, { label: string; color: string; bg: string; icon: typeof Shield; border: string }> = {
  SAFE: { label: 'SEGURO', color: 'text-success', bg: 'bg-success/10', icon: Shield, border: 'border-success/20' },
  WARNING: { label: 'ATENÇÃO', color: 'text-warning', bg: 'bg-warning/10', icon: ShieldAlert, border: 'border-warning/20' },
  VIOLATED: { label: 'VIOLADO', color: 'text-destructive', bg: 'bg-destructive/10', icon: ShieldX, border: 'border-destructive/20' },
};

// === Animated Progress Ring ===
function ProgressRing({ value, size = 80, strokeWidth = 6, status }: { value: number; size?: number; strokeWidth?: number; status: AccountStatus }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  const colorMap = { SAFE: 'hsl(var(--success))', WARNING: 'hsl(var(--warning))', VIOLATED: 'hsl(var(--destructive))' };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={colorMap[status]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono font-bold text-lg text-foreground">{value}</span>
      </div>
    </div>
  );
}

// === Glowing Progress Bar ===
function GlowBar({ value, max, variant = 'risk' }: { value: number; max: number; variant?: 'risk' | 'profit' }) {
  const p = pct(value, max);
  const color = variant === 'profit'
    ? 'bg-primary'
    : p > 70 ? 'bg-destructive' : p > 45 ? 'bg-warning' : 'bg-success';
  const glow = variant === 'profit'
    ? 'shadow-[0_0_8px_hsl(var(--primary)/0.4)]'
    : p > 70 ? 'shadow-[0_0_8px_hsl(var(--destructive)/0.4)]' : p > 45 ? 'shadow-[0_0_8px_hsl(var(--warning)/0.4)]' : '';

  return (
    <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${color} ${glow}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, p)}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

// === Hero Card ===
function HeroCard() {
  const { accounts } = useAccountsStore();
  const { user } = useAuth();
  const primary = accounts[0];

  const totalEquity = accounts.reduce((s, a) => s + a.currentEquity, 0);
  const totalInitial = accounts.reduce((s, a) => s + a.startBalance, 0);
  const pnl = totalEquity - totalInitial;
  const pnlPct = totalInitial > 0 ? ((pnl / totalInitial) * 100).toFixed(1) : '0.0';

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Trader';

  // Aggregate stats
  const allData = accounts.map(a => getAccountData(a));
  const activeAccounts = accounts.length;
  const warnings = allData.filter(d => d.status === 'WARNING').length;
  const violations = allData.filter(d => d.status === 'VIOLATED').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card"
    >
      {/* Decorative glow */}
      <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-info/5 blur-3xl pointer-events-none" />

      <div className="relative p-6 md:p-8">
        {/* Greeting */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <motion.p
              className="text-muted-foreground text-sm mb-1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              Bem-vindo, <span className="text-foreground font-medium">{firstName}</span>
            </motion.p>
            <motion.h1
              className="text-2xl md:text-3xl font-bold text-foreground"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              Visão Geral
            </motion.h1>
          </div>
          <motion.div
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Activity className="w-3 h-3 text-success animate-pulse" />
            <span>Ao vivo</span>
          </motion.div>
        </div>

        {/* Main stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <motion.div
            className="glass rounded-xl p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Equity Total</p>
            <p className="font-mono text-xl md:text-2xl font-bold text-foreground">{fmt(totalEquity)}</p>
            <div className={`flex items-center gap-1 mt-1 text-xs ${pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
              {pnl >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span className="font-mono font-medium">{pnl >= 0 ? '+' : ''}{pnlPct}%</span>
            </div>
          </motion.div>

          <motion.div
            className="glass rounded-xl p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Contas Ativas</p>
            <p className="font-mono text-xl md:text-2xl font-bold text-foreground">{activeAccounts}</p>
            <p className="text-xs text-muted-foreground mt-1">em monitoramento</p>
          </motion.div>

          <motion.div
            className="glass rounded-xl p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Alertas</p>
            <p className={`font-mono text-xl md:text-2xl font-bold ${warnings > 0 ? 'text-warning' : 'text-success'}`}>{warnings}</p>
            <p className="text-xs text-muted-foreground mt-1">{warnings === 0 ? 'tudo certo' : 'requer atenção'}</p>
          </motion.div>

          <motion.div
            className="glass rounded-xl p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Violações</p>
            <p className={`font-mono text-xl md:text-2xl font-bold ${violations > 0 ? 'text-destructive' : 'text-success'}`}>{violations}</p>
            <p className="text-xs text-muted-foreground mt-1">{violations === 0 ? 'nenhuma' : 'ação necessária'}</p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// === Decision Card ===
function DecisionCard() {
  const { accounts } = useAccountsStore();
  const primary = accounts[0];
  if (!primary) return null;
  const data = getAccountData(primary);
  const sc = statusConfig[data.status];
  const StatusIcon = sc.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className={`rounded-2xl border ${sc.border} bg-card overflow-hidden`}
    >
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-8 h-8 rounded-lg ${sc.bg} flex items-center justify-center`}>
            <Zap className={`w-4 h-4 ${sc.color}`} />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Próxima Decisão</p>
            <p className="text-[10px] text-muted-foreground">{primary.nickname}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Daily remaining */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Pode perder hoje</p>
            <p className="text-3xl font-mono font-bold text-foreground mb-3">{fmt(data.dailyRemaining)}</p>
            {data.dailyLoss && (
              <>
                <GlowBar value={data.dailyLoss.currentValue} max={data.dailyLoss.limitValue} />
                <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">
                  {fmt(data.dailyLoss.currentValue)} / {fmt(data.dailyLoss.limitValue)}
                </p>
              </>
            )}
          </div>

          {/* Closest rule */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Regra mais próxima</p>
            {data.closestRule ? (
              <div className="flex items-center gap-4">
                <ProgressRing value={Math.round(data.closestRule.progressPct)} size={72} status={data.status} />
                <div>
                  <p className="text-sm font-semibold text-foreground">{data.closestRule.rule.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {fmt(data.closestRule.currentValue)} / {fmt(data.closestRule.limitValue)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-success" />
                <span className="text-success font-semibold text-sm">Nenhuma em risco</span>
              </div>
            )}
          </div>

          {/* Action */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Status</p>
            <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${sc.bg} mb-3`}>
              <StatusIcon className={`w-3.5 h-3.5 ${sc.color}`} />
              <span className={`text-xs font-bold ${sc.color}`}>{sc.label}</span>
            </div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Recomendação</p>
            <p className="text-sm font-semibold text-foreground">{data.action}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// === Account Card ===
function AccountCard({ account, index }: { account: TradingAccount; index: number }) {
  const navigate = useNavigate();
  const data = getAccountData(account);
  const sc = statusConfig[data.status];
  const StatusIcon = sc.icon;
  const firmName = data.ruleSet?.firmName || data.ruleSet?.name || '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.08, duration: 0.4 }}
      className="group relative rounded-2xl border border-border bg-card hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden"
      onClick={() => navigate(`/accounts/${account.id}`)}
    >
      {/* Hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{account.nickname}</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">{firmName}</p>
          </div>
          <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${sc.bg}`}>
            <StatusIcon className={`w-3 h-3 ${sc.color}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${sc.color}`}>{sc.label}</span>
          </div>
        </div>

        {/* Health + Equity row */}
        <div className="flex items-center gap-5 mb-5">
          <ProgressRing value={data.healthScore} size={64} strokeWidth={5} status={data.status} />
          <div className="flex-1 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo</p>
              <p className="font-mono font-bold text-sm text-foreground">{fmt(account.startBalance)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Equity</p>
              <p className="font-mono font-bold text-sm text-foreground">{fmt(account.currentEquity)}</p>
            </div>
          </div>
        </div>

        {/* Can lose today */}
        <div className="rounded-xl bg-muted/40 p-3 mb-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pode perder hoje</p>
            <p className="font-mono font-bold text-base text-foreground">{fmt(data.dailyRemaining)}</p>
          </div>
        </div>

        {/* Progress bars */}
        <div className="space-y-3 mb-4">
          {data.dailyLoss && (
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Perda Diária</span>
                <span className="font-mono">{Math.round(pct(data.dailyLoss.currentValue, data.dailyLoss.limitValue))}%</span>
              </div>
              <GlowBar value={data.dailyLoss.currentValue} max={data.dailyLoss.limitValue} />
            </div>
          )}
          {data.totalLoss && (
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Perda Máxima</span>
                <span className="font-mono">{Math.round(pct(data.totalLoss.currentValue, data.totalLoss.limitValue))}%</span>
              </div>
              <GlowBar value={data.totalLoss.currentValue} max={data.totalLoss.limitValue} />
            </div>
          )}
          {data.profitTarget && (
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Meta de Lucro</span>
                <span className="font-mono">{Math.round(Math.max(0, data.profitTarget.progressPct))}%</span>
              </div>
              <GlowBar value={Math.max(0, data.profitTarget.currentValue)} max={data.profitTarget.limitValue} variant="profit" />
            </div>
          )}
        </div>

        {/* Insight */}
        <div className="flex items-start gap-2 rounded-xl border border-border/50 bg-muted/20 p-3">
          <Lightbulb className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-foreground/80 leading-relaxed">{data.insight}</p>
        </div>

        {/* View arrow */}
        <div className="flex justify-end mt-3">
          <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </motion.div>
  );
}

// === Dashboard Page ===
const Dashboard = () => {
  const { accounts } = useAccountsStore();
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <HeroCard />
      <DecisionCard />

      {/* Accounts */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Suas Contas</h2>
          <button
            onClick={() => navigate('/accounts')}
            className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            Ver todas <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {accounts.map((account, i) => (
            <AccountCard key={account.id} account={account} index={i} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-4 border-t border-border/50">
        <p className="text-[10px] text-muted-foreground/60 font-mono">
          Última atualização: {new Date().toLocaleString('pt-BR')}
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;
