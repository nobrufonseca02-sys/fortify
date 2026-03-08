import { useState } from 'react';
import { motion } from 'framer-motion';
import { MOCK_EVALUATIONS, RULE_SET_TEMPLATES } from '@/data/mockData';
import { AccountSelector } from '@/components/AccountSelector';
import { TradingAccount, RuleEvaluation, STATUS_CONFIG, RULE_TYPE_DESCRIPTIONS, RuleType } from '@/types/fortify';
import { useAccountsStore } from '@/hooks/useAccountsStore';
import { Shield, ShieldAlert, ShieldX, AlertTriangle, CheckCircle2, XCircle, Info, Lightbulb, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// === Helpers ===
const fmt = (v: number) => `$${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

const CRITICAL_TYPES: RuleType[] = ['MAX_DAILY_LOSS', 'MAX_TOTAL_LOSS', 'TRAILING_MAX_LOSS'];
const EVALUATION_TYPES: RuleType[] = ['PROFIT_TARGET', 'MIN_TRADING_DAYS', 'CONSISTENCY_BEST_DAY_CAP'];
const OPERATIONAL_TYPES: RuleType[] = ['NEWS_RESTRICTION_WINDOW', 'SCALPING_RULE', 'MAX_STACKING_TRADES', 'INACTIVITY_LIMIT'];

// === Avoidance tips by rule type ===
const AVOIDANCE_TIPS: Record<RuleType, { title: string; explanation: string; tips: string[] }> = {
  MAX_DAILY_LOSS: {
    title: 'Como evitar violação de Perda Diária',
    explanation: 'Esta regra limita quanto você pode perder em um único dia. Se o valor for atingido, a conta pode ser encerrada imediatamente (hard stop).',
    tips: [
      'Defina um stop loss antes de cada trade',
      'Reduza o tamanho do lote quando já tiver perda no dia',
      'Pare de operar após 2 trades perdedores consecutivos',
      'Nunca mova o stop loss para aumentar a perda',
      'Use no máximo 1-2% do limite diário por trade',
    ],
  },
  MAX_TOTAL_LOSS: {
    title: 'Como evitar violação de Perda Total',
    explanation: 'Esta regra limita a perda acumulada desde o início da conta. Se atingida, a conta é reprovada.',
    tips: [
      'Monitore sua perda acumulada diariamente',
      'Reduza o lote progressivamente conforme a perda aumenta',
      'Considere parar por 1-2 dias após uma série negativa',
      'Foque em trades de alta probabilidade quando a margem estiver curta',
      'Nunca tente recuperar perdas grandes de uma vez',
    ],
  },
  TRAILING_MAX_LOSS: {
    title: 'Como evitar violação de Trailing Drawdown',
    explanation: 'O limite acompanha o maior saldo atingido. Conforme você lucra, o "piso" sobe junto. Isso significa que ganhos anteriores apertam sua margem.',
    tips: [
      'Entenda que cada novo high eleva o piso de perda',
      'Proteja lucros parciais usando trailing stop nos trades',
      'Evite devolver ganhos grandes em uma única sessão',
      'Reduza o risco após atingir um novo high significativo',
    ],
  },
  PROFIT_TARGET: {
    title: 'Como atingir a Meta de Lucro',
    explanation: 'Você precisa atingir um valor de lucro específico para ser aprovado. Não apresse o processo.',
    tips: [
      'Divida a meta em micro-metas semanais',
      'Mantenha consistência ao invés de buscar trades grandes',
      'Não force trades para atingir a meta rapidamente',
      'Foque na qualidade dos setups, não na quantidade',
    ],
  },
  MIN_TRADING_DAYS: {
    title: 'Como cumprir os Dias Mínimos',
    explanation: 'A prop firm exige que você opere em pelo menos X dias diferentes. Um dia com pelo menos 1 trade conta.',
    tips: [
      'Planeje operar pelo menos 1 trade por dia nos dias necessários',
      'Mesmo um micro-lote conta como dia ativo',
      'Não deixe para os últimos dias — distribua ao longo do período',
    ],
  },
  CONSISTENCY_BEST_DAY_CAP: {
    title: 'Como manter Consistência',
    explanation: 'O lucro do seu melhor dia não pode representar mais do que X% do lucro total. Isso evita que uma única "sorte grande" aprove a conta.',
    tips: [
      'Distribua seus lucros de forma uniforme entre os dias',
      'Evite arriscar tudo em um único trade',
      'Se tiver um dia excepcional, pare e proteja o resultado',
      'Busque lucros moderados e consistentes',
    ],
  },
  NEWS_RESTRICTION_WINDOW: {
    title: 'Como respeitar a Restrição de Notícias',
    explanation: 'Algumas prop firms proíbem operar durante janelas de notícias de alto impacto (ex: NFP, FOMC).',
    tips: [
      'Consulte o calendário econômico diariamente antes de operar',
      'Feche posições abertas antes da janela restrita',
      'Não abra novas posições durante o período de restrição',
      'Use alertas para lembrar dos horários de notícias',
    ],
  },
  SCALPING_RULE: {
    title: 'Como evitar violação de Scalping',
    explanation: 'Trades com duração muito curta (geralmente menos de 2-3 minutos) podem ser considerados scalping e limitados.',
    tips: [
      'Mantenha trades abertos por pelo menos 3 minutos',
      'Evite entrar e sair rapidamente só para marcar lucro',
      'Se o trade atingir o target rápido, espere o tempo mínimo antes de fechar',
    ],
  },
  MAX_STACKING_TRADES: {
    title: 'Como evitar Stacking de Trades',
    explanation: 'Algumas prop firms limitam o número de posições abertas simultaneamente no mesmo ativo.',
    tips: [
      'Abra apenas 1 posição por ativo por vez',
      'Use ordens parciais ao invés de múltiplas posições',
      'Feche a posição anterior antes de abrir uma nova no mesmo ativo',
    ],
  },
  INACTIVITY_LIMIT: {
    title: 'Como evitar violação de Inatividade',
    explanation: 'Você não pode ficar muitos dias consecutivos sem operar. A conta pode ser cancelada por inatividade.',
    tips: [
      'Configure lembretes para operar mesmo em dias de baixa convicção',
      'Um micro-lote já conta como atividade',
      'Planeje suas férias considerando o limite de inatividade',
    ],
  },
  PROFIT_CAP_PAYOUT: {
    title: 'Como funciona o Teto de Lucro',
    explanation: 'Há um limite máximo de lucro que pode ser sacado por ciclo de payout.',
    tips: [
      'Conheça o limite de saque do seu plano',
      'Planeje seus ciclos de payout com antecedência',
      'Lucros acima do teto geralmente ficam retidos para o próximo ciclo',
    ],
  },
};

// === Progress Bar ===
function ProgressBar({ value, max, status }: { value: number; max: number; status: string }) {
  const p = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const barColor =
    status === 'VIOLATED' ? 'bg-destructive' :
    status === 'WARNING' ? 'bg-warning' :
    p > 70 ? 'bg-warning' :
    'bg-success';

  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${Math.min(100, p)}%` }} />
    </div>
  );
}

// === Status Icon ===
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'APPROVING': return <CheckCircle2 className="w-4 h-4 text-success" />;
    case 'WARNING': return <AlertTriangle className="w-4 h-4 text-warning" />;
    case 'VIOLATED': return <XCircle className="w-4 h-4 text-destructive" />;
    default: return <Shield className="w-4 h-4 text-muted-foreground" />;
  }
}

// === Avoidance Modal ===
function AvoidanceModal({ ruleType, open, onClose }: { ruleType: RuleType | null; open: boolean; onClose: () => void }) {
  if (!ruleType) return null;
  const data = AVOIDANCE_TIPS[ruleType];
  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Shield className="w-5 h-5 text-primary" />
            {data.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">{data.explanation}</p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Dicas práticas</h4>
            <div className="space-y-2">
              {data.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                  </div>
                  <p className="text-sm text-foreground">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-warning flex-shrink-0" />
              <p className="text-xs text-warning">Lembre-se: proteger a conta é mais importante do que lucrar.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// === Critical Rule Card (large) ===
function CriticalRuleCard({ evaluation, index }: { evaluation: RuleEvaluation; index: number }) {
  const [showModal, setShowModal] = useState(false);
  const config = STATUS_CONFIG[evaluation.status];
  const remaining = Math.max(0, evaluation.limitValue - evaluation.currentValue);
  const description = RULE_TYPE_DESCRIPTIONS[evaluation.rule.type];

  // Practical tip inline
  let tip = '';
  if (evaluation.progressPct > 80) tip = 'Pare de operar até o próximo dia';
  else if (evaluation.progressPct > 60) tip = 'Reduza o lote pela metade';
  else if (evaluation.progressPct > 40) tip = 'Mantenha stop loss apertado';
  else tip = 'Situação confortável, mantenha a disciplina';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06, duration: 0.3 }}
        className="rounded-xl border border-border bg-card p-5"
      >
        {/* Status line */}
        <div className={`h-[2px] rounded-full mb-4 ${
          evaluation.status === 'APPROVING' ? 'bg-success' :
          evaluation.status === 'WARNING' ? 'bg-warning' :
          evaluation.status === 'VIOLATED' ? 'bg-destructive' :
          'bg-muted-foreground/30'
        }`} />

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <StatusIcon status={evaluation.status} />
            <h3 className="font-semibold text-foreground">{evaluation.rule.name}</h3>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bgClass} ${config.textClass}`}>
            {config.label}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground mb-4">{description}</p>

        {/* Values grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Limite</p>
            <p className="font-mono font-bold text-sm text-foreground">{fmt(evaluation.limitValue)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Atual</p>
            <p className="font-mono font-bold text-sm text-foreground">{fmt(evaluation.currentValue)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Restante</p>
            <p className="font-mono font-bold text-sm text-success">{fmt(remaining)}</p>
          </div>
        </div>

        {/* Progress */}
        <ProgressBar value={evaluation.currentValue} max={evaluation.limitValue} status={evaluation.status} />
        <p className="text-[10px] text-muted-foreground font-mono mt-1">{Math.round(evaluation.progressPct)}% utilizado</p>

        {/* Tip */}
        <div className="mt-4 rounded-lg bg-muted/50 p-3 flex items-start gap-2">
          <Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-foreground">{tip}</p>
        </div>

        {/* Severity + Action */}
        <div className="mt-4 flex items-center justify-between">
          {evaluation.rule.severity === 'hard' && (
            <span className="text-[10px] font-mono uppercase tracking-wider text-destructive/70">⚠ Regra HARD — violação = reprovação</span>
          )}
          {evaluation.rule.severity === 'soft' && (
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Regra SOFT</span>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            Como evitar violação <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </motion.div>

      <AvoidanceModal ruleType={evaluation.rule.type} open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}

// === Evaluation Rule Card ===
function EvaluationRuleCard({ evaluation, index }: { evaluation: RuleEvaluation; index: number }) {
  const [showModal, setShowModal] = useState(false);
  const config = STATUS_CONFIG[evaluation.status];
  const remaining = Math.max(0, evaluation.limitValue - Math.max(0, evaluation.currentValue));

  const formatVal = (v: number) => {
    if (evaluation.rule.type === 'MIN_TRADING_DAYS') return `${v}`;
    if (evaluation.rule.type === 'CONSISTENCY_BEST_DAY_CAP') return `${v}%`;
    return fmt(v);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06, duration: 0.3 }}
        className="rounded-xl border border-border bg-card p-5"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <StatusIcon status={evaluation.status} />
            <h3 className="font-semibold text-foreground text-sm">{evaluation.rule.name}</h3>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bgClass} ${config.textClass}`}>
            {config.label}
          </span>
        </div>

        <p className="text-xs text-muted-foreground mb-4">{RULE_TYPE_DESCRIPTIONS[evaluation.rule.type]}</p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Progresso</p>
            <p className="font-mono font-bold text-sm text-foreground">{formatVal(evaluation.currentValue)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Meta</p>
            <p className="font-mono font-bold text-sm text-muted-foreground">{formatVal(evaluation.limitValue)}</p>
          </div>
        </div>

        <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-1">
          <div
            className="h-full rounded-full transition-all duration-700 bg-primary"
            style={{ width: `${Math.min(100, Math.max(0, evaluation.progressPct))}%` }}
          />
        </div>
        <div className="flex justify-between">
          <p className="text-[10px] text-muted-foreground font-mono">{Math.round(evaluation.progressPct)}% concluído</p>
          {evaluation.rule.type === 'PROFIT_TARGET' && evaluation.currentValue >= 0 && (
            <p className="text-[10px] text-muted-foreground font-mono">Faltam {fmt(remaining)}</p>
          )}
        </div>

        <div className="mt-3 flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            Como evitar violação <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </motion.div>

      <AvoidanceModal ruleType={evaluation.rule.type} open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}

// === Operational Rule Card (smaller) ===
function OperationalRuleCard({ evaluation, index }: { evaluation: RuleEvaluation; index: number }) {
  const [showModal, setShowModal] = useState(false);
  const config = STATUS_CONFIG[evaluation.status];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06, duration: 0.3 }}
        className="rounded-xl border border-border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <StatusIcon status={evaluation.status} />
            <h3 className="font-medium text-foreground text-sm">{evaluation.rule.name}</h3>
          </div>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${config.bgClass} ${config.textClass}`}>
            {config.label}
          </span>
        </div>

        <p className="text-xs text-muted-foreground mb-3">{RULE_TYPE_DESCRIPTIONS[evaluation.rule.type]}</p>

        <p className="text-[10px] text-muted-foreground font-mono mb-3">{evaluation.message}</p>

        <button
          onClick={() => setShowModal(true)}
          className="text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          Como evitar violação <ChevronRight className="w-3 h-3" />
        </button>
      </motion.div>

      <AvoidanceModal ruleType={evaluation.rule.type} open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}

// === Main Page ===
  const { accounts } = useAccountsStore();
  const [selectedAccount, setSelectedAccount] = useState<TradingAccount>(accounts[0]);

  const evals = MOCK_EVALUATIONS.filter(e => e.tradingAccountId === selectedAccount.id);
  const ruleSet = RULE_SET_TEMPLATES.find(r => r.id === selectedAccount.ruleSetId);

  const criticalEvals = evals.filter(e => CRITICAL_TYPES.includes(e.rule.type));
  const evaluationEvals = evals.filter(e => EVALUATION_TYPES.includes(e.rule.type));
  const operationalEvals = evals.filter(e => OPERATIONAL_TYPES.includes(e.rule.type));

  const atRiskCount = evals.filter(e => e.status === 'WARNING' || e.status === 'VIOLATED').length;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-foreground mb-1">Regras da Conta</h1>
        <p className="text-xs text-muted-foreground">Todas as regras que a conta precisa respeitar para evitar violação.</p>
      </div>

      {/* Account Selector */}
      <AccountSelector accounts={accounts} selected={selectedAccount} onSelect={setSelectedAccount} />

      {/* Overview */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-5"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Conta</p>
            <p className="font-semibold text-foreground text-sm mt-1">{selectedAccount.nickname}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Modelo de Regras</p>
            <p className="font-semibold text-foreground text-sm mt-1">{ruleSet?.firmName || ruleSet?.name || 'Custom'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Monitoradas</p>
            <p className="font-mono font-bold text-lg text-foreground mt-1">{evals.length}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Em Risco</p>
            <p className={`font-mono font-bold text-lg mt-1 ${atRiskCount > 0 ? 'text-warning' : 'text-success'}`}>{atRiskCount}</p>
          </div>
        </div>
      </motion.div>

      {/* Critical Rules */}
      {criticalEvals.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ShieldX className="w-4 h-4 text-destructive" />
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Regras Críticas</h2>
            <span className="text-[10px] text-destructive/70 font-mono">— podem quebrar a conta</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {criticalEvals.map((ev, i) => (
              <CriticalRuleCard key={ev.id} evaluation={ev} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Evaluation Rules */}
      {evaluationEvals.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Regras de Avaliação</h2>
            <span className="text-[10px] text-muted-foreground font-mono">— progresso para aprovação</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {evaluationEvals.map((ev, i) => (
              <EvaluationRuleCard key={ev.id} evaluation={ev} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Operational Rules */}
      {operationalEvals.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Regras Operacionais</h2>
            <span className="text-[10px] text-muted-foreground font-mono">— restrições específicas da firma</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {operationalEvals.map((ev, i) => (
              <OperationalRuleCard key={ev.id} evaluation={ev} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="pt-4 border-t border-border">
        <p className="text-[10px] text-muted-foreground font-mono">
          Última atualização: {new Date().toLocaleString('pt-BR')}
        </p>
      </footer>
    </div>
  );
};

export default AccountRules;
