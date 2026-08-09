import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Brain, CheckCircle2, ShieldAlert, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useSubscriptionPlan } from '@/hooks/useSubscriptionPlan';
import { PlanStatusPanel } from '@/components/PlanStatusPanel';
import { useRuleEvaluations, type RuleEvaluationRow } from '@/hooks/useRuleEvaluations';
import { useCoachMessages, useSendCoachMessage } from '@/hooks/useCoachChat';
import { ChatMessageBubble, TypingIndicator } from '@/components/coach/ChatMessageBubble';
import { ChatComposer } from '@/components/coach/ChatComposer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const fmtMoney = (value: number | null | undefined) =>
  `$${Number(value ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`;

const STARTER_PROMPTS = [
  'Qual é o meu maior risco agora?',
  'Posso operar mais hoje?',
  'Como fico dentro do limite diário?',
  'Revise minha última sessão',
];

function hasRuleKey(row: RuleEvaluationRow, keys: string[]) {
  return keys.includes(String(row.rule_instances?.rule_definitions?.key ?? ''));
}

function nextBestAction(rows: RuleEvaluationRow[], hasBinding: boolean) {
  if (!hasBinding && rows.length === 0) return 'Vincule as regras da mesa antes de confiar nos insights da conta.';
  if (rows.some((row) => row.status === 'VIOLATED')) return 'Pare de operar e revise as regras violadas antes do próximo trade.';
  if (rows.some((row) => row.status === 'WARNING')) return 'Reduza o risco até as regras em atenção ganharem mais margem.';
  if (rows.length === 0) return 'Sincronize a conta para calcular as avaliações de regra.';
  return 'Continue com risco controlado e sincronize após as sessões de trading.';
}

export default function AccountCoach() {
  const { id: accountId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasActivePlan, isLoading: planLoading } = useSubscriptionPlan();

  const [account, setAccount] = useState<any | null>(null);
  const [ruleBinding, setRuleBinding] = useState<any | null>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountId || !user?.id) return;

    const load = async () => {
      setLoading(true);
      try {
        const [accountRes, bindingRes] = await Promise.all([
          supabase.from('trading_accounts').select('*').eq('id', accountId).eq('user_id', user.id).maybeSingle(),
          (supabase
            .from('account_rule_bindings' as any)
            .select('*')
            .eq('trading_account_id', accountId)
            .eq('user_id', user.id)
            .eq('binding_status', 'active')
            .maybeSingle() as any),
        ]);

        setAccount(accountRes.data ?? null);
        setRuleBinding(bindingRes.data ?? null);

        const { data: connection } = await supabase
          .from('mt5_connections')
          .select('id')
          .eq('trading_account_id', accountId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (connection?.id) {
          const { data: tradeRows } = await supabase
            .from('mt5_trades')
            .select('profit, close_time')
            .eq('connection_id', connection.id)
            .not('close_time', 'is', null)
            .order('close_time', { ascending: false })
            .limit(50);
          setTrades(tradeRows ?? []);
        } else {
          setTrades([]);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [accountId, user?.id]);

  const { data: evaluations = [] } = useRuleEvaluations(accountId);

  const plan = useMemo(() => {
    const daily = evaluations.find((row) => hasRuleKey(row, ['max_daily_loss', 'daily_loss_percent', 'daily_loss_fixed']));
    const total =
      evaluations.find((row) => hasRuleKey(row, ['max_total_loss', 'total_loss_percent', 'total_loss_fixed', 'static_drawdown'])) ||
      evaluations.find((row) => String(row.rule_instances?.rule_definitions?.key ?? '').includes('drawdown'));
    const target = evaluations.find((row) => hasRuleKey(row, ['profit_target', 'profit_target_percent', 'profit_target_fixed']));
    const dailyRemaining = Number(daily?.remaining_value ?? Math.max(0, Number(daily?.limit_value ?? 0) - Number(daily?.current_value ?? 0)));
    const totalRemaining = Number(total?.remaining_value ?? Math.max(0, Number(total?.limit_value ?? 0) - Number(total?.current_value ?? 0)));
    const profitNeeded = Number(target?.remaining_value ?? Math.max(0, Number(target?.limit_value ?? 0) - Number(target?.current_value ?? 0)));
    const safeRisk = Math.max(0, Math.min(dailyRemaining * 0.2 || 0, totalRemaining * 0.1 || Number.MAX_SAFE_INTEGER));

    return {
      dailyRemaining,
      totalRemaining,
      profitNeeded,
      safeRisk: Number.isFinite(safeRisk) ? safeRisk : 0,
      next: nextBestAction(evaluations, !!ruleBinding),
    };
  }, [evaluations, ruleBinding]);

  const tradeStats = useMemo(() => {
    if (trades.length === 0) return null;
    const wins = trades.filter((trade) => Number(trade.profit ?? 0) > 0);
    const winRate = (wins.length / trades.length) * 100;
    const todayIso = new Date().toISOString().slice(0, 10);
    const tradesToday = trades.filter((trade) => String(trade.close_time || '').slice(0, 10) === todayIso).length;
    return { winRate, tradesToday, total: trades.length };
  }, [trades]);

  const violated = evaluations.filter((row) => row.status === 'VIOLATED');
  const warning = evaluations.filter((row) => row.status === 'WARNING');
  const severity: 'destructive' | 'warning' | 'success' = violated.length > 0 ? 'destructive' : warning.length > 0 ? 'warning' : 'success';
  const severityMeta = {
    destructive: { className: 'border-destructive/30 bg-destructive/10', iconClassName: 'text-destructive' },
    warning: { className: 'border-warning/30 bg-warning/10', iconClassName: 'text-warning' },
    success: { className: 'border-primary/20 bg-primary/5', iconClassName: 'text-primary' },
  }[severity];

  const { data: messages = [], isLoading: messagesLoading } = useCoachMessages(accountId);
  const sendMessage = useSendCoachMessage(accountId);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, sendMessage.isPending]);

  const handleSend = (message: string) => {
    sendMessage.mutate(message, {
      onError: (error: any) => {
        toast({
          title: 'Não foi possível enviar a mensagem',
          description: error?.message || 'Tente novamente em alguns instantes.',
          variant: 'destructive',
        });
      },
    });
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando coach de risco...</div>;
  }

  if (!account) {
    return <div className="p-6 text-sm text-muted-foreground">Conta não encontrada.</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(`/accounts/${accountId}`)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Coach de risco</h1>
          <p className="text-xs text-muted-foreground">
            {account.nickname ? `${account.nickname} — ` : ''}insights e orientação de disciplina para o próximo trade.
          </p>
        </div>
        <button
          onClick={() => navigate(`/accounts/${accountId}/rules`)}
          className="text-xs text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
        >
          Configurar vínculo de regras →
        </button>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground">Insights para o próximo trade</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Lucro necessário</p>
            <p className="font-mono text-sm text-foreground">{fmtMoney(plan.profitNeeded)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Margem diária</p>
            <p className="font-mono text-sm text-foreground">{fmtMoney(plan.dailyRemaining)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Margem total</p>
            <p className="font-mono text-sm text-foreground">{fmtMoney(plan.totalRemaining)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Risco/trade sugerido</p>
            <p className="font-mono text-sm text-foreground">{fmtMoney(plan.safeRisk)}</p>
          </div>
        </div>

        <div className={`rounded-lg border p-3 flex items-start gap-2 ${severityMeta.className}`}>
          <ShieldAlert className={`w-4 h-4 mt-0.5 shrink-0 ${severityMeta.iconClassName}`} />
          <p className="text-sm text-foreground font-medium">{plan.next}</p>
        </div>

        {(violated.length > 0 || warning.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {violated.map((row) => (
              <span
                key={row.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive"
              >
                <AlertTriangle className="w-3 h-3" />
                {row.rule_instances?.rule_definitions?.name || 'Regra'} · violada
              </span>
            ))}
            {warning.map((row) => (
              <span
                key={row.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning"
              >
                <AlertTriangle className="w-3 h-3" />
                {row.rule_instances?.rule_definitions?.name || 'Regra'} · atenção
              </span>
            ))}
          </div>
        )}

        {tradeStats && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Últimos {tradeStats.total} trades: {tradeStats.winRate.toFixed(0)}% de acerto · {tradeStats.tradesToday} trade(s) hoje.
          </div>
        )}
      </section>

      {!planLoading && !hasActivePlan ? (
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Converse com o coach</h2>
          </div>
          <PlanStatusPanel />
        </section>
      ) : (
        <section className="rounded-xl border border-border bg-card overflow-hidden flex flex-col h-[68vh] min-h-[480px]">
          <div className="flex items-center gap-3 border-b border-border bg-muted/20 px-5 py-3.5 shrink-0">
            <Avatar className="h-9 w-9 border border-primary/25">
              <AvatarFallback className="bg-primary/15 text-primary">
                <Brain className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-foreground">Coach de Risco</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                Ancorado nos dados reais desta conta
              </p>
            </div>
          </div>

          <ScrollArea className="flex-1 px-5 py-4">
            <div className="space-y-4">
              {messagesLoading ? (
                <p className="text-xs text-muted-foreground">Carregando conversa...</p>
              ) : messages.length === 0 ? (
                <div className="space-y-4">
                  <ChatMessageBubble
                    role="assistant"
                    content="Olá — sou seu coach de risco. Posso te ajudar a manter a disciplina com base nos números reais desta conta: regras, histórico de trades e seu plano do dia. O que você quer revisar antes do próximo trade?"
                  />
                  <div className="flex flex-wrap gap-2 pl-11">
                    {STARTER_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleSend(prompt)}
                        disabled={sendMessage.isPending}
                        className="pill-btn text-xs py-1.5 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message) => <ChatMessageBubble key={message.id} role={message.role} content={message.content} />)
              )}
              {sendMessage.isPending && <TypingIndicator />}
              <div ref={scrollAnchorRef} />
            </div>
          </ScrollArea>

          <div className="border-t border-border p-3 shrink-0">
            <ChatComposer onSend={handleSend} sending={sendMessage.isPending} />
          </div>
        </section>
      )}
    </div>
  );
}
