import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccountsStore } from '@/pages/Accounts';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Link2, XCircle, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import type { Mt5ConnectionStatus } from '@/types/fortify';

const mt5StatusConfig: Record<Mt5ConnectionStatus, { label: string; icon: typeof Link2; className: string }> = {
  disconnected: { label: 'Desconectada', icon: XCircle, className: 'bg-muted text-muted-foreground' },
  connecting: { label: 'Conectando', icon: RefreshCw, className: 'bg-warning/15 text-warning' },
  connected: { label: 'Conectada', icon: Link2, className: 'bg-success/15 text-success' },
  syncing: { label: 'Sincronizando', icon: RefreshCw, className: 'bg-primary/15 text-primary' },
  authError: { label: 'Erro de autenticação', icon: AlertTriangle, className: 'bg-destructive/15 text-destructive' },
};

const AccountDashboard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accounts, addAccount } = useAccountsStore();

  const account = accounts.find(a => a.id === id);

  const [loadingMt5Data, setLoadingMt5Data] = useState(false);
  const [mt5DataError, setMt5DataError] = useState<string | null>(null);
  const [connection, setConnection] = useState<any | null>(null);
  const [syncingNow, setSyncingNow] = useState(false);
  const [snapshot, setSnapshot] = useState<any | null>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);

  const supabase = (window as any)?.supabase;

  useEffect(() => {
    if (id) {
      reloadAccountData();
    }
  }, [id]);

  const reloadAccountData = async () => {
    if (!supabase || !id) return;
    
    setLoadingMt5Data(true);
    setMt5DataError(null);
    
    try {
      const [accRes, connRes] = await Promise.all([
        supabase
          .from('trading_accounts')
          .select('id,user_id,nickname,broker,start_balance,current_balance,current_equity,highest_equity,status,created_at,updated_at')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('mt5_connections')
          .select('*')
          .eq('trading_account_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (accRes.error) throw accRes.error;
      if (connRes.error) throw connRes.error;

      console.log('AccountDashboard - Querying MT5 connections for trading_account_id:', id);
      console.log('AccountDashboard - Found connection:', connRes.data);
      setConnection(connRes.data ?? null);

      // Load synced MT5 data if connection exists
      if (connRes.data?.id) {
        const [snapRes, posRes, tradeRes] = await Promise.all([
          supabase
            .from('mt5_account_snapshots')
            .select('*')
            .eq('connection_id', connRes.data.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('mt5_positions')
            .select('*')
            .eq('connection_id', connRes.data.id)
            .order('created_at', { ascending: false }),
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

      if (accRes.data && !account) {
        const r = accRes.data as any;
        const startBalance = Number(r.start_balance ?? 0);
        const currentBalance = Number(r.current_balance ?? startBalance);
        const currentEquity = Number(r.current_equity ?? currentBalance);
        const highestEquityAllTime = Number(r.highest_equity ?? currentEquity);
        addAccount({
          id: String(r.id),
          userId: String(r.user_id ?? ''),
          nickname: String(r.nickname ?? ''),
          broker: String(r.broker ?? ''),
          baseCurrency: 'USD',
          startBalance,
          currentBalance,
          currentEquity,
          highestEquityAllTime,
          status: (r.status as any) ?? 'active',
          ruleSetId: 'custom',
          createdAt: String((r.created_at ?? new Date().toISOString()).split('T')[0]),
        } as any);
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
      const { data, error } = await supabase.functions.invoke('metaapi-sync', {
        body: { connectionId: connection.id },
      });
      
      if (error) {
        let errorMessage = 'Falha ao sincronizar dados.';
        if (error.message?.includes('Connection not found')) {
          errorMessage = 'Nenhuma conexão MT5 encontrada para esta conta. Configure a conexão primeiro.';
        } else if (error.message?.includes('Invalid credentials')) {
          errorMessage = 'Credenciais inválidas. Verifique a configuração da conexão.';
        } else if (error.message?.includes('Sync in progress')) {
          errorMessage = 'Sincronização já em andamento. Aguarde alguns minutos.';
        } else if (error.message?.includes('Rate limit exceeded')) {
          errorMessage = 'Limite de requisições excedido. Tente novamente mais tarde.';
        }
        toast.error(errorMessage || error.message || 'Erro ao sincronizar. Tente novamente.');
        return;
      }

      toast.success('Sincronização concluída.');
      await reloadAccountData();
    } catch (e: any) {
      toast.error('Erro ao sincronizar. Tente novamente.');
    } finally {
      setSyncingNow(false);
    }
  };

  const getStatusConfig = (status: string) => {
    return mt5StatusConfig[status as Mt5ConnectionStatus] || mt5StatusConfig.disconnected;
  };

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
      </div>

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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <p className="font-medium mt-1">{connection.sync_status || 'Unknown'}</p>
                    </div>
                  </div>
                  
                  {connection.sync_error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                      <p className="text-sm text-destructive">Last Error: {connection.sync_error}</p>
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
                <div>
                  <p className="text-sm text-muted-foreground">No MT5 connection found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Configure your MT5 connection to start syncing data.
                  </p>
                </div>
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
                      <p className="font-semibold">${snapshot.account_balance?.toLocaleString() || '0'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Equity</p>
                      <p className="font-semibold">${snapshot.equity?.toLocaleString() || '0'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Free Margin</p>
                      <p className="font-semibold">${snapshot.free_margin?.toLocaleString() || '0'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Profit</p>
                      <p className={`font-semibold ${snapshot.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                        ${snapshot.profit?.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Connection created, waiting for first sync</p>
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
                          <span className={`text-xs px-2 py-1 rounded ${pos.side === 'buy' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                            {pos.side?.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">{pos.volume}</span>
                          <span className={`font-semibold ${pos.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                            ${pos.profit?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No open positions</p>
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
                  <p className="text-sm text-muted-foreground">No recent trades</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default AccountDashboard;
