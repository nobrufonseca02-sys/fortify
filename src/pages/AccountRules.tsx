import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, AlertTriangle, Target, CalendarDays, Edit3, Save, X, Lock, Info } from 'lucide-react';
import { useAccount, useAccounts, useUpdateAccount, type AccountRow } from '@/hooks/useAccountsStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const fmt = (v: number) => `$${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

interface RuleDef {
  key: 'daily_loss_limit' | 'total_loss_limit' | 'profit_target' | 'min_trading_days';
  name: string;
  description: string;
  severity: 'hard' | 'soft';
  icon: typeof Shield;
  unit: '$' | 'days';
  highlight?: boolean;
}

const RULES: RuleDef[] = [
  {
    key: 'daily_loss_limit', name: 'Perda diária máxima',
    description: 'Limite de perda permitida em um único dia. Atingir esse valor encerra a conta imediatamente.',
    severity: 'hard', icon: AlertTriangle, unit: '$', highlight: true,
  },
  {
    key: 'total_loss_limit', name: 'Perda total máxima',
    description: 'Limite de perda acumulada desde o início. Atingir esse valor reprova a conta.',
    severity: 'hard', icon: Shield, unit: '$', highlight: true,
  },
  {
    key: 'profit_target', name: 'Meta de lucro',
    description: 'Lucro necessário para passar de fase. 0 indica conta funded sem meta.',
    severity: 'hard', icon: Target, unit: '$',
  },
  {
    key: 'min_trading_days', name: 'Dias mínimos de trading',
    description: 'Quantidade mínima de dias com pelo menos 1 trade para cumprir o desafio.',
    severity: 'hard', icon: CalendarDays, unit: 'days',
  },
];

const AccountRules = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  // If no id in URL → use first account
  const { data: accounts = [] } = useAccounts();
  const { data: targetAccount } = useAccount(id);
  const account: AccountRow | undefined = id ? targetAccount ?? undefined : accounts[0];

  const [selectedId, setSelectedId] = useState<string | undefined>(account?.id);
  const effective = useMemo(
    () => (id ? targetAccount : accounts.find(a => a.id === selectedId) ?? accounts[0]),
    [id, targetAccount, accounts, selectedId],
  );

  const updateMutation = useUpdateAccount();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  const startEdit = () => {
    if (!effective) return;
    setValues({
      daily_loss_limit: String(effective.daily_loss_limit),
      total_loss_limit: String(effective.total_loss_limit),
      profit_target: String(effective.profit_target),
      min_trading_days: String(effective.min_trading_days),
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!effective) return;
    try {
      await updateMutation.mutateAsync({
        id: effective.id,
        patch: {
          daily_loss_limit: parseFloat(values.daily_loss_limit) || 0,
          total_loss_limit: parseFloat(values.total_loss_limit) || 0,
          profit_target: parseFloat(values.profit_target) || 0,
          min_trading_days: parseInt(values.min_trading_days) || 0,
        },
      });
      toast({ title: 'Regras atualizadas' });
      setEditing(false);
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao salvar.', variant: 'destructive' });
    }
  };

  if (!accounts.length) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center">
        <p className="text-sm text-muted-foreground">Você ainda não tem contas cadastradas.</p>
        <Button className="mt-4 btn-glow" onClick={() => navigate('/accounts/new')}>Criar primeira conta</Button>
      </div>
    );
  }

  if (!effective) {
    return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        {id && (
          <button onClick={() => navigate(`/accounts/${id}`)} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black text-foreground">Regras da conta</h1>
          <p className="text-xs text-muted-foreground">Gestão manual: defina limites e mantenha a operação dentro das regras.</p>
        </div>
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
            <Edit3 className="w-4 h-4 mr-1.5" /> Editar
          </Button>
        )}
      </div>

      {!id && accounts.length > 1 && (
        <div className="rounded-2xl border border-border bg-card p-3 card-premium">
          <select
            value={effective.id}
            onChange={e => setSelectedId(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.nickname}</option>
            ))}
          </select>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5 card-premium">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">Conta selecionada</p>
            <p className="text-sm font-black text-foreground truncate">{effective.nickname}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {effective.prop_firm || '—'} {effective.program ? `• ${effective.program}` : ''} {effective.phase ? `• ${effective.phase}` : ''} • Saldo: {fmt(effective.start_balance)}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Críticas</p>
                <p className="text-xs font-semibold text-foreground">Perdas diária e total</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 card-premium">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Dica: mantenha esses valores iguais aos limites oficiais do desafio. Atualize o uso/Equity no painel da conta.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {RULES.map((rule, i) => {
          const value = (effective as any)[rule.key] as number;
          const Icon = rule.icon;
          const severityCls = rule.severity === 'hard'
            ? 'bg-destructive/12 text-destructive border-destructive/20'
            : 'bg-warning/12 text-warning border-warning/20';
          const frameCls = rule.highlight ? 'border-primary/25 bg-primary/5' : 'border-border';

          return (
            <motion.div
              key={rule.key}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-2xl border ${frameCls} bg-card p-5 space-y-3 card-premium`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${rule.highlight ? 'text-primary' : 'text-primary'}`} />
                  <h3 className="font-semibold text-foreground text-sm">{rule.name}</h3>
                </div>
                <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full border ${severityCls}`}>
                  {rule.severity}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">{rule.description}</p>

              <div className="pt-3 border-t border-border/50">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">Limite atual</p>
                {editing ? (
                  <Input
                    type="number"
                    value={values[rule.key] ?? ''}
                    onChange={e => setValues(v => ({ ...v, [rule.key]: e.target.value }))}
                    min="0"
                    step={rule.unit === 'days' ? '1' : '100'}
                    className="h-9 text-sm"
                  />
                ) : (
                  <p className="font-mono font-black text-xl text-foreground">
                    {value > 0
                      ? rule.unit === 'days' ? `${value} dias` : fmt(value)
                      : '—'}
                  </p>
                )}
                {rule.highlight && !editing && value > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Regra crítica: mantenha uma margem de segurança e ajuste o risco por operação.
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AccountRules;
