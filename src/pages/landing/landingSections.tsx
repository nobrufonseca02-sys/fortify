import type { ReactNode } from 'react';
import {
  BellRing,
  Calculator,
  Gauge,
  Layers,
  Link2,
  ListChecks,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { propFirmFilterOptions } from '@/data/propFirmRules';
import { firmLogos } from '@/data/firmLogos';
import { CinematicSubPage, GlassCard, Reveal, Section } from '@/components/landing/cinematic/CinematicPage';
import { FinalCta } from '@/components/landing/cinematic/FinalCta';

// Contagem derivada do catálogo real (src/data/propFirmRules.ts), nunca um
// número de marketing chumbado — não consegue divergir da Biblioteca.
export const CATALOG_FIRM_COUNT = propFirmFilterOptions.firms.length;
const catalogFirmsWithLogo = propFirmFilterOptions.firms.filter((name) => firmLogos[name]);

const howItWorks = [
  {
    step: '1',
    icon: Link2,
    title: 'Conecte sua conta MT5',
    description:
      'Informe as credenciais da corretora. O Fortify autentica sua conta MT5 por um gateway dedicado; o token do MetaApi permanece no backend.',
  },
  {
    step: '2',
    icon: ShieldCheck,
    title: 'Vincule as regras da sua mesa',
    description:
      'Escolha a mesa proprietária, o modelo e o tamanho de conta na Biblioteca de Mesas. O Fortify grava um snapshot versionado e auditável das regras válidas para aquela conta.',
  },
  {
    step: '3',
    icon: Gauge,
    title: 'Monitore em tempo real',
    description:
      'Perda diária, perda total, drawdown, consistência, lote e dias operados aparecem no painel da conta, cada um com o valor atual, o limite e quanto ainda resta antes da violação.',
  },
  {
    step: '4',
    icon: BellRing,
    title: 'Aja antes de violar',
    description:
      'Quando uma regra se aproxima do limite, o status mostra texto, ícone e cor. Assim, você identifica o alerta sem depender apenas da cor.',
  },
];

const features = [
  {
    icon: ShieldCheck,
    title: 'Vinculação de regras auditada',
    description:
      'Cada conta guarda um snapshot versionado, com hash, das regras aplicáveis.',
  },
  {
    icon: Lock,
    title: 'Suas credenciais MT5 protegidas',
    description:
      'O frontend nunca fala direto com o MetaApi. Só o gateway do Fortify guarda o token, com o seu login validado a cada chamada.',
  },
  {
    icon: Gauge,
    title: 'Painel de contas MT5',
    description:
      'Status de conexão, saldo, equity e P&L flutuante de cada conta, com aviso claro quando os dados estão atrasados ou a conta caiu.',
  },
  {
    icon: Calculator,
    title: 'Calculadora de risco',
    description:
      'Calcule o tamanho da posição e a distância até o limite de perda antes de abrir uma operação.',
  },
  {
    icon: Layers,
    title: 'Multi-conta',
    description:
      'Planos com limite de contas MT5 monitoradas simultaneamente, com a opção de adicionar contas extras conforme sua operação cresce.',
  },
  {
    icon: ListChecks,
    title: 'Catálogo de regras por mesa',
    description: `${CATALOG_FIRM_COUNT} mesas proprietárias já mapeadas na Biblioteca, com fonte oficial linkada para cada regra.`,
  },
];

const faqItems = [
  {
    question: 'O Fortify executa ordens ou dá sinais de entrada?',
    answer:
      'Não. O Fortify monitora o risco e as regras da sua própria operação — ele não envia ordens, não recomenda entradas e não é consultoria de investimento. Você continua operando normalmente pela sua corretora ou mesa proprietária.',
  },
  {
    question: 'Quais plataformas e mesas o Fortify suporta hoje?',
    answer: `Contas MT5 (MetaTrader 5), conectadas via gateway dedicado. A Biblioteca de Mesas cobre ${CATALOG_FIRM_COUNT} mesas proprietárias, entre elas ${catalogFirmsWithLogo.slice(0, 5).join(', ')} e outras. Cada uma tem regras auditadas por conta e por modelo.`,
  },
  {
    question: 'E se a minha mesa não estiver no catálogo?',
    answer:
      'Você pode cadastrar a conta manualmente e configurar as regras específicas dela. A Biblioteca acelera esse processo para as mesas já mapeadas.',
  },
  {
    question: 'Minhas credenciais MT5 ficam expostas no navegador?',
    answer:
      'Não. O frontend nunca guarda nem envia o token do MetaApi diretamente — só o gateway do Fortify se comunica com o MetaApi, e cada chamada é revalidada contra a sua sessão autenticada no Supabase.',
  },
  {
    question: 'Com que frequência os dados da conta são atualizados?',
    answer:
      'A sincronização roda continuamente pelo gateway. Cada conta mostra no painel o horário da última sincronização, para você saber se está vendo um dado atual ou atrasado antes de decidir algo com base nele.',
  },
  {
    question: 'Posso cancelar quando quiser?',
    answer:
      'Sim. O gerenciamento da assinatura — incluindo troca de plano e cancelamento — fica disponível dentro da própria plataforma, na página de assinatura, depois de entrar na sua conta.',
  },
];

/** Casca das páginas internas de marketing, no visual da landing. */
export function LandingSubPage({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <CinematicSubPage eyebrow={eyebrow} title={title} description={description}>
      {children}
    </CinematicSubPage>
  );
}

/**
 * Existe para a landing longa mostrar um recorte e a página de Recursos
 * mostrar tudo: sem isso as duas URLs teriam o mesmo conteúdo inteiro, o que
 * é conteúdo duplicado e manutenção em dobro.
 */
export function FeaturesSection() {
  return (
    <Section className="pt-4">
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {features.map(({ icon: Icon, title, description }, index) => (
          <Reveal as="li" key={title} delay={index * 0.06}>
            <GlassCard className="transition-transform duration-300 hover:-translate-y-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 ring-1 ring-white/10">
                <Icon className="h-4 w-4 text-zinc-300" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-[15px] font-semibold text-white">{title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-400">{description}</p>
            </GlassCard>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

export function FaqSection() {
  return (
    <Section className="max-w-3xl pt-4">
      <Reveal>
        <GlassCard innerClassName="px-5 py-2 sm:px-7 sm:py-3">
          <Accordion type="single" collapsible>
            {faqItems.map((item, index) => (
              <AccordionItem
                key={item.question}
                value={`item-${index}`}
                className="border-white/10 last:border-b-0"
              >
                <AccordionTrigger className="text-left text-[15px] font-semibold text-white hover:no-underline [&>svg]:text-zinc-400">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-[13.5px] leading-relaxed text-zinc-400">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </GlassCard>
      </Reveal>
    </Section>
  );
}

export function FinalCtaSection() {
  return (
    <FinalCta
      title="Acompanhe os limites antes da próxima operação"
      body="Conecte sua conta MT5 e vincule as regras da sua mesa para acompanhar seus limites."
      tracking={{ primary: 'final_cta', secondary: 'final_secondary', location: 'cta_final' }}
    />
  );
}
