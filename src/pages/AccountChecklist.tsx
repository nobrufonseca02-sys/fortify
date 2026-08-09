import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccountsStore } from '@/hooks/useAccountsStore';
import { ArrowLeft } from 'lucide-react';
import type { TradingAccount } from '@/types/fortify';
import { supabase } from '@/integrations/supabase/client';
import { BetaReadinessChecklist } from '@/components/BetaReadinessChecklist';
import { buildBetaChecklist } from '@/lib/betaReadiness';
import { useAuth } from '@/hooks/useAuth';

const AccountChecklist = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accounts } = useAccountsStore();
  const { user } = useAuth();
  const [fallbackAccount, setFallbackAccount] = useState<TradingAccount | null>(null);
  const [connection, setConnection] = useState<any | null>(null);
  const [snapshot, setSnapshot] = useState<any | null>(null);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const account = accounts.find((a) => a.id === id) || fallbackAccount;

  useEffect(() => {
    if (!id || !user?.id) return;

    const load = async () => {
      setLoading(true);
      try {
        const [accRes, connRes, evalRes] = await Promise.all([
          supabase.from('trading_accounts').select('*').eq('id', id).eq('user_id', user.id).maybeSingle(),
          supabase
            .from('mt5_connections')
            .select('*')
            .eq('trading_account_id', id)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          (supabase
            .from('rule_evaluations' as any)
            .select('*')
            .eq('trading_account_id', id)
            .order('computed_at', { ascending: false }) as any),
        ]);

        setEvaluations(evalRes.error ? [] : (evalRes.data || []));
        setConnection(connRes.data ?? null);

        if (connRes.data?.id) {
          const { data: snap } = await supabase
            .from('mt5_account_snapshots')
            .select('*')
            .eq('connection_id', connRes.data.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          setSnapshot(snap ?? null);
        } else {
          setSnapshot(null);
        }

        if (accRes.data) {
          const r = accRes.data as any;
          const startBalance = Number(r.start_balance ?? 0);
          const currentBalance = Number(r.current_balance ?? startBalance);
          const currentEquity = Number(r.current_equity ?? currentBalance);
          setFallbackAccount({
            id: String(r.id),
            userId: String(r.user_id ?? ''),
            nickname: String(r.nickname ?? ''),
            broker: String(r.broker ?? ''),
            baseCurrency: String(r.base_currency ?? 'USD'),
            startBalance,
            currentBalance,
            currentEquity,
            highestEquityAllTime: Number(r.highest_equity ?? currentEquity),
            status: (r.status as any) ?? 'active',
            ruleSetId: String(r.rule_set_id ?? ''),
            createdAt: String((r.created_at ?? new Date().toISOString()).split('T')[0]),
            mt5Server: r.mt5_server || undefined,
            mt5Login: r.mt5_login || undefined,
            mt5ConnectionStatus: r.mt5_connection_status || undefined,
            mt5LastSyncAt: r.mt5_last_sync_at || undefined,
            mt5SyncError: r.mt5_sync_error || undefined,
          });
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, user?.id]);

  const betaChecklist = buildBetaChecklist({ account, connection, snapshot, evaluations });

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(`/accounts/${id}`)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Checklist beta da conta</h1>
          <p className="text-xs text-muted-foreground">
            {account?.nickname ? `${account.nickname} — ` : ''}o que falta para confiar nesta conta para monitoramento real.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Carregando checklist...</p>
        </div>
      ) : (
        <BetaReadinessChecklist
          items={betaChecklist}
          title="Checklist beta da conta"
          description="Use este checklist antes de tratar a conta como pronta para monitoramento real."
        />
      )}
    </div>
  );
};

export default AccountChecklist;
