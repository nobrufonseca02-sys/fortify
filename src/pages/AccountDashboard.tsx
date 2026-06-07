import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccountsStore } from '@/hooks/useAccountsStore';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Link2, XCircle, AlertTriangle, TrendingUp, TrendingDown, Shield } from 'lucide-react';
import type { Mt5ConnectionStatus, TradingAccount } from '@/types/fortify';
import { supabase } from '@/integrations/supabase/client';
import { BetaReadinessChecklist, BetaResponsibilityNotice, GuidedEmptyState } from '@/components/BetaReadinessChecklist';
import { buildBetaChecklist, getSyncErrorMessage, getSyncStatusMeta, maskLogin } from '@/lib/betaReadiness';

const mt5StatusConfig: Record<Mt5ConnectionStatus, { label: string; icon: typeof Link2; className: string }> = {
  disconnected: { label: 'Desconectada', icon: XCircle, className: 'bg-muted text-muted-foreground' },
  connecting: { label: 'Conectando', icon: RefreshCw, className: 'bg-warning/15 text-warning' },
  connected: { label: 'Conectada', icon: Link2, className: 'bg-success/15 text-success' },
  syncing: { label: 'Sincronizando', icon: RefreshCw, className: 'bg-primary/15 text-primary' },
  auth_error: { label: 'Erro de autenticação', icon: AlertTriangle, className: 'bg-destructive/15 text-destructive' },
};

const AccountDashboard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accounts } = useAccountsStore();
  const [fallbackAccount, setFallbackAccount] = useState<TradingAccount | null>(null);

  const account = accounts.find(a => a.id === id) || fallbackAccount;

  const [loadingMt5Data, setLoadingMt5Data] = useState(false);
  const [mt5DataError, setMt5DataError] = useState<string | null>(null);
  const [connection, setConnection] = useState<any | null>(null);
  const [syncingNow, setSyncingNow] = useState(false);
  const [snapshot, setSnapshot] = useState<any | null>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      reloadAccountData();
    }
  }, [id]);

  const reloadAccountData = async () => {
    if (!id) return;
    
    setLoadingMt5Data(true);
    setMt5DataError(null);
    
    try {
      const [accRes, connRes, evalRes] = await Promise.all([
        supabase
          .from('trading_accounts')
          .select('*')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('mt5_connections')
          .select('*')
          .eq('trading_account_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        (supabase
          .from('rule_evaluations' as any)
          .select('*')
          .eq('trading_account_id', id)
          .order('computed_at', { ascending: false }) as any),
      ]);

      if (accRes.error) throw accRes.error;
      if (connRes.error) throw connRes.error;
      if (evalRes.error) console.error('Failed to load rule evaluations:', evalRes.error);
      setEvaluations(evalRes.error ? [] : (evalRes.data || []));

      setConnection(connRes.data ?? null);

      // Load synced MT5 data if connection exists
      if (connRes.data?.id) {
        const [snapRes, posRes, tradeRes] = await Promise.all([
          supabase
            .from('mt5_account_snapshots')
            .select('*')
            .eq('connection_id', connRes.data.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('mt5_positions')
            .select('*')
            .eq('connection_id', connRes.data.id)
            .order('updated_at', { ascending: false }),
          supabase
            .from('mt5_trades')
            .select('*')
            .eq('connection_id', connRes.data.id)
            .order('created_at', { ascending: false })
            .limit(20),
        ]);

        if (snapRes.error) console.error('Failed to load snapshot:', snapRes.error);
        else setSnapshot(snapRes.data);

        if (posRes.error) console.error('Failed to load positions:', posRes.error);
        else setPositions(posRes.data || []);

        if (tradeRes.error) console.error('Failed to load trades:', tradeRes.error);
        else setTrades(tradeRes.data || []);
      } else {
        setSnapshot(null);
        setPositions([]);
        setTrades([]);
      }

      if (accRes.data) {
        const r = accRes.data as any;
        const startBalance = Number(r.start_balance ?? 0);
        const currentBalance = Number(r.current_balance ?? startBalance);
        const currentEquity = Number(r.current_equity ?? currentBalance);
        const highestEquityAllTime = Number(r.highest_equity ?? currentEquity);
        setFallbackAccount({
          id: String(r.id),
          userId: String(r.user_id ?? ''),
          nickname: String(r.nickname ?? ''),
          broker: String(r.broker ?? ''),
          baseCurrency: String(r.base_currency ?? 'USD'),
          startBalance,
          currentBalance,
          currentEquity,
          highestEquityAllTime,
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
    } catch (e: any) {
      const msg = e?.message || 'Falha ao carregar dados do MT5 via Supabase.';
      setMt5DataError(msg);
    } finally {
      setLoadingMt5Data(false);
    }
  };

  const handleSyncNow = async () => {
    if (!supabase || !id || !connection) {
      toast.error('Conexão MT5 não encontrada.');
      return;
    }

    setSyncingNow(true);
    try {
      const gatewayUrl = (import.meta as any).env?.VITE_METAAPI_GATEWAY_URL || 'http://localhost:3001';
      const res = await fetch(`${gatewayUrl}/metaapi/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: connection.id,
          userId: account?.userId || connection?.user_id || '',
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        console.error('MetaApi sync failed:', data);
        let errorMessage = getSyncErrorMessage(data);
        if (errorMessage?.includes('Connection not found')) {
          errorMessage = 'Nenhuma conexão MT5 encontrada para esta conta. Configure a conexão primeiro.';
        } else if (errorMessage?.includes('Invalid credentials')) {
          errorMessage = 'Credenciais inválidas. Verifique a configuração da conexão.';
        } else if (errorMessage?.includes('Sync in progress')) {
          errorMessage = 'Sincronização já em andamento. Aguarde alguns minutos.';
        } else if (errorMessage?.includes('Rate limit exceeded')) {
          errorMessage = 'Limite de requisições excedido. Tente novamente mais tarde.';
        }
        toast.error(errorMessage || 'Erro ao sincronizar. Tente novamente.');
        return;
      }

      toast.success('Sincronização concluída.');
      await reloadAccountData();
    } catch (e: any) {
      console.error('MetaApi sync error:', e);
      toast.error('Erro ao sincronizar. Tente novamente ou confirme se o gateway local está ativo.');
    } finally {
      setSyncingNow(false);
    }
  };

  const getStatusConfig = (status: string) => {
    return mt5StatusConfig[status as Mt5ConnectionStatus] || mt5StatusConfig.disconnected;
  };

  const betaChecklist = buildBetaChecklist({
    account,
    connection,
    snapshot,
    evaluations,
  });
  const syncStatus = getSyncStatusMeta(connection?.sync_status, connection?.last_sync_at, connection?.sync_error);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/accounts')} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Account Dashboard</h1>
          <p className="text-xs text-muted-foreground">Monitor your trading account performance</p>
        </div>
        <Button onClick={() => navigate(`/accounts/${id}/rules`)} variant="outline">
          <Shield className="w-4 h-4 mr-2" />
          Rules / Risk Plan
        </Button>
      </div>

      {account && (
        <BetaReadinessChecklist
          items={betaChecklist}
          title="Account beta checklist"
          description="Use this checklist before treating the account as ready for real monitoring."
          compact
        />
      )}

      {loadingMt5Data ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Loading account data...</p>
        </div>
      ) : mt5DataError ? (
        <div className="text-center py-8">
          <p className="text-sm text-destructive">{mt5DataError}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Account Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Account Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Account Name</p>
                  <p className="font-semibold">{account?.nickname || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="font-semibold">${account?.currentBalance?.toLocaleString() || '0'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-semibold">{account?.status || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">MT5</p>
                  <p className="font-semibold">{maskLogin(account?.mt5Login || connection?.mt5_login)} · {account?.mt5Server || connection?.mt5_server || 'No server'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* MT5 Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle>MT5 Connection</CardTitle>
            </CardHeader>
            <CardContent>
              {connection ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <div className="flex items-center gap-2 mt-1">
                        {(() => {
                          const statusConfig = getStatusConfig(connection.connection_status);
                          const StatusIcon = statusConfig.icon;
                          return (
                            <>
                              <StatusIcon className={`w-4 h-4 ${statusConfig.className}`} />
                              <span className="font-medium">{statusConfig.label}</span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Provider</p>
                      <p className="font-medium mt-1">{connection.provider || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Sync</p>
                      <p className="font-medium mt-1">
                        {connection.last_sync_at ? new Date(connection.last_sync_at).toLocaleString() : 'Never'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sync Status</p>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider mt-1 ${syncStatus.className}`}>
                        {syncStatus.label}
                      </span>
                    </div>
                  </div>
                  
                  {connection.sync_error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                      <p className="text-sm font-medium text-destructive">Sync failed</p>
                      <p className="text-xs text-destructive/90 mt-1">{connection.sync_error}</p>
                      <p className="text-xs text-muted-foreground mt-2">Try Sync Now again. If it repeats, review MetaApi account status and the gateway logs.</p>
                    </div>
                  )}

                  <Button onClick={handleSyncNow} disabled={syncingNow}>
                    {syncingNow ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync Now
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <GuidedEmptyState
                  icon={Link2}
                  title="No MT5 connection found"
                  description="Connect MT5 first so Fortify can fetch real balance, equity, positions and trades for this account."
                  actionLabel="Connect MT5"
                  onAction={() => navigate('/mt5')}
                />
              )}
            </CardContent>
          </Card>

          {/* Account Snapshot */}
          {connection && (
            <Card>
              <CardHeader>
                <CardTitle>Account Snapshot</CardTitle>
              </CardHeader>
              <CardContent>
                {snapshot ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Balance</p>
                      <p className="font-semibold">${snapshot.balance?.toLocaleString() || '0'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Equity</p>
                      <p className="font-semibold">${snapshot.equity?.toLocaleString() || '0'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Daily PnL</p>
                      <p className={`font-semibold ${snapshot.daily_pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                        ${snapshot.daily_pnl?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Floating PnL</p>
                      <p className={`font-semibold ${snapshot.floating_pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                        ${snapshot.floating_pnl?.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                    <p className="text-sm font-medium text-foreground">Connected, waiting for first sync</p>
                    <p className="text-xs text-muted-foreground mt-1">Run Sync Now to create the first account snapshot and unlock risk calculations.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Open Positions */}
          {connection && (
            <Card>
              <CardHeader>
                <CardTitle>Open Positions</CardTitle>
              </CardHeader>
              <CardContent>
                {positions.length > 0 ? (
                  <div className="space-y-2">
                    {positions.map((pos, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-sm">{pos.symbol}</span>
                          <span className="text-xs px-2 py-1 rounded bg-primary/15 text-primary">
                            OPEN
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">{pos.volume}</span>
                          <span className={`font-semibold ${pos.floating_pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                            ${pos.floating_pnl?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="text-sm font-medium text-foreground">No open positions</p>
                    <p className="text-xs text-muted-foreground mt-1">This is normal after sync when the MT5 account has no active trades. Risk still uses balance, equity and closed trade history.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Trades */}
          {connection && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Trades</CardTitle>
              </CardHeader>
              <CardContent>
                {trades.length > 0 ? (
                  <div className="space-y-2">
                    {trades.map((trade, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-sm">{trade.symbol}</span>
                          <span className={`text-xs px-2 py-1 rounded ${trade.side === 'buy' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                            {trade.side?.toUpperCase()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {trade.created_at ? new Date(trade.created_at).toLocaleString() : 'Unknown'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">{trade.volume}</span>
                          <span className={`font-semibold ${trade.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                            ${trade.profit?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                    <p className="text-sm font-medium text-foreground">No recent trades synced</p>
                    <p className="text-xs text-muted-foreground mt-1">Some rules need trade history. If this account is new, keep syncing after trading sessions; otherwise confirm the MetaApi account has access to history.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <BetaResponsibilityNotice />
        </div>
      )}
    </div>
  );
};

export default AccountDashboard;
