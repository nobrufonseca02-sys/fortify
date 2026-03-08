import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Link2, Unlink, Loader2, AlertTriangle, CheckCircle2, RefreshCw, Trash2, ChevronRight, Server } from 'lucide-react';
import { useMT5Connections, useCreateMT5Connection, useDeleteMT5Connection } from '@/hooks/useMT5';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const STATUS_MAP: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  connected: { label: 'Conectada', icon: CheckCircle2, className: 'text-success bg-success/10' },
  connecting: { label: 'Conectando', icon: Loader2, className: 'text-info bg-info/10' },
  syncing: { label: 'Sincronizando', icon: RefreshCw, className: 'text-info bg-info/10' },
  disconnected: { label: 'Desconectada', icon: Unlink, className: 'text-muted-foreground bg-muted' },
  auth_error: { label: 'Erro de autenticacao', icon: AlertTriangle, className: 'text-destructive bg-destructive/10' },
};

const MT5Connections = () => {
  const navigate = useNavigate();
  const { data: connections, isLoading } = useMT5Connections();
  const createMutation = useCreateMT5Connection();
  const deleteMutation = useDeleteMT5Connection();
  const [showForm, setShowForm] = useState(false);

  // Form
  const [accountName, setAccountName] = useState('');
  const [mt5Login, setMt5Login] = useState('');
  const [mt5Server, setMt5Server] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [accountType, setAccountType] = useState('demo');
  const [propFirm, setPropFirm] = useState('');

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

      {/* Info block */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex gap-3 items-start">
        <Server className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Sincronizacao automatica</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Ao registrar sua conta MT5, o backend externo validara a conexao e sincronizara automaticamente historico de trades,
            posicoes abertas e snapshots diarios. Os dados alimentam KPIs, regras e alertas em tempo real.
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
          {connections.map((conn, i) => {
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
