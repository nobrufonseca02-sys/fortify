import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Gauge, Link2, ShieldCheck } from 'lucide-react';
import { FortifyHero } from '@/components/landing/FortifyHero';
import {
  AUTH_SIGNUP_PATH,
  PublicButton,
  PublicCard,
  PublicFooter,
  PublicSection,
  trackCta,
  useForcedLightTheme,
} from '@/components/landing/PublicShell';
import { RevealBlock, RevealText } from '@/components/landing/publicMotion';
import { FaqSection, FeaturesSection } from '@/pages/landing/landingSections';
import { propFirmFilterOptions } from '@/data/propFirmRules';
import { firmLogos } from '@/data/firmLogos';
import { pushDataLayerEvent } from '@/lib/analytics';
import { SUPPORT_WHATSAPP_URL } from '@/lib/support';

const CATALOG_FIRM_COUNT = propFirmFilterOptions.firms.length;

/** Quatro passos, não os sete da página dedicada: aqui é chamada, não manual. */
const STEPS = [
  {
    icon: Building2,
    title: 'Escolha sua mesa',
    body: 'O catálogo é curado e cada regra tem a fonte oficial registrada.',
  },
  {
    icon: Link2,
    title: 'Conecte a conta MT5',
    body: 'A conexão passa por um serviço dedicado. As credenciais não ficam no navegador.',
  },
  {
    icon: Gauge,
    title: 'A conta ganha um estado',
    body: 'Cada regra com valor atual, limite e a folga que ainda sobra.',
  },
  {
    icon: ShieldCheck,
    title: 'Decida com o limite à vista',
    body: 'Antes da próxima ordem, e não depois de descobrir a violação.',
  },
];

const firmsWithLogo = propFirmFilterOptions.firms.filter((name) => firmLogos[name]);

/**
 * Landing pública (/vendas) — página longa, com as seções revelando no scroll.
 *
 * Era uma tela única sem rolagem. Virou página longa a pedido: hero de altura
 * cheia e seções que revelam ao entrar na tela.
 *
 * As seções aqui são CHAMADAS, não cópias: quatro passos em vez dos sete de
 * /vendas/como-funciona, quatro recursos em vez de todos, quatro perguntas em
 * vez do FAQ inteiro. Cada bloco leva para a página que tem o conteúdo
 * completo — repetir tudo nas duas URLs seria conteúdo duplicado e manutenção
 * em dobro.
 */
export default function SalesLandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    pushDataLayerEvent('view_sales_landing_page', {});
  }, []);

  // Página de anúncio: precisa ser idêntica para todo visitante, independente
  // do tema salvo no app. Restaura o anterior ao sair, sem tocar no localStorage.
  useForcedLightTheme();

  const irParaCadastro = (ctaId: string) => {
    trackCta(ctaId, 'landing', AUTH_SIGNUP_PATH);
    navigate(AUTH_SIGNUP_PATH);
  };

  const irPara = (ctaId: string, destino: string) => {
    trackCta(ctaId, 'landing', destino);
    navigate(destino);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-zinc-900">
      <FortifyHero
        onPrimary={() => irParaCadastro('hero_primary')}
        onSecondary={() => {
          trackCta('hero_secondary', 'landing', 'whatsapp_support');
          window.open(SUPPORT_WHATSAPP_URL, '_blank', 'noopener,noreferrer');
        }}
      />

      {/* Como funciona — chamada de quatro passos */}
      <PublicSection>
        <RevealText
          as="h2"
          text="Da escolha da mesa ao primeiro alerta."
          className="max-w-2xl text-[1.55rem] font-bold leading-[1.12] tracking-[-0.02em] text-zinc-900 sm:text-[2rem]"
        />
        <RevealBlock delay={0.1}>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-zinc-600">
            Sem planilha, sem cálculo manual de drawdown e sem depender de lembrar o regulamento no
            meio do pregão.
          </p>
        </RevealBlock>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, body }, index) => (
            <RevealBlock key={title} delay={index * 0.08}>
              <PublicCard className="h-full">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50">
                  <Icon className="h-4 w-4 text-zinc-500" strokeWidth={2} aria-hidden="true" />
                </div>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  Passo {index + 1}
                </p>
                <h3 className="mt-1.5 text-[15px] font-semibold text-zinc-900">{title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-600">{body}</p>
              </PublicCard>
            </RevealBlock>
          ))}
        </div>

        <RevealBlock delay={0.2} className="mt-8">
          <PublicButton variant="secondary" onClick={() => irPara('landing_how', '/vendas/como-funciona')}>
            Ver os sete passos
            <ArrowRight className="h-4 w-4" />
          </PublicButton>
        </RevealBlock>
      </PublicSection>

      {/* Recursos — recorte; a página de Recursos mostra todos */}
      <PublicSection className="pt-0">
        <RevealText
          as="h2"
          text="O que o Fortify monitora de verdade."
          className="max-w-2xl text-[1.55rem] font-bold leading-[1.12] tracking-[-0.02em] text-zinc-900 sm:text-[2rem]"
        />
        <FeaturesSection limit={3} />
        <RevealBlock className="-mt-4">
          <PublicButton variant="secondary" onClick={() => irPara('landing_features', '/vendas/recursos')}>
            Ver todos os recursos
            <ArrowRight className="h-4 w-4" />
          </PublicButton>
        </RevealBlock>
      </PublicSection>

      {/* Mesas — tira de marcas + contagem real do catálogo */}
      <PublicSection className="pt-0">
        <RevealText
          as="h2"
          text={`${CATALOG_FIRM_COUNT} mesas proprietárias mapeadas.`}
          className="max-w-2xl text-[1.55rem] font-bold leading-[1.12] tracking-[-0.02em] text-zinc-900 sm:text-[2rem]"
        />
        <RevealBlock delay={0.1}>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-zinc-600">
            Cada uma com as regras extraídas da fonte oficial e data de revisão registrada.
          </p>
        </RevealBlock>

        <RevealBlock delay={0.15} className="mt-10">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {firmsWithLogo.slice(0, 10).map((name) => (
              <li
                key={name}
                className="flex h-20 items-center justify-center rounded-2xl border border-brand-chip-border bg-brand-chip px-4"
              >
                <img
                  src={firmLogos[name] as string}
                  alt={name}
                  loading="lazy"
                  className="max-h-7 w-auto max-w-[120px] object-contain"
                />
              </li>
            ))}
          </ul>
        </RevealBlock>

        <RevealBlock delay={0.2} className="mt-8">
          <PublicButton variant="secondary" onClick={() => irPara('landing_firms', '/vendas/mesas')}>
            Ver o que cada mesa oferece
            <ArrowRight className="h-4 w-4" />
          </PublicButton>
        </RevealBlock>
      </PublicSection>

      {/* FAQ — recorte; a página de FAQ tem todas */}
      <PublicSection className="pt-0" width="narrow">
        <RevealText
          as="h2"
          text="Antes de conectar sua conta."
          className="text-[1.55rem] font-bold leading-[1.12] tracking-[-0.02em] text-zinc-900 sm:text-[2rem]"
        />
        <FaqSection limit={4} />
        <RevealBlock className="-mt-4">
          <PublicButton variant="secondary" onClick={() => irPara('landing_faq', '/vendas/faq')}>
            Ver todas as perguntas
            <ArrowRight className="h-4 w-4" />
          </PublicButton>
        </RevealBlock>
      </PublicSection>

      {/* Fechamento */}
      <PublicSection className="pt-0">
        <RevealBlock>
          <div className="rounded-3xl border border-zinc-200/80 bg-white px-6 py-12 text-center sm:px-12">
            <RevealText
              as="h2"
              text="Pare de descobrir a violação depois que ela aconteceu."
              className="mx-auto max-w-xl text-[1.55rem] font-bold leading-[1.12] tracking-[-0.02em] text-zinc-900 sm:text-[2rem]"
            />
            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-zinc-600">
              Conecte sua conta MT5, vincule as regras da sua mesa e comece a monitorar em minutos.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <PublicButton onClick={() => irParaCadastro('landing_final')} className="w-full sm:w-auto">
                Criar conta
                <ArrowRight className="h-4 w-4" />
              </PublicButton>
              <PublicButton
                variant="secondary"
                onClick={() => irPara('landing_plans', '/vendas/planos')}
                className="w-full sm:w-auto"
              >
                Ver planos
              </PublicButton>
            </div>
          </div>
        </RevealBlock>
      </PublicSection>

      <PublicFooter />
    </div>
  );
}
