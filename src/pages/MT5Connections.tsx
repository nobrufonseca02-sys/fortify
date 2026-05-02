import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, AlertTriangle, RefreshCw, Unlink, PlugZap, Server, Plus } from 'lucide-react';
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

type Mt5ConnectionRow = {
  id: string;
  userId: string;
  connectionName: string;
  mt5Login: string;
  serverName: string;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'auth_error' | 'syncing';
  lastSyncTime: string | null;
  latestSyncError: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_MAP: Record<Mt5ConnectionRow['connectionStatus'], { label: string; icon: typeof CheckCircle2; className: string }> = {
  connected: { label: 'Conectada', icon: CheckCircle2, className: 'text-success bg-success/10' },
  connecting: { label: 'Conectando', icon: Loader2, className: 'text-info bg-info/10' },
  syncing: { label: 'Sincronizando', icon: RefreshCw, className: 'text-info bg-info/10' },
  disconnected: { label: 'Desconectada', icon: Unlink, className: 'text-muted-foreground bg-muted' },
  auth_error: { label: 'Erro de autenticação', icon: AlertTriangle, className: 'text-destructive bg-destructive/10' },
};

export default function MT5Connections() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Mt5ConnectionRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [connectionName, setConnectionName] = useState('');
  const [mt5Login, setMt5Login] = useState('');
  const [serverName, setServerName] = useState('');

  const canUse = Boolean(userId);

  const fetchRows = async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('mt5Connections')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) {
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
      const st = STATUS_MAP[r.connectionStatus] || STATUS_MAP.disconnected;
      return { ...r, st };
    });
  }, [rows]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!connectionName || !mt5Login || !serverName) return;

    setSaving(true);
    const { error } = await supabase.from('mt5Connections').insert({
      userId,
      connectionName,
      mt5Login,
      serverName,
      connectionStatus: 'disconnected',
    });
    setSaving(false);

    if (error) {
      toast({ title: 'Erro ao adicionar conexão', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Conexão criada', description: 'Agora você pode conectar e sincronizar.' });
    setShowForm(false);
    setConnectionName('');
    setMt5Login('');
    setServerName('');
    fetchRows();
  };

  const setStatus = async (id: string, patch: Partial<Mt5ConnectionRow>) => {
    const { error } = await supabase.from('mt5Connections').update(patch).eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleConnect = async (r: Mt5ConnectionRow) => {
    const ok1 = await setStatus(r.id, { connectionStatus: 'connecting', latestSyncError: null });
    if (!ok1) return;

    const ok2 = await setStatus(r.id, { connectionStatus: 'connected', latestSyncError: null });
    if (!ok2) return;

    toast({ title: 'Conectado', description: 'Conexão marcada como ativa.' });
    fetchRows();
  };

  const handleSyncNow = async (r: Mt5ConnectionRow) => {
    const startedAt = new Date().toISOString();

    const { data: run, error: runError } = await supabase
      .from('mt5SyncRuns')
      .insert({ connectionId: r.id, startedAt, status: 'running' })
      .select('id')
      .single();

    if (runError) {
      toast({ title: 'Erro ao iniciar sync', description: runError.message, variant: 'destructive' });
      return;
    }

    const ok1 = await setStatus(r.id, { connectionStatus: 'syncing', latestSyncError: null });
    if (!ok1) return;

    const finishedAt = new Date().toISOString();
    const ok2 = await setStatus(r.id, { connectionStatus: 'connected', lastSyncTime: finishedAt, latestSyncError: null });

    await supabase
      .from('mt5SyncRuns')
      .update({ finishedAt, status: ok2 ? 'success' : 'failed' })
      .eq('id', run?.id);

    toast({ title: 'Sincronização concluída', description: 'Última sincronização atualizada.' });
    fetchRows();
  };

  const handleDisconnect = async (r: Mt5ConnectionRow) => {
    const ok = await setStatus(r.id, { connectionStatus: 'disconnected' });
    if (!ok) return;
    toast({ title: 'Desconectado', description: 'Conexão marcada como desconectada.' });
    fetchRows();
  };

  const handleDelete = async (r: Mt5ConnectionRow) => {
    const { error } = await supabase.from('mt5Connections').delete().eq('id', r.id);
    if (error) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Conexão removida', description: `"${r.connectionName}" foi removida.` });
    fetchRows();
  };

  if (!canUse) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-3">
        <h1 className="text-lg font-bold text-foreground">MT5</h1>
        <p className="text-sm text-muted-foreground">Faça login para gerenciar suas integrações.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">Integrações · MT5</h1>
          <p className="text-xs text-muted-foreground">Gerencie conexões e sincronizações da sua conta MetaTrader 5.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="btn-glow">
          <Plus className="w-4 h-4" />
          Nova conexão
        </Button>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex gap-3 items-start">
        <Server className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Conexão e sync</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Esta página gerencia o cadastro e o estado da conexão. A sincronização real deve ser executada por um backend/worker.
          </p>
        </div>
      </div>

      {showForm && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleCreate}
          className="card-premium rounded-xl border border-border bg-card p-6 space-y-5"
        >
          <h2 className="text-sm font-semibold text-foreground">Adicionar conexão</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nome da conexão</label>
              <Input value={connectionName} onChange={e => setConnectionName(e.target.value)} placeholder="Ex.: Conta principal" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Login MT5</label>
              <Input value={mt5Login} onChange={e => setMt5Login(e.target.value)} placeholder="Ex.: 12345678" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Servidor</label>
              <Input value={serverName} onChange={e => setServerName(e.target.value)} placeholder="Ex.: ICMarketsSC-Live" required />
            </div>
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
      ) : formattedRows.length > 0 ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Login</th>
                  <th className="px-4 py-3 font-medium">Servidor</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Último sync</th>
                  <th className="px-4 py-3 font-medium">Erro</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {formattedRows.map((r, i) => {
                  const StIcon = r.st.icon;
                  const isAnimated = r.connectionStatus === 'connecting' || r.connectionStatus === 'syncing';
                  return (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-t border-border"
                    >
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{r.connectionName}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.mt5Login}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.serverName}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${r.st.className}`}>
                          <StIcon className={`w-3 h-3 ${isAnimated ? 'animate-spin' : ''}`} />
                          {r.st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {r.lastSyncTime ? new Date(r.lastSyncTime).toLocaleString('pt-BR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-destructive max-w-[260px] truncate" title={r.latestSyncError || ''}>
                        {r.latestSyncError || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConnect(r)}
                            disabled={r.connectionStatus === 'connected' || r.connectionStatus === 'syncing' || r.connectionStatus === 'connecting'}
                          >
                            <PlugZap className="w-4 h-4" />
                            Connect
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSyncNow(r)}
                            disabled={r.connectionStatus !== 'connected'}
                          >
                            <RefreshCw className="w-4 h-4" />
                            Sync now
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDisconnect(r)}
                            disabled={r.connectionStatus === 'disconnected' || r.connectionStatus === 'connecting' || r.connectionStatus === 'syncing'}
                          >
                            <Unlink className="w-4 h-4" />
                            Disconnect
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">Remover</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover conexão?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  A conexão "{r.connectionName}" será removida permanentemente.
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
          <p className="text-sm text-muted-foreground">Nenhuma conexão MT5 cadastrada.</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Nova conexão" para começar.</p>
        </div>
      )}
    </div>
  );
}
