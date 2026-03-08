import { useParams, useNavigate } from 'react-router-dom';
import { MOCK_ACCOUNTS, MOCK_EVALUATIONS, RULE_SET_TEMPLATES } from '@/data/mockData';
import { RuleEvaluation } from '@/types/fortify';
import {
  Shield, ShieldAlert, ShieldX, AlertTriangle, ArrowLeft,
  Lightbulb, Bell, TrendingDown, Target, Activity
} from 'lucide-react';
import { motion } from 'framer-motion';

const fmt = (v: number) => `$${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const p = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${p}%` }} />
    </div>
  );
}

const statusConfig = {
  SAFE: { label: 'SEGURO', color: 'text-success', bg: 'bg-success/10', border: 'border-success/20', icon: Shield },
  WARNING: { label: 'ATENÇÃO', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', icon: ShieldAlert },
  VIOLATED: { label: 'VIOLADO', color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20', icon: ShieldX },
} as const;

const AccountDashboard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const account = MOCK_ACCOUNTS.find(a => a.id === id);
  if (!account) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Conta não encontrada.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-primary text-sm">Voltar ao Painel</button>
      </div>
    );
  }

  const evals = MOCK_EVALUATIONS.filter(e => e.tradingAccountId === account.id);
  const ruleSet = RULE_SET_TEMPLATES.find(r => r.id === account.ruleSetId);
  const firmName = ruleSet?.firmName || ruleSet?.name || '—';

  const dailyLoss = evals.find(e => e.rule.type === 'MAX_DAILY_LOSS');
  const totalLoss = evals.find(e => e.rule.type === 'MAX_TOTAL_LOSS') || evals.find(e => e.rule.type === 'TRAILING_MAX_LOSS');
  const profitTarget = evals.find(e => e.rule.type === 'PROFIT_TARGET');
  const consistency = evals.find(e => e.rule.type === 'CONSISTENCY_BEST_DAY_CAP');
  const minDays = evals.find(e => e.rule.type === 'MIN_TRADING_DAYS');

  const dailyRemaining = dailyLoss ? Math.max(0, dailyLoss.limitValue - dailyLoss.currentValue) : 0;
  const maxLossRemaining = totalLoss ? Math.max(0, totalLoss.limitValue - totalLoss.currentValue) : 0;

  // Floating loss (simulated as open P&L)
  const floatingLoss = account.currentEquity - account.currentBalance;
  const floatingLimit = dailyLoss ? dailyLoss.limitValue : 0;

  const riskEvals = evals.filter(e => ['MAX_DAILY_LOSS', 'MAX_TOTAL_LOSS', 'TRAILING_MAX_LOSS'].includes(e.rule.type));
  const closestRule = riskEvals.length > 0 ? riskEvals.reduce((a, b) => a.progressPct > b.progressPct ? a : b) : null;
  const avgRisk = riskEvals.length > 0 ? riskEvals.reduce((s, e) => s + e.progressPct, 0) / riskEvals.length : 0;

  const hasViolation = evals.some(e => e.status === 'VIOLATED');
  const hasWarning = evals.some(e => e.status === 'WARNING');
  const status: 'SAFE' | 'WARNING' | 'VIOLATED' = hasViolation ? 'VIOLATED' : hasWarning ? 'WARNING' : 'SAFE';
  const healthScore = Math.max(0, Math.round(100 - avgRisk));
  const sc = statusConfig[status];
  const StatusIcon = sc.icon;

  // Recommendations
  const recommendations: string[] = [];
  recommendations.push(`Você ainda pode perder hoje: ${fmt(dailyRemaining)}`);
  if (dailyLoss && dailyLoss.progressPct > 70) recommendations.push(`Risco diário alto (${Math.round(dailyLoss.progressPct)}%), considere reduzir lote`);
  else if (dailyLoss && dailyLoss.progressPct > 40) recommendations.push(`Você está usando ${Math.round(dailyLoss.progressPct)}% do limite diário`);
  if (profitTarget && profitTarget.currentValue < 0) {
    const neededPct = ((profitTarget.limitValue - profitTarget.currentValue) / account.startBalance * 100).toFixed(1);
    recommendations.push(`Conta em recuperação, precisa de +${neededPct}% para voltar ao equilíbrio`);
  }
  if (avgRisk > 65) recommendations.push('⛔ Considere parar de operar hoje');
  else if (avgRisk > 45) recommendations.push('📉 Reduza o tamanho dos lotes nos próximos trades');
  else recommendations.push('✅ Risco controlado, mantenha a estratégia');

  // Alerts
  const alerts: { text: string; severity: 'warning' | 'danger' | 'info' }[] = [];
  evals.forEach(ev => {
    if (ev.status === 'WARNING') alerts.push({ text: `${ev.rule.name}: ${ev.message}`, severity: 'warning' });
    if (ev.status === 'VIOLATED') alerts.push({ text: `${ev.rule.name}: ${ev.message}`, severity: 'danger' });
    if (ev.status === 'NOT_MET' && ev.progressPct < 50) alerts.push({ text: `${ev.rule.name}: ${ev.message}`, severity: 'info' });
  });

  const barColorFor = (ev: RuleEvaluation | undefined) =>
    !ev ? 'bg-muted-foreground' :
    ev.status === 'VIOLATED' ? 'bg-destructive' :
    ev.status === 'WARNING' || ev.progressPct > 70 ? 'bg-warning' :
    'bg-success';

  const pnl = account.currentBalance - account.startBalance;
  const pnlPct = ((pnl / account.startBalance) * 100).toFixed(2);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Painel
      </button>

      {/* === STATUS DA CONTA === */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border ${sc.border} ${sc.bg} p-6 md:p-8`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1 space-y-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Status da Conta</p>
            <h1 className="text-xl font-bold text-foreground">{account.nickname}</h1>
            <p className="text-xs text-muted-foreground">{firmName} • {account.broker}</p>

            <div className="flex items-center gap-2 mt-3">
              <StatusIcon className={`w-5 h-5 ${sc.color}`} />
              <span className={`text-lg font-bold ${sc.color}`}>{sc.label}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo Inicial</p>
              <p className="font-mono font-bold text-foreground">{fmt(account.startBalance)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Equity Atual</p>
              <p className="font-mono font-bold text-foreground">{fmt(account.currentEquity)}</p>
              <p className={`text-xs font-mono font-semibold ${pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                {pnl >= 0 ? '+' : ''}{pnlPct}%
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Health Score</p>
              <p className={`text-3xl font-mono font-bold ${sc.color}`}>{healthScore}</p>
              <p className="text-[10px] text-muted-foreground">/100</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* === RISCO DA CONTA === */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-4 h-4 text-destructive" />
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Risco da Conta</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Daily Loss */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Perda Diária</h3>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-mono font-bold text-foreground">{fmt(dailyLoss?.currentValue ?? 0)}</span>
              <span className="text-sm font-mono text-muted-foreground">/ {fmt(dailyLoss?.limitValue ?? 0)}</span>
            </div>
            <ProgressBar value={dailyLoss?.currentValue ?? 0} max={dailyLoss?.limitValue ?? 1} color={barColorFor(dailyLoss)} />
            <p className="text-xs font-mono text-muted-foreground">
              Restante: <span className="text-foreground font-semibold">{fmt(dailyRemaining)}</span>
            </p>
          </div>

          {/* Max Loss */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Perda Máxima</h3>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-mono font-bold text-foreground">{fmt(totalLoss?.currentValue ?? 0)}</span>
              <span className="text-sm font-mono text-muted-foreground">/ {fmt(totalLoss?.limitValue ?? 0)}</span>
            </div>
            <ProgressBar value={totalLoss?.currentValue ?? 0} max={totalLoss?.limitValue ?? 1} color={barColorFor(totalLoss)} />
            <p className="text-xs font-mono text-muted-foreground">
              Restante: <span className="text-foreground font-semibold">{fmt(maxLossRemaining)}</span>
            </p>
          </div>

          {/* Floating Loss */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Perda Flutuante</h3>
            <div className="flex items-end justify-between">
              <span className={`text-2xl font-mono font-bold ${floatingLoss < 0 ? 'text-destructive' : 'text-success'}`}>
                {floatingLoss < 0 ? `-${fmt(Math.abs(floatingLoss))}` : fmt(floatingLoss)}
              </span>
              {floatingLimit > 0 && <span className="text-sm font-mono text-muted-foreground">/ {fmt(floatingLimit)}</span>}
            </div>
            <ProgressBar value={Math.abs(floatingLoss)} max={floatingLimit || 1} color={floatingLoss < -floatingLimit * 0.7 ? 'bg-warning' : 'bg-success'} />
            <p className="text-xs font-mono text-muted-foreground">
              {floatingLoss < 0 ? 'P&L aberto negativo' : 'P&L aberto positivo'}
            </p>
          </div>
        </div>
      </section>

      {/* === PROGRESSO DA CONTA === */}
      {(profitTarget || minDays || consistency) && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-primary" />
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Progresso da Conta</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {profitTarget && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meta de Lucro</h3>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-mono font-bold text-foreground">{fmt(Math.max(0, profitTarget.currentValue))}</span>
                  <span className="text-sm font-mono text-muted-foreground">/ {fmt(profitTarget.limitValue)}</span>
                </div>
                <ProgressBar value={Math.max(0, profitTarget.currentValue)} max={profitTarget.limitValue} color="bg-primary" />
                <p className="text-xs font-mono text-muted-foreground">{Math.max(0, profitTarget.progressPct)}% concluído</p>
              </div>
            )}

            {minDays && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dias de Trading</h3>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-mono font-bold text-foreground">{minDays.currentValue}</span>
                  <span className="text-sm font-mono text-muted-foreground">/ {minDays.limitValue}</span>
                </div>
                <ProgressBar value={minDays.currentValue} max={minDays.limitValue} color="bg-primary" />
                <p className="text-xs font-mono text-muted-foreground">{minDays.progressPct}% concluído</p>
              </div>
            )}

            {consistency && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Consistência</h3>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-mono font-bold text-foreground">{consistency.currentValue}%</span>
                  <span className="text-sm font-mono text-muted-foreground">/ {consistency.limitValue}%</span>
                </div>
                <ProgressBar value={consistency.currentValue} max={consistency.limitValue} color={consistency.status === 'APPROVING' ? 'bg-success' : 'bg-warning'} />
                <p className="text-xs font-mono text-muted-foreground">{consistency.message}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* === O QUE FAZER AGORA === */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-primary" />
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">O que fazer agora</h2>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          {recommendations.map((rec, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3"
            >
              <Activity className="w-3.5 h-3.5 mt-0.5 text-primary flex-shrink-0" />
              <p className="text-sm text-foreground">{rec}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* === ALERTAS === */}
      {alerts.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-warning" />
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Alertas</h2>
          </div>
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  alert.severity === 'danger' ? 'border-destructive/30 bg-destructive/5' :
                  alert.severity === 'warning' ? 'border-warning/30 bg-warning/5' :
                  'border-border bg-muted/30'
                }`}
              >
                <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                  alert.severity === 'danger' ? 'text-destructive' :
                  alert.severity === 'warning' ? 'text-warning' :
                  'text-muted-foreground'
                }`} />
                <p className="text-xs text-foreground">{alert.text}</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="pt-4 border-t border-border">
        <p className="text-[10px] text-muted-foreground font-mono">
          Última atualização: {new Date().toLocaleString('pt-BR')}
        </p>
      </footer>
    </div>
  );
};

export default AccountDashboard;
