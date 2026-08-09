import { Navigate, useNavigate } from 'react-router-dom';
import { Brain, ChevronRight, Link2 } from 'lucide-react';
import { useAccountsStore } from '@/hooks/useAccountsStore';
import { GuidedEmptyState } from '@/components/BetaReadinessChecklist';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const fmtMoney = (value: number | null | undefined) =>
  `$${Number(value ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`;

function CoachHeader({ subtitle }: { subtitle: string }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-10 w-10 border border-primary/25">
        <AvatarFallback className="bg-primary/15 text-primary">
          <Brain className="h-5 w-5" />
        </AvatarFallback>
      </Avatar>
      <div>
        <p className="eyebrow">Fortify</p>
        <h1 className="text-lg font-bold text-foreground -mt-0.5">Coach de risco</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

export default function Coach() {
  const navigate = useNavigate();
  const { accounts, isLoading } = useAccountsStore();

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando coach de risco...</div>;
  }

  if (accounts.length === 0) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        <CoachHeader subtitle="Converse a qualquer momento sobre disciplina e gestão de risco." />
        <GuidedEmptyState
          icon={Link2}
          title="Nenhuma conta conectada ainda"
          description="O coach precisa dos dados reais de uma conta (regras, histórico de trades, plano do dia) para dar orientação de disciplina. Conecte uma conta primeiro."
          actionLabel="Conectar conta"
          onAction={() => navigate('/accounts')}
        />
      </div>
    );
  }

  if (accounts.length === 1) {
    return <Navigate to={`/accounts/${accounts[0].id}/coach`} replace />;
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <CoachHeader subtitle="Escolha a conta que você quer discutir com o coach." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {accounts.map((account) => (
          <button
            key={account.id}
            type="button"
            onClick={() => navigate(`/accounts/${account.id}/coach`)}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left hover:border-primary/40 hover:bg-muted/20 transition-colors"
          >
            <div className="min-w-0">
              <p className="font-medium text-sm text-foreground truncate">{account.nickname || 'Conta sem nome'}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {account.broker || 'Broker não definido'} · equity {fmtMoney(account.currentEquity)}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
