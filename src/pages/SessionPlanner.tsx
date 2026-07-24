import { useState } from 'react';
import { motion } from 'motion/react';
import { ClipboardList, Save, CheckCircle2 } from 'lucide-react';
import { AccountSelector } from '@/components/AccountSelector';
import { useAccountsStore } from '@/hooks/useAccountsStore';
import { TradingAccount } from '@/types/fortify';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

const SessionPlanner = () => {
  const { accounts } = useAccountsStore();
  const { session } = useAuth();
  const [selectedAccount, setSelectedAccount] = useState<TradingAccount>(accounts[0]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [maxRisk, setMaxRisk] = useState('');
  const [maxTrades, setMaxTrades] = useState('');
  const [riskPerTrade, setRiskPerTrade] = useState('');
  const [dailyStop, setDailyStop] = useState('');
  const [target, setTarget] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = async () => {
    if (!session?.user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('session_plans').insert({
        user_id: session.user.id,
        trading_account_id: selectedAccount?.id || null,
        max_risk_today: maxRisk ? parseFloat(maxRisk) : null,
        max_trades: maxTrades ? parseInt(maxTrades) : null,
        risk_per_trade: riskPerTrade ? parseFloat(riskPerTrade) : null,
        personal_daily_stop: dailyStop ? parseFloat(dailyStop) : null,
        conservative_target: target ? parseFloat(target) : null,
        notes: notes || null,
      });
      if (error) throw error;
      setSaved(true);
      toast({ title: 'Plano salvo', description: 'Seu plano de sessão foi registrado com sucesso.' });
    } catch {
      toast({ title: 'Erro ao salvar', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setMaxRisk('');
    setMaxTrades('');
    setRiskPerTrade('');
    setDailyStop('');
    setTarget('');
    setNotes('');
    setSaved(false);
  };

  if (!selectedAccount) {
    return <div className="p-6 text-center text-muted-foreground">Nenhuma conta cadastrada.</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Plano de Sessão</h1>
        </div>
        <p className="text-xs text-muted-foreground">Defina suas regras pessoais antes de operar. Disciplina começa antes do mercado abrir.</p>
      </div>

      <AccountSelector accounts={accounts} selected={selectedAccount} onSelect={setSelectedAccount} />

      {saved ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl border border-success/20 bg-success/10 p-8 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
          <div>
            <p className="text-lg font-bold text-foreground">Plano registrado</p>
            <p className="text-sm text-muted-foreground mt-1">Sua preparação está feita. Opere com disciplina.</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-left space-y-2 max-w-sm mx-auto">
            {maxRisk && <p className="text-xs text-muted-foreground">Risco máximo do dia: <span className="text-foreground font-mono font-bold">${maxRisk}</span></p>}
            {maxTrades && <p className="text-xs text-muted-foreground">Máximo de trades: <span className="text-foreground font-mono font-bold">{maxTrades}</span></p>}
            {riskPerTrade && <p className="text-xs text-muted-foreground">Risco por trade: <span className="text-foreground font-mono font-bold">${riskPerTrade}</span></p>}
            {dailyStop && <p className="text-xs text-muted-foreground">Stop diário pessoal: <span className="text-foreground font-mono font-bold">${dailyStop}</span></p>}
            {target && <p className="text-xs text-muted-foreground">Meta do dia: <span className="text-foreground font-mono font-bold">${target}</span></p>}
            {notes && <p className="text-xs text-muted-foreground">Observação: <span className="text-foreground">{notes}</span></p>}
          </div>
          <Button variant="outline" onClick={resetForm}>Criar novo plano</Button>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-6 space-y-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Regras da Sessão</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Risco máximo do dia ($)</label>
              <Input type="number" value={maxRisk} onChange={e => setMaxRisk(e.target.value)} placeholder="Ex.: 500" min="0" step="1" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Número máximo de trades</label>
              <Input type="number" value={maxTrades} onChange={e => setMaxTrades(e.target.value)} placeholder="Ex.: 3" min="1" step="1" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Risco por trade ($)</label>
              <Input type="number" value={riskPerTrade} onChange={e => setRiskPerTrade(e.target.value)} placeholder="Ex.: 200" min="0" step="1" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Stop diário pessoal ($)</label>
              <Input type="number" value={dailyStop} onChange={e => setDailyStop(e.target.value)} placeholder="Ex.: 300" min="0" step="1" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Meta conservadora do dia ($)</label>
              <Input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="Ex.: 400" min="0" step="1" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Observação do plano</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex.: Focar apenas em setups de continuação. Evitar operar antes das 10h."
              className="flex w-full rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 min-h-[80px] resize-none transition-all duration-200"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="btn-glow w-full md:w-auto">
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Plano'}
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default SessionPlanner;
