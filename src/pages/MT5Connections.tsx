import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Unlink, Loader2, AlertTriangle, CheckCircle2, RefreshCw, Trash2, ChevronRight, Server } from 'lucide-react';
import { useMT5Connections, useCreateMT5Connection, useDeleteMT5Connection } from '@/hooks/useMT5';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const STATUS_MAP: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  connected: { label: 'Conectada', icon: CheckCircle2, className: 'text-success bg-success/10' },
  connecting: { label: 'Conectando', icon: Loader2, className: 'text-info bg-info/10' },
  syncing: { label: 'Sincronizando', icon: RefreshCw, className: 'text-info bg-info/10' },
  disconnected: { label: 'Desconectada', icon: Unlink, className: 'text-muted-foreground bg-muted' },
  auth_error: { label: 'Erro de autenticação', icon: AlertTriangle, className: 'text-destructive bg-destructive/10' },
};

const MT5Connections = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { data: connections, isLoading } = useMT5Connections();
  const createMutation = useCreateMT5Connection();
  const deleteMutation = useDeleteMT5Connection();
  const [showForm, setShowForm] = useState(false);

  const [accountName, setAccountName] = useState('');
  const [mt5Login, setMt5Login] = useState('');
  const [mt5Server, setMt5Server] = useState('');
  const [brokerName, setBrokerName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName || !mt5Login || !mt5Server || !brokerName || !session?.user?.id) return;
    try {
      await createMutation.mutateAsync({
        accountName,
        mt5Login,
        mt5Server,
        brokerName,
        userId: session.user.id,
      });
      toast({ title: 'Conta registrada', description: 'Conexão cadastrada com sucesso.' });
      setShowForm(false);
      setAccountName('');
      setMt5Login('');
      setMt5Server('');
      setBrokerName('');
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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Contas MT5</h1>
          <p className="text-xs text-muted-foreground">Conecte suas contas MetaTrader 5 para sincronização automática.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="btn-glow">
          <Plus className="w-4 h-4" />
          Conectar Conta
        </Button>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex gap-3 items-start">
        <Server className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Sincronização automática</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Ao registrar sua conta MT5, o backend validará a conexão e sincronizará histórico de trades,
            posições abertas e snapshots diários.
          </p>
        </div>
      </div>

      {showForm && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="card-premium rounded-xl border border-border bg-card p-6 space-y-5"
        >
          <h2 className="text-sm font-semibold text-foreground">Registrar Conta MT5</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nome da Conta</label>
              <Input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Ex.: Minha conta FTMO" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Login MT5</label>
              <Input value={mt5Login} onChange={e => setMt5Login(e.target.value)} placeholder="Ex.: 12345678" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Servidor MT5</label>
              <Input value={mt5Server} onChange={e => setMt5Server(e.target.value)} placeholder="Ex.: ICMarketsSC-Live" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Broker</label>
              <Input value={brokerName} onChange={e => setBrokerName(e.target.value)} placeholder="Ex.: ICMarkets" required />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Registrar
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </motion.form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : connections && connections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connections.map((conn, i) => {
            const st = STATUS_MAP[conn.connection_status] || STATUS_MAP.disconnected;
            const StIcon = st.icon;
            const isAnimated = conn.connection_status === 'connecting' || conn.connection_status === 'syncing';

            return (
              <motion.div
                key={conn.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-5 space-y-3 hover:border-primary/30 transition-colors cursor-pointer group"
                onClick={() => navigate(`/mt5/${conn.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground truncate">{conn.account_name}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {conn.mt5_login} — {conn.mt5_server} — {conn.broker_name}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${st.className}`}>
                    <StIcon className={`w-3 h-3 ${isAnimated ? 'animate-spin' : ''}`} />
                    {st.label}
                  </span>
                </div>

                {conn.last_sync_at && (
                  <p className="text-[10px] text-muted-foreground">
                    Última sincronização: {new Date(conn.last_sync_at).toLocaleString('pt-BR')}
                  </p>
                )}
                {conn.sync_error && (
                  <p className="text-[10px] text-destructive">{conn.sync_error}</p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remover
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={e => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover conexão?</AlertDialogTitle>
                        <AlertDialogDescription>
                          A conexão "{conn.account_name}" será removida permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={e => { e.stopPropagation(); handleDelete(conn.id, conn.account_name); }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    Ver Dashboard <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Server className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma conta MT5 conectada.</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Conectar Conta" para começar.</p>
        </div>
      )}
    </div>
  );
};

export default MT5Connections;
