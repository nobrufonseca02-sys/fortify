import { useEffect } from 'react';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { AlertTriangle, BookOpen, Gauge, ShieldCheck, Target, Timer } from 'lucide-react';
import {
  CinematicSubPage,
  GlassCard,
  Reveal,
  Section,
  SectionTitle,
} from '@/components/landing/cinematic/CinematicPage';
import { FinalCta } from '@/components/landing/cinematic/FinalCta';
import { FONT_MONO } from '@/components/landing/cinematic/fonts';
import { pushDataLayerEvent } from '@/lib/analytics';

/**
 * As cinco famílias de regra que o produto realmente avalia. Vieram do motor de
 * regras (src/lib/ruleBinding.ts + a Biblioteca de Mesas), não de um texto de
 * marketing — se o motor mudar, esta lista precisa mudar junto.
 */
const RULE_PRESSURES = [
  {
    icon: AlertTriangle,
    title: 'Perda diária',
    body: 'O limite é reiniciado a cada dia e exige uma leitura atualizada do resultado.',
  },
  {
    icon: Gauge,
    title: 'Drawdown',
    body: 'Pode ser estático ou trailing, calculado sobre saldo ou sobre o pico. A forma de cálculo depende da mesa.',
  },
  {
    icon: Target,
    title: 'Meta',
    body: 'Mostra quanto falta para o objetivo do desafio e ajuda a contextualizar o risco da próxima operação.',
  },
  {
    icon: ShieldCheck,
    title: 'Consistência',
    body: 'Limita a participação de um único dia no resultado. Algumas mesas verificam essa regra no saque.',
  },
  {
    icon: Timer,
    title: 'Restrições operacionais',
    body: 'Inclui dias mínimos, lote máximo, horários e restrições para notícias.',
  },
];

const PRINCIPLES = [
  {
    title: 'Regras auditáveis por conta',
    body: 'Cada conta recebe um snapshot versionado e assinado das regras aplicáveis. Você pode consultar qual versão estava em vigor.',
  },
  {
    title: 'Folga disponível para operar',
    body: 'O painel destaca quanto ainda pode ser perdido no dia e qual limite está mais próximo.',
  },
  {
    title: 'Alertas com texto e estado',
    body: 'Cada alerta combina texto, ícone e cor para deixar o estado da regra claro.',
  },
];

export default function QuemSomosPage() {
  // Título, descrição e canônica próprios: sem isso as sete páginas do
  // site dividiam o mesmo título genérico, o que confunde o Google e
  // derruba o índice de qualidade de anúncio.
  useDocumentMeta({
    title: 'Quem somos — FORTIFY',
    description:
      'Por que o Fortify existe: controle de risco auditável para quem opera capital de mesa proprietária. Não é corretora, não dá sinais de entrada.',
    path: '/vendas/quem-somos',
  });

  useEffect(() => {
    pushDataLayerEvent('view_about_page', {});
  }, []);

  return (
    <CinematicSubPage
      eyebrow="Quem somos"
      title="Acompanhe os limites da conta antes de operar."
      description="O Fortify é uma plataforma de gestão de risco para quem opera capital de mesa proprietária. Existe para responder uma pergunta específica, o dia inteiro: esta conta ainda está dentro das regras?"
    >
      <Section className="pt-4">
        <SectionTitle
          eyebrow="O problema"
          title="Uma conta de mesa proprietária segue várias regras ao mesmo tempo."
          description="Perda diária, drawdown, meta e consistência usam bases de cálculo diferentes. Uma violação pode encerrar a conta."
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RULE_PRESSURES.map(({ icon: Icon, title, body }, index) => (
            <Reveal as="li" key={title} delay={(index % 3) * 0.06}>
              <GlassCard className="transition-transform duration-300 hover:-translate-y-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 ring-1 ring-white/10">
                  <Icon className="h-4 w-4 text-zinc-300" strokeWidth={2} aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-[15px] font-semibold text-white">{title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-400">{body}</p>
              </GlassCard>
            </Reveal>
          ))}
          <Reveal as="li" delay={0.12}>
            <div className="flex h-full flex-col justify-center rounded-[1.6rem] border border-dashed border-white/15 px-6 py-8">
              <p className="text-[15px] font-semibold leading-snug text-white">
                Um limite pode ser violado enquanto você está operando.
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-400">
                O Fortify deixa o estado das regras visível durante a operação.
              </p>
            </div>
          </Reveal>
        </ul>
      </Section>

      <Section>
        <GlassCard innerClassName="p-8 sm:p-12">
          <SectionTitle
            eyebrow="A proposta"
            title="Regras da mesa organizadas para acompanhar a conta."
            description="O Fortify registra as regras da sua mesa e acompanha a conta MT5 em relação a elas. O estado fica disponível no painel."
          />
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {PRINCIPLES.map(({ title, body }, index) => (
              <Reveal key={title} delay={index * 0.08}>
                <p className={`${FONT_MONO} text-[13px] tabular-nums text-zinc-500`}>{String(index + 1).padStart(2, '0')}</p>
                <h3 className="mt-3 text-[15px] font-semibold leading-snug text-white">{title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-400">{body}</p>
              </Reveal>
            ))}
          </div>
        </GlassCard>
      </Section>

      <Section>
        <SectionTitle eyebrow="Diferencial" title="O Fortify mostra os limites da conta durante a operação." />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Reveal>
            <GlassCard>
              <div className="flex items-center gap-2.5">
                <BookOpen className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                <p className={`${FONT_MONO} text-[11px] uppercase tracking-[0.2em] text-zinc-500`}>Trade journal</p>
              </div>
              <p className="mt-4 text-[15px] font-semibold text-zinc-200">Registra operações concluídas.</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-500">
                Registra entradas, saídas e estatísticas depois do fato. Ajuda a analisar operações encerradas.
              </p>
            </GlassCard>
          </Reveal>
          <Reveal delay={0.08}>
            <GlassCard className="bg-gradient-to-b from-[rgba(165,88,251,0.5)] via-[rgba(73,34,229,0.2)] to-white/5 shadow-[0_32px_100px_-20px_rgba(115,60,240,0.45)]">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-zinc-300" aria-hidden="true" />
                <p className={`${FONT_MONO} text-[11px] uppercase tracking-[0.2em] text-zinc-300`}>Fortify</p>
              </div>
              <p className="mt-4 text-[15px] font-semibold text-white">Mostra o estado atual da conta e seus limites.</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-300">
                Cada regra da sua mesa aparece com valor atual, limite e folga disponível.
              </p>
            </GlassCard>
          </Reveal>
        </div>
        <Reveal className="mt-6">
          <p className="text-[12.5px] leading-relaxed text-zinc-500">
            O Fortify não é corretora, não executa ordens, não dá recomendação de investimento e não garante aprovação
            em nenhum desafio. É uma ferramenta de monitoramento: a decisão de operar continua sendo sua.
          </p>
        </Reveal>
      </Section>

      <FinalCta
        title="Conecte sua conta MT5"
        body="Vincule as regras da sua mesa e acompanhe o estado da conta no painel."
        secondary={{ label: 'Ver como funciona', to: '/vendas/como-funciona', destination: '/vendas/como-funciona' }}
        tracking={{ primary: 'about_primary', secondary: 'about_secondary', location: 'quem_somos' }}
      />
    </CinematicSubPage>
  );
}
