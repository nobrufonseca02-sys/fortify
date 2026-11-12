import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Check, Copy, Download, KeyRound, Lock, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionPlan } from '@/hooks/useSubscriptionPlan';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { setPendingAccountLogin } from '@/lib/guardAccount';
import { gatewayBaseUrl, gatewayJsonHeaders } from '@/lib/gateway';
import { eaAccountStatus } from '@/lib/guardStatus';

// Fortify Guard: o EA do MT5 que mostra as regras da mesa ao vivo e alimenta o
// Fortify com tudo o que o trader opera. Esta página entrega o EA (só para quem
// assina a partir do Beginner), a chave única do trader e o status de cada conta.

const POLL_MS = 15_000;

interface GuardAccount {
  id: string;
  nickname: string;
  mt5_login: string | null;
  ea_status: 'pending' | 'linked' | null;
  ea_last_seen_at: string | null;
  firm: string | null;
  model: string | null;
}

interface TokenRow {
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

function timeAgo(iso: string | null, now = Date.now()) {
  if (!iso) return 'nunca';
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (seconds < 60) return `há ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `há ${hours} h`;
  return `há ${Math.round(hours / 24)} dias`;
}

const TONE_CLASSES = {
  ok: 'bg-success/10 text-success',
  wait: 'bg-warning/10 text-warning',
  off: 'bg-muted text-muted-foreground',
};
const DOT_CLASSES = { ok: 'bg-success', wait: 'bg-warning', off: 'bg-muted-foreground' };

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: 'Copie manualmente', description: 'Selecione o texto e use Ctrl+C.' });
    }
  };
  return (
    <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
      <code className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">{value}</code>
      <button
        type="button"
        onClick={copy}
        aria-label={label}
        className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  );
}

/**
 * Conta aguardando o EA: o trader pode dizer qual login MT5 ela é. Necessário
 * quando há mais de uma aguardando e o EA não consegue saber sozinho.
 */
function PendingLoginField({
  userId,
  account,
  onSaved,
}: {
  userId: string;
  account: GuardAccount;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(account.mt5_login ?? '');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const login = await setPendingAccountLogin({ userId, tradingAccountId: account.id, login: value });
      toast({ title: 'Login salvo', description: `O EA aberto na conta ${login} vai se ligar a "${account.nickname}".` });
      onSaved();
    } catch (error: any) {
      toast({ title: 'Login não salvo', description: error?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };
  return (
    <form
      className="flex items-center gap-1.5"
      onClick={(event) => event.stopPropagation()}
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        inputMode="numeric"
        placeholder="Login MT5"
        aria-label={`Login MT5 da conta ${account.nickname}`}
        className="h-8 w-32 font-mono text-xs"
      />
      <Button type="submit" size="sm" variant="outline" className="h-8" disabled={saving || !value.trim() || value.trim() === account.mt5_login}>
        {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Salvar'}
      </Button>
    </form>
  );
}

export default function FortifyGuardPage() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { hasActivePlan, isLoading: planLoading } = useSubscriptionPlan();
  const [accounts, setAccounts] = useState<GuardAccount[]>([]);
  const [token, setToken] = useState<TokenRow | null>(null);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [accountsRes, bindingsRes, tokenRes] = await Promise.all([
      supabase
        .from('trading_accounts' as any)
        .select('id, nickname, mt5_login, ea_status, ea_last_seen_at, created_at')
        .eq('user_id', user.id)
        .not('ea_status', 'is', null)
        .order('created_at', { ascending: true }) as any,
      supabase
        .from('account_rule_bindings' as any)
        .select('trading_account_id, rule_snapshot')
        .eq('user_id', user.id)
        .eq('binding_status', 'active') as any,
      supabase
        .from('ea_access_tokens' as any)
        .select('token_prefix, created_at, last_used_at')
        .eq('user_id', user.id)
        .is('revoked_at', null)
        .maybeSingle() as any,
    ]);
    const bindings = new Map<string, any>(
      ((bindingsRes.data ?? []) as any[]).map((row) => [row.trading_account_id, row.rule_snapshot]),
    );
    setAccounts(
      ((accountsRes.data ?? []) as any[]).map((row) => {
        const snapshot = bindings.get(row.id);
        return {
          id: row.id,
          nickname: row.nickname,
          mt5_login: row.mt5_login || null,
          ea_status: row.ea_status,
          ea_last_seen_at: row.ea_last_seen_at,
          firm: snapshot?.propFirm?.name ?? null,
          model: snapshot ? `${snapshot.program?.name ?? ''} · ${snapshot.accountSize?.label ?? ''}` : null,
        };
      }),
    );
    setToken(tokenRes.data?.token_prefix ? (tokenRes.data as TokenRow) : null);
    setNow(Date.now());
  }, [user?.id]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const download = async () => {
    if (!session?.access_token) return;
    setDownloading(true);
    try {
      const response = await fetch(`${gatewayBaseUrl()}/ea/download`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || 'Não foi possível baixar o EA agora.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'FortifyGuard.ex5';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({ title: 'Download não concluído', description: error?.message, variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const generateToken = async () => {
    if (!session?.access_token) return;
    if (token && !window.confirm('Gerar uma chave nova desliga a atual. Os EAs que usam a chave antiga vão pedir a nova. Continuar?')) return;
    setGenerating(true);
    try {
      const response = await fetch(`${gatewayBaseUrl()}/ea/token`, {
        method: 'POST',
        headers: gatewayJsonHeaders(session.access_token),
        body: JSON.stringify({}),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Não foi possível gerar a chave.');
      setFreshToken(body.token);
      setToken({ token_prefix: body.prefix, created_at: new Date().toISOString(), last_used_at: null });
    } catch (error: any) {
      toast({ title: 'Chave não gerada', description: error?.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const locked = !planLoading && !hasActivePlan;
  const gatewayUrl = gatewayBaseUrl();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="display-editorial-sm text-foreground">Fortify Guard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Regras da mesa ao vivo no MT5.</p>
      </header>

      <div className="relative">
        <div
          className={`grid gap-4 md:grid-cols-3 ${locked ? 'pointer-events-none select-none opacity-40 blur-[2px]' : ''}`}
          aria-hidden={locked}
        >
          <section className="rounded-xl border border-border bg-card p-5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">1</span>
            <h2 className="mt-3 text-sm font-semibold text-foreground">Baixe</h2>
            <p className="mt-1.5 text-xs text-muted-foreground">Cole em MQL5 &gt; Experts.</p>
            <Button className="mt-4 gap-2" onClick={download} disabled={downloading || locked}>
              {downloading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Baixar para Windows
            </Button>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">2</span>
            <h2 className="mt-3 text-sm font-semibold text-foreground">Libere</h2>
            <p className="mt-1.5 text-xs text-muted-foreground">Opções &gt; Expert Advisors &gt; WebRequest:</p>
            <CopyField value={gatewayUrl} label="Copiar endereço do Fortify" />
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">3</span>
            <h2 className="mt-3 text-sm font-semibold text-foreground">Cole a chave</h2>
            <p className="mt-1.5 text-xs text-muted-foreground">Uma chave para todas as contas.</p>
            {freshToken ? (
              <>
                <CopyField value={freshToken} label="Copiar chave do EA" />
                <p className="mt-2 text-[11px] text-muted-foreground">Aparece só agora.</p>
              </>
            ) : token ? (
              <p className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
                {token.token_prefix}············ ativa
              </p>
            ) : null}
            <Button variant={token ? 'outline' : 'default'} className="mt-3 gap-2" onClick={generateToken} disabled={generating || locked}>
              {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {token ? 'Gerar chave nova' : 'Gerar minha chave'}
            </Button>
          </section>
        </div>

        {locked && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl">
            <div className="max-w-md rounded-xl border border-border bg-background/90 p-6 text-center shadow-xl">
              <Lock className="mx-auto h-8 w-8 text-primary" aria-hidden />
              <h2 className="mt-3 text-lg font-semibold text-foreground">A partir do Beginner</h2>
              <Button className="mt-4" onClick={() => navigate('/pricing')}>
                Ver planos
              </Button>
            </div>
          </div>
        )}
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Contas</h2>
        </div>
        {accounts.length === 0 ? (
          <div className="mt-4 flex flex-col items-start gap-3 rounded-lg border border-dashed border-border p-5">
            <p className="text-sm text-muted-foreground">Nenhuma conta. Crie pela Biblioteca.</p>
            <Button variant="outline" className="gap-2" onClick={() => navigate('/')}>
              <BookOpen className="h-4 w-4" />
              Biblioteca
            </Button>
          </div>
        ) : (
          <>
          {accounts.filter((account) => account.ea_status === 'pending').length > 1 && (
            <p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
              Várias aguardando: informe o login de cada uma.
            </p>
          )}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Conta</th>
                  <th className="py-2 pr-3 font-medium">Modelo</th>
                  <th className="py-2 pr-3 font-medium">Login</th>
                  <th className="py-2 pr-3 font-medium">EA</th>
                  <th className="py-2 font-medium">Último sinal</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => {
                  const status = eaAccountStatus(account, now);
                  return (
                    <tr
                      key={account.id}
                      className="cursor-pointer border-t border-border hover:bg-muted/30"
                      onClick={() => navigate(`/accounts/${account.id}/rules`)}
                    >
                      <td className="py-3 pr-3 font-medium text-foreground">{account.nickname}</td>
                      <td className="py-3 pr-3 text-foreground">{account.firm ? `${account.firm} · ${account.model}` : 'Mesa não escolhida'}</td>
                      <td className="py-3 pr-3 text-muted-foreground">
                        {account.ea_status === 'pending' && user?.id ? (
                          <PendingLoginField userId={user.id} account={account} onSaved={() => void load()} />
                        ) : (
                          account.mt5_login || 'aguardando'
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONE_CLASSES[status.tone]}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[status.tone]}`} />
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground">{timeAgo(account.ea_last_seen_at, now)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </div>
  );
}
