import { MOCK_EVALUATIONS, RULE_SET_TEMPLATES } from '@/data/mockData';
import { useAccountsStore } from '@/hooks/useAccountsStore';
import { TradingAccount, type Mt5ConnectionStatus } from '@/types/fortify';
import {
  Shield, ShieldAlert, ShieldX, Lightbulb,
  TrendingUp, TrendingDown, Activity, Zap, ChevronRight, ArrowUpRight,
  Link2, RefreshCw, XCircle, AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useMemo, useState, useEffect } from 'react';
import { SlideToActivate } from '@/components/SlideToActivate';
import { toast } from '@/hooks/use-toast';

const mt5StatusConfig: Record<Mt5ConnectionStatus, { label: string; icon: typeof Link2; className: string }> = {
  disconnected: { label: 'Desconectada', icon: XCircle, className: 'bg-muted text-muted-foreground' },
  connecting: { label: 'Conectando', icon: RefreshCw, className: 'bg-warning/15 text-warning' },
  connected: { label: 'Conectada', icon: Link2, className: 'bg-success/15 text-success' },
  syncing: { label: 'Sincronizando', icon: RefreshCw, className: 'bg-primary/15 text-primary' },
  auth_error: { label: 'Erro de autenticação', icon: AlertTriangle, className: 'bg-destructive/15 text-destructive' },
};

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
  else if (avgRisk > 30) action = 'Recuperacao gradual';

  let insight = '';
  if (dailyLoss && dailyLoss.progressPct > 50) {
    insight = `Ja usou ${fmt(dailyLoss.currentValue)} do limite diario. Restam ${fmt(Math.max(0, dailyLoss.limitValue - dailyLoss.currentValue))}`;
  } else if (profitTarget && profitTarget.currentValue < 0) {
    insight = `Precisa de ${fmt(profitTarget.limitValue - profitTarget.currentValue)} para atingir a meta`;
  } else if (totalLoss && totalLoss.progressPct > 30) {
    insight = `Margem de perda restante: ${fmt(Math.max(0, totalLoss.limitValue - totalLoss.currentValue))}`;
  } else if (profitTarget) {
    insight = `Faltam ${fmt(profitTarget.limitValue - Math.max(0, profitTarget.currentValue))} para a meta de lucro`;
  } else {
    insight = 'Conta dentro dos limites seguros';
  }

  return { evals, ruleSet, dailyLoss, totalLoss, profitTarget, dailyRemaining, maxLossRemaining, closestRule, status, healthScore, action, insight, avgRisk };
}

type AccountStatus = 'SAFE' | 'WARNING' | 'VIOLATED';

const statusConfig: Record<AccountStatus, { label: string; color: string; bg: string; icon: typeof Shield; border: string; glow: string }> = {
  SAFE: { label: 'SEGURO', color: 'text-success', bg: 'bg-success/10', icon: Shield, border: 'border-success/20', glow: 'shadow-success/5' },
  WARNING: { label: 'ATENCAO', color: 'text-warning', bg: 'bg-warning/10', icon: ShieldAlert, border: 'border-warning/20', glow: 'shadow-warning/5' },
  VIOLATED: { label: 'VIOLADO', color: 'text-destructive', bg: 'bg-destructive/10', icon: ShieldX, border: 'border-destructive/20', glow: 'shadow-destructive/20' },
};

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
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono font-bold text-lg text-foreground">{value}</span>
      </div>
    </div>
  );
}

function GlowBar({ value, max, variant = 'risk' }: { value: number; max: number; variant?: 'risk' | 'profit' }) {
  const p = pct(value, max);
  const color = variant === 'profit'
    ? 'bg-primary'
    : p > 70 ? 'bg-destructive' : p > 45 ? 'bg-warning' : 'bg-success';

  return (
    <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, p)}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}

function HeroCard() {
  const { accounts } = useAccountsStore();
  const { user } = useAuth();
  const totalEquity = accounts.reduce((s, a) => s + a.currentEquity, 0);
  const totalInitial = accounts.reduce((s, a) => s + a.startBalance, 0);
  const pnl = totalEquity - totalInitial;
  const pnlPct = totalInitial > 0 ? ((pnl / totalInitial) * 100).toFixed(1) : '0.0';
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Trader';
  const allData = accounts.map(a => getAccountData(a));
  const activeAccounts = accounts.length;
  const warnings = allData.filter(d => d.status === 'WARNING').length;
  const violations = allData.filter(d => d.status === 'VIOLATED').length;
  const overallStatus: AccountStatus = violations > 0 ? 'VIOLATED' : warnings > 0 ? 'WARNING' : 'SAFE';
  const sc = statusConfig[overallStatus];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-2xl hero-surface edge-top"
    >
      <div className="relative p-7 md:p-10">
        {/* status strip */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${sc.color.replace('text-', 'bg-')} animate-pulse`} />
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
              Risk Console <span className="text-foreground/40">/</span> {sc.label}
            </span>
          </div>
          <span className="badge-system">
            <Activity className="w-3 h-3 text-primary" />
            Ao vivo
          </span>
        </div>

        <div className="max-w-3xl mb-10">
          <motion.p className="eyebrow mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            Bem-vindo, <span className="text-foreground/90">{firstName}</span>
          </motion.p>
          <motion.h1
            className="display-editorial text-gradient-steel"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          >
            <span className="text-gradient-primary">Proteja</span> a conta<br/>antes do próximo trade.
          </motion.h1>
          <motion.p
            className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          >
            Painel de risco em tempo real para suas contas de prop firm — limites, drawdown e regras críticas em uma única superfície.
          </motion.p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: 'Equity Total', value: fmt(totalEquity), sub: <span className={`flex items-center gap-1 mt-1.5 text-xs font-mono font-medium ${pnl >= 0 ? 'text-success' : 'text-destructive'}`}>{pnl >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{pnl >= 0 ? '+' : ''}{pnlPct}%</span> },
            { label: 'Contas Ativas', value: String(activeAccounts), sub: <span className="text-[11px] text-muted-foreground mt-1.5">em monitoramento</span> },
            { label: 'Alertas', value: String(warnings), valueClass: warnings > 0 ? 'text-warning' : 'text-success', sub: <span className="text-[11px] text-muted-foreground mt-1.5">{warnings === 0 ? 'tudo certo' : 'requer atenção'}</span> },
            { label: 'Violações', value: String(violations), valueClass: violations > 0 ? 'text-destructive' : 'text-success', sub: <span className="text-[11px] text-muted-foreground mt-1.5">{violations === 0 ? 'nenhuma' : 'ação necessária'}</span> },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="relative rounded-xl border border-border/70 bg-background/40 backdrop-blur-sm p-4 overflow-hidden group"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.07 }}
            >
              <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-60" />
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2 font-mono">{stat.label}</p>
              <p className={`font-mono text-xl md:text-2xl font-bold ${(stat as any).valueClass || 'text-foreground'}`}>{stat.value}</p>
              {stat.sub}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

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
      className={`rounded-2xl border ${sc.border} bg-card overflow-hidden shadow-lg ${sc.glow}`}
    >
      <div className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className={`w-8 h-8 rounded-lg ${sc.bg} flex items-center justify-center`}>
            <Zap className={`w-4 h-4 ${sc.color}`} />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">Próxima Decisão</p>
            <p className="text-[10px] text-muted-foreground">{primary.nickname}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">Pode perder hoje</p>
            <p className="text-3xl font-mono font-black text-foreground mb-3">{fmt(data.dailyRemaining)}</p>
            {data.dailyLoss && (
              <>
                <GlowBar value={data.dailyLoss.currentValue} max={data.dailyLoss.limitValue} />
                <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">{fmt(data.dailyLoss.currentValue)} / {fmt(data.dailyLoss.limitValue)}</p>
              </>
            )}
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">Regra mais proxima</p>
            {data.closestRule ? (
              <div className="flex items-center gap-4">
                <ProgressRing value={Math.round(data.closestRule.progressPct)} size={72} status={data.status} />
                <div>
                  <p className="text-sm font-bold text-foreground">{data.closestRule.rule.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{fmt(data.closestRule.currentValue)} / {fmt(data.closestRule.limitValue)}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-success" />
                <span className="text-success font-bold text-sm">Nenhuma em risco</span>
              </div>
            )}
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">Status</p>
            <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${sc.bg} border ${sc.border} mb-3`}>
              <StatusIcon className={`w-3.5 h-3.5 ${sc.color}`} />
              <span className={`text-xs font-bold ${sc.color}`}>{sc.label}</span>
            </div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">Recomendacao</p>
            <p className="text-sm font-bold text-foreground">{data.action}</p>
          </div>
        </div>

        <div className="mt-7 pt-6 border-t border-border/40 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono mb-1">Trava de proteção</p>
            <p className="text-xs text-foreground/80">Deslize para confirmar a meta de risco do dia.</p>
          </div>
          <div className="md:w-72">
            <SlideToActivate
              label="Deslize para travar dia"
              activatedLabel="Dia travado"
              variant={data.status === 'VIOLATED' ? 'destructive' : data.status === 'WARNING' ? 'primary' : 'success'}
              onActivate={() => toast({ title: 'Risco do dia travado', description: 'Continue acompanhando o painel.' })}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AccountCard({ account, index, mt5Connection }: { account: TradingAccount; index: number; mt5Connection?: any }) {
  const navigate = useNavigate();
  const data = getAccountData(account);
  const sc = statusConfig[data.status];
  const StatusIcon = sc.icon;
  const brokerName = account.broker || '—';
  
  // MT5 connection info
  const rawConnectionStatus = mt5Connection?.connection_status ?? 'disconnected';
  const connectionStatus = (rawConnectionStatus || 'disconnected') as Mt5ConnectionStatus;
  const mt5Status = mt5StatusConfig[connectionStatus] || mt5StatusConfig.disconnected;
  const Mt5StatusIcon = mt5Status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.08, duration: 0.4 }}
      className="group relative card-soft lift cursor-pointer overflow-hidden"
      onClick={() => navigate(`/accounts/${account.id}`)}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" />

      <div className="relative p-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">{account.nickname}</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">{brokerName}</p>
            {mt5Connection && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`inline-flex items-center gap-0.5 text-[7px] font-semibold uppercase tracking-wider px-1 py-0.5 rounded-full ${mt5Status.className}`}>
                  <Mt5StatusIcon className={`w-2 h-2 ${connectionStatus === 'connecting' || connectionStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  {mt5Status.label}
                </span>
                <span className="text-[7px] text-muted-foreground">
                  {mt5Connection.provider || 'mt5'} • {mt5Connection.last_sync_at ? new Date(mt5Connection.last_sync_at).toLocaleDateString('pt-BR') : 'sem sync'}
                </span>
              </div>
            )}
          </div>
          <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${sc.bg} border ${sc.border}`}>
            <StatusIcon className={`w-3 h-3 ${sc.color}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${sc.color}`}>{sc.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-5 mb-5">
          <ProgressRing value={data.healthScore} size={64} strokeWidth={5} status={data.status} />
          <div className="flex-1 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Saldo</p>
              <p className="font-mono font-bold text-sm text-foreground">{fmt(account.startBalance)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Equity</p>
              <p className="font-mono font-bold text-sm text-foreground">{fmt(account.currentEquity)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-muted/30 border border-border/40 p-3 mb-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Pode perder hoje</p>
            <p className="font-mono font-bold text-base text-foreground">{fmt(data.dailyRemaining)}</p>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          {data.dailyLoss && (
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Perda Diaria</span>
                <span className="font-mono">{Math.round(pct(data.dailyLoss.currentValue, data.dailyLoss.limitValue))}%</span>
              </div>
              <GlowBar value={data.dailyLoss.currentValue} max={data.dailyLoss.limitValue} />
            </div>
          )}
          {data.totalLoss && (
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Perda Maxima</span>
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

        <div className="flex items-start gap-2 rounded-xl border border-border/30 bg-muted/20 p-3">
          <Lightbulb className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-foreground/80 leading-relaxed">{data.insight}</p>
        </div>

        <div className="flex justify-end mt-3">
          <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </motion.div>
  );
}

const Dashboard = () => {
  const { accounts } = useAccountsStore();
  const navigate = useNavigate();
  
  // MT5 connections state
  const [mt5Connections, setMt5Connections] = useState<any[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);

  // Load MT5 connections from Supabase
  useEffect(() => {
    const loadMt5Connections = async () => {
      const supabase = (window as any)?.supabase;
      if (!supabase) return;

      setLoadingConnections(true);
      try {
        const { data, error } = await supabase
          .from('mt5_connections')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setMt5Connections(data || []);
      } catch (error) {
        console.error('Failed to load MT5 connections:', error);
      } finally {
        setLoadingConnections(false);
      }
    };

    loadMt5Connections();
  }, []);

  // Helper to get MT5 connection for an account
  const getMt5Connection = (accountId: string) => {
    return mt5Connections.find(conn => conn.trading_account_id === accountId);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <HeroCard />
      <DecisionCard />

      <section>
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70 mb-1">Portfolio</p>
            <h2 className="text-xl font-bold text-foreground tracking-tight">Suas Contas</h2>
          </div>
          <button onClick={() => navigate('/accounts')} className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1 font-medium">
            Ver todas <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {accounts.map((account, i) => (
            <AccountCard key={account.id} account={account} index={i} mt5Connection={getMt5Connection(account.id)} />
          ))}
        </div>
      </section>

      <footer className="pt-4 border-t border-border/30">
        <p className="text-[10px] text-muted-foreground/50 font-mono">
          Ultima atualizacao: {new Date().toLocaleString('pt-BR')}
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;
