import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getGuestCheckoutStatus } from '@/lib/billing';

// Volta da Stripe para quem assinou sem conta. A conta é criada pelo e-mail pago;
// esta página espera o pagamento ser confirmado e já entra na conta nova.
const POLL_INTERVAL_MS = 2500;
const MAX_ATTEMPTS = 24; // ~1 minuto

type View =
  | { kind: 'waiting' }
  | { kind: 'redirecting' }
  | { kind: 'existing'; email?: string }
  | { kind: 'delayed' }
  | { kind: 'error'; message: string };

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id') || '';
  const [view, setView] = useState<View>(sessionId ? { kind: 'waiting' } : { kind: 'error', message: 'Link de retorno sem a sessão de pagamento.' });

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      attempts += 1;
      try {
        const status = await getGuestCheckoutStatus(sessionId);
        if (cancelled) return;
        if (status.state === 'ready') {
          setView({ kind: 'redirecting' });
          window.location.href = status.login_url;
          return;
        }
        if (status.state === 'existing_account') {
          setView({ kind: 'existing', email: status.email });
          return;
        }
        if (status.state === 'manual_review') {
          setView({ kind: 'delayed' });
          return;
        }
      } catch (error: any) {
        if (cancelled) return;
        if (attempts >= 3) {
          setView({ kind: 'error', message: error?.message || 'Não foi possível confirmar o pagamento agora.' });
          return;
        }
      }
      if (attempts >= MAX_ATTEMPTS) {
        setView({ kind: 'delayed' });
        return;
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId]);

  const waiting = view.kind === 'waiting' || view.kind === 'redirecting';

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
          {waiting ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          ) : view.kind === 'error' ? (
            <Shield className="h-8 w-8 text-primary" aria-hidden />
          ) : (
            <CheckCircle2 className="h-8 w-8 text-primary" aria-hidden />
          )}
        </div>

        {waiting && (
          <>
            <h1 className="mb-2 text-xl font-bold text-foreground">Confirmando seu pagamento</h1>
            <p className="text-sm text-muted-foreground" role="status">
              {view.kind === 'redirecting' ? 'Pagamento confirmado. Entrando na sua conta...' : 'Isso leva alguns segundos. Não feche esta página.'}
            </p>
          </>
        )}

        {view.kind === 'existing' && (
          <>
            <h1 className="mb-2 text-xl font-bold text-foreground">Pagamento confirmado</h1>
            <p className="mb-8 text-sm text-muted-foreground">
              O plano foi ligado à conta {view.email ? <strong className="text-foreground">{view.email}</strong> : 'do e-mail usado no pagamento'}. Entre com ela para começar.
            </p>
            <Button asChild variant="premium">
              <Link to="/auth">Entrar na minha conta</Link>
            </Button>
          </>
        )}

        {view.kind === 'delayed' && (
          <>
            <h1 className="mb-2 text-xl font-bold text-foreground">Pagamento recebido</h1>
            <p className="mb-8 text-sm text-muted-foreground">
              Estamos liberando seu acesso. Entre com o e-mail usado no pagamento. Se a conta ainda não aparecer, use "Esqueci minha senha" com esse e-mail em alguns minutos.
            </p>
            <Button asChild variant="premium">
              <Link to="/auth">Entrar</Link>
            </Button>
          </>
        )}

        {view.kind === 'error' && (
          <>
            <h1 className="mb-2 text-xl font-bold text-foreground">Não conseguimos confirmar agora</h1>
            <p className="mb-8 text-sm text-muted-foreground">{view.message} Se o pagamento foi feito, ele não se perde: entre com o e-mail usado na Stripe.</p>
            <Button asChild variant="premium">
              <Link to="/auth">Entrar</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
