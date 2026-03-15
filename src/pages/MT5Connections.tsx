import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Link2, Unlink, Loader2, AlertTriangle, CheckCircle2, RefreshCw, Trash2, ChevronRight, Server, Settings2 } from 'lucide-react';
import { useMT5Connections, useCreateMT5Connection, useDeleteMT5Connection } from '@/hooks/useMT5';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createClient } from '@supabase/supabase-js';

const STATUS_MAP: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  connected: { label: 'Conectada', icon: CheckCircle2, className: 'text-success bg-success/10' },
  connecting: { label: 'Conectando', icon: Loader2, className: 'text-info bg-info/10' },
  syncing: { label: 'Sincronizando', icon: RefreshCw, className: 'text-info bg-info/10' },
  disconnected: { label: 'Desconectada', icon: Unlink, className: 'text-muted-foreground bg-muted' },
  auth_error: { label: 'Erro de autenticacao', icon: AlertTriangle, className: 'text-destructive bg-destructive/10' },
};

const getSupabaseUrl = () =>
  (import.meta as any)?.env?.VITE_SUPABASE_URL ||
  (import.meta as any)?.env?.VITE_PUBLIC_SUPABASE_URL ||
  (window as any)?.__SUPABASE_URL__;

const getSupabaseAnonKey = () =>
  (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY ||
  (import.meta as any)?.env?.VITE_PUBLIC_SUPABASE_ANON_KEY ||
  (window as any)?.__SUPABASE_ANON_KEY__;

const MT5Connections = () => {
  const navigate = useNavigate();
  const params = useParams();
  const tradingAccountId = (params as any)?.accountId || (params as any)?.id;

  const { data: connections, isLoading } = useMT5Connections();
  const createMutation = useCreateMT5Connection();
  const deleteMutation = useDeleteMT5Connection();
  const [showForm, setShowForm] = useState(false);

  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();
  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: true } });
  }, [supabaseUrl, supabaseAnonKey]);

  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [savingAccountDialog, setSavingAccountDialog] = useState(false);
  const [syncingNow, setSyncingNow] = useState(false);

  // Form (global list)
  const [accountName, setAccountName] = useState('');
  const [mt5Login, setMt5Login] = useState('');
  const [mt5Server, setMt5Server] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [accountType, setAccountType] = useState('demo');
  const [propFirm, setPropFirm] = useState('');

  // Account page dialog form
  const [dialogMt5Login, setDialogMt5Login] = useState('');
  const [dialogMt5Server, setDialogMt5Server] = useState('');
  const [dialogBrokerName, setDialogBrokerName] = useState('');
  const [dialogProvider, setDialogProvider] = useState('');
  const [dialogStatus, setDialogStatus] = useState<string>('disconnected');

  const scopedConnection = useMemo(() => {
    if (!tradingAccountId) return null;
    const list = Array.isArray(connections) ? connections : [];
    return list.find((c: any) => String(c.trading_account_id) === String(tradingAccountId)) || null;
  }, [connections, tradingAccountId]);

  useEffect(() => {
    let cancelled = false;

    const loadAccountConnection = async () => {
      if (!showAccountDialog) return;
      if (!supabase || !tradingAccountId) return;

      try {
        const res = await supabase
          .from('mt5_connections')
          .select('id,mt5_login,mt5_server,broker_name,provider,connection_status')
          .eq('trading_account_id', tradingAccountId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (res.error) throw res.error;
        if (cancelled) return;

        const row = res.data;
        setEditingConnectionId(row?.id ? String(row.id) : null);
        setDialogMt5Login(String(row?.mt5_login ?? ''));
        setDialogMt5Server(String(row?.mt5_server ?? ''));
        setDialogBrokerName(String(row?.broker_name ?? ''));
        setDialogProvider(String(row?.provider ?? ''));
        setDialogStatus(String(row?.connection_status ?? 'disconnected'));
      } catch {
        if (cancelled) return;
        setEditingConnectionId(null);
        setDialogMt5Login('');
        setDialogMt5Server('');
        setDialogBrokerName('');
        setDialogProvider('');
        setDialogStatus('disconnected');
      }
    };

    loadAccountConnection();

    return () => {
      cancelled = true;
    };
  }, [showAccountDialog, supabase, tradingAccountId]);

  const openAccountDialog = async () => {
    if (!tradingAccountId) return;
    setShowAccountDialog(true);
  };

  const handleAccountDialogSave = async () => {
    if (!supabase || !tradingAccountId) {
      toast({ title: 'Supabase indisponível', description: 'Nao foi possivel salvar a conexao.', variant: 'destructive' });
      return;
    }
    if (!dialogMt5Login || !dialogMt5Server || !dialogBrokerName || !dialogProvider) return;

    setSavingAccountDialog(true);
    try {
      if (editingConnectionId) {
        const res = await supabase
          .from('mt5_connections')
          .update({
            mt5_login: dialogMt5Login,
            mt5_server: dialogMt5Server,
            broker_name: dialogBrokerName,
            provider: dialogProvider,
          })
          .eq('id', editingConnectionId)
          .select('id,mt5_login,mt5_server,broker_name,provider,connection_status')
          .single();

        if (res.error) throw res.error;
        setDialogStatus(String(res.data?.connection_status ?? dialogStatus));
        toast({ title: 'Credenciais atualizadas', description: 'Conexao MT5 atualizada em mt5_connections.' });
      } else {
        const res = await supabase
          .from('mt5_connections')
          .insert({
            trading_account_id: tradingAccountId,
            mt5_login: dialogMt5Login,
            mt5_server: dialogMt5Server,
            broker_name: dialogBrokerName,
            provider: dialogProvider,
          })
          .select('id,mt5_login,mt5_server,broker_name,provider,connection_status')
          .single();

        if (res.error) throw res.error;
        setEditingConnectionId(String(res.data.id));
        setDialogStatus(String(res.data?.connection_status ?? 'disconnected'));
        toast({ title: 'Conexao registrada', description: 'Dados salvos em mt5_connections.' });
      }

      setShowAccountDialog(false);
    } catch {
      toast({ title: 'Erro ao salvar conexao', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSavingAccountDialog(false);
    }
  };

  const handleSyncNow = async () => {
    if (!supabase || !tradingAccountId) {
      toast({ title: 'Supabase indisponível', description: 'Nao foi possivel sincronizar.', variant: 'destructive' });
      return;
    }

    setSyncingNow(true);
    try {
      const res = await supabase.functions.invoke('sync-mt5-account', {
        body: { tradingAccountId: tradingAccountId },
      });

      if ((res as any)?.error) {
        const err: any = (res as any).error;
        throw new Error(err?.message || 'Falha ao sincronizar.');
      }

      toast({ title: 'Sincronizacao concluida', description: 'Dados atualizados via Edge Function.' });
    } catch (e: any) {
      toast({ title: 'Erro na sincronizacao', description: e?.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSyncingNow(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName || !mt5Login || !mt5Server || !brokerName) return;
    try {
      await createMutation.mutateAsync({
        account_name: accountName,
        mt5_login: mt5Login,
        mt5_server: mt5Server,
        broker_name: brokerName,
        account_type: accountType,
        prop_firm: propFirm || undefined,
      });
      toast({ title: 'Conta registrada', description: 'Aguardando sincronizacao com o backend.' });
      setShowForm(false);
      setAccountName(''); setMt5Login(''); setMt5Server(''); setBrokerName(''); setPropFirm('');
    } catch {
      toast({ title: 'Erro ao registrar conta', description: 'Tente novamente.', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: 'Conta removida', description: `"${name}" foi desconectada.` });
    } catch {
      toast({ title: 'Erro ao remover', variant: 'destructive' });
    }
  };

  const scopedStatus = STATUS_MAP[scopedConnection?.connection_status] || STATUS_MAP.disconnected;
  const ScopedStatusIcon = scopedStatus.icon;
  const scopedIsAnimated = scopedConnection?.connection_status === 'connecting' || scopedConnection?.connection_status === 'syncing';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Contas MT5</h1>
          <p className="text-xs text-muted-foreground">Conecte suas contas MetaTrader 5 para sincronizacao automatica.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-glow flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground"
        >
          <Plus className="w-4 h-4" />
          Conectar Conta
        </button>
      </div>

      {/* Account scoped block (used in individual account page) */}
      {tradingAccountId && (
        <div className="card-premium rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Conexao MT5</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${scopedStatus.className}`}>
                  <ScopedStatusIcon className={`w-3 h-3 ${scopedIsAnimated ? 'animate-spin' : ''}`} />
                  {scopedStatus.label}
                </span>
                {scopedConnection?.provider && (
                  <span className="text-[10px] text-muted-foreground">Provider: {scopedConnection.provider}</span>
                )}
              </div>
              {scopedConnection ? (
                <p className="text-[10px] text-muted-foreground mt-1 truncate">
                  Login: {scopedConnection.mt5_login} — {scopedConnection.mt5_server} — {scopedConnection.broker_name}
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground mt-1">Nenhuma conexao registrada para esta conta.</p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncNow}
                disabled={!scopedConnection || syncingNow}
              >
                <RefreshCw className={`w-4 h-4 ${syncingNow ? 'animate-spin' : ''}`} />
                Sincronizar agora
              </Button>

              <Button
                variant={scopedConnection ? 'outline' : 'default'}
                size="sm"
                onClick={openAccountDialog}
                className={scopedConnection ? '' : 'btn-glow'}
              >
                {scopedConnection ? (
                  <>
                    <Settings2 className="w-4 h-4" />
                    Atualizar credenciais
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    Conectar conta
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingConnectionId ? 'Atualizar conexao MT5' : 'Conectar conta MT5'}</DialogTitle>
            <DialogDescription>
              Informe os dados da sua conexao. Esta etapa apenas cadastra/atualiza credenciais em mt5_connections.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Login MT5</label>
              <Input value={dialogMt5Login} onChange={e => setDialogMt5Login(e.target.value)} placeholder="Ex.: 12345678" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Servidor MT5</label>
              <Input value={dialogMt5Server} onChange={e => setDialogMt5Server(e.target.value)} placeholder="Ex.: ICMarketsSC-Live" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Broker</label>
              <Input value={dialogBrokerName} onChange={e => setDialogBrokerName(e.target.value)} placeholder="Ex.: ICMarkets, Pepperstone" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Provider</label>
              <Input value={dialogProvider} onChange={e => setDialogProvider(e.target.value)} placeholder="Ex.: mt5" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[10px] text-muted-foreground">Status atual: {dialogStatus}</span>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAccountDialog(false)} disabled={savingAccountDialog}>Cancelar</Button>
            <Button onClick={handleAccountDialogSave} disabled={savingAccountDialog || !dialogMt5Login || !dialogMt5Server || !dialogBrokerName || !dialogProvider}>
              {savingAccountDialog ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info block */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex gap-3 items-start">
        <Server className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Sincronizacao automatica</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Ao registrar sua conta MT5, o backend validara a conexao e sincronizara historico de trades,
            posicoes abertas e snapshots diarios. Use "Sincronizar agora" para executar manualmente.
          </p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="card-premium rounded-xl border border-border bg-card p-6 space-y-5"
        >
          <h2 className="text-sm font-semibold text-foreground">Registrar Conta MT5</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome da Conta" value={accountName} onChange={setAccountName} placeholder="Ex.: FTMO 100k Challenge" required />
            <Field label="Login MT5" value={mt5Login} onChange={setMt5Login} placeholder="Ex.: 12345678" required />
            <Field label="Servidor MT5" value={mt5Server} onChange={setMt5Server} placeholder="Ex.: FTMODemo-Server" required />
            <Field label="Corretora" value={brokerName} onChange={setBrokerName} placeholder="Ex.: ICMarkets, Pepperstone" required />
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tipo de Conta</label>
              <select
                value={accountType}
                onChange={e => setAccountType(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="demo">Demo</option>
                <option value="live">Real</option>
                <option value="challenge">Desafio</option>
                <option value="funded">Funded</option>
              </select>
            </div>
            <Field label="Prop Firm (opcional)" value={propFirm} onChange={setPropFirm} placeholder="Ex.: FTMO, E8, FundingPips" />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={createMutation.isPending} className="btn-glow flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-primary-foreground disabled:opacity-50">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              Conectar Conta
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cancelar
            </button>
          </div>
        </motion.form>
      )}

      {/* Connections List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : connections && connections.length > 0 ? (
        <div className="space-y-3">
          {connections.map((conn: any, i: number) => {
            const status = STATUS_MAP[conn.connection_status] || STATUS_MAP.disconnected;
            const StatusIcon = status.icon;
            const isAnimated = conn.connection_status === 'connecting' || conn.connection_status === 'syncing';
            return (
              <motion.div
                key={conn.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card-premium rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Server className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{conn.account_name}</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Login: {conn.mt5_login} — {conn.mt5_server} — {conn.broker_name}
                        {conn.prop_firm && ` — ${conn.prop_firm}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status */}
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${status.className}`}>
                      <StatusIcon className={`w-3 h-3 ${isAnimated ? 'animate-spin' : ''}`} />
                      {status.label}
                    </span>

                    {/* Last sync */}
                    {conn.last_sync_at && (
                      <span className="text-[10px] text-muted-foreground hidden sm:block">
                        Sincronizado: {new Date(conn.last_sync_at).toLocaleDateString('pt-BR')} {new Date(conn.last_sync_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}

                    {/* View Dashboard */}
                    <button
                      onClick={() => navigate(`/mt5/${conn.id}`)}
                      className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Abrir <ChevronRight className="w-3 h-3" />
                    </button>

                    {/* Delete */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Desconectar conta MT5?</AlertDialogTitle>
                          <AlertDialogDescription>
                            A conta "{conn.account_name}" sera removida. Os dados sincronizados serao perdidos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(conn.id, conn.account_name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Desconectar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Error message */}
                {conn.sync_error && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-destructive bg-destructive/5 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    {conn.sync_error}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Server className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma conta MT5 conectada.</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Conectar Conta" para iniciar.</p>
        </div>
      )}
    </div>
  );
};

function Field({ label, value, onChange, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}

export default MT5Connections;
