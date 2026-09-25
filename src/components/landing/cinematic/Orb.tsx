import { motion, type MotionValue } from 'motion/react';

/**
 * O mesmo eclipse do Orb, mas num círculo enorme com o centro abaixo e à
 * esquerda da tela: a borda atravessa em diagonal, como uma linha de horizonte.
 * Proporções do Orb normalizadas pelo anel branco (1,32 → 1): a faixa de luz
 * fica com ~5% do raio, a mesma espessura visual do hero da landing.
 */
export function HorizonArc({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute left-[calc(-12vw_-_100vmax)] top-[calc(100vh_+_42vmax_-_100vmax)] h-[200vmax] w-[200vmax] [isolation:isolate] ${className ?? ''}`}
    >
      <div className="absolute inset-0 rounded-full bg-white shadow-[0_-4px_23px_0_rgba(255,255,255,0.71)]" />
      <div className="absolute inset-0 rounded-full bg-[rgb(165,88,251)] blur-[31px] [transform:scale(0.97)]" />
      <div className="absolute inset-0 rounded-full bg-[rgb(73,34,229)] blur-[21px] [transform:scale(0.982)]" />
      <div className="absolute inset-0 rounded-full bg-black blur-[51px] [transform:scale(0.955)]" />
    </div>
  );
}

/** Luz em eclipse do template: anel branco com halo violeta e azul, miolo preto por cima. */
export function Orb({ style }: { style?: { y?: MotionValue<string>; opacity?: MotionValue<number> } }) {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute h-full w-[max(100%,150vh)] left-[calc(50%_-_max(100%,150vh)/2)] [isolation:isolate]"
      style={{ y: style?.y ?? '-50%', opacity: style?.opacity }}
    >
      <div className="absolute inset-0 rounded-[100%] bg-white [transform:scale(1.32)] shadow-[0_-4px_23px_0_rgba(255,255,255,0.71)]" />
      <div className="absolute inset-0 rounded-[100%] bg-[rgb(165,88,251)] blur-[31px] [transform:scale(1.2)]" />
      <div className="absolute inset-0 rounded-[100%] bg-[rgb(73,34,229)] blur-[21px] [transform:scale(1.24)]" />
      <div className="absolute inset-0 rounded-[100%] bg-black blur-[51px] [transform:scale(1.2)]" />
    </motion.div>
  );
}
