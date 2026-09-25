import { firmLogos } from '@/data/firmLogos';

/**
 * Faixa de logos das mesas proprietárias reais que o Fortify atende, rolando
 * em loop contínuo. Usado no login e no hero da /vendas — mesmo catálogo de `src/data/firmLogos.ts` que o carrossel da
 * biblioteca de mesas usa (`PropFirmLibrary.tsx`), aqui sem o tratamento em
 * chip/caixa: logo nua, com um drop-shadow suave para se destacar num fundo
 * escuro sem desenhar um retângulo visível.
 */

const firmLogoEntries = Object.entries(firmLogos) as [string, string][];
const marqueeLogos = [...firmLogoEntries, ...firmLogoEntries];

// Proporção acima de ~6:1 não cabe na caixa padrão sem virar um fio. O arquivo
// da FundedNext é 898x87 (10,32:1) e não tem uma coluna de margem para aparar —
// medido no bitmap. Caixa mais larga para a altura subir de 12px para 16px,
// que é o melhor possível sem um asset compacto da marca.
const WIDE_MARKS = new Set(['FundedNext']);

export function FirmLogoStrip({ reduceMotion, pauseOnHover = false }: { reduceMotion: boolean; pauseOnHover?: boolean }) {
  return (
    <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div
        className={`flex w-max items-center gap-6 ${reduceMotion ? '' : 'animate-marquee'} ${pauseOnHover ? 'hover:[animation-play-state:paused]' : ''}`}
      >
        {marqueeLogos.map(([name, src], index) => (
          <img
            key={`${name}-${index}`}
            src={src}
            alt={name}
            loading={index < firmLogoEntries.length ? 'eager' : 'lazy'}
            decoding="async"
            /* Caixa IGUAL para toda marca, com object-contain: é o que padroniza.
               Só travar a altura não resolvia — com a proporção indo de 1:1
               (BrightFunded, FundingPips, NP Future) a 10,3:1 (FundedNext), a
               mesma altura de 24px produzia larguras de 24px a 248px, 10x de
               diferença. Agora cada logo ocupa 120x28 e se ajusta dentro disso:
               wordmark largo limita pela largura, marca quadrada pela altura. */
            className={`h-7 ${WIDE_MARKS.has(name) ? 'w-[168px]' : 'w-[120px]'} shrink-0 object-contain [filter:drop-shadow(0_0_1px_rgba(255,255,255,0.5))_drop-shadow(0_0_5px_rgba(255,255,255,0.2))]`}
          />
        ))}
      </div>
    </div>
  );
}
