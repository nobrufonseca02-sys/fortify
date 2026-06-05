import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Shield, AlertTriangle, TrendingDown, Lightbulb } from 'lucide-react';
import { AccountSelector } from '@/components/AccountSelector';
import { useAccountsStore } from '@/hooks/useAccountsStore';
import { useRuleEvaluations } from '@/hooks/useRuleEvaluations';
import { TradingAccount } from '@/types/fortify';
import { Input } from '@/components/ui/input';

const fmt = (v: number) => `$${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

const RiskCalculator = () => {
  const { accounts } = useAccountsStore();
  const [selectedAccount, setSelectedAccount] = useState<TradingAccount | undefined>(accounts[0]);
  const { data: ruleEvaluations = [] } = useRuleEvaluations(selectedAccount?.id);

  useEffect(() => {
    if (!selectedAccount && accounts.length > 0) {
      setSelectedAccount(accounts[0]);
      return;
    }
    if (selectedAccount && accounts.length > 0 && !accounts.some(account => account.id === selectedAccount.id)) {
      setSelectedAccount(accounts[0]);
    }
  }, [accounts, selectedAccount]);

  const findEvaluation = (keys: string[]) =>
    ruleEvaluations.find(evaluation => keys.includes(evaluation.rule_instances?.rule_definitions?.key));

  const dailyLossEval = findEvaluation(['max_daily_loss']);
  const maxLossEval = findEvaluation(['max_total_loss', 'trailing_drawdown']);

  const dailyLossLimit = dailyLossEval?.limit_value ?? 0;
  const dailyLossUsed = dailyLossEval?.current_value ?? 0;
  const dailyRemaining = Math.max(0, dailyLossLimit - dailyLossUsed);

  const maxLossLimit = maxLossEval?.limit_value ?? 0;
  const maxLossUsed = maxLossEval?.current_value ?? 0;
  const maxRemaining = Math.max(0, maxLossLimit - maxLossUsed);

  const equity = selectedAccount?.currentEquity ?? 0;

  // Inputs
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
    if (!dailyLossEval && !maxLossEval) return null;
    if (!riskValue || !stopVal || !ptVal) return null;
    const maxLot = riskValue / (stopVal * ptVal);
    const stopsInDay = dailyRemaining > 0 ? Math.floor(dailyRemaining / riskValue) : 0;
    const stopsInAccount = maxRemaining > 0 ? Math.floor(maxRemaining / riskValue) : 0;
    const riskPctOfDaily = dailyRemaining > 0 ? (riskValue / dailyRemaining) * 100 : 100;
    const riskPctOfMax = maxRemaining > 0 ? (riskValue / maxRemaining) * 100 : 100;

    let severity: 'safe' | 'warning' | 'danger' = 'safe';
    if (riskPctOfDaily > 50 || stopsInDay <= 1) severity = 'danger';
    else if (riskPctOfDaily > 30 || stopsInDay <= 2) severity = 'warning';

    return { maxLot, stopsInDay, stopsInAccount, riskPctOfDaily, riskPctOfMax, severity };
  }, [dailyLossEval, maxLossEval, riskValue, stopVal, ptVal, dailyRemaining, maxRemaining]);

  const getMessage = () => {
    if (!calc) return null;
    if (calc.severity === 'danger') {
      if (calc.stopsInDay <= 0) return { text: 'Esse risco excede seu limite diário restante. Não opere com esse tamanho.', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' };
      if (calc.stopsInDay === 1) return { text: `Apenas 1 stop desse tamanho cabe no dia. Se perder, encerre a sessão.`, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' };
      return { text: `Esse lote está acima do recomendado. Mais ${calc.stopsInDay} stops colocam a conta em zona crítica.`, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' };
    }
    if (calc.severity === 'warning') {
      return { text: `Atenção: com esse tamanho, ${calc.stopsInDay} stops iguais esgotam seu limite diário. Opere com cautela.`, color: 'text-warning', bg: 'bg-warning/10 border-warning/20' };
    }
    return { text: `Você ainda pode arriscar com segurança até ${fmt(dailyRemaining)} hoje. ${calc.stopsInDay} stops desse tamanho cabem no dia.`, color: 'text-success', bg: 'bg-success/10 border-success/20' };
  };

  const message = getMessage();

  if (!selectedAccount) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Nenhuma conta cadastrada. Crie uma conta primeiro.
      </div>
    );
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

      <AccountSelector accounts={accounts} selected={selectedAccount} onSelect={setSelectedAccount} />

      {/* Context Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3 font-medium">Contexto da Conta</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Equity</p>
            <p className="font-mono font-bold text-foreground">{fmt(equity)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Limite Diário</p>
            <p className="font-mono font-bold text-foreground">{fmt(dailyLossLimit)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Restante Hoje</p>
            <p className="font-mono font-bold text-warning">{fmt(dailyRemaining)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Drawdown Restante</p>
            <p className="font-mono font-bold text-foreground">{fmt(maxRemaining)}</p>
          </div>
        </div>
      </motion.div>

      {/* Input Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-5 space-y-5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Parâmetros da Operação</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Input
                type="number"
                value={riskInput}
                onChange={e => setRiskInput(e.target.value)}
                placeholder={riskMode === 'percent' ? '1' : '500'}
                step="0.1"
                min="0"
                className="flex-1"
              />
            </div>
            {riskMode === 'percent' && (
              <p className="text-[10px] text-muted-foreground font-mono">= {fmt(riskValue)}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Stop Loss (pontos/pips)</label>
            <Input
              type="number"
              value={stopPoints}
              onChange={e => setStopPoints(e.target.value)}
              placeholder="20"
              step="1"
              min="1"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Valor por Ponto/Tick (por lote)</label>
            <Input
              type="number"
              value={pointValue}
              onChange={e => setPointValue(e.target.value)}
              placeholder="10"
              step="0.01"
              min="0.01"
            />
          </div>
        </div>
      </motion.div>

      {/* Results */}
      {calc && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
          {/* Main result */}
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-4 font-medium">Resultado</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Lote Máximo</p>
                <p className="text-2xl font-mono font-black text-foreground">{calc.maxLot.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Risco da Operação</p>
                <p className="text-2xl font-mono font-black text-foreground">{fmt(riskValue)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Stops no Dia</p>
                <p className={`text-2xl font-mono font-black ${calc.stopsInDay <= 1 ? 'text-destructive' : calc.stopsInDay <= 3 ? 'text-warning' : 'text-success'}`}>
                  {calc.stopsInDay}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Stops na Conta</p>
                <p className={`text-2xl font-mono font-black ${calc.stopsInAccount <= 2 ? 'text-destructive' : calc.stopsInAccount <= 5 ? 'text-warning' : 'text-foreground'}`}>
                  {calc.stopsInAccount}
                </p>
              </div>
            </div>
          </div>

          {/* Interpretive message */}
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

          {/* Risk bars */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Impacto nos Limites</p>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Uso do Limite Diário</span>
                  <span className="font-mono">{Math.round(calc.riskPctOfDaily)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${calc.riskPctOfDaily > 50 ? 'bg-destructive' : calc.riskPctOfDaily > 30 ? 'bg-warning' : 'bg-success'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, calc.riskPctOfDaily)}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Uso do Drawdown Total</span>
                  <span className="font-mono">{Math.round(calc.riskPctOfMax)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${calc.riskPctOfMax > 50 ? 'bg-destructive' : calc.riskPctOfMax > 30 ? 'bg-warning' : 'bg-success'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, calc.riskPctOfMax)}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default RiskCalculator;
