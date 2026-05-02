import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Trash2, Wallet, ChevronRight, Shield, AlertTriangle, XCircle } from 'lucide-react';
import { useAccounts, useDeleteAccount, computeAccountMetrics, type AccountRow } from '@/hooks/useAccountsStore';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

const fmt = (v: number) => `$${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

const statusConfig = {
  SAFE: { label: 'SEGURO', icon: Shield, className: 'bg-success/15 text-success' },
  WARNING: { label: 'ATENÇÃO', icon: AlertTriangle, className: 'bg-warning/15 text-warning' },
  DANGER: { label: 'CRÍTICO', icon: XCircle, className: 'bg-destructive/15 text-destructive' },
} as const;

function StatusBadge({ status }: { status: 'SAFE' | 'WARNING' | 'DANGER' }) {
  const c = statusConfig[status];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${c.className}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

function AccountRowCard({ account, index, onDelete }: { account: AccountRow; index: number; onDelete: (id: string) => void }) {
  const navigate = useNavigate();
  const m = computeAccountMetrics(account);
  const isPositive = m.profit >= 0;
  const pnlPct = account.start_balance > 0 ? ((m.profit / account.start_balance) * 100).toFixed(2) : '0.00';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="rounded-xl border border-border bg-card p-5 space-y-4 hover:border-primary/30 transition-colors cursor-pointer group"
      onClick={() => navigate(`/accounts/${account.id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground truncate">{account.nickname}</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
            {account.prop_firm || '—'} {account.program ? `• ${account.program}` : ''} {account.phase ? `• ${account.phase}` : ''}
          </p>
        </div>
        <StatusBadge status={m.status} />
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo Inicial</p>
          <p className="font-mono text-sm text-muted-foreground">{fmt(account.start_balance)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Equity Atual</p>
          <p className="font-mono font-bold text-foreground">{fmt(account.current_equity)}</p>
          <p className={`text-xs font-mono font-semibold ${isPositive ? 'text-success' : 'text-destructive'}`}>
            {isPositive ? '+' : ''}{pnlPct}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pode perder hoje</p>
          <p className="font-mono font-bold text-sm text-warning">{fmt(m.dailyRemaining)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Perda Total Restante</p>
          <p className="font-mono font-bold text-sm text-foreground">{fmt(m.totalRemaining)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-3 h-3" />
              Excluir
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
              <AlertDialogDescription>
                A conta "{account.nickname}" será removida permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.stopPropagation(); onDelete(account.id); }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          Abrir Painel <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </motion.div>
  );
}

const Accounts = () => {
  const navigate = useNavigate();
  const { data: accounts = [], isLoading } = useAccounts();
  const deleteMutation = useDeleteAccount();

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: 'Conta excluída', description: 'A conta foi removida.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao excluir.', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Minhas Contas</h1>
          <p className="text-xs text-muted-foreground">Cadastre e gerencie suas contas de prop firm.</p>
        </div>
        <button
          onClick={() => navigate('/accounts/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Conta
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-64 rounded-xl border border-border bg-card animate-pulse" />)}
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-foreground font-medium">Nenhuma conta cadastrada.</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Nova Conta" para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((account, i) => (
            <AccountRowCard key={account.id} account={account} index={i} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Accounts;
