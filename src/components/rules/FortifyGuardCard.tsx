import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, KeyRound, MonitorSmartphone, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { gatewayBaseUrl, gatewayJsonHeaders } from '@/lib/gateway';
import {
  defaultGuardRuleKeys,
  guardRuleOptions,
  inferStage,
  isGuardRuleKey,
  type AccountStage,
  type GuardGroup,
  type GuardRuleKey,
} from '@/lib/ruleEngine/guardRules';
import type { AccountRuleBindingRow } from '@/lib/ruleBinding';

// Fortify Guard: o EA do MT5 que mostra ao vivo as regras desta conta.
// Aqui o trader informa a fase da conta, escolhe quais regras da mesa aparecem
// no EA, gera a chave e baixa o EA. As opções e os padrões vêm do mesmo módulo
// que o gateway usa (services/metaapi-gateway/src/ruleEngine/guardRules.ts).

const GROUPS: Array<{ id: GuardGroup; title: string; hint: string; chip: string }> = [
  {
    id: 'account',
    title: 'Zeram a conta',
    hint: 'Quebrar qualquer uma encerra a conta. Recomendamos deixar todas ligadas.',
    chip: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
  {
    id: 'payout',
    title: 'Saque e metas',
    hint: 'Não encerram a conta, mas travam a aprovação ou o saque.',
    chip: 'border-warning/30 bg-warning/10 text-warning',
  },
  {
    id: 'reminder',
    title: 'Lembretes',
    hint: 'Aparecem como texto fixo no painel. Ficam desligados se você não ligar.',
    chip: 'border-border bg-muted text-muted-foreground',
  },
];

const STAGES: Array<{ id: AccountStage; label: string }> = [
  { id: 'evaluation', label: 'Avaliação' },
  { id: 'funded', label: 'Funded' },
];

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
  // null = ainda sem escolha salva: fase deduzida pelo programa e regras no padrão.
  const [stage, setStage] = useState<AccountStage | null>(null);
  const [explicitKeys, setExplicitKeys] = useState<Set<GuardRuleKey> | null>(null);
  const effectiveStage = stage ?? inferStage(binding.rule_snapshot);
  const options = useMemo(() => guardRuleOptions(binding.rule_snapshot, effectiveStage), [binding, effectiveStage]);
  const selected = useMemo(
    () => explicitKeys ?? new Set(defaultGuardRuleKeys(options)),
    [explicitKeys, options],
  );
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
          .select('rule_keys, warning_pct, critical_pct, account_stage')
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
      if (prefRes.data) {
        if (Array.isArray(prefRes.data.rule_keys)) {
          setExplicitKeys(new Set((prefRes.data.rule_keys as string[]).filter(isGuardRuleKey)));
        }
        if (prefRes.data.account_stage === 'evaluation' || prefRes.data.account_stage === 'funded') {
          setStage(prefRes.data.account_stage);
        }
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

  const savePreferences = async (
    nextKeys: Set<GuardRuleKey> | null,
    nextStage: AccountStage | null = stage,
    nextThresholds = thresholds,
  ) => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await (supabase.from('ea_rule_preferences' as any).upsert({
      trading_account_id: accountId,
      user_id: user.id,
      // null mantém o padrão por grupo, que acompanha a fase.
      rule_keys: nextKeys ? [...nextKeys] : null,
      account_stage: nextStage,
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
    setExplicitKeys(next);
    void savePreferences(next);
  };

  const changeStage = (next: AccountStage) => {
    setStage(next);
    void savePreferences(explicitKeys, next);
  };

  const changeThresholds = (index: number) => {
    const next = THRESHOLDS[index];
    setThresholds(next);
    void savePreferences(explicitKeys, stage, next);
  };

  const selectedCount = options.filter((option) => selected.has(option.key)).length;

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
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fase da conta</p>
            <div className="mt-2 inline-flex rounded-lg border border-border p-1" role="radiogroup" aria-label="Fase da conta">
              {STAGES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={effectiveStage === option.id}
                  onClick={() => changeStage(option.id)}
                  disabled={loading}
                  className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
                    effectiveStage === option.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              A fase muda quais regras valem: no funded entram a consistência do saque e as restrições da conta financiada; sai a meta de
              lucro.
              {stage === null && ' Deduzimos pela conta que você vinculou; troque se estiver em outra fase.'}
            </p>
          </div>

          {GROUPS.map((group) => {
            const groupOptions = options.filter((option) => option.group === group.id);
            if (groupOptions.length === 0) return null;
            return (
              <div key={group.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.title}</p>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{group.hint}</p>
                <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
                  {groupOptions.map((option) => (
                    <li key={option.key} className="flex items-start justify-between gap-4 p-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{option.label}</p>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${group.chip}`}>
                            {option.consequence}
                          </span>
                          {!option.live && (
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">só texto</span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">Regra oficial: {option.officialText || 'não informada'}</p>
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
              </div>
            );
          })}
          <p className="text-[11px] text-muted-foreground">
            {selectedCount} {selectedCount === 1 ? 'regra aparece' : 'regras aparecem'} no EA. Regra que a mesa escreve de um jeito que não
            dá para calcular com segurança aparece como texto, nunca como número estimado.
          </p>

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
