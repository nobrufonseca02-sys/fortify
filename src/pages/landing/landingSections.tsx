import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
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
  AUTH_SIGNUP_PATH,
  PublicFooter,
  PublicPageHeader,
  PublicShell,
  ScrollReveal,
  trackCta,
} from '@/components/landing/PublicShell';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { propFirmFilterOptions } from '@/data/propFirmRules';
import { firmLogos } from '@/data/firmLogos';

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
      'Informe as credenciais da corretora e o Fortify autentica sua conta MT5 através de um gateway dedicado — o token do MetaApi nunca fica no navegador, só no serviço de backend.',
  },
  {
    step: '2',
    icon: ShieldCheck,
    title: 'Vincule as regras da sua mesa',
    description:
      'Escolha a mesa proprietária, o modelo e o tamanho de conta na Biblioteca de Mesas. O Fortify grava um snapshot versionado e auditável das regras que passam a valer para aquela conta — nada é assumido silenciosamente.',
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
      'Quando uma regra se aproxima do limite, o status muda de forma visível — texto, ícone e cor juntos, nunca só a cor — para você decidir a próxima ação com tempo de sobra.',
  },
];

const features = [
  {
    icon: ShieldCheck,
    title: 'Vinculação de regras auditada',
    description:
      'Cada conta guarda um snapshot versionado e com hash de qual regra estava valendo — nunca um "provavelmente era assim".',
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
      'Simule tamanho de posição e distância até o limite de perda antes de entrar — não depois de já ter violado a regra.',
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
    answer: `Contas MT5 (MetaTrader 5), conectadas via gateway dedicado. A Biblioteca de Mesas já cobre ${CATALOG_FIRM_COUNT} mesas proprietárias, entre elas ${catalogFirmsWithLogo.slice(0, 5).join(', ')} e outras — cada uma com suas regras auditadas por conta e por modelo.`,
  },
  {
    question: 'E se a minha mesa não estiver no catálogo?',
    answer:
      'Você ainda pode cadastrar a conta manualmente e configurar as regras específicas dela — a Biblioteca acelera o processo para as mesas já mapeadas, mas não é a única forma de conectar uma conta.',
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


/**
 * Casca das páginas internas de marketing. Toda a estrutura (tema claro,
 * navbar, rodapé, cabeçalho editorial) mora em PublicShell — aqui fica só a
 * composição, para as páginas antigas continuarem com a mesma assinatura.
 */
export function LandingSubPage({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <PublicShell>
      <PublicPageHeader eyebrow={eyebrow} title={title} description={description} />
      {children}
    </PublicShell>
  );
}

/** Mantido como reexport: várias páginas já importam LandingFooter daqui. */
export const LandingFooter = PublicFooter;

/**
 *  existe para a landing longa mostrar um recorte e a página de
 * Recursos mostrar tudo: sem isso as duas URLs teriam o mesmo conteúdo
 * inteiro, o que é conteúdo duplicado e manutenção em dobro.
 */
export function FeaturesSection() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {features.map(({ icon: Icon, title, description }) => (
          <ScrollReveal key={title}>
            <div className="h-full rounded-lg border border-border bg-card/60 p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}

export function FaqSection() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <ScrollReveal>
        <Accordion type="single" collapsible className="rounded-lg border border-border bg-card/60 px-5">
          {faqItems.map((item, index) => (
            <AccordionItem key={item.question} value={`item-${index}`} className="border-border">
              <AccordionTrigger className="text-left text-sm text-foreground hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollReveal>
    </section>
  );
}

export function FinalCtaSection() {
  const navigate = useNavigate();

  return (
    <section className="mx-auto max-w-7xl px-5 pb-14 pt-4 sm:px-8">
      <ScrollReveal>
        <div className="hero-surface flex flex-col items-center gap-5 p-8 text-center sm:p-12">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <h2 className="display-editorial-sm max-w-2xl text-foreground">
            Pare de descobrir a violação depois que ela já aconteceu
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            Conecte sua conta MT5, vincule as regras da sua mesa e comece a monitorar em minutos.
          </p>
          <button
            type="button"
            onClick={() => {
              trackCta('final_cta', 'cta_final', AUTH_SIGNUP_PATH);
              navigate(AUTH_SIGNUP_PATH);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(24,24,27,0.16)] transition-colors hover:bg-zinc-800"
          >
            Criar conta grátis
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </ScrollReveal>
    </section>
  );
}

