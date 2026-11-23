// Em que hora cada mesa vira o dia. A perda diária, o melhor dia e os dias operados
// dependem disso: contar em UTC erra a conta nas horas perto da virada.
//
// Só entra aqui o que a mesa publica (conferido nas fontes oficiais em 18/11/2026).
// Mesa sem horário publicado continua em UTC e o painel avisa que é estimativa.

export interface DayBoundary {
  /** O EA devolve este texto para dizer em qual calendário agrupou os dias. */
  token: string;
  mode: 'server' | 'zone' | 'utc';
  timezone: string | null;
  /** Minuto do dia, no fuso da mesa, em que o dia vira. */
  resetMinutes: number;
  /** false: a mesa não dá o horário exato, então o resultado sai como estimativa. */
  exact: boolean;
  note: string;
}

const server = (): DayBoundary => ({ token: 'server', mode: 'server', timezone: null, resetMinutes: 0, exact: true, note: '' });
const zone = (timezone: string, resetMinutes: number, exact: boolean, note = ''): DayBoundary => ({
  token: `${timezone}+${resetMinutes}`,
  mode: 'zone',
  timezone,
  resetMinutes,
  exact,
  note,
});

const UTC_BOUNDARY: DayBoundary = {
  token: 'utc',
  mode: 'utc',
  timezone: null,
  resetMinutes: 0,
  exact: false,
  note: 'A mesa não publica a hora da virada do dia: o Fortify conta em UTC.',
};

const FIRM_BOUNDARIES: Record<string, DayBoundary> = {
  // "recalculated daily at 00:00 CE(S)T" (ftmo.com/en/trading-objectives).
  ftmo: zone('Europe/Prague', 0, true),
  // 00:00 no horário do servidor MT5, publicado por cada mesa na central de ajuda.
  fundednext: server(),
  the5ers: server(),
  fundingpips: server(),
  'alpha-capital-group': server(),
  'e8-markets': server(),
  'hantec-trader': server(),
  // "5 PM EST": a mesa não diz se acompanha o horário de verão de Nova York.
  fxify: zone('America/New_York', 17 * 60, false, 'Virada do dia às 17h de Nova York: confirme no horário de verão.'),
  // "between 11:30 PM CET and 11:59 PM CET": é uma janela, não um horário exato.
  brightfunded: zone('Europe/Prague', 23 * 60 + 30, false, 'A mesa vira o dia entre 23h30 e 23h59 CET.'),
};

export function dayBoundaryForFirm(slug: string | null | undefined): DayBoundary {
  return FIRM_BOUNDARIES[String(slug ?? '')] ?? UTC_BOUNDARY;
}

function zoneOffsetMinutes(timezone: string, at: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  );
  const local = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((local - Math.floor(at.getTime() / 1000) * 1000) / 60_000);
}

const DAY_MS = 86_400_000;
const HISTORY_DAYS = 400;
const transitionCache = new Map<string, Array<[number, number]>>();

/**
 * Trocas de fuso do histórico: [instante em segundos UTC, minutos a somar ao UTC].
 * O EA usa a lista para datar certo as operações de antes do horário de verão.
 */
export function zoneTransitions(timezone: string, now: Date): Array<[number, number]> {
  const key = `${timezone}|${now.toISOString().slice(0, 10)}`;
  const cached = transitionCache.get(key);
  if (cached) return cached;

  const start = Math.floor((now.getTime() - HISTORY_DAYS * DAY_MS) / 1000) * 1000;
  let cursor = start;
  let offset = zoneOffsetMinutes(timezone, new Date(cursor));
  const result: Array<[number, number]> = [[Math.floor(start / 1000), offset]];
  while (cursor < now.getTime() + DAY_MS) {
    const next = cursor + DAY_MS;
    const nextOffset = zoneOffsetMinutes(timezone, new Date(next));
    if (nextOffset !== offset) {
      let low = cursor;
      let high = next;
      while (high - low > 1000) {
        const middle = Math.floor((low + high) / 2000) * 1000;
        if (zoneOffsetMinutes(timezone, new Date(middle)) === offset) low = middle;
        else high = middle;
      }
      result.push([Math.floor(high / 1000), nextOffset]);
      offset = nextOffset;
    }
    cursor = next;
  }
  transitionCache.clear();
  transitionCache.set(key, result);
  return result;
}

export interface EaDayState {
  boundary: DayBoundary;
  /** Chave do dia de hoje no calendário usado pelo histórico que o EA mandou. */
  today: string;
  /** O EA já agrupou o histórico no calendário da mesa. */
  aligned: boolean;
}

/** EA antigo manda os dias em UTC: nesse caso tudo continua em UTC. */
export function resolveEaDay(
  slug: string | null | undefined,
  live: { dayBasis?: string | null; dayToday?: string | null; now: Date },
): EaDayState {
  const boundary = dayBoundaryForFirm(slug);
  const utcToday = live.now.toISOString().slice(0, 10);
  const reported = String(live.dayToday ?? '');
  const reportedAt = /^\d{4}-\d{2}-\d{2}$/.test(reported) ? Date.parse(`${reported}T00:00:00.000Z`) : Number.NaN;
  const plausible = Number.isFinite(reportedAt) && Math.abs(reportedAt - Date.parse(`${utcToday}T00:00:00.000Z`)) <= DAY_MS;
  const aligned = boundary.mode !== 'utc' && live.dayBasis === boundary.token && plausible;
  return { boundary, today: aligned ? reported : utcToday, aligned };
}
