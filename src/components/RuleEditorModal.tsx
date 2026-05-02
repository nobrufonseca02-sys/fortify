import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Rule, RuleType, RuleSeverity, EvaluationScope, RULE_TYPE_LABELS } from '@/types/fortify';

// Default params per rule type
const DEFAULT_PARAMS: Record<RuleType, Record<string, unknown>> = {
  MAX_DAILY_LOSS: { percentOrAmount: 5, basis: 'initialBalance', measure: 'equity', hardStop: true },
  MAX_TOTAL_LOSS: { percentOrAmount: 10, basis: 'initialBalance', measure: 'equity' },
  TRAILING_MAX_LOSS: { trailPercentOrAmount: 5, anchor: 'highestEquityAllTime', measure: 'equity' },
  PROFIT_TARGET: { percentOrAmount: 10, basis: 'initialBalance', calculation: 'closedPnLOnly', phaseId: 'evaluation' },
  MIN_TRADING_DAYS: { minDays: 4, definition: 'daysWithTrade' },
  CONSISTENCY_BEST_DAY_CAP: { capPercent: 50, basis: 'totalNetProfitInWindow', window: 'payoutWindow' },
  INACTIVITY_LIMIT: { maxDays: 5 },
  NEWS_RESTRICTION_WINDOW: { minutesBefore: 3, minutesAfter: 3, calendarSourceText: 'Forex Factory', enforcement: 'informational' },
  SCALPING_RULE: { definition: 'tradesUnder3Min', maxScalpedProfitSharePercent: 10 },
  MAX_STACKING_TRADES: { maxSameSymbolOpenTrades: 3 },
  PROFIT_CAP_PAYOUT: { maxWithdrawalAmount: 10000, payoutCycleDays: 14 },
};

const RULE_TYPES = Object.keys(RULE_TYPE_LABELS) as RuleType[];
const SEVERITIES: RuleSeverity[] = ['hard', 'soft'];
const SCOPES: EvaluationScope[] = ['daily', 'total', 'phase', 'payoutWindow'];

interface RuleEditorModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (rule: Rule) => void;
  existingRule: Rule | null;
  ruleSetId: string;
}

export function RuleEditorModal({ open, onClose, onSave, existingRule, ruleSetId }: RuleEditorModalProps) {
  const isEdit = !!existingRule;

  const [type, setType] = useState<RuleType>('MAX_DAILY_LOSS');
  const [name, setName] = useState('');
  const [severity, setSeverity] = useState<RuleSeverity>('hard');
  const [scope, setScope] = useState<EvaluationScope>('daily');
  const [enabled, setEnabled] = useState(true);
  const [params, setParams] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (existingRule) {
      setType(existingRule.type);
      setName(existingRule.name);
      setSeverity(existingRule.severity);
      setScope(existingRule.evaluationScope);
      setEnabled(existingRule.enabled);
      setParams({ ...existingRule.params });
    } else {
      setType('MAX_DAILY_LOSS');
      setName('');
      setSeverity('hard');
      setScope('daily');
      setEnabled(true);
      setParams({ ...DEFAULT_PARAMS['MAX_DAILY_LOSS'] });
    }
  }, [existingRule, open]);

  const handleTypeChange = (newType: RuleType) => {
    setType(newType);
    if (!isEdit) {
      setName(RULE_TYPE_LABELS[newType]);
      setParams({ ...DEFAULT_PARAMS[newType] });
    }
  };

  const handleParamChange = (key: string, value: string) => {
    const num = Number(value);
    setParams(prev => ({
      ...prev,
      [key]: isNaN(num) ? value : num,
    }));
  };

  const handleSave = () => {
    const rule: Rule = {
      id: existingRule?.id || `rule-${Date.now()}`,
      ruleSetId,
      type,
      name: name || RULE_TYPE_LABELS[type],
      severity,
      params,
      enabled,
      evaluationScope: scope,
    };
    onSave(rule);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {isEdit ? 'Editar Regra' : 'Nova Regra'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tipo de Regra</Label>
            <Select value={type} onValueChange={(v) => handleTypeChange(v as RuleType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RULE_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{RULE_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={RULE_TYPE_LABELS[type]} />
          </div>

          {/* Severity + Scope */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Severidade</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as RuleSeverity)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map(s => (
                    <SelectItem key={s} value={s}>{s === 'hard' ? 'Hard (Violação)' : 'Soft (Aviso)'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Escopo</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as EvaluationScope)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCOPES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Enabled */}
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ativa</Label>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {/* Dynamic Params */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Parâmetros</Label>
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
              {Object.entries(params).map(([key, val]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground min-w-[140px]">{key}</span>
                  {typeof val === 'boolean' ? (
                    <Switch
                      checked={val as boolean}
                      onCheckedChange={(v) => setParams(prev => ({ ...prev, [key]: v }))}
                    />
                  ) : (
                    <Input
                      value={String(val)}
                      onChange={e => handleParamChange(key, e.target.value)}
                      className="h-8 text-sm font-mono"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>{isEdit ? 'Salvar' : 'Criar Regra'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
