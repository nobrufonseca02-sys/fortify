import { useState, type PointerEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'ghost' | 'glass';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-white text-zinc-950 shadow-[0_1px_2px_rgba(0,0,0,0.4)] hover:shadow-[0_8px_24px_-8px_rgba(255,255,255,0.35)]',
  ghost: 'bg-transparent text-white hover:bg-white/10',
  glass:
    'bg-zinc-900/80 text-zinc-100 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_4px_12px_-4px_rgba(0,0,0,0.6)] backdrop-blur-md hover:bg-zinc-800/90 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_8px_20px_-8px_rgba(0,0,0,0.7)]',
};

const MotionLink = motion.create(Link);

/**
 * Botão tátil do template de referência: cantos que arredondam ao pressionar,
 * leve compressão em mola e uma onda radial saindo do ponto do toque.
 */
export function TactileButton({
  children,
  to,
  href,
  onClick,
  variant = 'primary',
  size = 'md',
  className,
  ariaLabel,
  disabled = false,
  type = 'button',
}: {
  children: ReactNode;
  to?: string;
  href?: string;
  onClick?: () => void;
  variant?: Variant;
  size?: 'sm' | 'md';
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const reduceMotion = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (disabled) return;
    setPressed(true);
    if (reduceMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setRipple({ x: event.clientX - rect.left, y: event.clientY - rect.top, key: Date.now() });
  };
  const release = () => setPressed(false);

  const classes = cn(
    'group relative isolate inline-flex min-h-11 cursor-pointer select-none items-center justify-center gap-2 overflow-hidden whitespace-nowrap font-medium tracking-[0.01em]',
    'transition-[background-color,box-shadow,border-radius] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1.2)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
    size === 'sm' ? 'min-h-9 px-3.5 text-[13px]' : 'px-5 text-sm',
    pressed ? 'rounded-[20px]' : 'rounded-[12px]',
    VARIANTS[variant],
    disabled && 'pointer-events-none cursor-not-allowed opacity-40 shadow-none',
    className,
  );

  const content = (
    <>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-current opacity-0 transition-opacity duration-200 group-hover:opacity-[0.06]" />
      {ripple && (
        <motion.span
          key={ripple.key}
          aria-hidden="true"
          className="pointer-events-none absolute -z-10 h-10 w-10 rounded-full bg-[radial-gradient(closest-side,currentColor_65%,transparent_100%)]"
          style={{ left: ripple.x - 20, top: ripple.y - 20 }}
          initial={{ scale: 0, opacity: 0.16 }}
          animate={{ scale: 9, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          onAnimationComplete={() => setRipple(null)}
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-2 [&_svg]:transition-transform [&_svg]:duration-300 group-hover:[&_svg:last-child]:translate-x-0.5">
        {children}
      </span>
    </>
  );

  const motionProps = {
    className: classes,
    onPointerDown,
    onPointerUp: release,
    onPointerLeave: release,
    onPointerCancel: release,
    whileTap: reduceMotion || disabled ? undefined : { scale: 0.97 },
    transition: { type: 'spring' as const, stiffness: 380, damping: 25 },
    'aria-label': ariaLabel,
  };

  if (to) {
    return (
      <MotionLink to={to} onClick={onClick} {...motionProps}>
        {content}
      </MotionLink>
    );
  }
  if (href) {
    return (
      <motion.a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} {...motionProps}>
        {content}
      </motion.a>
    );
  }
  return (
    <motion.button type={type} onClick={onClick} disabled={disabled} {...motionProps}>
      {content}
    </motion.button>
  );
}
