import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Layers } from 'lucide-react';
import { CoverflowCarousel, type CoverflowSlide } from '@/components/ui/coverflow-carousel';
import {
  PublicCard,
  PublicClosingCta,
  PublicSection,
  PublicShell,
  AUTH_SIGNUP_PATH,
  ScrollReveal,
  trackCta,
} from '@/components/landing/PublicShell';
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
  const navigate = useNavigate();
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
      featured.map(({ name, programs }) => ({
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
    <PublicShell>
      {/* Título só para leitor de tela e indexação: o cabeçalho visível foi
          retirado a pedido, mas uma página pública sem nenhum h1 perde a
          âncora de documento. */}
      <h1 className="sr-only">{`${featured.length} mesas proprietárias suportadas pelo Fortify`}</h1>

      <PublicSection>
        <p className="instrument-label text-[11px] text-zinc-500">Mesas em destaque</p>

        <div className="relative isolate z-0 mt-4">
          <CoverflowCarousel
            slides={slides}
            imageFit="contain"
            showNavigation
            onSelectionChange={handleSelection}
            cardClassName="border border-brand-chip-border bg-brand-chip"
            label="Mesas proprietárias em destaque"
          />
        </div>

        {/* Dados só da mesa escolhida. A `key` remonta o bloco na troca, então a
            entrada anima a cada escolha em vez de trocar o texto no lugar. */}
        {detail && (
          <div key={detail.name} className="mt-10">
            <ScrollReveal>
              <div className="text-center">
                <h2 className="text-[1.55rem] font-bold tracking-[-0.02em] text-zinc-900 sm:text-[2rem]">
                  {detail.name}
                </h2>
                <p className="mt-1 text-[13.5px] text-zinc-500">{detail.markets}</p>
              </div>

              <dl className="mx-auto mt-8 grid max-w-2xl gap-x-10 gap-y-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1 border-t border-zinc-200/80 pt-3">
                  <dt className="instrument-label text-[11px] text-zinc-500">Modelos</dt>
                  <dd className="text-[14px] font-semibold text-zinc-900">
                    {countLabel(detail.programs.length, 'modelo', 'modelos')}
                  </dd>
                </div>
                <div className="flex flex-col gap-1 border-t border-zinc-200/80 pt-3">
                  <dt className="instrument-label text-[11px] text-zinc-500">Plataformas</dt>
                  <dd className="text-[14px] font-semibold text-zinc-900">{detail.platforms}</dd>
                </div>
                <div className="flex flex-col gap-1 border-t border-zinc-200/80 pt-3">
                  <dt className="instrument-label text-[11px] text-zinc-500">Status</dt>
                  <dd className="text-[14px] font-semibold text-zinc-900">Operacional</dd>
                </div>
              </dl>
            </ScrollReveal>

            <div
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
                  <ScrollReveal key={program.id} delay={index * 0.04}>
                    <PublicCard rail className="h-full pl-7">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="text-[15px] font-semibold text-zinc-900">{program.programName}</h3>
                          <p className="mt-1 text-[12.5px] text-zinc-500">
                            {program.programType} · {countLabel(accounts.length, 'tamanho', 'tamanhos')}
                          </p>
                        </div>
                        <Layers className="h-4 w-4 shrink-0 text-zinc-300" aria-hidden="true" />
                      </div>

                      {sizes.length > 0 && (
                        <p className="mt-4 text-[12.5px] leading-relaxed text-zinc-600">
                          {sizes.slice(0, 4).join(' · ')}
                          {sizes.length > 4 ? ` · +${sizes.length - 4}` : ''}
                        </p>
                      )}

                      {first && (
                        <dl className="mt-5 space-y-2 border-t border-zinc-100 pt-4">
                          {[
                            { label: 'Meta', value: phaseSummary(first) || 'Não público' },
                            { label: 'Perda diária', value: cleanValue(first.dailyLoss) },
                            { label: 'Perda máxima', value: cleanValue(first.maxLoss) },
                            { label: 'Dias mínimos', value: cleanValue(first.minTradingDays) },
                          ].map((row) => (
                            <div key={row.label} className="flex items-baseline justify-between gap-4">
                              <dt className="instrument-label shrink-0 text-[10px] text-zinc-500">
                                {row.label}
                              </dt>
                              {/* Estes são os MESMOS números que o painel mostra
                                  (perda diária, perda máxima, dias mínimos). Na
                                  voz de ledger — mono tabular, peso 600 — o site
                                  passa a falar a língua do produto no ponto em
                                  que os dois tratam do mesmo dado. */}
                              <dd className="numeral-ledger text-right text-[12px] text-zinc-800">
                                {row.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </PublicCard>
                  </ScrollReveal>
                );
              })}
            </div>

            {detail.source && (
              <ScrollReveal className="mt-6 text-center">
                <a
                  href={detail.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12.5px] text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-900 hover:underline"
                >
                  Fonte oficial das regras da {detail.name}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </ScrollReveal>
            )}
          </div>
        )}
      </PublicSection>

      <PublicClosingCta
        title="Conecte sua conta e comece a monitorar."
        description="Escolha a mesa, confirme a versão das regras que vale para a sua conta e acompanhe os limites em tempo real."
        primaryLabel="Criar conta"
        onPrimary={() => {
          trackCta('firms_primary', 'mesas', AUTH_SIGNUP_PATH);
          navigate(AUTH_SIGNUP_PATH);
        }}
        secondaryLabel="Ver como usar"
        onSecondary={() => {
          trackCta('firms_secondary', 'mesas', '/vendas/como-funciona');
          navigate('/vendas/como-funciona');
        }}
      />
    </PublicShell>
  );
}
