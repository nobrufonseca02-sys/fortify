import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Trash2, Wallet, ChevronRight, Shield, AlertTriangle, XCircle, Building2 } from 'lucide-react';
import { useAccounts, useDeleteAccount, computeAccountMetrics, type AccountRow } from '@/hooks/useAccountsStore';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

const fmt = (v: number) => `$${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

const statusConfig = {
  SAFE: { label: 'SEGURO', icon: Shield, className: 'bg-success/15 text-success border-success/20' },
  WARNING: { label: 'ATENÇÃO', icon: AlertTriangle, className: 'bg-warning/15 text-warning border-warning/20' },
  DANGER: { label: 'CRÍTICO', icon: XCircle, className: 'bg-destructive/15 text-destructive border-destructive/20' },
} as const;

function StatusBadge({ status }: { status: 'SAFE' | 'WARNING' | 'DANGER' }) {
  const c = statusConfig[status];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${c.className}`}>
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
      className="rounded-2xl border border-border bg-card p-5 space-y-4 hover:border-primary/35 transition-colors cursor-pointer group card-premium"
      onClick={() => navigate(`/accounts/${account.id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-foreground truncate group-hover:text-primary transition-colors">{account.nickname}</h3>
          <div className="flex items-center gap-2 mt-1 min-w-0">
            <p className="text-[10px] text-muted-foreground truncate">
              {account.prop_firm || '—'} {account.program ? `• ${account.program}` : ''} {account.phase ? `• ${account.phase}` : ''}
            </p>
          </div>
        </div>
        <StatusBadge status={m.status} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/50 bg-muted/15 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Equity</p>
          <p className="font-mono font-black text-base text-foreground mt-1">{fmt(account.current_equity)}</p>
          <p className={`text-[10px] font-mono font-semibold mt-1 ${isPositive ? 'text-success' : 'text-destructive'}`}>
            {isPositive ? '+' : ''}{pnlPct}%
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-muted/15 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Prop firm / Fase</p>
          <p className="text-sm font-semibold text-foreground mt-1 truncate">{account.prop_firm || '—'}</p>
          <p className="text-[11px] text-muted-foreground truncate">{account.phase || '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="rounded-xl border border-warning/15 bg-warning/5 p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Perda diária restante</p>
          <p className="font-mono font-black text-base text-foreground mt-1">{fmt(m.dailyRemaining)}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-muted/15 p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Perda total restante</p>
          <p className="font-mono font-black text-base text-foreground mt-1">{fmt(m.totalRemaining)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border/50">
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
          Abrir painel <ChevronRight className="w-3 h-3" />
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
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 md:p-6 card-premium">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <h1 className="text-lg font-black text-foreground truncate">Minhas Contas</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cadastro manual e monitoramento de regras. Escaneie rápido: risco restante e status.
            </p>
          </div>
          <button
            onClick={() => navigate('/accounts/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors btn-glow flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nova Conta
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <div key={i} className="h-72 rounded-2xl border border-border bg-card animate-pulse" />)}
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center card-premium">
          <Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-foreground font-medium">Nenhuma conta cadastrada.</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Nova Conta" para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {accounts.map((account, i) => (
            <AccountRowCard key={account.id} account={account} index={i} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Accounts;
