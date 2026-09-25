import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { ExternalLink, Layers } from 'lucide-react';
import { CoverflowCarousel, type CoverflowSlide } from '@/components/ui/coverflow-carousel';
import { CinematicPage, GlassCard, Reveal, Section } from '@/components/landing/cinematic/CinematicPage';
import { FinalCta } from '@/components/landing/cinematic/FinalCta';
import { Orb } from '@/components/landing/cinematic/Orb';
import { FONT_DISPLAY, FONT_MONO } from '@/components/landing/cinematic/fonts';
import { pushDataLayerEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { propFirmFilterOptions } from '@/data/propFirmRules';
import { firmLogos } from '@/data/firmLogos';
import {
  accountRules,
  cleanValue,
  countLabel,
  firmPrograms,
  formatAccountLabel,
  getFirmStatus,
  phaseSummary,
  platformLabels,
} from '@/lib/propFirmSummary';

/**
 * Mesas suportadas — a versão pública da Biblioteca de Mesas do painel.
 *
 * Mesma dinâmica: o visitante passa pelas mesas no carrossel, clica numa e
 * SÓ os dados dela aparecem abaixo. Os dois consomem os mesmos helpers
 * (src/lib/propFirmSummary.ts) sobre o mesmo catálogo estático, então o que
 * aparece aqui não pode divergir do que o trader vê logado.
 */
export default function MesasPage() {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Título, descrição e canônica próprios: sem isso as sete páginas do
  // site dividiam o mesmo título genérico, o que confunde o Google e
  // derruba o índice de qualidade de anúncio.
  useDocumentMeta({
    title: 'Mesas proprietárias suportadas — FORTIFY',
    description:
      'FTMO, FundedNext, Apex, Topstep, The5ers e outras: as regras de cada mesa extraídas da fonte oficial, com data de revisão registrada.',
    path: '/vendas/mesas',
  });

  useEffect(() => {
    pushDataLayerEvent('view_landing_page', { page: 'mesas' });
  }, []);

  /** Só mesas operacionais e com marca de primeira mão: o carrossel é conduzido
   *  pela imagem, e um card sem logo viraria um retângulo vazio. */
  const featured = useMemo(
    () =>
      propFirmFilterOptions.firms
        .map((name) => ({ name, programs: firmPrograms(name) }))
        .filter(({ name, programs }) => getFirmStatus(programs) === 'operational' && firmLogos[name]),
    [],
  );

  const slides: CoverflowSlide[] = useMemo(
    () =>
      featured.map(({ name }) => ({
        src: firmLogos[name] as string,
        alt: `Logo ${name}`,
        title: name,
      })),
    [featured],
  );

  const selected = featured[Math.min(selectedIndex, featured.length - 1)];

  // useCallback: a prop entra num useEffect dentro do carrossel; uma função
  // nova a cada render faria o efeito rodar sem parar.
  const handleSelection = useCallback((index: number) => setSelectedIndex(index), []);

  const detail = useMemo(() => {
    if (!selected) return null;
    const programs = selected.programs.filter((program) => accountRules(program).length > 0);
    const platforms = platformLabels(selected.programs);
    const markets = Array.from(new Set(selected.programs.map((program) => program.market)));
    return {
      name: selected.name,
      markets: markets.join(' · '),
      platforms: platforms.length ? platforms.join(' · ') : 'Não público',
      programs,
      source: selected.programs.find((program) => program.officialSourceUrl)?.officialSourceUrl,
    };
  }, [selected]);

  return (
    <CinematicPage>
      {/* Título só para leitor de tela e indexação: o cabeçalho visível foi
          retirado a pedido, mas uma página pública sem nenhum h1 perde a
          âncora de documento. */}
      <h1 className="sr-only">{`${featured.length} mesas proprietárias suportadas pelo Fortify`}</h1>

      <section aria-label="Mesas em destaque" className="relative overflow-x-clip pb-4 pt-32 sm:pt-36">
        <div className="absolute inset-x-0 top-0 h-[60vh] opacity-80">
          <Orb />
        </div>
        <div className="relative z-10 mx-auto w-full max-w-6xl px-5 sm:px-6">
          <Reveal>
            <p className={`${FONT_MONO} text-center text-[11px] uppercase tracking-[0.25em] text-zinc-300`}>
              Mesas em destaque
            </p>
          </Reveal>
          <div className="relative isolate z-0 mt-6">
            <CoverflowCarousel
              slides={slides}
              imageFit="contain"
              showNavigation
              onSelectionChange={handleSelection}
              cardClassName="border border-white/15 bg-zinc-950/90 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]"
              label="Mesas proprietárias em destaque"
            />
          </div>
        </div>
      </section>

      {/* Dados só da mesa escolhida. A `key` remonta o bloco na troca, então a
          entrada anima a cada escolha em vez de trocar o texto no lugar. */}
      {detail && (
        <Section key={detail.name} className="pt-8">
          <Reveal>
            <div className="text-center">
              <h2 className={`${FONT_DISPLAY} text-3xl font-semibold tracking-tight text-white sm:text-4xl`}>
                {detail.name}
              </h2>
              <p className="mt-2 text-[13.5px] text-zinc-400">{detail.markets}</p>
            </div>

            <dl className="mx-auto mt-8 grid max-w-2xl gap-x-10 gap-y-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1 border-t border-white/10 pt-3">
                <dt className={`${FONT_MONO} text-[10px] uppercase tracking-[0.2em] text-zinc-500`}>Modelos</dt>
                <dd className="text-[14px] font-semibold text-white">
                  {countLabel(detail.programs.length, 'modelo', 'modelos')}
                </dd>
              </div>
              <div className="flex flex-col gap-1 border-t border-white/10 pt-3">
                <dt className={`${FONT_MONO} text-[10px] uppercase tracking-[0.2em] text-zinc-500`}>Plataformas</dt>
                <dd className="text-[14px] font-semibold text-white">{detail.platforms}</dd>
              </div>
              <div className="flex flex-col gap-1 border-t border-white/10 pt-3">
                <dt className={`${FONT_MONO} text-[10px] uppercase tracking-[0.2em] text-zinc-500`}>Status</dt>
                <dd className="flex items-center gap-2 text-[14px] font-semibold text-white">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
                  Operacional
                </dd>
              </div>
            </dl>
          </Reveal>

          <ul
            className={cn(
              'mt-10 grid gap-4',
              detail.programs.length > 1 ? 'md:grid-cols-2' : 'mx-auto max-w-xl',
            )}
          >
            {detail.programs.map((program, index) => {
              const accounts = accountRules(program);
              const sizes = accounts.map((account) => formatAccountLabel(account.label));
              const first = accounts[0];
              return (
                <Reveal as="li" key={program.id} delay={(index % 2) * 0.08}>
                  <GlassCard className="transition-transform duration-300 hover:-translate-y-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-semibold text-white">{program.programName}</h3>
                        <p className="mt-1 text-[12.5px] text-zinc-400">
                          {program.programType} · {countLabel(accounts.length, 'tamanho', 'tamanhos')}
                        </p>
                      </div>
                      <Layers className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
                    </div>

                    {sizes.length > 0 && (
                      <p className="mt-4 text-[12.5px] leading-relaxed text-zinc-300">
                        {sizes.slice(0, 4).join(' · ')}
                        {sizes.length > 4 ? ` · +${sizes.length - 4}` : ''}
                      </p>
                    )}

                    {first && (
                      <dl className="mt-5 space-y-2.5 border-t border-white/10 pt-4">
                        {[
                          { label: 'Meta', value: phaseSummary(first) || 'Não público' },
                          { label: 'Perda diária', value: cleanValue(first.dailyLoss) },
                          { label: 'Perda máxima', value: cleanValue(first.maxLoss) },
                          { label: 'Dias mínimos', value: cleanValue(first.minTradingDays) },
                        ].map((row) => (
                          <div key={row.label} className="flex items-baseline justify-between gap-4">
                            <dt className={`${FONT_MONO} shrink-0 text-[10px] uppercase tracking-[0.18em] text-zinc-500`}>
                              {row.label}
                            </dt>
                            {/* Os mesmos números que o painel mostra, em mono tabular. */}
                            <dd className={`${FONT_MONO} text-right text-[12px] tabular-nums text-zinc-100`}>{row.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </GlassCard>
                </Reveal>
              );
            })}
          </ul>

          {detail.source && (
            <Reveal className="mt-8 text-center">
              <a
                href={detail.source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12.5px] text-zinc-400 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                Fonte oficial das regras da {detail.name}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </Reveal>
          )}
        </Section>
      )}

      <FinalCta
        title="Conecte sua conta e comece a monitorar."
        body="Escolha a mesa, confirme a versão das regras que vale para a sua conta e acompanhe os limites em tempo real."
        secondary={{ label: 'Ver como usar', to: '/vendas/como-funciona', destination: '/vendas/como-funciona' }}
        tracking={{ primary: 'firms_primary', secondary: 'firms_secondary', location: 'mesas' }}
      />
    </CinematicPage>
  );
}
