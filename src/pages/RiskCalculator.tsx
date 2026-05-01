import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Shield, AlertTriangle, Lightbulb } from 'lucide-react';
import { useAccounts, computeAccountMetrics, type AccountRow } from '@/hooks/useAccountsStore';
import { Input } from '@/components/ui/input';

const fmt = (v: number) => `$${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

const RiskCalculator = () => {
  const { data: accounts = [], isLoading } = useAccounts();
  const [accountId, setAccountId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!accountId && accounts.length) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  const selected: AccountRow | undefined = useMemo(
    () => accounts.find(a => a.id === accountId) ?? accounts[0],
    [accounts, accountId],
  );

  const metrics = selected ? computeAccountMetrics(selected) : null;
  const equity = selected?.current_equity ?? 0;
  const dailyRemaining = metrics?.dailyRemaining ?? 0;
  const totalRemaining = metrics?.totalRemaining ?? 0;

  const [riskMode, setRiskMode] = useState<'percent' | 'value'>('percent');
  const [riskInput, setRiskInput] = useState('1');
  const [stopPoints, setStopPoints] = useState('20');
  const [pointValue, setPointValue] = useState('10');

  const riskValue = useMemo(() => {
    const v = parseFloat(riskInput) || 0;
    return riskMode === 'percent' ? equity * (v / 100) : v;
  }, [riskInput, riskMode, equity]);

  const stopVal = parseFloat(stopPoints) || 0;
  const ptVal = parseFloat(pointValue) || 0;

  const calc = useMemo(() => {
    if (!riskValue || !stopVal || !ptVal) return null;
    const maxLot = riskValue / (stopVal * ptVal);
    const stopsInDay = dailyRemaining > 0 ? Math.floor(dailyRemaining / riskValue) : 0;
    const stopsInAccount = totalRemaining > 0 ? Math.floor(totalRemaining / riskValue) : 0;
    const riskPctOfDaily = dailyRemaining > 0 ? (riskValue / dailyRemaining) * 100 : 100;
    const riskPctOfMax = totalRemaining > 0 ? (riskValue / totalRemaining) * 100 : 100;

    let severity: 'safe' | 'warning' | 'danger' = 'safe';
    if (riskPctOfDaily > 50 || stopsInDay <= 1) severity = 'danger';
    else if (riskPctOfDaily > 30 || stopsInDay <= 2) severity = 'warning';

    return { maxLot, stopsInDay, stopsInAccount, riskPctOfDaily, riskPctOfMax, severity };
  }, [riskValue, stopVal, ptVal, dailyRemaining, totalRemaining]);

  const message = useMemo(() => {
    if (!calc) return null;
    if (calc.severity === 'danger') {
      if (calc.stopsInDay <= 0) return { text: 'Esse risco excede seu limite diário restante. Não opere com esse tamanho.', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' };
      if (calc.stopsInDay === 1) return { text: 'Apenas 1 stop desse tamanho cabe no dia. Se perder, encerre a sessão.', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' };
      return { text: `Esse lote está acima do recomendado. Mais ${calc.stopsInDay} stops colocam a conta em zona crítica.`, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' };
    }
    if (calc.severity === 'warning') {
      return { text: `Atenção: com esse tamanho, ${calc.stopsInDay} stops iguais esgotam seu limite diário. Opere com cautela.`, color: 'text-warning', bg: 'bg-warning/10 border-warning/20' };
    }
    return { text: `Você ainda pode arriscar com segurança até ${fmt(dailyRemaining)} hoje. ${calc.stopsInDay} stops desse tamanho cabem no dia.`, color: 'text-success', bg: 'bg-success/10 border-success/20' };
  }, [calc, dailyRemaining]);

  if (!isLoading && !accounts.length) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Nenhuma conta cadastrada. Crie uma conta primeiro.
      </div>
    );
  }

  if (!selected) {
    return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Calculator className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Calculadora de Risco</h1>
        </div>
        <p className="text-xs text-muted-foreground">Calcule o lote ideal e entenda o impacto de cada operação na sua conta.</p>
      </div>

      {accounts.length > 1 && (
        <div className="rounded-xl border border-border bg-card p-3">
          <select
            value={selected.id}
            onChange={e => setAccountId(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.nickname}</option>
            ))}
          </select>
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3 font-medium">Contexto da Conta</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Box label="Equity" value={fmt(equity)} />
          <Box label="Limite Diário" value={fmt(selected.daily_loss_limit)} />
          <Box label="Restante Hoje" value={fmt(dailyRemaining)} valueClass="text-warning" />
          <Box label="Drawdown Restante" value={fmt(totalRemaining)} />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-5 space-y-5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Parâmetros da Operação</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Risco por Trade</label>
            <div className="flex gap-2">
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setRiskMode('percent')}
                  className={`px-3 py-2 text-xs font-medium transition-colors ${riskMode === 'percent' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >%</button>
                <button
                  onClick={() => setRiskMode('value')}
                  className={`px-3 py-2 text-xs font-medium transition-colors ${riskMode === 'value' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >$</button>
              </div>
              <Input type="number" value={riskInput} onChange={e => setRiskInput(e.target.value)} step="0.1" min="0" className="flex-1" />
            </div>
            {riskMode === 'percent' && <p className="text-[10px] text-muted-foreground font-mono">= {fmt(riskValue)}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Stop Loss (pontos)</label>
            <Input type="number" value={stopPoints} onChange={e => setStopPoints(e.target.value)} step="1" min="1" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Valor por Ponto (por lote)</label>
            <Input type="number" value={pointValue} onChange={e => setPointValue(e.target.value)} step="0.01" min="0.01" />
          </div>
        </div>
      </motion.div>

      {calc && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-4 font-medium">Resultado</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <Box label="Lote Máximo" value={calc.maxLot.toFixed(2)} big />
              <Box label="Risco da Operação" value={fmt(riskValue)} big />
              <Box
                label="Stops no Dia"
                value={String(calc.stopsInDay)}
                big
                valueClass={calc.stopsInDay <= 1 ? 'text-destructive' : calc.stopsInDay <= 3 ? 'text-warning' : 'text-success'}
              />
              <Box
                label="Stops na Conta"
                value={String(calc.stopsInAccount)}
                big
                valueClass={calc.stopsInAccount <= 2 ? 'text-destructive' : calc.stopsInAccount <= 5 ? 'text-warning' : 'text-foreground'}
              />
            </div>
          </div>

          {message && (
            <div className={`rounded-xl border p-4 flex items-start gap-3 ${message.bg}`}>
              {calc.severity === 'danger' ? (
                <AlertTriangle className={`w-5 h-5 ${message.color} flex-shrink-0 mt-0.5`} />
              ) : calc.severity === 'warning' ? (
                <Shield className={`w-5 h-5 ${message.color} flex-shrink-0 mt-0.5`} />
              ) : (
                <Lightbulb className={`w-5 h-5 ${message.color} flex-shrink-0 mt-0.5`} />
              )}
              <p className={`text-sm font-medium ${message.color}`}>{message.text}</p>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Impacto nos Limites</p>
            <Impact label="Uso do Limite Diário" pct={calc.riskPctOfDaily} />
            <Impact label="Uso do Drawdown Total" pct={calc.riskPctOfMax} />
          </div>
        </motion.div>
      )}
    </div>
  );
};

function Box({ label, value, valueClass, big }: { label: string; value: string; valueClass?: string; big?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`font-mono font-bold ${big ? 'text-2xl font-black' : ''} ${valueClass || 'text-foreground'}`}>{value}</p>
    </div>
  );
}

function Impact({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
        <span>{label}</span>
        <span className="font-mono">{Math.round(pct)}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${pct > 50 ? 'bg-destructive' : pct > 30 ? 'bg-warning' : 'bg-success'}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, pct)}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
    </div>
  );
}

export default RiskCalculator;
