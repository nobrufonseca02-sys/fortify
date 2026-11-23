import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionPlan } from '@/hooks/useSubscriptionPlan';
import { createCheckoutSession, startPromoTrial } from '@/lib/billing';
import { clearPendingPromo, isPromoTrialSubscription, readPendingPromo, trialMsLeft } from '@/lib/promoTrial';
import { FortifyGuardPromoModal } from '@/components/billing/FortifyGuardPromoModal';
import { GUARD97_COUPON_CODE, isKnownCoupon } from '../../../services/metaapi-gateway/src/checkoutCoupons';

const EXPIRED_MODAL_SHOWN_KEY = 'fortify_trial_expired_modal_shown';

function formatLeft(ms: number) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

/**
 * Teste grátis da campanha (link ?promo=guard3d) e oferta de R$ 97.
 * - Pede o trial ao gateway uma vez, logo depois do primeiro login com o link.
 * - Durante o teste: faixa discreta com o tempo restante e o botão "Garantir desconto".
 * - Teste vencido: abre o pop-up da oferta uma vez por sessão e deixa a faixa como lembrete.
 * Fora do teste da campanha não mostra nada.
 */
export function PromoTrialGate() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { promoTrial } = useSubscriptionPlan();
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requested = useRef(false);

  // 1. Ativação do trial depois do cadastro pelo link da campanha.
  useEffect(() => {
    const token = session?.access_token;
    if (!token || requested.current) return;
    const promo = readPendingPromo();
    if (!promo) return;
    requested.current = true;
    startPromoTrial(promo, token)
      .then((result) => {
        // Resposta definitiva (liberou, não tem direito ou campanha encerrada): não pede de novo.
        if (result.ok || [400, 409, 410].includes(result.status)) clearPendingPromo();
        if (result.ok) {
          void queryClient.invalidateQueries({ queryKey: ['fortify_subscription_plan'] });
          toast({
            title: 'Seu teste grátis de 3 dias começou',
            description: 'Baixe o Fortify Guard e gere sua chave para conectar o MT5.',
          });
        }
      })
      .catch(() => {
        // Gateway fora do ar: tenta de novo no próximo carregamento.
        requested.current = false;
      });
  }, [session?.access_token, queryClient]);

  // Relógio da contagem regressiva.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const isTrial = isPromoTrialSubscription(promoTrial);
  const msLeft = isTrial ? trialMsLeft(promoTrial, now) : 0;
  const expired = isTrial && msLeft <= 0;
  const offerActive = isKnownCoupon(GUARD97_COUPON_CODE, new Date(now));

  // 2. Teste vencido: o pop-up abre sozinho uma vez por sessão.
  useEffect(() => {
    if (!expired) return;
    try {
      if (window.sessionStorage.getItem(EXPIRED_MODAL_SHOWN_KEY)) return;
      window.sessionStorage.setItem(EXPIRED_MODAL_SHOWN_KEY, '1');
    } catch {
      // sem sessionStorage: abre mesmo assim
    }
    setOpen(true);
  }, [expired]);

  if (!isTrial) return null;

  const handleCheckout = async () => {
    const token = session?.access_token;
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const { checkout_url } = await createCheckoutSession('beginner_monthly', token, false, GUARD97_COUPON_CODE);
      window.location.assign(checkout_url);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Não foi possível abrir o pagamento agora.');
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-sm ${
          expired ? 'border-destructive/40 bg-destructive/10' : 'border-border bg-muted/40'
        }`}
      >
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0" aria-hidden />
          {expired
            ? 'Seu teste grátis do Fortify Guard terminou.'
            : `Teste grátis do Fortify Guard: faltam ${formatLeft(msLeft)}.`}
          {offerActive && <span className="text-muted-foreground">R$ 97/mês até 30/11.</span>}
        </span>
        <Button size="sm" variant={expired ? 'default' : 'outline'} onClick={() => setOpen(true)}>
          {offerActive ? 'Garantir desconto' : 'Ver planos'}
        </Button>
      </div>
      <FortifyGuardPromoModal
        open={open}
        onOpenChange={setOpen}
        trialExpired={expired}
        offerActive={offerActive}
        loading={loading}
        error={error}
        onCheckout={handleCheckout}
        onSeePlans={() => {
          setOpen(false);
          navigate('/pricing');
        }}
      />
    </>
  );
}
