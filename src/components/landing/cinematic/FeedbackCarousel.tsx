import { motion, useReducedMotion } from 'motion/react';
import { Star } from 'lucide-react';
import { FortifyMark } from '@/components/brand/FortifyMark';
import { cn } from '@/lib/utils';
import { FEEDBACK_ITEMS, isVerified, type FeedbackItem } from './feedback';
import { FONT_DISPLAY, FONT_MONO } from './fonts';

const EASE = [0.22, 1, 0.36, 1] as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function Avatar({ item }: { item: FeedbackItem }) {
  const base = 'flex size-11 flex-none items-center justify-center overflow-hidden rounded-full ring-1 ring-white/15 transition-transform duration-200 group-hover:scale-105';
  if (isVerified(item) && item.author.avatarSrc) {
    return <img src={item.author.avatarSrc} alt="" className={`${base} object-cover`} loading="lazy" decoding="async" />;
  }
  if (isVerified(item)) {
    return (
      <span aria-hidden="true" className={`${base} bg-gradient-to-br from-[rgb(165,88,251)] to-[rgb(73,34,229)] text-sm font-semibold text-white`}>
        {initials(item.author.name)}
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={`${base} bg-black`}>
      <FortifyMark className="size-5 text-zinc-300" />
    </span>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="mt-1.5 flex gap-0.5" role="img" aria-label={`Nota ${rating} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          aria-hidden="true"
          className={cn('flex size-4 items-center justify-center rounded-[3px]', n <= rating ? 'bg-emerald-500' : 'bg-zinc-700')}
        >
          <Star className="size-2.5 fill-white text-white" />
        </span>
      ))}
    </div>
  );
}

/** Rodapé do card: de onde veio a avaliação. Demonstração diz que é demonstração. */
function SourceRow({ item }: { item: FeedbackItem }) {
  if (isVerified(item) && item.source) {
    const { name, url, logoSrc } = item.source;
    const body = (
      <>
        {logoSrc ? (
          <img src={logoSrc} alt="" className="h-8 w-8 flex-none rounded-md object-contain" loading="lazy" decoding="async" />
        ) : (
          <span aria-hidden="true" className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-zinc-800 text-[11px] font-semibold text-zinc-300">
            {name[0]}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold text-zinc-100">{name}</span>
          <span className="block truncate text-[11px] text-zinc-400">{item.context}</span>
        </span>
      </>
    );
    return url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 hover:opacity-90">
        {body}
      </a>
    ) : (
      <div className="flex items-center gap-2.5">{body}</div>
    );
  }
  return (
    <div className="flex items-center gap-2.5">
      <span aria-hidden="true" className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-black ring-1 ring-white/10">
        <FortifyMark className="size-4 text-zinc-300" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-zinc-100">Fortify</span>
        <span className="block truncate text-[11px] text-zinc-400">{item.context}</span>
      </span>
    </div>
  );
}

/** Mesmo layout de card de avaliação: autor e nota em cima, comentário, e a fonte embaixo. */
function FeedbackCard({ item, hidden = false }: { item: FeedbackItem; hidden?: boolean }) {
  const verified = isVerified(item);
  return (
    <article
      aria-hidden={hidden || undefined}
      className="group flex w-[300px] flex-none select-none flex-col rounded-2xl bg-zinc-900/90 text-left shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_1px_2px_-1px_rgba(0,0,0,0.5)] backdrop-blur-md transition-[box-shadow,background-color,translate] duration-200 ease-out hover:-translate-y-0.5 hover:bg-zinc-800/90 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_12px_32px_-12px_rgba(0,0,0,0.7)]"
    >
      <div className="flex-1 p-4">
        <div className="flex items-center gap-3">
          <Avatar item={item} />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold leading-tight text-zinc-100">
              {verified ? item.author.name : 'Mensagem de demonstração'}
            </p>
            {verified ? (
              <Stars rating={item.rating} />
            ) : (
              <span className={`${FONT_MONO} mt-1.5 inline-flex rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-zinc-400`}>
                Demonstração
              </span>
            )}
          </div>
        </div>
        <p className="mt-3 line-clamp-4 min-h-[6em] text-[13px] leading-[1.5] text-zinc-300 transition-colors duration-200 group-hover:text-zinc-200">
          {item.message}
        </p>
      </div>
      <div className="border-t border-white/10 px-4 py-3">
        <SourceRow item={item} />
      </div>
    </article>
  );
}

export function FeedbackCarousel() {
  const reduceMotion = useReducedMotion();
  const enter = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20, filter: 'blur(8px)' },
        whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
        viewport: { once: true, margin: '0px 0px -12% 0px' },
        transition: { duration: 0.7, ease: EASE },
      };

  return (
    <section aria-labelledby="feedback-title" className="relative z-30 w-full overflow-hidden bg-black py-20 md:py-24">
      <motion.div {...enter} className="mx-auto mb-10 max-w-6xl px-6">
        <p className={`${FONT_MONO} mb-4 inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-amber-200`}>
          Feedbacks de demonstração
        </p>
        <h2 id="feedback-title" className={`${FONT_DISPLAY} max-w-2xl text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl`}>
          Como o Fortify entra na rotina antes da ordem.
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400">
          Mensagens ilustrativas do uso do produto, não depoimentos de clientes. Serão substituídas por relatos
          verificados quando houver.
        </p>
      </motion.div>

      {reduceMotion ? (
        <div className="flex gap-3 overflow-x-auto px-6 pb-2">
          {FEEDBACK_ITEMS.map((item) => (
            <FeedbackCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="[mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)] overflow-hidden">
          {/* Espaço como padding de cada card, não gap: assim -50% cai exatamente no início da cópia. */}
          <div className="flex w-max py-1 animate-marquee [animation-duration:60s] hover:[animation-play-state:paused]">
            {[...FEEDBACK_ITEMS, ...FEEDBACK_ITEMS].map((item, index) => (
              <div key={`${item.id}-${index}`} className="pr-3">
                <FeedbackCard item={item} hidden={index >= FEEDBACK_ITEMS.length} />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
