import { useEffect } from 'react';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BookOpen, Gauge, ShieldCheck, Target, Timer } from 'lucide-react';
import {
  PublicCard,
  PublicPanel,
  PublicClosingCta,
  PublicPageHeader,
  PublicSection,
  PublicShell,
  AUTH_SIGNUP_PATH,
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
  const navigate = useNavigate();

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

  const goToAuth = (ctaId: string) => {
    trackCta(ctaId, 'quem_somos', AUTH_SIGNUP_PATH);
    navigate(AUTH_SIGNUP_PATH);
  };

  return (
    <PublicShell>
      <PublicPageHeader
        eyebrow="Quem somos"
        title="Acompanhe os limites da conta antes de operar."
        description="O Fortify é uma plataforma de gestão de risco para quem opera capital de mesa proprietária. Existe para responder uma pergunta específica, o dia inteiro: esta conta ainda está dentro das regras?"
      />

      {/* O problema */}
      <PublicSection>
        <SectionHeading
          eyebrow="O problema"
          title="Uma conta de mesa proprietária segue várias regras ao mesmo tempo."
          description="Perda diária, drawdown, meta e consistência usam bases de cálculo diferentes. Uma violação pode encerrar a conta."
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
            <div className="flex h-full flex-col justify-center rounded-lg border border-dashed border-zinc-300 px-6 py-8">
              <p className="text-[15px] font-semibold leading-snug text-zinc-900">
                Um limite pode ser violado enquanto você está operando.
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-600">
                O Fortify deixa o estado das regras visível durante a operação.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </PublicSection>

      {/* A proposta */}
      <PublicSection className="pt-0">
        <PublicPanel>
          <SectionHeading
            eyebrow="A proposta"
            title="Regras da mesa organizadas para acompanhar a conta."
            description="O Fortify registra as regras da sua mesa e acompanha a conta MT5 em relação a elas. O estado fica disponível no painel."
          />

          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {PRINCIPLES.map(({ title, body }, index) => (
              <ScrollReveal key={title} delay={index * 0.06}>
                {/* 01 / 02 / 03 é numeral, não rótulo: vai na voz de ledger
                    (mono tabular), então os três alinham coluna a coluna. */}
                <p className="numeral-ledger text-[13px] text-zinc-400">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-3 text-[15px] font-semibold leading-snug text-zinc-900">{title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-600">{body}</p>
              </ScrollReveal>
            ))}
          </div>
        </PublicPanel>
      </PublicSection>

      {/* Diferencial */}
      <PublicSection className="pt-0">
        <SectionHeading
          eyebrow="Diferencial"
          title="O Fortify mostra os limites da conta durante a operação."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <ScrollReveal>
            <PublicCard className="h-full bg-zinc-50/60">
              <div className="flex items-center gap-2.5">
                <BookOpen className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                <p className="instrument-label text-[11px] text-zinc-500">Trade journal</p>
              </div>
              <p className="mt-4 text-[15px] font-semibold text-zinc-900">Registra operações concluídas.</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-600">
                Registra entradas, saídas e estatísticas depois do fato. Ajuda a analisar operações
                encerradas.
              </p>
            </PublicCard>
          </ScrollReveal>

          <ScrollReveal delay={0.06}>
            <PublicCard className="h-full border-zinc-900/10 bg-zinc-900 text-white">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-white/60" aria-hidden="true" />
                <p className="instrument-label text-[11px] text-white/60">Fortify</p>
              </div>
              <p className="mt-4 text-[15px] font-semibold">
                Mostra o estado atual da conta e seus limites.
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-white/70">
                Cada regra da sua mesa aparece com valor atual, limite e folga disponível.
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
        title="Conecte sua conta MT5"
        description="Vincule as regras da sua mesa e acompanhe o estado da conta no painel."
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
