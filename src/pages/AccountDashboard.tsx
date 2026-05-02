import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Shield, ShieldAlert, ShieldX, TrendingUp, TrendingDown,
  Target, CalendarDays, Edit3, Save, X, ScrollText,
} from 'lucide-react';
import { useAccount, useUpdateAccount, computeAccountMetrics } from '@/hooks/useAccountsStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const fmt = (v: number) => `$${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

const statusConfig = {
  SAFE: { label: 'SEGURO', color: 'text-success', bg: 'bg-success/10', border: 'border-success/20', icon: Shield, msg: 'Sua conta está segura para operar hoje.' },
  WARNING: { label: 'ATENÇÃO', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', icon: ShieldAlert, msg: 'Você está se aproximando dos limites. Reduza o risco.' },
  DANGER: { label: 'CRÍTICO', color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20', icon: ShieldX, msg: 'Limite quase esgotado. Pare de operar imediatamente.' },
} as const;

function Bar({ pct, variant = 'risk' }: { pct: number; variant?: 'risk' | 'profit' }) {
  const color = variant === 'profit'
    ? 'bg-primary'
    : pct >= 80 ? 'bg-destructive' : pct >= 50 ? 'bg-warning' : 'bg-success';
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, pct)}%` }}
        transition={{ duration: 0.7 }}
      />
    </div>
  );
}

const AccountDashboard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: account, isLoading } = useAccount(id);
  const updateMutation = useUpdateAccount();

  const [editing, setEditing] = useState(false);
  const [equity, setEquity] = useState('');
  const [dailyUsed, setDailyUsed] = useState('');
  const [totalUsed, setTotalUsed] = useState('');
  const [tradingDays, setTradingDays] = useState('');

  const startEdit = () => {
    if (!account) return;
    setEquity(String(account.current_equity));
    setDailyUsed(String(account.daily_loss_used));
    setTotalUsed(String(account.total_loss_used));
    setTradingDays(String(account.trading_days_count));
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!account) return;
    try {
      const newEquity = parseFloat(equity) || 0;
      await updateMutation.mutateAsync({
        id: account.id,
        patch: {
          current_equity: newEquity,
          current_balance: newEquity,
          highest_equity: Math.max(account.highest_equity, newEquity),
          daily_loss_used: parseFloat(dailyUsed) || 0,
          total_loss_used: parseFloat(totalUsed) || 0,
          trading_days_count: parseInt(tradingDays) || 0,
        },
      });
      toast({ title: 'Conta atualizada' });
      setEditing(false);
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao atualizar.', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Carregando conta...</div>;
  }

  if (!account) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Conta não encontrada.</p>
        <button onClick={() => navigate('/accounts')} className="mt-4 text-primary text-sm">Voltar</button>
      </div>
    );
  }

  const m = computeAccountMetrics(account);
  const sc = statusConfig[m.status];
  const StatusIcon = sc.icon;
  const recommendedPerTrade = Math.max(0, m.dailyRemaining) * 0.01;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/accounts')} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black text-foreground truncate">{account.nickname}</h1>
          <p className="text-xs text-muted-foreground truncate">
            {account.prop_firm || '—'} {account.program ? `• ${account.program}` : ''} {account.phase ? `• ${account.phase}` : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(`/accounts/${account.id}/rules`)}>
          <ScrollText className="w-4 h-4 mr-1.5" /> Regras
        </Button>
        {editing ? (
          <>
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              <X className="w-4 h-4 mr-1.5" /> Cancelar
            </Button>
            <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending} className="btn-glow">
              <Save className="w-4 h-4 mr-1.5" /> Salvar
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={startEdit} className="btn-glow">
            <Edit3 className="w-4 h-4 mr-1.5" /> Atualizar
          </Button>
        )}
      </div>

      {/* Status banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border ${sc.border} ${sc.bg} p-5 flex items-start gap-4 card-premium`}
      >
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-card border ${sc.border}`}>
          <StatusIcon className={`w-5 h-5 ${sc.color}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold uppercase tracking-wider ${sc.color}`}>{sc.label}</span>
          </div>
          <p className="text-sm text-foreground">{sc.msg}</p>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border/50 bg-background/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Perda diária restante</p>
              <p className="font-mono font-black text-base text-foreground mt-1">{fmt(m.dailyRemaining)}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Perda total restante</p>
              <p className="font-mono font-black text-base text-foreground mt-1">{fmt(m.totalRemaining)}</p>
            </div>
            <div className="rounded-xl border border-primary/15 bg-primary/5 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Risco recomendado/oper.</p>
              <p className="font-mono font-black text-base text-primary mt-1">{fmt(recommendedPerTrade)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">~1% do restante diário</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Equity atual" value={fmt(account.current_equity)}>
          {editing && <Input type="number" value={equity} onChange={e => setEquity(e.target.value)} className="mt-2 h-8 text-sm" />}
        </KPI>
        <KPI label="Saldo inicial" value={fmt(account.start_balance)} />
        <KPI
          label="P&L"
          value={`${m.profit >= 0 ? '+' : '-'}${fmt(m.profit)}`}
          valueClass={m.profit >= 0 ? 'text-success' : 'text-destructive'}
          icon={m.profit >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
        />
        <KPI label="Dias operados" value={account.min_trading_days > 0 ? `${account.trading_days_count}/${account.min_trading_days}` : String(account.trading_days_count)} icon={<CalendarDays className="w-3.5 h-3.5" />} />
      </div>

      {/* Risk progress */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-2xl border border-border bg-card p-6 space-y-5 card-premium"
      >
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Limites de risco (operacional)</h2>

        <RiskRow
          title="Perda diária"
          used={account.daily_loss_used}
          limit={account.daily_loss_limit}
          remaining={m.dailyRemaining}
          pct={m.dailyPct}
          editing={editing}
          editValue={dailyUsed}
          onEdit={setDailyUsed}
        />
        <RiskRow
          title="Perda total"
          used={account.total_loss_used}
          limit={account.total_loss_limit}
          remaining={m.totalRemaining}
          pct={m.totalPct}
          editing={editing}
          editValue={totalUsed}
          onEdit={setTotalUsed}
        />
      </motion.div>

      {/* Progress to pass */}
      {(account.profit_target > 0 || account.min_trading_days > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-6 space-y-5 card-premium"
        >
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Progresso para aprovação</h2>

          {account.profit_target > 0 && (
            <ProgressRow
              icon={<Target className="w-4 h-4 text-primary" />}
              title="Meta de lucro"
              current={fmt(Math.max(0, m.profit))}
              target={fmt(account.profit_target)}
              pct={m.profitPct}
            />
          )}

          {account.min_trading_days > 0 && (
            <ProgressRow
              icon={<CalendarDays className="w-4 h-4 text-primary" />}
              title="Dias mínimos"
              current={String(account.trading_days_count)}
              target={String(account.min_trading_days)}
              pct={m.daysPct}
              editing={editing}
              editValue={tradingDays}
              onEdit={setTradingDays}
            />
          )}
        </motion.div>
      )}
    </div>
  );
};

function KPI({ label, value, valueClass, icon, children }: { label: string; value: string; valueClass?: string; icon?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 card-premium">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">{label}</p>
      <p className={`font-mono text-xl font-black flex items-center gap-1.5 ${valueClass || 'text-foreground'}`}>
        {icon}{value}
      </p>
      {children}
    </div>
  );
}

function RiskRow({ title, used, limit, remaining, pct, editing, editValue, onEdit }: {
  title: string; used: number; limit: number; remaining: number; pct: number;
  editing?: boolean; editValue?: string; onEdit?: (v: string) => void;
}) {
  const remainingCls = remaining <= 0 ? 'text-destructive' : pct >= 80 ? 'text-warning' : 'text-success';

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="text-xs font-mono text-muted-foreground">{Math.round(pct)}%</span>
      </div>
      <Bar pct={pct} />
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Usado</p>
          {editing && onEdit ? (
            <Input type="number" value={editValue} onChange={e => onEdit(e.target.value)} className="h-7 text-xs" />
          ) : (
            <p className="font-mono font-bold text-foreground">{fmt(used)}</p>
          )}
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Limite</p>
          <p className="font-mono font-bold text-foreground">{fmt(limit)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Restante</p>
          <p className={`font-mono font-bold ${remainingCls}`}>{fmt(remaining)}</p>
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ icon, title, current, target, pct, editing, editValue, onEdit }: {
  icon: React.ReactNode; title: string; current: string; target: string; pct: number;
  editing?: boolean; editValue?: string; onEdit?: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-foreground flex items-center gap-2">{icon}{title}</span>
        <span className="text-xs font-mono text-muted-foreground">{Math.round(pct)}%</span>
      </div>
      <Bar pct={pct} variant="profit" />
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Atual</p>
          {editing && onEdit ? (
            <Input type="number" value={editValue} onChange={e => onEdit(e.target.value)} className="h-7 text-xs" />
          ) : (
            <p className="font-mono font-bold text-foreground">{current}</p>
          )}
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Meta</p>
          <p className="font-mono font-bold text-foreground">{target}</p>
        </div>
      </div>
    </div>
  );
}

export default AccountDashboard;
