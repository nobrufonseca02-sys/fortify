import { useEffect } from 'react';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import {
  Activity,
  Building2,
  Gauge,
  Link2,
  Ruler,
  ScrollText,
  ShieldCheck,
} from 'lucide-react';
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
import { cn } from '@/lib/utils';

/**
 * A jornada real do produto, na ordem em que ela acontece na interface:
 * Biblioteca de Mesas -> programa/tamanho -> regras -> conexão MT5 -> painel.
 *
 * Deliberadamente não menciona MetaApi: é infraestrutura de conexão, não o que
 * o cliente compra. O que ele compra é o acompanhamento das regras.
 */
const STEPS = [
  {
    icon: Building2,
    title: 'Escolha sua mesa',
    body: 'Use a Biblioteca de Mesas para encontrar sua mesa. Cada regra tem uma fonte oficial registrada.',
  },
  {
    icon: Ruler,
    title: 'Escolha o modelo e o tamanho',
    body: 'Selecione o programa (avaliação, 2 fases, instant funding) e o tamanho da conta. É o que define quais números valem para você.',
  },
  {
    icon: ScrollText,
    title: 'Confira as regras daquela conta',
    body: 'Perda diária, perda total, drawdown, meta, consistência e restrições aparecem antes de você conectar qualquer coisa. Você confirma que é essa a versão que vale.',
  },
  {
    icon: Link2,
    title: 'Conecte sua conta MT5',
    body: 'Informe as credenciais de investidor da sua conta. A conexão é feita por um serviço dedicado do Fortify e as credenciais não ficam no navegador.',
  },
  {
    icon: Activity,
    title: 'O Fortify acompanha as operações',
    body: 'Posições, saldo, equity e resultado do dia são sincronizados e avaliados contra as regras que você vinculou.',
  },
  {
    icon: Gauge,
    title: 'Veja o estado da conta',
    body: 'Cada regra mostra o valor atual, o limite e a folga restante.',
  },
  {
    icon: ShieldCheck,
    title: 'Consulte os limites antes de operar',
    body: 'Antes da próxima ordem, o painel mostra a perda acumulada, a folga disponível e a regra mais próxima do limite.',
  },
];

/** O que aparece no painel de uma conta — os mesmos indicadores do produto. */
const ACCOUNT_SIGNALS = [
  'Quanto já perdeu hoje',
  'Quanto ainda pode perder',
  'Drawdown atual e limite',
  'Consistência',
  'Progresso da meta',
  'Regras em estado crítico',
];

export default function ComoFuncionaPage() {
  // Título, descrição e canônica próprios: sem isso as sete páginas do
  // site dividiam o mesmo título genérico, o que confunde o Google e
  // derruba o índice de qualidade de anúncio.
  useDocumentMeta({
    title: 'Como usar o Fortify em sete passos — FORTIFY',
    description:
      'Da escolha da mesa proprietária ao primeiro alerta: os sete passos para conectar sua conta MT5 e monitorar as regras que valem para ela.',
    path: '/vendas/como-funciona',
  });

  useEffect(() => {
    pushDataLayerEvent('view_landing_page', { page: 'como_funciona' });
  }, []);

  return (
    <CinematicSubPage
      eyebrow="Como usar"
      title="Da escolha da mesa ao primeiro alerta, em sete passos."
      description="Consulte as regras e o drawdown da conta sem depender de cálculo manual durante o pregão."
    >
      <Section className="pt-4">
        <ol className="grid gap-4 md:grid-cols-2">
          {STEPS.map(({ icon: Icon, title, body }, index) => (
            // O passo 7 fecha a jornada e ocupa a linha inteira: numa grade de duas
            // colunas ele ficaria órfão, com um vazio do lado.
            <Reveal
              as="li"
              key={title}
              delay={(index % 2) * 0.08}
              className={cn(index === STEPS.length - 1 && 'md:col-span-2')}
            >
              <GlassCard className="group transition-transform duration-300 hover:-translate-y-1" innerClassName="flex gap-5">
                <div className="relative flex shrink-0 flex-col items-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black ring-1 ring-white/15 shadow-[0_0_24px_-6px_rgba(165,88,251,0.55)] transition-shadow duration-300 group-hover:shadow-[0_0_32px_-4px_rgba(165,88,251,0.8)]">
                    <Icon className="h-4 w-4 text-zinc-200" strokeWidth={2} aria-hidden="true" />
                  </div>
                  <span aria-hidden="true" className="mt-3 w-px flex-1 bg-gradient-to-b from-white/20 to-transparent" />
                </div>
                <div className="min-w-0 pb-1">
                  {/* O texto tem que continuar sendo exatamente "Passo N" num
                      nó só — PublicPages.test.tsx casa /^Passo \d$/. */}
                  <p className={`${FONT_MONO} text-[11px] uppercase tracking-[0.22em] text-zinc-400`}>
                    Passo {index + 1}
                  </p>
                  <h2 className="mt-2 text-[16px] font-semibold text-white">{title}</h2>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-400">{body}</p>
                </div>
              </GlassCard>
            </Reveal>
          ))}
        </ol>
      </Section>

      <Section>
        <GlassCard innerClassName="p-8 sm:p-12">
          <SectionTitle
            eyebrow="Depois da conexão"
            title="Uma tela responde se você ainda pode operar."
            description="O painel mostra o estado atual da conta para orientar a próxima operação."
          />
          <ul className="mt-10 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {ACCOUNT_SIGNALS.map((signal, index) => (
              <Reveal as="li" key={signal} delay={index * 0.05}>
                <span className="flex items-center gap-3 border-b border-white/10 pb-4 text-[14px] text-zinc-300">
                  <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(165,88,251)] shadow-[0_0_10px_rgba(165,88,251,0.9)]" />
                  {signal}
                </span>
              </Reveal>
            ))}
          </ul>
        </GlassCard>
      </Section>

      <FinalCta
        title="Comece pela sua mesa."
        body="Escolha a mesa, confira as regras e conecte sua conta MT5. O acompanhamento começa na primeira sincronização."
        secondary={{ label: 'Ver mesas suportadas', to: '/vendas/mesas', destination: '/vendas/mesas' }}
        tracking={{ primary: 'how_primary', secondary: 'how_secondary', location: 'como_usar' }}
      />
    </CinematicSubPage>
  );
}
