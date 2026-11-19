import { useState, type FormEvent } from 'react';
import { Check, Tag, X } from 'lucide-react';
import type { PricingCheckout } from '@/hooks/usePricingCheckout';
import { cn } from '@/lib/utils';

/**
 * Campo de cupom da tela de planos. O mesmo cupom chega pelo link (?cupom=FORTIFY):
 * aplicado, os cards mostram o preço com desconto e o checkout já abre com ele.
 */
export function CouponField({ pricing, tone }: { pricing: PricingCheckout; tone: 'public' | 'app' }) {
  const { coupon, couponError, applyCoupon, removeCoupon } = pricing;
  const [value, setValue] = useState('');
  const dark = tone === 'public';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (applyCoupon(value)) setValue('');
  };

  if (coupon) {
    return (
      <div
        role="status"
        className={cn(
          'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm',
          dark ? 'bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-300/30' : 'bg-success/10 text-success ring-1 ring-success/30',
        )}
      >
        <Check className="h-4 w-4" aria-hidden="true" />
        <span>
          Cupom <strong className="font-semibold">{coupon}</strong> aplicado
        </span>
        <button
          type="button"
          onClick={removeCoupon}
          aria-label={`Remover o cupom ${coupon}`}
          className={cn('rounded-full p-0.5 transition-colors', dark ? 'hover:bg-white/10' : 'hover:bg-foreground/10')}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col items-center gap-1.5">
      <div
        className={cn(
          'flex items-center gap-1 rounded-full p-1 pl-3',
          dark ? 'bg-zinc-900/80 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]' : 'border border-border bg-muted/40',
        )}
      >
        <Tag className={cn('h-3.5 w-3.5 shrink-0', dark ? 'text-zinc-500' : 'text-muted-foreground')} aria-hidden="true" />
        <label htmlFor="cupom" className="sr-only">
          Cupom de desconto
        </label>
        <input
          id="cupom"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Tem cupom?"
          autoComplete="off"
          spellCheck={false}
          className={cn(
            'w-32 bg-transparent px-1 text-sm uppercase outline-none placeholder:normal-case',
            dark ? 'text-white placeholder:text-zinc-500' : 'text-foreground placeholder:text-muted-foreground',
          )}
        />
        <button
          type="submit"
          className={cn(
            'rounded-full px-3 py-1 text-sm font-medium transition-colors',
            dark ? 'bg-white text-zinc-950 hover:bg-zinc-200' : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          Aplicar
        </button>
      </div>
      {couponError ? (
        <p role="alert" className={cn('text-xs', dark ? 'text-rose-300' : 'text-destructive')}>
          {couponError}
        </p>
      ) : null}
    </form>
  );
}
