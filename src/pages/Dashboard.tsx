import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield, ShieldAlert, ShieldX, Activity, TrendingUp, TrendingDown,
  ChevronRight, Wallet, PlusCircle, AlertTriangle, Target, CalendarDays,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts, computeAccountMetrics, type AccountRow } from '@/hooks/useAccountsStore';

const fmt = (v: number) => `$${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

const statusConfig = {
  SAFE: { label: 'SEGURO', color: 'text-success', bg: 'bg-success/10', border: 'border-success/20', icon: Shield },
  WARNING: { label: 'ATENÇÃO', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', icon: ShieldAlert },
  DANGER: { label: 'CRÍTICO', color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20', icon: ShieldX },
} as const;

function Bar({ pct, variant = 'risk' }: { pct: number; variant?: 'risk' | 'profit' }) {
  const color = variant === 'profit'
    ? 'bg-primary'
    : pct >= 80 ? 'bg-destructive' : pct >= 50 ? 'bg-warning' : 'bg-success';
  return (
    <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, pct)}%` }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />
    </div>
  );
}

function HeroCard({ accounts }: { accounts: AccountRow[] }) {
  const { user } = useAuth();
  const totalEquity = accounts.reduce((s, a) => s + Number(a.current_equity || 0), 0);
  const totalInitial = accounts.reduce((s, a) => s + Number(a.start_balance || 0), 0);
  const pnl = totalEquity - totalInitial;
  const pnlPct = totalInitial > 0 ? ((pnl / totalInitial) * 100).toFixed(1) : '0.0';
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Trader';

  const metrics = accounts.map(computeAccountMetrics);
  const warnings = metrics.filter(m => m.status === 'WARNING').length;
  const dangers = metrics.filter(m => m.status === 'DANGER').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8"
    >
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/[0.05] blur-[60px] pointer-events-none" />
      <div className="relative flex items-start justify-between mb-8">
        <div>
          <p className="text-muted-foreground text-sm mb-1">
            Bem-vindo, <span className="text-foreground font-medium">{firstName}</span>
          </p>
          <h1 className="text-2xl md:text-3xl font-black text-foreground">Risk Panel</h1>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] bg-success/5 border border-success/10 rounded-full px-3 py-1.5">
          <Activity className="w-3 h-3 text-success animate-pulse" />
          <span className="text-success font-medium">Ao vivo</span>
        </div>
      </div>

      <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
        {[
          {
            label: 'Equity Total', value: fmt(totalEquity),
            sub: <span className={`flex items-center gap-1 mt-1 text-xs font-mono font-medium ${pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
              {pnl >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {pnl >= 0 ? '+' : ''}{pnlPct}%
            </span>,
          },
          { label: 'Contas Ativas', value: String(accounts.length), sub: <span className="text-xs text-muted-foreground mt-1">em monitoramento</span> },
          { label: 'Alertas', value: String(warnings), valueClass: warnings > 0 ? 'text-warning' : 'text-success', sub: <span className="text-xs text-muted-foreground mt-1">{warnings === 0 ? 'tudo certo' : 'requer atenção'}</span> },
          { label: 'Críticos', value: String(dangers), valueClass: dangers > 0 ? 'text-destructive' : 'text-success', sub: <span className="text-xs text-muted-foreground mt-1">{dangers === 0 ? 'nenhum' : 'ação necessária'}</span> },
        ].map((stat, i) => (
          <motion.div key={stat.label} className="rounded-xl bg-muted/30 border border-border/50 p-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">{stat.label}</p>
            <p className={`font-mono text-xl md:text-2xl font-bold ${(stat as any).valueClass || 'text-foreground'}`}>{stat.value}</p>
            {stat.sub}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function AccountCard({ account, index }: { account: AccountRow; index: number }) {
  const navigate = useNavigate();
  const m = computeAccountMetrics(account);
  const sc = statusConfig[m.status];
  const StatusIcon = sc.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.06, duration: 0.4 }}
      onClick={() => navigate(`/accounts/${account.id}`)}
      className="group cursor-pointer rounded-2xl border border-border bg-card hover:border-primary/40 transition-all duration-300 p-5"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0">
          <h3 className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">{account.nickname}</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
            {account.prop_firm || '—'} {account.program ? `• ${account.program}` : ''} {account.phase ? `• ${account.phase}` : ''}
          </p>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${sc.bg} border ${sc.border} flex-shrink-0`}>
          <StatusIcon className={`w-3 h-3 ${sc.color}`} />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${sc.color}`}>{sc.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Equity</p>
          <p className="font-mono font-bold text-foreground">{fmt(account.current_equity)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">P&L</p>
          <p className={`font-mono font-bold ${m.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
            {m.profit >= 0 ? '+' : '-'}{fmt(m.profit)}
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-muted/30 border border-border/40 p-3 mb-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Pode perder hoje</p>
          <p className="font-mono font-bold text-base text-foreground">{fmt(m.dailyRemaining)}</p>
        </div>
      </div>

      <div className="space-y-2.5">
        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>Perda Diária</span>
            <span className="font-mono">{Math.round(m.dailyPct)}%</span>
          </div>
          <Bar pct={m.dailyPct} />
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>Perda Total</span>
            <span className="font-mono">{Math.round(m.totalPct)}%</span>
          </div>
          <Bar pct={m.totalPct} />
        </div>
        {account.profit_target > 0 && (
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Meta de Lucro</span>
              <span className="font-mono">{Math.round(m.profitPct)}%</span>
            </div>
            <Bar pct={m.profitPct} variant="profit" />
          </div>
        )}
        {account.min_trading_days > 0 && (
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Dias de Trading</span>
              <span className="font-mono">{account.trading_days_count}/{account.min_trading_days}</span>
            </div>
            <Bar pct={m.daysPct} variant="profit" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: accounts = [], isLoading } = useAccounts();

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <HeroCard accounts={accounts} />

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Suas Contas</h2>
          <button onClick={() => navigate('/accounts')} className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1 font-medium">
            Ver todas <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 rounded-2xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <Wallet className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-foreground font-medium">Nenhuma conta cadastrada</p>
            <p className="text-xs text-muted-foreground mt-1 mb-5">Comece adicionando sua primeira conta de prop firm.</p>
            <button
              onClick={() => navigate('/accounts/new')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Criar primeira conta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {accounts.map((account, i) => (
              <AccountCard key={account.id} account={account} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
