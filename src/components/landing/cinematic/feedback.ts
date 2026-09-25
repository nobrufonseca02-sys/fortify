/**
 * Cards do carrossel de feedback.
 *
 * Enquanto não houver depoimentos verificados, a lista só tem mensagens de
 * demonstração: sem nome, foto, nota ou resultado financeiro. Para publicar
 * um depoimento real, use `kind: 'verificado'` com `author`, `rating` e
 * `source` — só depoimentos com consentimento registrado. Nesse caso o card
 * mostra iniciais (ou a foto autorizada), as estrelas e a fonte da avaliação.
 *
 * Exemplo de depoimento real:
 * {
 *   id: 'trustpilot-2026-10-01-ana',
 *   kind: 'verificado',
 *   message: 'Texto exatamente como o cliente escreveu.',
 *   context: 'Conta FTMO 100k',
 *   rating: 5,
 *   author: { name: 'Ana S.', avatarSrc: '/depoimentos/ana.jpg' }, // foto só com autorização
 *   source: { name: 'Trustpilot', url: 'https://www.trustpilot.com/review/...' },
 * }
 */
export type FeedbackSource = {
  /** Onde a avaliação foi publicada (ex.: Trustpilot, Google). */
  name: string;
  /** Link para a avaliação original, para qualquer visitante conferir. */
  url?: string;
  /** Logo da plataforma — só quando a avaliação veio mesmo de lá. */
  logoSrc?: string;
};

export type FeedbackItem = {
  id: string;
  kind: 'demonstracao' | 'verificado';
  message: string;
  context: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  author?: { name: string; role?: string; avatarSrc?: string };
  source?: FeedbackSource;
};

export const FEEDBACK_ITEMS: FeedbackItem[] = [
  {
    id: 'demo-antes-da-ordem',
    kind: 'demonstracao',
    message: 'A folga do limite diário aparece antes de abrir a ordem, não depois do stop.',
    context: 'Recurso · Calculadora de Risco',
  },
  {
    id: 'demo-regra-vinculada',
    kind: 'demonstracao',
    message: 'A conta fica ligada à versão da regra do programa contratado.',
    context: 'Recurso · Vínculo de regras',
  },
  {
    id: 'demo-varias-contas',
    kind: 'demonstracao',
    message: 'Cada conta MT5 aparece com o próprio estado, sem misturar limites.',
    context: 'Recurso · Painel de contas',
  },
  {
    id: 'demo-sem-dados',
    kind: 'demonstracao',
    message: 'Sem conexão, a conta aparece como “sem dados” em vez de parecer segura.',
    context: 'Recurso · Saúde da conta',
  },
  {
    id: 'demo-biblioteca',
    kind: 'demonstracao',
    message: 'O programa escolhido na biblioteca segue direto para o vínculo da conta.',
    context: 'Recurso · Biblioteca de mesas',
  },
  {
    id: 'demo-lote',
    kind: 'demonstracao',
    message: 'Com o risco por operação definido, o lote sai da distância do stop.',
    context: 'Recurso · Calculadora de Risco',
  },
];

/** Só depoimento real, com autor e nota, pode exibir estrelas e nome. */
export function isVerified(item: FeedbackItem): item is FeedbackItem & {
  author: NonNullable<FeedbackItem['author']>;
  rating: NonNullable<FeedbackItem['rating']>;
} {
  return item.kind === 'verificado' && Boolean(item.author?.name) && typeof item.rating === 'number';
}
