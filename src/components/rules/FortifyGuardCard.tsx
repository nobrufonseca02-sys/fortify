import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MonitorSmartphone, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { eaAccountStatus } from '@/lib/guardStatus';
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

interface EaAccountRow {
  ea_status: string | null;
  ea_last_seen_at: string | null;
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
  const { user } = useAuth();
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
  const [eaAccount, setEaAccount] = useState<EaAccountRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [prefRes, accountRes] = await Promise.all([
        supabase
          .from('ea_rule_preferences' as any)
          .select('rule_keys, warning_pct, critical_pct, account_stage')
          .eq('trading_account_id', accountId)
          .maybeSingle() as any,
        supabase
          .from('trading_accounts' as any)
          .select('ea_status, ea_last_seen_at')
          .eq('id', accountId)
          .maybeSingle() as any,
      ]);
      if (cancelled) return;
      if (prefRes.error) {
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
      setEaAccount(accountRes.data && 'ea_status' in accountRes.data ? (accountRes.data as EaAccountRow) : null);
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

  const eaStatus = eaAccount?.ea_status ? eaAccountStatus(eaAccount) : null;
  const eaLastSeen = timeAgo(eaAccount?.ea_last_seen_at ?? null);

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
        {eaStatus && (
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              eaStatus.tone === 'ok' ? 'bg-success/10 text-success' : eaStatus.tone === 'wait' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${eaStatus.tone === 'ok' ? 'bg-success' : eaStatus.tone === 'wait' ? 'bg-warning' : 'bg-muted-foreground'}`} />
            {eaStatus.label}
            {eaStatus.tone === 'ok' && eaLastSeen ? ` · ${eaLastSeen}` : ''}
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

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              O download do EA, a chave e o passo a passo de instalação ficam na página Fortify Guard. Uma instalação serve para todas as
              suas contas.
            </p>
            <Link to="/fortify-guard" className="pill-btn shrink-0 text-xs">
              Abrir Fortify Guard
            </Link>
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
