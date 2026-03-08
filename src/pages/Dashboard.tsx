import { MOCK_ACCOUNTS, MOCK_EVALUATIONS, RULE_SET_TEMPLATES } from '@/data/mockData';
import { TradingAccount, RuleEvaluation, STATUS_CONFIG } from '@/types/fortify';
import { AlertTriangle, Shield, ShieldAlert, ShieldX, TrendingDown, Target, Lightbulb, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

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

  // Closest to violation = highest progressPct among risk rules
  const riskEvals = evals.filter(e => ['MAX_DAILY_LOSS', 'MAX_TOTAL_LOSS', 'TRAILING_MAX_LOSS'].includes(e.rule.type));
  const closestRule = riskEvals.length > 0 ? riskEvals.reduce((a, b) => a.progressPct > b.progressPct ? a : b) : null;

  const hasViolation = evals.some(e => e.status === 'VIOLATED');
  const hasWarning = evals.some(e => e.status === 'WARNING');
  const status = hasViolation ? 'VIOLATED' as const : hasWarning ? 'WARNING' as const : 'SAFE' as const;

  // Health score
  const avgRisk = riskEvals.length > 0 ? riskEvals.reduce((s, e) => s + e.progressPct, 0) / riskEvals.length : 0;
  const healthScore = Math.max(0, Math.round(100 - avgRisk));

  // Recommended action
  let action = 'Manter risco atual';
  if (avgRisk > 85) action = '⛔ Parar de operar';
  else if (avgRisk > 65) action = '⚠️ Reduzir lote significativamente';
  else if (avgRisk > 45) action = '📉 Reduzir lote';
  else if (avgRisk > 30) action = '🔄 Buscar recuperação gradual';

  // Insight
  let insight = '';
  if (dailyLoss && dailyLoss.progressPct > 50) {
    const used = dailyLoss.currentValue;
    const remain = Math.max(0, dailyLoss.limitValue - used);
    insight = `Você já usou ${fmt(used)} do limite diário. Restam ${fmt(remain)}`;
  } else if (profitTarget && profitTarget.currentValue < 0) {
    const neededValue = profitTarget.limitValue - profitTarget.currentValue;
    insight = `Esta conta precisa de ${fmt(neededValue)} para atingir a meta`;
  } else if (totalLoss && totalLoss.progressPct > 30) {
    const remain = Math.max(0, totalLoss.limitValue - totalLoss.currentValue);
    insight = `Margem de perda restante: ${fmt(remain)} de ${fmt(totalLoss.limitValue)}`;
  } else if (profitTarget) {
    const remaining = profitTarget.limitValue - Math.max(0, profitTarget.currentValue);
    insight = `Faltam ${fmt(remaining)} para atingir a meta de lucro`;
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

const statusConfig: Record<AccountStatus, { label: string; color: string; icon: typeof Shield; glow: string }> = {
  SAFE: { label: 'SEGURO', color: 'text-success', icon: Shield, glow: 'glow-success' },
  WARNING: { label: 'ATENÇÃO', color: 'text-warning', icon: ShieldAlert, glow: '' },
  VIOLATED: { label: 'VIOLADO', color: 'text-destructive', icon: ShieldX, glow: 'glow-destructive' },
};

// === Mini Progress Bar ===
function MiniBar({ value, max, status }: { value: number; max: number; status: string }) {
  const p = pct(value, max);
  const barColor =
    status === 'VIOLATED' ? 'bg-destructive' :
    status === 'WARNING' ? 'bg-warning' :
    p > 70 ? 'bg-warning' :
    'bg-success';

  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${Math.min(100, p)}%` }} />
    </div>
  );
}

// === Hero Card: Próxima Decisão ===
function HeroDecisionCard() {
  // Use first account as "primary" — could be selectable
  const primary = MOCK_ACCOUNTS[0];
  const data = getAccountData(primary);
  const sc = statusConfig[data.status];
  const StatusIcon = sc.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`rounded-2xl border border-border bg-card p-6 md:p-8 ${data.status === 'SAFE' ? 'border-success/20' : data.status === 'WARNING' ? 'border-warning/20' : 'border-destructive/20'}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Target className="w-4 h-4 text-primary" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Próxima decisão</span>
      </div>
      <p className="text-xs text-muted-foreground mb-6">{primary.nickname}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quanto pode perder hoje */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Quanto você ainda pode perder hoje</p>
          <p className="text-3xl font-mono font-bold text-foreground">{fmt(data.dailyRemaining)}</p>
          {data.dailyLoss && (
            <div className="mt-2">
              <MiniBar value={data.dailyLoss.currentValue} max={data.dailyLoss.limitValue} status={data.dailyLoss.status} />
              <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                {fmt(data.dailyLoss.currentValue)} de {fmt(data.dailyLoss.limitValue)}
              </p>
            </div>
          )}
        </div>

        {/* Regra mais próxima */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Regra mais próxima de violação</p>
          {data.closestRule ? (
            <>
              <p className="text-lg font-semibold text-foreground">{data.closestRule.rule.name}</p>
              <p className={`text-2xl font-mono font-bold ${data.closestRule.progressPct > 70 ? 'text-warning' : 'text-foreground'}`}>
                {Math.round(data.closestRule.progressPct)}%
              </p>
              <MiniBar value={data.closestRule.currentValue} max={data.closestRule.limitValue} status={data.closestRule.status} />
            </>
          ) : (
            <p className="text-success font-semibold">Nenhuma regra em risco</p>
          )}
        </div>

        {/* Status + Ação */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Status da conta</p>
          <div className="flex items-center gap-2 mb-3">
            <StatusIcon className={`w-5 h-5 ${sc.color}`} />
            <span className={`text-lg font-bold ${sc.color}`}>{sc.label}</span>
          </div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">O que fazer agora</p>
          <p className="text-sm font-semibold text-foreground">{data.action}</p>
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className="rounded-xl border border-border bg-card p-5 hover:border-primary/20 transition-colors cursor-pointer"
      onClick={() => navigate(`/accounts/${account.id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground text-sm">{account.nickname}</h3>
          <p className="text-[10px] text-muted-foreground">{firmName} • {account.broker}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusIcon className={`w-4 h-4 ${sc.color}`} />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${sc.color}`}>{sc.label}</span>
        </div>
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo Inicial</p>
          <p className="font-mono font-bold text-sm text-foreground">{fmt(account.startBalance)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Equity Atual</p>
          <p className="font-mono font-bold text-sm text-foreground">{fmt(account.currentEquity)}</p>
        </div>
      </div>

      {/* Pode perder hoje */}
      <div className="rounded-lg bg-muted/50 p-3 mb-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Pode perder hoje</p>
        <p className="font-mono font-bold text-lg text-foreground">{fmt(data.dailyRemaining)}</p>
      </div>

      {/* 3 Progress Bars */}
      <div className="space-y-3 mb-4">
        {/* Daily Loss */}
        {data.dailyLoss && (
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Perda Diária</span>
              <span className="font-mono">{fmt(data.dailyLoss.currentValue)} / {fmt(data.dailyLoss.limitValue)}</span>
            </div>
            <MiniBar value={data.dailyLoss.currentValue} max={data.dailyLoss.limitValue} status={data.dailyLoss.status} />
          </div>
        )}

        {/* Max Loss */}
        {data.totalLoss && (
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Perda Máxima</span>
              <span className="font-mono">{fmt(data.totalLoss.currentValue)} / {fmt(data.totalLoss.limitValue)}</span>
            </div>
            <MiniBar value={data.totalLoss.currentValue} max={data.totalLoss.limitValue} status={data.totalLoss.status} />
          </div>
        )}

        {/* Profit Target */}
        {data.profitTarget && (
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Meta de Lucro</span>
              <span className="font-mono">{fmt(Math.max(0, data.profitTarget.currentValue))} / {fmt(data.profitTarget.limitValue)}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 bg-primary"
                style={{ width: `${Math.min(100, Math.max(0, data.profitTarget.progressPct))}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Closest Rule */}
      {data.closestRule && (
        <div className="flex items-center gap-2 text-[10px] mb-3">
          <AlertTriangle className={`w-3 h-3 flex-shrink-0 ${data.closestRule.progressPct > 60 ? 'text-warning' : 'text-muted-foreground'}`} />
          <span className="text-muted-foreground">
            Regra mais próxima: <span className="text-foreground font-medium">{data.closestRule.rule.name}</span>
            {' '}({Math.round(data.closestRule.progressPct)}%)
          </span>
        </div>
      )}

      {/* Insight */}
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Lightbulb className="w-3 h-3 text-primary" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Insight do momento</span>
        </div>
        <p className="text-xs text-foreground">{data.insight}</p>
      </div>
    </motion.div>
  );
}

// === Dashboard Page ===
const Dashboard = () => {
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Hero */}
      <HeroDecisionCard />

      {/* Accounts Grid */}
      <section>
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">Suas Contas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {MOCK_ACCOUNTS.map((account, i) => (
            <AccountCard key={account.id} account={account} index={i} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-4 border-t border-border">
        <p className="text-[10px] text-muted-foreground font-mono">
          Última atualização: {new Date().toLocaleString('pt-BR')}
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;
