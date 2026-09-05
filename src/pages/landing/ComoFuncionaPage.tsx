import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    body: 'Comece pela Biblioteca de Mesas. O catálogo é curado e cada regra tem a fonte registrada — não é um resumo escrito de memória.',
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
    body: 'Informe as credenciais de investidor da sua conta. A conexão é feita por um serviço dedicado do Fortify — as credenciais não ficam no navegador.',
  },
  {
    icon: Activity,
    title: 'O Fortify acompanha as operações',
    body: 'Posições, saldo, equity e resultado do dia são sincronizados e avaliados contra as regras que você vinculou.',
  },
  {
    icon: Gauge,
    title: 'A conta ganha um estado',
    body: 'Cada regra passa a ter valor atual, limite e folga restante. A conta deixa de ser um extrato e vira um painel de saúde.',
  },
  {
    icon: ShieldCheck,
    title: 'Você decide com o limite à vista',
    body: 'Antes da próxima ordem você vê o que já perdeu, o quanto ainda pode perder e qual regra está mais perto de estourar.',
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
  const navigate = useNavigate();

  useEffect(() => {
    pushDataLayerEvent('view_landing_page', { page: 'como_funciona' });
  }, []);

  return (
    <PublicShell>
      <PublicPageHeader
        eyebrow="Como usar"
        title="Da escolha da mesa ao primeiro alerta, em sete passos."
        description="Sem planilha, sem cálculo manual de drawdown e sem depender de lembrar o regulamento no meio do pregão."
      />

      {/* Os passos */}
      <PublicSection>
        <ol className="grid gap-4 md:grid-cols-2">
          {STEPS.map(({ icon: Icon, title, body }, index) => (
            /* O passo 7 fecha a jornada e ocupa a linha inteira: numa grade de duas
               colunas ele ficaria órfão, com um vazio do lado. O col-span vai no <li>,
               que é o filho direto do grid. */
            <li key={title} className={cn(index === STEPS.length - 1 && 'md:col-span-2')}>
              <ScrollReveal delay={index * 0.03} className="h-full">
                <PublicCard className="flex h-full gap-5">
                  <div className="shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50">
                      <Icon className="h-4 w-4 text-zinc-500" strokeWidth={2} aria-hidden="true" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                      Passo {index + 1}
                    </p>
                    <h2 className="mt-1.5 text-[15px] font-semibold text-zinc-900">{title}</h2>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-600">{body}</p>
                  </div>
                </PublicCard>
              </ScrollReveal>
            </li>
          ))}
        </ol>
      </PublicSection>

      {/* O que fica visível no fim */}
      <PublicSection className="pt-0">
        <div className="rounded-3xl border border-zinc-200/80 bg-white px-6 py-12 sm:px-12">
          <SectionHeading
            eyebrow="No fim da jornada"
            title="Uma tela responde se você ainda pode operar."
            description="Não é um relatório para ler depois. É o estado da conta agora, no formato que serve para decidir a próxima ordem."
          />

          <ul className="mt-10 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {ACCOUNT_SIGNALS.map((signal, index) => (
              <li key={signal}>
                <ScrollReveal delay={index * 0.03}>
                  <span className="flex items-center gap-3 border-b border-zinc-100 pb-4 text-[14px] text-zinc-700">
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-900"
                    />
                    {signal}
                  </span>
                </ScrollReveal>
              </li>
            ))}
          </ul>
        </div>
      </PublicSection>

      <PublicClosingCta
        title="Comece pela sua mesa."
        description="Escolha a mesa, confira as regras e conecte sua conta MT5. O acompanhamento começa na primeira sincronização."
        primaryLabel="Criar conta"
        onPrimary={() => {
          trackCta('how_primary', 'como_usar', '/auth');
          navigate('/auth');
        }}
        secondaryLabel="Ver mesas suportadas"
        onSecondary={() => {
          trackCta('how_secondary', 'como_usar', '/vendas/mesas');
          navigate('/vendas/mesas');
        }}
      />
    </PublicShell>
  );
}
