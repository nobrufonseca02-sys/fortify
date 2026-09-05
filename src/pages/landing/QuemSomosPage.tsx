import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BookOpen, Gauge, ShieldCheck, Target, Timer } from 'lucide-react';
import {
  PublicCard,
  PublicClosingCta,
  PublicPageHeader,
  PublicSection,
  PublicShell,
  ScrollReveal,
  SectionHeading,
  trackCta,
} from '@/components/landing/PublicShell';
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
    body: 'Um limite que zera todo dia e não perdoa atraso de leitura. É a regra que mais reprova conta.',
  },
  {
    icon: Gauge,
    title: 'Drawdown',
    body: 'Estático ou trailing, sobre saldo ou sobre pico. Muda de mesa para mesa e raramente é lido do mesmo jeito.',
  },
  {
    icon: Target,
    title: 'Meta',
    body: 'Quanto falta para o objetivo do desafio — e o quanto arriscar a mais deixa de fazer sentido.',
  },
  {
    icon: ShieldCheck,
    title: 'Consistência',
    body: 'Teto de participação de um único dia no resultado. Costuma aparecer só na hora do saque.',
  },
  {
    icon: Timer,
    title: 'Restrições operacionais',
    body: 'Dias mínimos, lote máximo, horários e notícias proibidas. Regras pequenas com efeito definitivo.',
  },
];

const PRINCIPLES = [
  {
    title: 'A regra é dado, não interpretação',
    body: 'Cada conta recebe um snapshot versionado e assinado das regras que valem para ela. Nada é assumido em silêncio, e dá para auditar qual versão estava valendo em qualquer momento.',
  },
  {
    title: 'O limite importa mais que o histórico',
    body: 'O número que decide a próxima ordem não é o que você já perdeu: é o quanto ainda pode perder hoje sem quebrar a conta.',
  },
  {
    title: 'Estado antes de cor',
    body: 'Todo alerta é texto, ícone e cor ao mesmo tempo. Ninguém deveria depender de enxergar vermelho para saber que está no limite.',
  },
];

export default function QuemSomosPage() {
  const navigate = useNavigate();

  useEffect(() => {
    pushDataLayerEvent('view_about_page', {});
  }, []);

  const goToAuth = (ctaId: string) => {
    trackCta(ctaId, 'quem_somos', '/auth');
    navigate('/auth');
  };

  return (
    <PublicShell>
      <PublicPageHeader
        eyebrow="Quem somos"
        title="Controle o risco antes que o mercado controle sua conta."
        description="O Fortify é uma plataforma de gestão de risco para quem opera capital de mesa proprietária. Existe para responder uma pergunta específica, o dia inteiro: esta conta ainda está dentro das regras?"
      />

      {/* O problema */}
      <PublicSection>
        <SectionHeading
          eyebrow="O problema"
          title="Aprovar num desafio é fácil de entender. Continuar dentro das regras, não."
          description="Uma conta de mesa proprietária não é avaliada por um número só. São várias regras correndo ao mesmo tempo, com bases de cálculo diferentes, e basta uma delas estourar para o resto não importar mais."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RULE_PRESSURES.map(({ icon: Icon, title, body }, index) => (
            <ScrollReveal key={title} delay={index * 0.04}>
              <PublicCard className="h-full">
                <Icon className="h-5 w-5 text-zinc-400" strokeWidth={2} aria-hidden="true" />
                <h3 className="mt-4 text-[15px] font-semibold text-zinc-900">{title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-600">{body}</p>
              </PublicCard>
            </ScrollReveal>
          ))}

          <ScrollReveal delay={0.2}>
            <div className="flex h-full flex-col justify-center rounded-2xl border border-dashed border-zinc-300 px-6 py-8">
              <p className="text-[15px] font-semibold leading-snug text-zinc-900">
                O trader não perde a conta por falta de análise.
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-600">
                Perde por perder de vista um limite enquanto estava ocupado operando.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </PublicSection>

      {/* A proposta */}
      <PublicSection className="pt-0">
        <div className="rounded-3xl border border-zinc-200/80 bg-white px-6 py-12 sm:px-12">
          <SectionHeading
            eyebrow="A proposta"
            title="Transformar o regulamento da mesa em acompanhamento operacional."
            description="O Fortify lê o regulamento da sua mesa uma vez, transforma em regras monitoráveis e passa a acompanhar sua conta MT5 contra elas. O que era um PDF vira um estado que você consulta em segundos."
          />

          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {PRINCIPLES.map(({ title, body }, index) => (
              <ScrollReveal key={title} delay={index * 0.06}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-3 text-[15px] font-semibold leading-snug text-zinc-900">{title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-600">{body}</p>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </PublicSection>

      {/* Diferencial */}
      <PublicSection className="pt-0">
        <SectionHeading
          eyebrow="Diferencial"
          title="Um diário de trades olha para trás. O Fortify olha para o limite."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <ScrollReveal>
            <PublicCard className="h-full bg-zinc-50/60">
              <div className="flex items-center gap-2.5">
                <BookOpen className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Trade journal
                </p>
              </div>
              <p className="mt-4 text-[15px] font-semibold text-zinc-900">Mostra o que aconteceu.</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-600">
                Registra entradas, saídas e estatísticas depois do fato. Serve para estudar a
                operação — e é uma leitura de fim de semana, não de horário de pregão.
              </p>
            </PublicCard>
          </ScrollReveal>

          <ScrollReveal delay={0.06}>
            <PublicCard className="h-full border-zinc-900/10 bg-zinc-900 text-white">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-white/60" aria-hidden="true" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                  Fortify
                </p>
              </div>
              <p className="mt-4 text-[15px] font-semibold">
                Mostra a saúde da conta e se você ainda pode operar.
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-white/70">
                Cada regra da sua mesa com o valor atual, o limite e a folga que sobrou. É uma
                leitura de antes da próxima ordem, não de depois do prejuízo.
              </p>
            </PublicCard>
          </ScrollReveal>
        </div>

        <ScrollReveal className="mt-6">
          <p className="text-[12.5px] leading-relaxed text-zinc-500">
            O Fortify não é corretora, não executa ordens, não dá recomendação de investimento e não
            garante aprovação em nenhum desafio. É uma ferramenta de monitoramento: a decisão de
            operar continua sendo sua.
          </p>
        </ScrollReveal>
      </PublicSection>

      <PublicClosingCta
        title="Conheça a plataforma com a sua própria conta."
        description="Conecte uma conta MT5, vincule as regras da sua mesa e veja o estado dela em minutos."
        primaryLabel="Criar conta"
        onPrimary={() => goToAuth('about_primary')}
        secondaryLabel="Ver como funciona"
        onSecondary={() => {
          trackCta('about_secondary', 'quem_somos', '/vendas/como-funciona');
          navigate('/vendas/como-funciona');
        }}
      />
    </PublicShell>
  );
}
