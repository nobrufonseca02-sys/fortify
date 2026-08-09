import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle2, CreditCard, Loader2, ShieldCheck, AlertTriangle,
  Headphones, RotateCcw, XCircle, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionPlan, type FortifyPlan } from '@/hooks/useSubscriptionPlan';
import { useAccountsStore } from '@/hooks/useAccountsStore';
import {
  cancelSubscription, resumeSubscription, changePlan, createPortalSession,
  getSubscriptionStatus, isBillingEnabled, createCheckoutSession,
  scheduleManualDowngrade, cancelScheduledDowngrade,
} from '@/lib/billing';
import { SUPPORT_WHATSAPP_URL } from '@/lib/support';
import { toast } from '@/hooks/use-toast';
import type { TradingAccount } from '@/types/fortify';

const supportLabels: Record<string, string> = {
  basic: 'Suporte básico',
  standard: 'Suporte padrão',
  priority: 'Suporte prioritário',
  enterprise: 'Suporte VIP/Enterprise',
};

const LIVE_STATUSES = new Set(['connected', 'connecting', 'syncing']);

function isValidStripePrice(value?: string | null) {
  return typeof value === 'string' && /^price_[A-Za-z0-9]+$/.test(value);
}

function hasConfiguredPrice(plan: FortifyPlan) {
  const amount = Number(plan.price_amount ?? plan.price_cents ?? 0);
  return amount > 0 && isValidStripePrice(plan.stripe_price_id);
}

function isRealPlan(plan: FortifyPlan) {
  return plan.id !== 'beta_free' && String(plan.plan_type || '').toLowerCase() !== 'add_on';
}

function formatPrice(plan: FortifyPlan) {
  const amount = Number(plan.price_amount ?? plan.price_cents ?? 0);
  if (!amount) return 'Preço a confirmar';
  return (amount / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: String(plan.currency || 'brl').toUpperCase(),
  });
}

function intervalLabel(interval?: string | null) {
  return interval === 'year' ? 'ano' : 'mês';
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toLocaleDateString('pt-BR');
}

interface SubscriptionStatusResponse {
  subscription: {
    plan_id: string;
    plan_name: string;
    status: string;
    current_period_end: string | null;
    paid_until: string | null;
    cancel_at_period_end: boolean | null;
    has_stripe_customer: boolean;
    has_stripe_subscription: boolean;
    pending_plan_id: string | null;
  } | null;
  activeAccountCount: number;
  includedAccountLimit: number;
  extraAccountQuantity: number;
  accountLimit: number;
  remainingAccounts: number;
  hasActivePlan: boolean;
}

export default function SubscriptionManagementPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;
  const accessToken = session?.access_token;

  const { plans, isLoading: plansLoading } = useSubscriptionPlan();
  const { accounts, removeAccount } = useAccountsStore();
  const billingEnabled = isBillingEnabled();

  const statusQuery = useQuery({
    queryKey: ['billing_subscription_status', userId],
    queryFn: () => getSubscriptionStatus(accessToken!),
    enabled: Boolean(accessToken),
  });

  const status = statusQuery.data as SubscriptionStatusResponse | undefined;
  const subscription = status?.subscription ?? null;

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const [picker, setPicker] = useState<{
    plan: FortifyPlan;
    targetLimit: number;
    keep: Set<string>;
    mode: 'change' | 'schedule';
  } | null>(null);
  const [pickerBusy, setPickerBusy] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const [autoTriggeredTargetPlan, setAutoTriggeredTargetPlan] = useState(false);

  const liveAccounts = useMemo<TradingAccount[]>(
    () => accounts.filter((account) => LIVE_STATUSES.has(String(account.mt5ConnectionStatus || ''))),
    [accounts],
  );

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['billing_subscription_status', userId] });
    queryClient.invalidateQueries({ queryKey: ['fortify_subscription_plan', userId] });
  };

  const refetchLiveAccountIds = async () => {
    await queryClient.refetchQueries({ queryKey: ['trading_accounts', userId] });
    const fresh = (queryClient.getQueryData(['trading_accounts', userId]) as TradingAccount[] | undefined) || [];
    return new Set(
      fresh
        .filter((account) => account.status !== 'inactive' && LIVE_STATUSES.has(String(account.mt5ConnectionStatus || '')))
        .map((account) => account.id),
    );
  };

  const runPlanMutation = async (targetPlan: FortifyPlan, mode: 'change' | 'schedule') => {
    if (!accessToken) return;
    const actionKey = mode === 'schedule' ? `schedule-${targetPlan.id}` : targetPlan.id;
    setBusyAction(actionKey);
    try {
      if (mode === 'schedule') {
        await scheduleManualDowngrade(targetPlan.slug || targetPlan.id, accessToken);
      } else {
        await changePlan(targetPlan.slug || targetPlan.id, accessToken);
      }
      invalidateAll();
      toast(
        mode === 'schedule'
          ? {
              title: 'Downgrade agendado',
              description: `Seu plano muda para ${targetPlan.name || targetPlan.plan_name} na próxima renovação.`,
            }
          : {
              title: 'Plano alterado com sucesso',
              description: `Você agora está no plano ${targetPlan.name || targetPlan.plan_name}.`,
            },
      );
      setPicker(null);
      setPickerError(null);
    } catch (error: any) {
      if (error?.code === 'account_limit_exceeded_for_target_plan') {
        const details = error?.details || {};
        const liveIds = await refetchLiveAccountIds();
        setPicker({
          plan: targetPlan,
          targetLimit: Number(details.targetAccountLimit ?? 0),
          keep: liveIds,
          mode,
        });
        setPickerError(error.message);
      } else {
        toast({
          title: mode === 'schedule' ? 'Não foi possível agendar o downgrade' : 'Não foi possível trocar de plano',
          description: error?.message,
          variant: 'destructive',
        });
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handlePlanAction = (targetPlan: FortifyPlan) => {
    if (!status) return;
    const targetTotalLimit = Number(targetPlan.account_limit || 0) + status.extraAccountQuantity;
    const accountsOverBy = status.activeAccountCount - targetTotalLimit;

    if (accountsOverBy <= 0) {
      runPlanMutation(targetPlan, 'change');
      return;
    }

    setPickerError(null);
    setPicker({
      plan: targetPlan,
      targetLimit: targetTotalLimit,
      keep: new Set(liveAccounts.map((account) => account.id)),
      mode: 'change',
    });
  };

  const handleScheduleDowngrade = (targetPlan: FortifyPlan) => {
    if (!status) return;
    const targetTotalLimit = Number(targetPlan.account_limit || 0) + status.extraAccountQuantity;
    const accountsOverBy = status.activeAccountCount - targetTotalLimit;

    if (accountsOverBy <= 0) {
      runPlanMutation(targetPlan, 'schedule');
      return;
    }

    setPickerError(null);
    setPicker({
      plan: targetPlan,
      targetLimit: targetTotalLimit,
      keep: new Set(liveAccounts.map((account) => account.id)),
      mode: 'schedule',
    });
  };

  const payNow = async (targetPlan: FortifyPlan) => {
    if (!accessToken) return;
    setBusyAction(`pay-${targetPlan.id}`);
    try {
      const checkout = await createCheckoutSession(targetPlan.slug || targetPlan.id, accessToken);
      window.location.assign(checkout.checkout_url);
    } catch (error: any) {
      toast({ title: 'Não foi possível abrir o checkout', description: error?.message, variant: 'destructive' });
      setBusyAction(null);
    }
  };

  const handleCancelScheduledDowngrade = async () => {
    if (!accessToken) return;
    setBusyAction('cancel-scheduled-downgrade');
    try {
      await cancelScheduledDowngrade(accessToken);
      invalidateAll();
      toast({ title: 'Agendamento cancelado', description: 'Seu plano não vai mudar automaticamente.' });
    } catch (error: any) {
      toast({ title: 'Não foi possível cancelar o agendamento', description: error?.message, variant: 'destructive' });
    } finally {
      setBusyAction(null);
    }
  };

  // Auto-open the change flow for ?targetPlan=<slug> coming from PricingPage.
  useEffect(() => {
    if (autoTriggeredTargetPlan || !status?.hasActivePlan || !subscription?.has_stripe_subscription) return;
    const targetSlug = searchParams.get('targetPlan');
    if (!targetSlug || plans.length === 0) return;
    const targetPlan = plans.find((plan) => plan.slug === targetSlug || plan.id === targetSlug);
    if (!targetPlan || targetPlan.id === subscription.plan_id) return;
    setAutoTriggeredTargetPlan(true);
    handlePlanAction(targetPlan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTriggeredTargetPlan, status?.hasActivePlan, subscription?.has_stripe_subscription, plans, searchParams]);

  const confirmPicker = async () => {
    if (!picker || !accessToken) return;
    setPickerBusy(true);
    setPickerError(null);
    try {
      const toRemove = liveAccounts.filter((account) => !picker.keep.has(account.id));
      await Promise.allSettled(toRemove.map((account) => removeAccountSafe(account.id)));

      const liveIdsAfterRemoval = await refetchLiveAccountIds();
      const stillLive = toRemove.filter((account) => liveIdsAfterRemoval.has(account.id));
      if (stillLive.length > 0) {
        setPickerError(
          `Não foi possível remover ${stillLive.map((a) => a.nickname).join(', ')}. Tente novamente.`,
        );
        setPicker((prev) => (prev ? { ...prev, keep: liveIdsAfterRemoval } : prev));
        return;
      }

      await runPlanMutation(picker.plan, picker.mode);
    } finally {
      setPickerBusy(false);
    }
  };

  const removeAccountSafe = async (id: string) => {
    try {
      await removeAccount(id, 'plan_downgrade');
    } catch {
      // Verified independently via refetchLiveAccountIds after all removals settle.
    }
  };

  const handleCancel = async () => {
    if (!accessToken) return;
    setBusyAction('cancel');
    try {
      await cancelSubscription(accessToken);
      invalidateAll();
      toast({ title: 'Cancelamento agendado', description: 'Você não será cobrado no próximo ciclo.' });
    } catch (error: any) {
      toast({ title: 'Não foi possível cancelar', description: error?.message, variant: 'destructive' });
    } finally {
      setBusyAction(null);
      setCancelDialogOpen(false);
    }
  };

  const handleResume = async () => {
    if (!accessToken) return;
    setBusyAction('resume');
    try {
      await resumeSubscription(accessToken);
      invalidateAll();
      toast({ title: 'Assinatura reativada', description: 'A cobrança do próximo ciclo foi restaurada.' });
    } catch (error: any) {
      toast({ title: 'Não foi possível reativar', description: error?.message, variant: 'destructive' });
    } finally {
      setBusyAction(null);
    }
  };

  const openPortal = async () => {
    if (!accessToken) return;
    setOpeningPortal(true);
    try {
      const portal = await createPortalSession(accessToken);
      window.location.assign(portal.portal_url);
    } catch (error: any) {
      toast({ title: 'Portal indisponível', description: error?.message, variant: 'destructive' });
    } finally {
      setOpeningPortal(false);
    }
  };

  const header = (
    <div className="flex items-center gap-3">
      <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
        <ArrowLeft className="w-4 h-4 text-muted-foreground" />
      </button>
      <div>
        <h1 className="text-lg font-bold text-foreground">Gerenciar assinatura</h1>
        <p className="text-xs text-muted-foreground">Cancele, reative ou troque de plano quando quiser.</p>
      </div>
    </div>
  );

  if (statusQuery.isLoading || plansLoading) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        {header}
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Carregando assinatura...</p>
        </div>
      </div>
    );
  }

  if (!status?.hasActivePlan) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        {header}
        <div className="rounded-xl border border-border bg-card p-6 text-center space-y-4">
          <AlertTriangle className="w-8 h-8 text-warning mx-auto" />
          <div>
            <p className="text-sm font-semibold text-foreground">Você ainda não tem um plano ativo.</p>
            <p className="text-xs text-muted-foreground mt-1">Escolha um plano Fortify para começar a monitorar suas contas.</p>
          </div>
          <button type="button" onClick={() => navigate('/pricing')} className="pill-btn pill-btn-primary mx-auto">
            <CreditCard className="w-4 h-4" />
            Ver planos
          </button>
        </div>
      </div>
    );
  }

  if (subscription?.plan_id === 'beta_free') {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        {header}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <p className="text-sm font-semibold text-foreground">Acesso beta liberado pelo Fortify</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {status.activeAccountCount}/{status.accountLimit} contas MT5 em monitoramento.
          </p>
          <button type="button" onClick={() => navigate('/pricing')} className="pill-btn pill-btn-primary">
            <CreditCard className="w-4 h-4" />
            Assinar um plano
          </button>
        </div>
      </div>
    );
  }

  const periodEndLabel = formatDate(subscription?.paid_until || subscription?.current_period_end);
  const otherPlans = plans.filter((plan) => isRealPlan(plan) && plan.id !== subscription?.plan_id && hasConfiguredPrice(plan));

  const renderPlanGrid = (mode: 'stripe' | 'manual') => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {otherPlans.map((plan) => {
        const isUpgrade = Number(plan.account_limit || 0) > status.includedAccountLimit;
        const isDowngrade = Number(plan.account_limit || 0) < status.includedAccountLimit;
        const isBusyChange = busyAction === plan.id;
        const isBusyPay = busyAction === `pay-${plan.id}`;
        const isBusySchedule = busyAction === `schedule-${plan.id}`;
        return (
          <section key={plan.id} className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{plan.name || plan.plan_name}</p>
              {plan.recommended_badge ? <Badge className="bg-primary/15 text-primary border-0">{plan.recommended_badge}</Badge> : null}
            </div>
            <div>
              <p className="font-mono text-2xl font-bold text-foreground">{formatPrice(plan)}</p>
              <p className="text-xs text-muted-foreground mt-1">por {intervalLabel(plan.billing_interval)}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Até {plan.account_limit} conta{plan.account_limit === 1 ? '' : 's'} MT5 · {supportLabels[String(plan.support_tier || 'basic')] || supportLabels.basic}
            </p>
            {mode === 'stripe' ? (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                disabled={isBusyChange || !billingEnabled}
                onClick={() => handlePlanAction(plan)}
              >
                {isBusyChange ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isUpgrade ? 'Fazer upgrade' : 'Fazer downgrade'}
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 gap-2"
                  disabled={isBusyPay || !billingEnabled}
                  onClick={() => payNow(plan)}
                >
                  {isBusyPay ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Pagar agora
                </Button>
                {isDowngrade && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 gap-2"
                    disabled={isBusySchedule || !billingEnabled}
                    onClick={() => handleScheduleDowngrade(plan)}
                  >
                    {isBusySchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Agendar downgrade
                  </Button>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );

  if (!subscription?.has_stripe_subscription) {
    const pendingPlan = subscription?.pending_plan_id
      ? plans.find((plan) => plan.id === subscription.pending_plan_id)
      : null;

    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        {header}

        {!billingEnabled && (
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
            <p className="text-sm font-medium text-foreground">Checkout Stripe desativado localmente</p>
            <p className="text-xs text-muted-foreground mt-1">
              Configure `VITE_BILLING_ENABLED=true` no frontend e `STRIPE_SECRET_KEY` no gateway para gerenciar a assinatura.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Plano atual</p>
            <p className="text-xl font-bold text-foreground mt-1">{subscription?.plan_name}</p>
            {periodEndLabel && (
              <p className="text-xs text-muted-foreground mt-1">Válido até {periodEndLabel}</p>
            )}
          </div>

          <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
            <p className="text-xs font-medium text-foreground">
              {status.activeAccountCount}/{status.accountLimit} contas MT5 em monitoramento
            </p>
            {status.extraAccountQuantity > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Inclui {status.extraAccountQuantity} conta{status.extraAccountQuantity === 1 ? '' : 's'} extra{status.extraAccountQuantity === 1 ? '' : 's'} ({status.includedAccountLimit} do plano + {status.extraAccountQuantity} extra).
              </p>
            )}
          </div>

          <div className="rounded-lg border border-info/25 bg-info/5 p-4 flex items-start gap-3">
            <ShieldCheck className="h-4 w-4 text-info mt-0.5 shrink-0" />
            <p className="text-xs text-foreground/85 leading-relaxed">
              Este plano foi ativado manualmente pela equipe Fortify. Escolha "Pagar agora" para migrar
              para um checkout Stripe de verdade, ou agende um downgrade que entra em vigor
              automaticamente em {periodEndLabel || 'a data de validade do seu plano'}. Para outras
              alterações, fale com o suporte.
            </p>
          </div>

          {pendingPlan && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Downgrade para {pendingPlan.name || pendingPlan.plan_name} agendado{periodEndLabel ? ` para ${periodEndLabel}` : ''}.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Seu plano muda automaticamente nessa data.</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleCancelScheduledDowngrade}
                disabled={busyAction === 'cancel-scheduled-downgrade' || !billingEnabled}
                className="gap-2"
              >
                {busyAction === 'cancel-scheduled-downgrade' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Cancelar agendamento
              </Button>
            </div>
          )}

          <a
            href={SUPPORT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Headphones className="w-3.5 h-3.5" />
            Prefere falar com o suporte? Fale com a equipe Fortify
          </a>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Outros planos</p>
          {renderPlanGrid('manual')}
        </div>

        <Dialog
          open={Boolean(picker)}
          onOpenChange={(open) => {
            if (!open && !pickerBusy) {
              setPicker(null);
              setPickerError(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Escolha quais contas manter</DialogTitle>
              <DialogDescription>
                O plano {picker?.plan.name || picker?.plan.plan_name} permite {picker?.targetLimit} conta
                {picker?.targetLimit === 1 ? '' : 's'} MT5. Desmarque as contas que devem sair do monitoramento.
              </DialogDescription>
            </DialogHeader>

            {pickerError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                <p className="text-xs text-destructive">{pickerError}</p>
              </div>
            )}

            <div className="space-y-2 max-h-[45vh] overflow-y-auto">
              {liveAccounts.map((account) => {
                const checked = picker?.keep.has(account.id) ?? false;
                return (
                  <label
                    key={account.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-primary/40 transition-colors"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        setPicker((prev) => {
                          if (!prev) return prev;
                          const next = new Set(prev.keep);
                          if (value) next.add(account.id);
                          else next.delete(account.id);
                          return { ...prev, keep: next };
                        });
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{account.nickname}</p>
                      <p className="text-xs text-muted-foreground truncate">{account.broker}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground">
              {picker?.keep.size ?? 0} de {picker?.targetLimit ?? 0} permitidas
            </p>

            <DialogFooter>
              <Button variant="outline" onClick={() => setPicker(null)} disabled={pickerBusy}>
                Cancelar
              </Button>
              <Button
                onClick={confirmPicker}
                disabled={pickerBusy || !picker || picker.keep.size > picker.targetLimit}
                className="gap-2"
              >
                {pickerBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const cancelPending = Boolean(subscription.cancel_at_period_end);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {header}

      {!billingEnabled && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm font-medium text-foreground">Checkout Stripe desativado localmente</p>
          <p className="text-xs text-muted-foreground mt-1">
            Configure `VITE_BILLING_ENABLED=true` no frontend e `STRIPE_SECRET_KEY` no gateway para gerenciar a assinatura.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Plano atual</p>
            <p className="text-xl font-bold text-foreground mt-1">{subscription.plan_name}</p>
            {periodEndLabel && (
              <p className="text-xs text-muted-foreground mt-1">
                {cancelPending ? 'Acesso até' : 'Próxima cobrança em'} {periodEndLabel}
              </p>
            )}
          </div>
          <Button variant="outline" onClick={openPortal} disabled={openingPortal || !billingEnabled} className="gap-2">
            {openingPortal ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            Forma de pagamento e faturas
          </Button>
        </div>

        <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
          <p className="text-xs font-medium text-foreground">
            {status.activeAccountCount}/{status.accountLimit} contas MT5 em monitoramento
          </p>
          {status.extraAccountQuantity > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Inclui {status.extraAccountQuantity} conta{status.extraAccountQuantity === 1 ? '' : 's'} extra{status.extraAccountQuantity === 1 ? '' : 's'} ({status.includedAccountLimit} do plano + {status.extraAccountQuantity} extra).
            </p>
          )}
        </div>

        {String(subscription.status).toLowerCase() === 'past_due' && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
            <p className="text-sm font-medium text-foreground">Pagamento pendente</p>
            <p className="text-xs text-muted-foreground mt-1">Atualize sua forma de pagamento no portal acima para evitar a suspensão.</p>
          </div>
        )}

        {cancelPending ? (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium text-foreground">Sua assinatura será cancelada{periodEndLabel ? ` em ${periodEndLabel}` : ''}.</p>
              <p className="text-xs text-muted-foreground mt-1">Você não será cobrado novamente. Pode reativar antes dessa data.</p>
            </div>
            <Button onClick={handleResume} disabled={busyAction === 'resume' || !billingEnabled} className="gap-2">
              {busyAction === 'resume' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              Reativar assinatura
            </Button>
          </div>
        ) : (
          <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={!billingEnabled} className="gap-2 text-destructive hover:text-destructive">
                <XCircle className="w-4 h-4" />
                Cancelar assinatura
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
                <AlertDialogDescription>
                  Você continuará com acesso completo até {periodEndLabel || 'o fim do ciclo atual'}. Depois
                  disso, sua assinatura não será renovada e você não será cobrado novamente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancel} disabled={busyAction === 'cancel'}>
                  {busyAction === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Cancelar assinatura
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {!cancelPending && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Outros planos</p>
          {renderPlanGrid('stripe')}
        </div>
      )}

      <Dialog
        open={Boolean(picker)}
        onOpenChange={(open) => {
          if (!open && !pickerBusy) {
            setPicker(null);
            setPickerError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escolha quais contas manter</DialogTitle>
            <DialogDescription>
              O plano {picker?.plan.name || picker?.plan.plan_name} permite {picker?.targetLimit} conta
              {picker?.targetLimit === 1 ? '' : 's'} MT5. Desmarque as contas que devem sair do monitoramento.
            </DialogDescription>
          </DialogHeader>

          {pickerError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <p className="text-xs text-destructive">{pickerError}</p>
            </div>
          )}

          <div className="space-y-2 max-h-[45vh] overflow-y-auto">
            {liveAccounts.map((account) => {
              const checked = picker?.keep.has(account.id) ?? false;
              return (
                <label
                  key={account.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-primary/40 transition-colors"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => {
                      setPicker((prev) => {
                        if (!prev) return prev;
                        const next = new Set(prev.keep);
                        if (value) next.add(account.id);
                        else next.delete(account.id);
                        return { ...prev, keep: next };
                      });
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{account.nickname}</p>
                    <p className="text-xs text-muted-foreground truncate">{account.broker}</p>
                  </div>
                </label>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            {picker?.keep.size ?? 0} de {picker?.targetLimit ?? 0} permitidas
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPicker(null)} disabled={pickerBusy}>
              Cancelar
            </Button>
            <Button
              onClick={confirmPicker}
              disabled={pickerBusy || !picker || picker.keep.size > picker.targetLimit}
              className="gap-2"
            >
              {pickerBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
