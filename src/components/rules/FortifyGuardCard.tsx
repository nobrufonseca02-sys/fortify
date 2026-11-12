import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, KeyRound, MonitorSmartphone, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { gatewayBaseUrl, gatewayJsonHeaders } from '@/lib/gateway';
import { isExplicitRuleValue } from '@/lib/ruleEngine/ruleEngineTypes';
import type { AccountRuleBindingRow } from '@/lib/ruleBinding';

// Fortify Guard: o EA do MT5 que mostra ao vivo as regras desta conta.
// Aqui o trader escolhe quais regras da mesa aparecem no EA, gera a chave e
// baixa o EA. O cálculo ao vivo acontece no gateway + EA (services/metaapi-gateway/src/eaFeed.ts).

export const GUARD_RULE_KEYS = [
  'daily_loss',
  'max_drawdown',
  'profit_target',
  'consistency',
  'min_trading_days',
  'news',
  'weekend',
  'overnight',
  'max_lots',
] as const;
export type GuardRuleKey = (typeof GUARD_RULE_KEYS)[number];

interface GuardOption {
  key: GuardRuleKey;
  label: string;
  hint: string;
  officialText: string;
  live: boolean;
}

export function guardOptionsFromBinding(binding: AccountRuleBindingRow): GuardOption[] {
  const rules = binding.rule_snapshot.criticalRules;
  const lots = isExplicitRuleValue(rules.maxLots) ? rules.maxLots : rules.maxContracts;
  const all: GuardOption[] = [
    { key: 'daily_loss', label: 'Perda diária', hint: 'Equity mínima do dia e folga até o limite', officialText: rules.dailyLoss, live: true },
    { key: 'max_drawdown', label: 'Drawdown máximo', hint: 'Piso da conta, inclusive trailing', officialText: rules.maxLoss, live: true },
    {
      key: 'profit_target',
      label: 'Meta de lucro',
      hint: 'Quanto falta para concluir a fase',
      officialText: rules.phases.map((phase) => `${phase.label}: ${phase.profitTarget}`).join(' · '),
      live: true,
    },
    { key: 'consistency', label: 'Consistência', hint: 'Teto de lucro de hoje para não concentrar no melhor dia', officialText: rules.consistencyRule, live: true },
    { key: 'min_trading_days', label: 'Dias mínimos', hint: 'Dias operados contra o exigido', officialText: rules.minTradingDays, live: true },
    { key: 'news', label: 'Notícias', hint: 'Lembrete fixo no painel', officialText: rules.newsRule, live: false },
    { key: 'weekend', label: 'Fim de semana', hint: 'Lembrete fixo no painel', officialText: rules.weekendRule, live: false },
    { key: 'overnight', label: 'Overnight', hint: 'Lembrete fixo no painel', officialText: rules.overnightRule, live: false },
    { key: 'max_lots', label: 'Tamanho máximo', hint: 'Lembrete fixo no painel', officialText: lots, live: false },
  ];
  // Lembrete sem texto oficial não tem o que mostrar: fica fora da lista.
  return all.filter((option) => option.live || isExplicitRuleValue(option.officialText));
}

interface TokenRow {
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
  bound_mt5_login: string | null;
}

function timeAgo(iso: string | null) {
  if (!iso) return null;
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (seconds < 90) return 'agora há pouco';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `há ${hours} h`;
  return `há ${Math.round(hours / 24)} dias`;
}

const THRESHOLDS = [
  { warning: 60, critical: 80, label: 'Cedo (60% e 80%)' },
  { warning: 70, critical: 85, label: 'Padrão (70% e 85%)' },
  { warning: 80, critical: 90, label: 'Tarde (80% e 90%)' },
];

export function FortifyGuardCard({ accountId, binding }: { accountId: string; binding: AccountRuleBindingRow }) {
  const { user, session } = useAuth();
  const options = useMemo(() => guardOptionsFromBinding(binding), [binding]);
  const [selected, setSelected] = useState<Set<GuardRuleKey>>(() => new Set(options.map((option) => option.key)));
  const [thresholds, setThresholds] = useState(THRESHOLDS[1]);
  const [token, setToken] = useState<TokenRow | null>(null);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [prefRes, tokenRes] = await Promise.all([
        supabase
          .from('ea_rule_preferences' as any)
          .select('rule_keys, warning_pct, critical_pct')
          .eq('trading_account_id', accountId)
          .maybeSingle() as any,
        supabase
          .from('ea_access_tokens' as any)
          .select('token_prefix, created_at, last_used_at, bound_mt5_login')
          .eq('trading_account_id', accountId)
          .is('revoked_at', null)
          .maybeSingle() as any,
      ]);
      if (cancelled) return;
      if (prefRes.error || tokenRes.error) {
        // Tabelas ainda não criadas neste ambiente: o cartão explica em vez de quebrar.
        setUnavailable(true);
        setLoading(false);
        return;
      }
      if (prefRes.data && Array.isArray(prefRes.data.rule_keys)) {
        const keys = (prefRes.data.rule_keys as string[]).filter((key): key is GuardRuleKey =>
          (GUARD_RULE_KEYS as readonly string[]).includes(key),
        );
        setSelected(new Set(keys));
        const match = THRESHOLDS.find(
          (option) => option.warning === Number(prefRes.data.warning_pct) && option.critical === Number(prefRes.data.critical_pct),
        );
        if (match) setThresholds(match);
      }
      setToken(tokenRes.data?.token_prefix ? (tokenRes.data as TokenRow) : null);
      setLoading(false);
    })().catch(() => {
      if (cancelled) return;
      setUnavailable(true);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const savePreferences = async (nextSelected: Set<GuardRuleKey>, nextThresholds = thresholds) => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await (supabase.from('ea_rule_preferences' as any).upsert({
      trading_account_id: accountId,
      user_id: user.id,
      rule_keys: GUARD_RULE_KEYS.filter((key) => nextSelected.has(key)),
      warning_pct: nextThresholds.warning,
      critical_pct: nextThresholds.critical,
      updated_at: new Date().toISOString(),
    }) as any);
    setSaving(false);
    if (error) {
      toast({ title: 'Não foi possível salvar', description: error.message, variant: 'destructive' });
    }
  };

  const toggle = (key: GuardRuleKey, enabled: boolean) => {
    const next = new Set(selected);
    if (enabled) next.add(key);
    else next.delete(key);
    setSelected(next);
    void savePreferences(next);
  };

  const changeThresholds = (index: number) => {
    const next = THRESHOLDS[index];
    setThresholds(next);
    void savePreferences(selected, next);
  };

  const generateToken = async () => {
    if (!session?.access_token) return;
    if (token && !window.confirm('Gerar uma chave nova desliga a chave atual. O EA vai precisar da chave nova. Continuar?')) return;
    setGenerating(true);
    try {
      const response = await fetch(`${gatewayBaseUrl()}/ea/token`, {
        method: 'POST',
        headers: gatewayJsonHeaders(session.access_token),
        body: JSON.stringify({ tradingAccountId: accountId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Não foi possível gerar a chave.');
      setFreshToken(body.token);
      setCopied(false);
      setToken({ token_prefix: body.prefix, created_at: new Date().toISOString(), last_used_at: null, bound_mt5_login: null });
    } catch (error: any) {
      toast({ title: 'Chave não gerada', description: error?.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const copyToken = async () => {
    if (!freshToken) return;
    try {
      await navigator.clipboard.writeText(freshToken);
      setCopied(true);
    } catch {
      toast({ title: 'Copie manualmente', description: 'Selecione a chave e copie com Ctrl+C.' });
    }
  };

  const connectedAgo = timeAgo(token?.last_used_at ?? null);
  const gatewayUrl = gatewayBaseUrl();

  return (
    <section className="rounded-xl border border-primary/30 bg-card p-5 space-y-5" aria-labelledby="fortify-guard-title">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
            <MonitorSmartphone className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h2 id="fortify-guard-title" className="text-sm font-semibold text-foreground">
              Fortify Guard no MetaTrader 5
            </h2>
            <p className="mt-1 max-w-xl text-xs text-muted-foreground">
              As regras da {binding.rule_snapshot.propFirm.name} ao vivo no seu gráfico: quanto falta para cada limite, aviso antes de
              estourar e um botão para fechar as posições. O EA não opera sozinho.
            </p>
          </div>
        </div>
        {token && (
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              connectedAgo ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${connectedAgo ? 'bg-success' : 'bg-muted-foreground'}`} />
            {connectedAgo ? `EA conectado ${connectedAgo}` : 'EA ainda não conectado'}
          </span>
        )}
      </div>

      {unavailable ? (
        <p className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-muted-foreground">
          O Fortify Guard está sendo ativado neste ambiente. Volte em alguns minutos.
        </p>
      ) : (
        <>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Regras que aparecem no EA</p>
            <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
              {options.map((option) => (
                <li key={option.key} className="flex items-start justify-between gap-4 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {option.label}
                      {!option.live && <span className="ml-2 text-[10px] font-normal uppercase tracking-wider text-muted-foreground">lembrete</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{option.hint}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground/80">Regra oficial: {option.officialText || 'não informada'}</p>
                  </div>
                  <Switch
                    checked={selected.has(option.key)}
                    onCheckedChange={(checked) => toggle(option.key, checked)}
                    disabled={loading}
                    aria-label={`Mostrar ${option.label} no EA`}
                  />
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Regra que a mesa escreve de um jeito que não dá para calcular com segurança aparece no EA como texto, nunca como número
              estimado.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quando avisar</p>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Quando avisar">
              {THRESHOLDS.map((option, index) => (
                <button
                  key={option.label}
                  type="button"
                  role="radio"
                  aria-checked={thresholds === option}
                  onClick={() => changeThresholds(index)}
                  disabled={loading}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    thresholds === option ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {option.label}
                </button>
              ))}
              {saving && <span className="self-center text-[11px] text-muted-foreground">salvando...</span>}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-background/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Instalar em 4 passos</p>
            <ol className="space-y-3 text-xs text-muted-foreground">
              <li>
                <span className="font-semibold text-foreground">1. Baixe o EA</span> e, no MT5, abra Arquivo &gt; Abrir pasta de dados &gt;
                MQL5 &gt; Experts e cole o arquivo lá.
                <div className="mt-2">
                  <Button asChild size="sm" variant="outline" className="gap-2">
                    <a href="/downloads/FortifyGuard.ex5" download>
                      <Download className="h-3.5 w-3.5" />
                      Baixar FortifyGuard.ex5
                    </a>
                  </Button>
                </div>
              </li>
              <li>
                <span className="font-semibold text-foreground">2. Libere o Fortify no MT5:</span> Ferramentas &gt; Opções &gt; Expert
                Advisors, marque "Permitir WebRequest para as URLs listadas" e adicione{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">{gatewayUrl}</code>
              </li>
              <li>
                <span className="font-semibold text-foreground">3. Gere a chave desta conta</span> e copie.
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={generateToken} disabled={generating || loading} className="gap-2">
                    {generating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                    {token ? 'Gerar chave nova' : 'Gerar chave do EA'}
                  </Button>
                  {token && !freshToken && (
                    <span className="text-[11px] text-muted-foreground">
                      Chave ativa {token.token_prefix}... {token.bound_mt5_login ? `· presa à conta MT5 ${token.bound_mt5_login}` : ''}
                    </span>
                  )}
                </div>
                {freshToken && (
                  <div className="mt-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
                    <div className="flex items-center gap-2">
                      <code className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">{freshToken}</code>
                      <Button size="sm" variant="outline" onClick={copyToken} className="shrink-0 gap-1.5">
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? 'Copiada' : 'Copiar'}
                      </Button>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Esta chave aparece só agora. Ela só lê as regras desta conta e fica presa à primeira conta MT5 que usar.
                    </p>
                  </div>
                )}
              </li>
              <li>
                <span className="font-semibold text-foreground">4. Arraste o FortifyGuard para o gráfico</span>, cole a chave no campo "Chave
                do EA" e confirme. O painel aparece no canto do gráfico.
              </li>
            </ol>
          </div>

          <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            O EA só roda no MT5 para computador. Confira se a sua mesa permite EAs de gerenciamento antes de usar na conta financiada.
          </p>
        </>
      )}
    </section>
  );
}
