import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Shield, AlertTriangle, Zap, TrendingUp,
  Calculator, Brain, BarChart3, Target, Clock, Newspaper, Layers, Activity,
  ChevronDown, ChevronUp, Wallet, Flame, Award
} from 'lucide-react';
import { RuleType, RULE_TYPE_LABELS, RULE_TYPE_DESCRIPTIONS } from '@/types/fortify';
import { FIRM_TEMPLATES, type FirmTemplate, type TemplateRule } from '@/data/propFirmLibrary';

const RISK_OPTIONS = [
  { label: '0.25%', value: 0.25, desc: 'Ultra conservador' },
  { label: '0.5%', value: 0.5, desc: 'Conservador' },
  { label: '1%', value: 1, desc: 'Moderado' },
  { label: '2%', value: 2, desc: 'Agressivo' },
];

const RULE_ICONS: Partial<Record<RuleType, React.ElementType>> = {
  MAX_DAILY_LOSS: Flame,
  MAX_TOTAL_LOSS: Shield,
  TRAILING_MAX_LOSS: TrendingUp,
  PROFIT_TARGET: Target,
  MIN_TRADING_DAYS: Clock,
  CONSISTENCY_BEST_DAY_CAP: BarChart3,
  NEWS_RESTRICTION_WINDOW: Newspaper,
  SCALPING_RULE: Zap,
  MAX_STACKING_TRADES: Layers,
  INACTIVITY_LIMIT: Activity,
};

const fmt = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

// ─── Step indicator ───
const StepIndicator = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
          i < current ? 'bg-primary text-primary-foreground' :
          i === current ? 'bg-primary/20 text-primary border border-primary' :
          'bg-muted text-muted-foreground'
        }`}>
          {i < current ? <Check className="w-4 h-4" /> : i + 1}
        </div>
        {i < total - 1 && <div className={`w-8 h-px ${i < current ? 'bg-primary' : 'bg-border'}`} />}
      </div>
    ))}
  </div>
);

// ─── Main Page ───
const CreateAccount = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Step 1: Prop Firm
  const [selectedFirm, setSelectedFirm] = useState<string | null>(null);

  // Step 2: Account Info
  const [accountName, setAccountName] = useState('');
  const [startBalance, setStartBalance] = useState('100000');
  const [currency, setCurrency] = useState('USD');
  const [accountType, setAccountType] = useState('');

  // Step 3: Rules
  const [rules, setRules] = useState<TemplateRule[]>([]);

  // Step 4: Risk
  const [riskPerTrade, setRiskPerTrade] = useState<number | null>(null);
  const [customRisk, setCustomRisk] = useState('');

  const firm = FIRM_TEMPLATES.find(f => f.id === selectedFirm);
  const balance = parseFloat(startBalance) || 0;
  const effectiveRisk = riskPerTrade ?? (customRisk ? parseFloat(customRisk) : 0);

  // Select firm → load rules
  const handleSelectFirm = (id: string) => {
    setSelectedFirm(id);
    const t = FIRM_TEMPLATES.find(f => f.id === id)!;
    setRules(t.rules.map(r => ({ ...r })));
    setAccountType(t.accountTypes[0]);
  };

  const toggleRule = (idx: number) => {
    setRules(prev => prev.map((r, i) => i === idx ? { ...r, enabled: !r.enabled } : r));
  };

  const updateRuleValue = (idx: number, val: number) => {
    setRules(prev => prev.map((r, i) => i === idx ? { ...r, defaultValue: val } : r));
  };

  // Risk simulation
  const riskSimulation = useMemo(() => {
    if (!effectiveRisk || !balance) return null;
    const riskPerTradeValue = balance * (effectiveRisk / 100);
    const dailyLossRule = rules.find(r => r.type === 'MAX_DAILY_LOSS' && r.enabled);
    const maxLossRule = rules.find(r => (r.type === 'MAX_TOTAL_LOSS' || r.type === 'TRAILING_MAX_LOSS') && r.enabled);

    const dailyLimit = dailyLossRule
      ? dailyLossRule.unit === '%' ? balance * (dailyLossRule.defaultValue / 100) : dailyLossRule.defaultValue
      : 0;
    const maxLimit = maxLossRule
      ? maxLossRule.unit === '%' ? balance * (maxLossRule.defaultValue / 100) : maxLossRule.defaultValue
      : 0;

    const tradesUntilDaily = dailyLimit ? Math.floor(dailyLimit / riskPerTradeValue) : 0;
    const tradesUntilMax = maxLimit ? Math.floor(maxLimit / riskPerTradeValue) : 0;

    return { riskPerTradeValue, dailyLimit, maxLimit, tradesUntilDaily, tradesUntilMax };
  }, [effectiveRisk, balance, rules]);

  // Difficulty index
  const difficultyIndex = useMemo(() => {
    if (!rules.length) return null;
    let score = 0;
    const dailyLoss = rules.find(r => r.type === 'MAX_DAILY_LOSS' && r.enabled);
    const maxLoss = rules.find(r => (r.type === 'MAX_TOTAL_LOSS' || r.type === 'TRAILING_MAX_LOSS') && r.enabled);
    const profit = rules.find(r => r.type === 'PROFIT_TARGET' && r.enabled);

    if (dailyLoss && dailyLoss.unit === '%') {
      if (dailyLoss.defaultValue <= 3) score += 3;
      else if (dailyLoss.defaultValue <= 5) score += 2;
      else score += 1;
    }
    if (maxLoss && maxLoss.unit === '%') {
      if (maxLoss.defaultValue <= 6) score += 3;
      else if (maxLoss.defaultValue <= 10) score += 2;
      else score += 1;
    }
    if (profit && profit.unit === '%') {
      if (profit.defaultValue >= 10) score += 2;
      else score += 1;
    }
    const trailing = rules.find(r => r.type === 'TRAILING_MAX_LOSS' && r.enabled);
    if (trailing) score += 2;
    const news = rules.find(r => r.type === 'NEWS_RESTRICTION_WINDOW' && r.enabled);
    if (news) score += 1;
    const scalp = rules.find(r => r.type === 'SCALPING_RULE' && r.enabled);
    if (scalp) score += 1;

    const maxScore = 12;
    const pct = Math.min(100, Math.round((score / maxScore) * 100));
    const label = pct >= 70 ? 'Difícil' : pct >= 40 ? 'Moderado' : 'Fácil';
    const colorClass = pct >= 70 ? 'text-destructive' : pct >= 40 ? 'text-warning' : 'text-success';
    return { pct, label, colorClass };
  }, [rules]);

  // Recovery calculator
  const recoveryCalc = useMemo(() => {
    if (!balance) return [];
    const losses = [1, 2, 3, 5, 8, 10, 15, 20];
    return losses.map(pct => {
      const lostAmount = balance * (pct / 100);
      const afterLoss = balance - lostAmount;
      const recoveryNeeded = balance - afterLoss;
      const recoveryPct = (recoveryNeeded / afterLoss) * 100;
      return { lossPct: pct, lostAmount, afterLoss, recoveryNeeded, recoveryPct: recoveryPct.toFixed(2) };
    });
  }, [balance]);

  const canNext = () => {
    if (step === 0) return !!selectedFirm;
    if (step === 1) return !!accountName && balance > 0;
    if (step === 2) return rules.some(r => r.enabled);
    if (step === 3) return effectiveRisk > 0;
    return true;
  };

  const handleCreate = () => {
    // For now navigate back — will integrate with DB later
    navigate('/accounts');
  };

  const STEPS = ['Prop Firm', 'Conta', 'Regras', 'Risco', 'Revisão'];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/accounts')} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Criar Nova Conta</h1>
          <p className="text-xs text-muted-foreground">Configure sua conta de prop firm em menos de 1 minuto</p>
        </div>
        <StepIndicator current={step} total={STEPS.length} />
      </div>

      <AnimatePresence mode="wait">
        {/* ─── STEP 0: Prop Firm Selection ─── */}
        {step === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Selecione sua Prop Firm</h2>
              <p className="text-xs text-muted-foreground mt-1">As regras serão carregadas automaticamente</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {FIRM_TEMPLATES.map(f => (
                <button
                  key={f.id}
                  onClick={() => handleSelectFirm(f.id)}
                  className={`relative rounded-xl border p-4 text-left transition-all hover:border-primary/50 ${
                    selectedFirm === f.id ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border bg-card'
                  }`}
                >
                  {selectedFirm === f.id && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold mb-3" style={{ background: `${f.color}20`, color: f.color }}>
                    {f.logo}
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">{f.name}</h3>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{f.description}</p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {f.rules.filter(r => r.enabled).length > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {f.rules.filter(r => r.enabled).length} regras
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── STEP 1: Account Info ─── */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Informações da Conta</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nome da Conta</label>
                <input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder={`${firm?.name || ''} 100k Challenge`} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Saldo Inicial</label>
                <input type="number" value={startBalance} onChange={e => setStartBalance(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary" min="0" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Moeda</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="BRL">BRL (R$)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tipo de Conta</label>
                <select value={accountType} onChange={e => setAccountType(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  {firm?.accountTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── STEP 2: Rules ─── */}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Regras da Conta</h2>
                <p className="text-xs text-muted-foreground mt-1">Edite os valores ou ative/desative regras</p>
              </div>
              {difficultyIndex && (
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Dificuldade</p>
                  <p className={`text-sm font-bold ${difficultyIndex.colorClass}`}>{difficultyIndex.label} ({difficultyIndex.pct}%)</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rules.map((rule, idx) => {
                const Icon = RULE_ICONS[rule.type] || Shield;
                const computedValue = rule.unit === '%' ? balance * (rule.defaultValue / 100) : rule.defaultValue;
                return (
                  <div key={idx} className={`rounded-xl border p-4 transition-all ${rule.enabled ? 'border-border bg-card' : 'border-border/50 bg-muted/20 opacity-60'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${rule.severity === 'hard' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold text-foreground">{rule.name}</h3>
                          <span className={`text-[9px] font-mono uppercase ${rule.severity === 'hard' ? 'text-destructive' : 'text-warning'}`}>{rule.severity}</span>
                        </div>
                      </div>
                      <button onClick={() => toggleRule(idx)} className={`w-10 h-5 rounded-full transition-colors relative ${rule.enabled ? 'bg-primary' : 'bg-muted'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-foreground transition-all ${rule.enabled ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                    {rule.enabled && rule.editable && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={rule.defaultValue}
                            onChange={e => updateRuleValue(idx, parseFloat(e.target.value) || 0)}
                            className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <span className="text-xs text-muted-foreground">{rule.unit}</span>
                          {rule.unit === '%' && balance > 0 && (
                            <span className="text-xs font-mono text-muted-foreground ml-auto">= {fmt(computedValue)}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ─── STEP 3: Risk Configuration ─── */}
        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <h2 className="text-sm font-semibold text-foreground">Configuração de Risco por Trade</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {RISK_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setRiskPerTrade(opt.value); setCustomRisk(''); }}
                  className={`rounded-xl border p-4 text-center transition-all ${riskPerTrade === opt.value ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border bg-card hover:border-primary/30'}`}
                >
                  <p className="text-lg font-bold font-mono text-foreground">{opt.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{opt.desc}</p>
                  {balance > 0 && <p className="text-xs font-mono text-primary mt-2">{fmt(balance * (opt.value / 100))}/trade</p>}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Ou digite um valor customizado (%)</label>
              <input
                type="number"
                value={customRisk}
                onChange={e => { setCustomRisk(e.target.value); setRiskPerTrade(null); }}
                placeholder="Ex.: 0.75"
                className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                min="0" max="100" step="0.01"
              />
            </div>

            {/* Risk Simulator */}
            {riskSimulation && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Simulação de Risco</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Risco por Trade</p>
                    <p className="text-lg font-mono font-bold text-foreground">{fmt(riskSimulation.riskPerTradeValue)}</p>
                  </div>
                  {riskSimulation.dailyLimit > 0 && (
                    <div className="rounded-lg bg-warning/5 border border-warning/20 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-warning">Trades até Perda Diária</p>
                      <p className="text-lg font-mono font-bold text-warning">{riskSimulation.tradesUntilDaily} trades</p>
                      <p className="text-[10px] text-muted-foreground">Limite: {fmt(riskSimulation.dailyLimit)}</p>
                    </div>
                  )}
                  {riskSimulation.maxLimit > 0 && (
                    <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-destructive">Trades até Perda Máxima</p>
                      <p className="text-lg font-mono font-bold text-destructive">{riskSimulation.tradesUntilMax} trades</p>
                      <p className="text-[10px] text-muted-foreground">Limite: {fmt(riskSimulation.maxLimit)}</p>
                    </div>
                  )}
                </div>

                {/* AI Rule Coach */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-semibold text-primary">AI Rule Coach</h4>
                  </div>
                  <div className="space-y-1 text-xs text-foreground/80">
                    {riskSimulation.tradesUntilDaily <= 2 && (
                      <p>⚠️ Com {effectiveRisk}% de risco, você só aguenta <strong>{riskSimulation.tradesUntilDaily} trades perdedores</strong> antes de atingir o limite diário. Considere reduzir o risco.</p>
                    )}
                    {riskSimulation.tradesUntilDaily > 2 && riskSimulation.tradesUntilDaily <= 5 && (
                      <p>📊 Você tem margem para <strong>{riskSimulation.tradesUntilDaily} trades perdedores consecutivos</strong> antes de atingir o limite diário de {fmt(riskSimulation.dailyLimit)}.</p>
                    )}
                    {riskSimulation.tradesUntilDaily > 5 && (
                      <p>✅ Boa margem de segurança: <strong>{riskSimulation.tradesUntilDaily} trades perdedores</strong> antes do limite diário. Risco bem calibrado.</p>
                    )}
                    {riskSimulation.tradesUntilMax > 0 && (
                      <p>🛡️ Para quebrar a conta, seria necessário perder <strong>{riskSimulation.tradesUntilMax} trades consecutivos</strong> ({fmt(riskSimulation.maxLimit)} de margem total).</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Recovery Calculator */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Recovery Calculator</h3>
              </div>
              <p className="text-xs text-muted-foreground">Quanto maior a perda, exponencialmente mais difícil é recuperar.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {recoveryCalc.slice(0, 8).map(r => (
                  <div key={r.lossPct} className={`rounded-lg p-3 text-center ${r.lossPct >= 10 ? 'bg-destructive/10 border border-destructive/20' : r.lossPct >= 5 ? 'bg-warning/10 border border-warning/20' : 'bg-muted/30 border border-border'}`}>
                    <p className="text-[10px] text-muted-foreground">Perda de {r.lossPct}%</p>
                    <p className="text-xs font-mono font-bold text-foreground mt-1">{fmt(r.lostAmount)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Precisa recuperar</p>
                    <p className={`text-xs font-mono font-bold ${r.lossPct >= 10 ? 'text-destructive' : r.lossPct >= 5 ? 'text-warning' : 'text-foreground'}`}>{fmt(r.recoveryNeeded)}</p>
                    <p className="text-[9px] text-muted-foreground">({r.recoveryPct}% do saldo restante)</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── STEP 4: Review & Preview ─── */}
        {step === 4 && (
          <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <h2 className="text-sm font-semibold text-foreground">Revisão e Preview</h2>

            {/* Account preview card */}
            <div className="rounded-xl border border-primary/30 bg-card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{accountName || 'Minha Conta'}</h3>
                  <p className="text-[10px] text-muted-foreground">{firm?.name || 'Custom'} • {accountType} • {currency}</p>
                </div>
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-success/15 text-success">
                  <Shield className="w-3 h-3" /> ATIVA
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo Inicial</p>
                  <p className="font-mono font-bold text-foreground">{fmt(balance)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Risco/Trade</p>
                  <p className="font-mono font-bold text-primary">{effectiveRisk}% ({fmt(balance * (effectiveRisk / 100))})</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Regras Ativas</p>
                  <p className="font-mono font-bold text-foreground">{rules.filter(r => r.enabled).length}</p>
                </div>
                {difficultyIndex && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Dificuldade</p>
                    <p className={`font-bold ${difficultyIndex.colorClass}`}>{difficultyIndex.label}</p>
                  </div>
                )}
              </div>

              {/* Rules summary */}
              <div className="border-t border-border pt-3 space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Regras Configuradas</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {rules.filter(r => r.enabled).map((rule, i) => {
                    const Icon = RULE_ICONS[rule.type] || Shield;
                    const computedValue = rule.unit === '%' ? balance * (rule.defaultValue / 100) : rule.defaultValue;
                    return (
                      <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-foreground flex-1">{rule.name}</span>
                        <span className="text-xs font-mono text-primary">{rule.defaultValue}{rule.unit}</span>
                        {rule.unit === '%' && <span className="text-[10px] font-mono text-muted-foreground">({fmt(computedValue)})</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Difficulty Index */}
            {difficultyIndex && (
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Prop Firm Difficulty Index</h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="16" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                      <circle cx="18" cy="18" r="16" fill="none" stroke={difficultyIndex.pct >= 70 ? 'hsl(var(--destructive))' : difficultyIndex.pct >= 40 ? 'hsl(var(--warning))' : 'hsl(var(--success))'} strokeWidth="3" strokeDasharray={`${difficultyIndex.pct} ${100 - difficultyIndex.pct}`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-sm font-bold font-mono ${difficultyIndex.colorClass}`}>{difficultyIndex.pct}%</span>
                    </div>
                  </div>
                  <div>
                    <p className={`text-lg font-bold ${difficultyIndex.colorClass}`}>{difficultyIndex.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">Baseado nas regras configuradas, limites e restrições operacionais.</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          onClick={() => step > 0 ? setStep(step - 1) : navigate('/accounts')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 0 ? 'Voltar' : 'Anterior'}
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            Próximo
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors glow-primary"
          >
            <Check className="w-4 h-4" />
            Criar Conta e Ativar Monitoramento
          </button>
        )}
      </div>
    </div>
  );
};

export default CreateAccount;
