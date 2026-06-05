import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, AlertTriangle, RefreshCw, Unlink, PlugZap, Server, Plus, Cloud } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Tables } from '@/integrations/supabase/types';

type Mt5ConnectionRow = Tables<'mt5_connections'>;

type ConnStatus = Mt5ConnectionRow['connection_status'];

const STATUS_MAP: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  connected: { label: 'Conectada', icon: CheckCircle2, className: 'text-success bg-success/10' },
  connecting: { label: 'Conectando', icon: Loader2, className: 'text-info bg-info/10' },
  syncing: { label: 'Sincronizando', icon: RefreshCw, className: 'text-info bg-info/10' },
  disconnected: { label: 'Desconectada', icon: Unlink, className: 'text-muted-foreground bg-muted' },
  auth_error: { label: 'Erro de autenticação', icon: AlertTriangle, className: 'text-destructive bg-destructive/10' },
};

const PROVIDER_META: Record<string, { label: string; icon: typeof Cloud; className: string }> = {
  metaapi: { label: 'MetaApi', icon: Cloud, className: 'text-primary bg-primary/10' },
};

export default function MT5Connections() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rows, setRows] = useState<Mt5ConnectionRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [accountName, setAccountName] = useState('');
  const [mt5Login, setMt5Login] = useState('');
  const [mt5Server, setMt5Server] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [provider, setProvider] = useState<'metaapi'>('metaapi');
  const [mt5Password, setMt5Password] = useState('');

  const canUse = Boolean(userId);

  const fetchRows = async () => {
    if (!userId) return;
    setLoading(true);
    setLoadError(null);

    const { data, error } = await supabase
      .from('mt5_connections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setLoadError(error.message);
      toast({ title: 'Erro ao carregar conexões', description: error.message, variant: 'destructive' });
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data || []) as Mt5ConnectionRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const formattedRows = useMemo(() => {
    return rows.map((r) => {
      const st = STATUS_MAP[r.connection_status] || STATUS_MAP.disconnected;
      const pv = PROVIDER_META[(r as any).provider || 'metaapi'] || PROVIDER_META.metaapi;
      return { ...r, st, pv };
    });
  }, [rows]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!accountName || !mt5Login || !mt5Server || !brokerName || !mt5Password) return;

    setSaving(true);

    if (provider === 'metaapi') {
      // Use local backend instead of Supabase Edge Function
      const gatewayUrl = import.meta.env.VITE_METAAPI_GATEWAY_URL || 'http://localhost:3001';
      try {
        const res = await fetch(`${gatewayUrl}/metaapi/connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountName,
            mt5Login,
            mt5Server,
            brokerName,
            mt5Password,
            tradingAccountId: null,
            userId,
          }),
        });
        const data = await res.json();
        setSaving(false);

        if (!res.ok) {
          console.error('MetaApi connection failed:', data);
          const errorMessage = data?.error || data?.details || 'Erro ao conectar com MetaApi';
          toast({ title: 'Erro ao registrar conta', description: errorMessage, variant: 'destructive' });
          return;
        }

        toast({ title: 'Conta MetaApi registrada', description: 'Conexão criada com sucesso.' });
      } catch (err: any) {
        setSaving(false);
        console.error('MetaApi connection error:', err);
        toast({ title: 'Erro ao registrar conta', description: err?.message || 'Erro de conexão com o backend', variant: 'destructive' });
        return;
      }
    }

    setShowForm(false);
    setAccountName(''); setMt5Login(''); setMt5Server(''); setBrokerName(''); setMt5Password('');
    fetchRows();
  };

  const handleSyncNow = async (r: Mt5ConnectionRow) => {
    setBusyId(r.id);
    const gatewayUrl = import.meta.env.VITE_METAAPI_GATEWAY_URL || 'http://localhost:3001';
    try {
      const res = await fetch(`${gatewayUrl}/metaapi/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: r.id,
          userId,
        }),
      });
      const data = await res.json();
      setBusyId(null);

      if (!res.ok) {
        console.error('MetaApi sync failed:', data);
        const errorMessage = data?.error || data?.details || 'Erro ao sincronizar com MetaApi';
        toast({ title: 'Erro ao sincronizar', description: errorMessage, variant: 'destructive' });
        fetchRows();
        return;
      }

      toast({ title: 'Sincronização concluída', description: 'Dados atualizados com sucesso.' });
      fetchRows();
    } catch (err: any) {
      setBusyId(null);
      console.error('MetaApi sync error:', err);
      toast({ title: 'Erro ao sincronizar', description: err?.message || 'Erro de conexão com o backend', variant: 'destructive' });
      fetchRows();
    }
  };

  const handleDisconnect = async (r: Mt5ConnectionRow) => {
    const { error } = await supabase
      .from('mt5_connections')
      .update({ connection_status: 'disconnected' })
      .eq('id', r.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Desconectado' });
    fetchRows();
  };

  const handleDelete = async (r: Mt5ConnectionRow) => {
    const { error } = await supabase.from('mt5_connections').delete().eq('id', r.id);
    if (error) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Conexão removida', description: `"${r.account_name}" foi removida.` });
    fetchRows();
  };

  if (!canUse) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-3">
        <h1 className="text-lg font-bold text-foreground">Integrações · MT5</h1>
        <p className="text-sm text-muted-foreground">Faça login para gerenciar suas integrações.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="rounded-2xl hero-surface edge-top p-7 md:p-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="max-w-2xl">
          <p className="eyebrow mb-4">Integrações · MetaTrader</p>
          <h1 className="display-editorial-sm text-gradient-steel">
            Contas <span className="text-gradient-primary">MT5</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-4 max-w-md leading-relaxed">
            MetaApi cloud para sincronização automática de contas MT5 — sem servidor local.
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="pill-btn pill-btn-primary">
          <Plus className="w-4 h-4" />
          Conectar nova conta
        </button>
      </div>

      {showForm && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleCreate}
          className="card-premium rounded-xl border border-border bg-card p-6 space-y-5"
        >
          <h2 className="text-sm font-semibold text-foreground">Conectar conta MT5</h2>

          <div className="grid grid-cols-2 gap-2">
            {(['metaapi'] as const).map(p => {
              const meta = PROVIDER_META[p];
              const Icon = meta.icon;
              const active = provider === p;
              return (
                <button
                  type="button"
                  key={p}
                  onClick={() => setProvider(p)}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                    active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                  }`}
                >
                  <Icon className="w-4 h-4 mt-0.5 text-primary" />
                  <div>
                    <div className="text-sm font-medium text-foreground">{meta.label}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Sincronização cloud automática (recomendado).
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nome da conexão</label>
              <Input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Ex.: FTMO 100k" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Login MT5</label>
              <Input value={mt5Login} onChange={e => setMt5Login(e.target.value)} placeholder="Ex.: 12345678" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Servidor</label>
              <Input value={mt5Server} onChange={e => setMt5Server(e.target.value)} placeholder="Ex.: ICMarketsSC-Live" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Broker</label>
              <Input value={brokerName} onChange={e => setBrokerName(e.target.value)} placeholder="Ex.: IC Markets" required />
            </div>
            {provider === 'metaapi' && (
              <div className="space-y-1.5 md:col-span-4">
                <label className="text-xs font-medium text-muted-foreground">Senha MT5</label>
                <Input
                  type="password"
                  value={mt5Password}
                  onChange={e => setMt5Password(e.target.value)}
                  placeholder="Digite a senha MT5"
                  autoComplete="off"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Use a senha de acesso da conta MT5 fornecida pela mesa para sincronização via MetaApi.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Salvar
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </motion.form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Falha ao carregar conexões</p>
              <p className="text-xs text-muted-foreground">{loadError}</p>
              <Button size="sm" onClick={fetchRows}>
                <RefreshCw className="w-4 h-4" />
                Tentar novamente
              </Button>
            </div>
          </div>
        </div>
      ) : formattedRows.length > 0 ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Provider</th>
                  <th className="px-4 py-3 font-medium">Login</th>
                  <th className="px-4 py-3 font-medium">Servidor</th>
                  <th className="px-4 py-3 font-medium">Broker</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Último sync</th>
                  <th className="px-4 py-3 font-medium">Erro</th>
                  <th className="px-4 py-3 font-medium text-xs text-muted-foreground">Provider ID</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {formattedRows.map((r, i) => {
                  const StIcon = r.st.icon;
                  const PvIcon = r.pv.icon;
                  const isAnimated = r.connection_status === 'connecting' || r.connection_status === 'syncing' || busyId === r.id;
                  return (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-t border-border"
                    >
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{r.account_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${r.pv.className}`}>
                          <PvIcon className="w-3 h-3" />
                          {r.pv.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.mt5_login}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.mt5_server}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.broker_name || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${r.st.className}`}>
                          <StIcon className={`w-3 h-3 ${isAnimated ? 'animate-spin' : ''}`} />
                          {r.st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {r.last_sync_at ? new Date(r.last_sync_at).toLocaleString('pt-BR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-destructive max-w-[260px] truncate" title={r.sync_error || ''}>
                        {r.sync_error || '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                        {(r as any).provider_account_id || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSyncNow(r)}
                            disabled={busyId === r.id}
                          >
                            {busyId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Sync now
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDisconnect(r)}
                            disabled={r.connection_status === 'disconnected'}
                          >
                            <Unlink className="w-4 h-4" />
                            Desconectar
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">Remover</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover conexão?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  A conexão "{r.account_name}" será removida permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(r)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Server className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma conta MT5 conectada.</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Conectar nova conta" para começar.</p>
        </div>
      )}
    </div>
  );
}
