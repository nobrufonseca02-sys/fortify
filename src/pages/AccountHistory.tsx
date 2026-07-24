import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccountsStore, type DeletedAccount } from '@/hooks/useAccountsStore';
import { TradingAccount } from '@/types/fortify';
import {
  Trash2, RotateCcw, XCircle, Clock, Wallet, AlertTriangle,
  Shield, Archive, ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { GuidedEmptyState } from '@/components/BetaReadinessChecklist';

const fmt = (v: number) => `$${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

const AccountHistory = () => {
  const { deletedAccounts, restoreAccount, permanentlyDelete } = useAccountsStore();

  const handleRestore = (id: string, name: string) => {
    restoreAccount(id);
    toast({ title: 'Conta restaurada', description: `"${name}" foi restaurada com sucesso.` });
  };

  const handlePermanentDelete = (id: string, name: string) => {
    permanentlyDelete(id);
    toast({ title: 'Conta excluída permanentemente', description: `"${name}" foi removida definitivamente.`, variant: 'destructive' });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Archive className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-lg font-bold text-foreground">Histórico de Contas</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Contas excluídas ficam aqui. Você pode restaurá-las ou excluí-las permanentemente.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total Excluídas</p>
          <p className="text-2xl font-bold font-mono text-foreground">{deletedAccounts.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Valor Total</p>
          <p className="text-2xl font-bold font-mono text-foreground">
            {fmt(deletedAccounts.reduce((s, d) => s + d.account.startBalance, 0))}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Última Exclusão</p>
          <p className="text-sm font-mono text-foreground">
            {deletedAccounts.length > 0
              ? fmtDate(deletedAccounts[deletedAccounts.length - 1].deletedAt)
              : '—'}
          </p>
        </div>
      </div>

      {/* Deleted accounts list */}
      {deletedAccounts.length === 0 ? (
        <GuidedEmptyState
          icon={Wallet}
          title="Nenhuma conta arquivada"
          description="Tudo certo por aqui. Contas removidas pela UI aparecem neste histórico para restauração antes de qualquer exclusão definitiva local."
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {deletedAccounts.map((entry, i) => {
              const { account, deletedAt } = entry;
              const pnl = account.currentBalance - account.startBalance;
              const pnlPct = account.startBalance > 0 ? ((pnl / account.startBalance) * 100).toFixed(2) : '0.00';
              const isPositive = pnl >= 0;

              return (
                <motion.div
                  key={account.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12, height: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Info */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Wallet className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{account.nickname}</h3>
                        <p className="text-[10px] text-muted-foreground">{account.broker}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo Inicial</p>
                            <p className="font-mono text-sm text-foreground">{fmt(account.startBalance)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Equity Final</p>
                            <p className="font-mono text-sm text-foreground">{fmt(account.currentEquity)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">P&L</p>
                            <p className={`font-mono text-sm font-semibold ${isPositive ? 'text-success' : 'text-destructive'}`}>
                              {isPositive ? '+' : ''}{pnlPct}%
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>Excluída em {fmtDate(deletedAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleRestore(account.id, account.nickname)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-accent transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restaurar
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-destructive/30 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors">
                            <XCircle className="w-3.5 h-3.5" />
                            Excluir
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
                            <AlertDialogDescription>
                              A conta "{account.nickname}" será removida definitivamente. Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handlePermanentDelete(account.id, account.nickname)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir definitivamente
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default AccountHistory;
