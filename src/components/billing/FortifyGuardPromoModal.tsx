import { Check, Loader2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface FortifyGuardPromoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** O teste grátis já acabou? Muda só a frase de abertura. */
  trialExpired: boolean;
  /** A oferta de R$ 97 ainda está no prazo (até 30/11/2026 23h59)? */
  offerActive: boolean;
  loading: boolean;
  error: string | null;
  onCheckout: () => void;
  onSeePlans: () => void;
}

const DETAILS = [
  'Válido para 1 conta MT5 (plano Beginner).',
  'R$ 97/mês travado por 12 meses na assinatura recorrente.',
  'Oferta válida até 30/11/2026 às 23h59.',
];

export function FortifyGuardPromoModal({
  open,
  onOpenChange,
  trialExpired,
  offerActive,
  loading,
  error,
  onCheckout,
  onSeePlans,
}: FortifyGuardPromoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-3 text-left">
          {offerActive && (
            <Badge variant="secondary" className="w-fit">
              Condição Exclusiva de Lançamento
            </Badge>
          )}
          <DialogTitle className="text-xl leading-snug">
            {offerActive
              ? 'Continue protegendo sua conta no MT5 por apenas R$ 97/mês'
              : 'Seu teste grátis do Fortify Guard terminou'}
          </DialogTitle>
          <DialogDescription>
            {trialExpired
              ? 'Seu teste de 3 dias acabou e o Fortify Guard parou de acompanhar sua conta.'
              : 'Garanta agora o valor de lançamento e o Fortify Guard segue acompanhando sua conta sem interrupção.'}
          </DialogDescription>
        </DialogHeader>

        {offerActive ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">
                De <span className="line-through">R$ 297/mês</span> por
              </p>
              <p className="text-3xl font-bold tracking-tight">R$ 97/mês</p>
              <p className="mt-1 text-sm font-medium text-emerald-500">Economia de R$ 200 por mês</p>
            </div>
            <ul className="space-y-2">
              {DETAILS.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button className="w-full" size="lg" onClick={onCheckout} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="mr-2 h-4 w-4" aria-hidden />}
              Garantir Minha Vaga por R$ 97/mês
            </Button>
          </div>
        ) : (
          <Button className="w-full" size="lg" onClick={onSeePlans}>
            Ver planos do Fortify
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
