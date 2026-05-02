import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Wallet, Building2 } from 'lucide-react';
import { useCreateAccount } from '@/hooks/useAccountsStore';
import { PROP_FIRMS } from '@/data/propFirmsMVP';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const fmt = (v: number) => `$${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

const CreateAccount = () => {
  const navigate = useNavigate();
  const createMutation = useCreateAccount();

  const [propFirmName, setPropFirmName] = useState<string>(PROP_FIRMS[0].name);
  const [programName, setProgramName] = useState<string>(PROP_FIRMS[0].programs[0].name);
  const [phaseName, setPhaseName] = useState<string>(PROP_FIRMS[0].programs[0].phases[0].name);
  const [nickname, setNickname] = useState('');
  const [startBalance, setStartBalance] = useState('100000');
  const [currentEquity, setCurrentEquity] = useState('100000');
  const [currency, setCurrency] = useState('USD');

  const firm = useMemo(() => PROP_FIRMS.find(f => f.name === propFirmName)!, [propFirmName]);
  const program = useMemo(() => firm.programs.find(p => p.name === programName) ?? firm.programs[0], [firm, programName]);
  const phase = useMemo(() => program.phases.find(p => p.name === phaseName) ?? program.phases[0], [program, phaseName]);

  // When firm/program changes, reset downstream selections
  useEffect(() => {
    if (!firm.programs.find(p => p.name === programName)) {
      setProgramName(firm.programs[0].name);
    }
  }, [firm, programName]);
  useEffect(() => {
    if (!program.phases.find(p => p.name === phaseName)) {
      setPhaseName(program.phases[0].name);
    }
  }, [program, phaseName]);

  const balance = parseFloat(startBalance) || 0;
  const equity = parseFloat(currentEquity) || 0;

  const limits = useMemo(() => ({
    daily_loss_limit: balance * (phase.dailyLossPct / 100),
    total_loss_limit: balance * (phase.totalLossPct / 100),
    profit_target: balance * (phase.profitTargetPct / 100),
    min_trading_days: phase.minTradingDays,
  }), [balance, phase]);

  const canSubmit = nickname.trim() && balance > 0 && equity >= 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await createMutation.mutateAsync({
        nickname: nickname.trim(),
        prop_firm: propFirmName,
        program: programName,
        phase: phaseName,
        base_currency: currency,
        start_balance: balance,
        current_equity: equity,
        daily_loss_limit: limits.daily_loss_limit,
        total_loss_limit: limits.total_loss_limit,
        profit_target: limits.profit_target,
        min_trading_days: limits.min_trading_days,
      });
      toast({ title: 'Conta criada', description: 'Sua conta foi adicionada.' });
      navigate('/accounts');
    } catch (e: any) {
      toast({ title: 'Erro ao criar conta', description: e?.message || 'Tente novamente.', variant: 'destructive' });
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/accounts')} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Nova Conta</h1>
          <p className="text-xs text-muted-foreground">Cadastre sua conta de prop firm em segundos.</p>
        </div>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-6 space-y-5"
      >
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Prop Firm e Programa</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Prop Firm</label>
            <select
              value={propFirmName}
              onChange={e => setPropFirmName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {PROP_FIRMS.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Programa</label>
            <select
              value={programName}
              onChange={e => setProgramName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {firm.programs.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Fase</label>
            <select
              value={phaseName}
              onChange={e => setPhaseName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {program.phases.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-border/50">
          <Stat label="Perda Diária" value={`${phase.dailyLossPct}%`} />
          <Stat label="Perda Total" value={`${phase.totalLossPct}%`} />
          <Stat label="Meta de Lucro" value={phase.profitTargetPct > 0 ? `${phase.profitTargetPct}%` : '—'} />
          <Stat label="Dias Mínimos" value={phase.minTradingDays > 0 ? String(phase.minTradingDays) : '—'} />
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-xl border border-border bg-card p-6 space-y-5"
      >
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Dados da Conta</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Apelido da Conta</label>
            <Input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder={`Ex.: ${propFirmName} 100k`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Moeda</label>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="BRL">BRL</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Saldo Inicial</label>
            <Input
              type="number"
              value={startBalance}
              onChange={e => {
                setStartBalance(e.target.value);
                if (!currentEquity || currentEquity === '0') setCurrentEquity(e.target.value);
              }}
              min="0" step="100"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Equity Atual</label>
            <Input
              type="number"
              value={currentEquity}
              onChange={e => setCurrentEquity(e.target.value)}
              min="0" step="100"
            />
          </div>
        </div>

        <div className="rounded-lg bg-muted/30 border border-border/50 p-4 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Limites Calculados</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Perda Diária" value={fmt(limits.daily_loss_limit)} />
            <Stat label="Perda Total" value={fmt(limits.total_loss_limit)} />
            <Stat label="Meta" value={limits.profit_target > 0 ? fmt(limits.profit_target) : '—'} />
            <Stat label="Dias Mín." value={limits.min_trading_days > 0 ? String(limits.min_trading_days) : '—'} />
          </div>
        </div>
      </motion.section>

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('/accounts')}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={!canSubmit || createMutation.isPending}>
          <Check className="w-4 h-4 mr-1.5" />
          {createMutation.isPending ? 'Criando...' : 'Criar Conta'}
        </Button>
      </div>
    </div>
  );
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-mono font-bold text-sm text-foreground">{value}</p>
    </div>
  );
}

export default CreateAccount;
