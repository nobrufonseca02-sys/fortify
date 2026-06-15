import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  Ban,
  CheckCircle2,
  CreditCard,
  Database,
  Loader2,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldOff,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { gatewayJsonHeaders } from '@/lib/gateway';

const gatewayUrl = () => import.meta.env.VITE_METAAPI_GATEWAY_URL || 'http://localhost:3001';

type AdminUser = {
  user_id: string;
  email: string;
  created_at: string;
  subscription_status: string | null;
  plan: string | null;
  plan_name: string | null;
  support_tier?: string | null;
  plan_family?: string | null;
  account_limit: number;
  connected_accounts_count: number;
  deployed_mt5_count?: number;
  suspension_pending_count?: number;
  paid_until?: string | null;
  last_payment_failed_at?: string | null;
  suspended_at?: string | null;
  suspension_reason?: string | null;
  account_limit_reached?: boolean;
  sync_error_count: number;
  last_sync_at: string | null;
  subscription?: AdminSubscription | null;
};

type AdminPlan = {
  id: string;
  name?: string | null;
  plan_name?: string | null;
  slug?: string | null;
  status?: string | null;
  active?: boolean | null;
  account_limit: number;
  support_tier?: string | null;
  billing_interval?: string | null;
  price_amount?: number | null;
  currency?: string | null;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
  stripe_product_id_status?: 'configured' | 'missing' | 'invalid';
  stripe_price_id_status?: 'configured' | 'missing' | 'invalid';
  has_stripe_price?: boolean;
  has_stripe_product?: boolean;
  display_order?: number | null;
  highlighted?: boolean | null;
  recommended_badge?: string | null;
};

type AdminSubscription = {
  id: string;
  user_id: string;
  plan_id: string;
  plan_name: string;
  status: string;
  account_limit: number;
  current_period_end: string | null;
  paid_until?: string | null;
  last_payment_failed_at?: string | null;
  suspended_at?: string | null;
  suspension_reason?: string | null;
  stripe_subscription_status?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  has_stripe_customer?: boolean;
  has_stripe_subscription?: boolean;
};

type AdminAccount = {
  id: string;
  user_email: string | null;
  account_name: string | null;
  mt5_login: string | null;
  mt5_server: string | null;
  broker_name: string | null;
  connection_status: string | null;
  sync_status: string | null;
  sync_error: string | null;
  suspended_at?: string | null;
  suspension_reason?: string | null;
  last_sync_at: string | null;
  rule_status: string | null;
  trading_account_nickname?: string | null;
};

type AdminRuleSet = {
  id: string;
  name: string;
  status: string;
  review_status: string;
  verified_at: string | null;
  source_url: string | null;
  source_notes: string | null;
  is_user_custom: boolean;
  rule_count: number;
  program?: { name: string; review_status?: string | null; account_size?: number | null; phase?: string | null } | null;
  prop_firm?: { name: string; slug?: string | null } | null;
};

type AdminSystemStatus = {
  gateway?: { ok: boolean; region: string; port: number };
  stripeConfigured?: boolean;
  stripeWebhookConfigured?: boolean;
  productPriceMappingComplete?: boolean;
  metaapiTokenConfigured?: boolean;
  supabaseConnected?: boolean;
  supabaseError?: string | null;
  env?: Record<string, boolean>;
};

const statusClass = (status?: string | null) => {
  const normalized = String(status || '').toLowerCase();
  if (['active', 'trialing', 'connected', 'success', 'verified', 'configured'].includes(normalized)) return 'bg-success/15 text-success border-0';
  if (['pending', 'running', 'connecting', 'syncing', 'needs_review', 'incomplete', 'missing', 'past_due', 'suspension_pending'].includes(normalized)) return 'bg-warning/15 text-warning border-0';
  if (['error', 'failed', 'auth_error', 'suspended', 'canceled', 'deprecated', 'invalid'].includes(normalized)) return 'bg-destructive/15 text-destructive border-0';
  return 'bg-muted text-muted-foreground border-0';
};

const statusLabel = (status?: string | null) => {
  const normalized = String(status || '').toLowerCase();
  const labels: Record<string, string> = {
    active: 'Ativo',
    trialing: 'Trial',
    connected: 'Conectada',
    success: 'Sucesso',
    verified: 'Oficial verificada',
    configured: 'Configurado',
    pending: 'Pendente',
    running: 'Em execução',
    connecting: 'Conectando',
    syncing: 'Sincronizando',
    needs_review: 'Precisa de revisão',
    incomplete: 'Incompleto',
    missing: 'Ausente',
    past_due: 'Pagamento pendente',
    suspension_pending: 'Suspensão pendente',
    error: 'Erro',
    failed: 'Falhou',
    auth_error: 'Falha de autenticação',
    suspended: 'Suspenso',
    canceled: 'Cancelado',
    deprecated: 'Descontinuado',
    invalid: 'Inválido',
    inactive: 'Inativo',
    none: 'Sem plano',
    custom: 'Personalizada',
    user_custom: 'Personalizada',
  };
  return labels[normalized] || status || 'Sem status';
};

const fmtDate = (value?: string | null) => {
  if (!value) return 'sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'sem data';
  return date.toLocaleString('pt-BR');
};

const fmtPrice = (value?: number | null) => {
  if (!value) return 'Sem preço';
  return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

async function adminFetch(path: string, token: string, options: RequestInit = {}) {
  const response = await fetch(`${gatewayUrl()}${path}`, {
    ...options,
    headers: {
      ...gatewayJsonHeaders(token),
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.details || body?.error || `Admin request failed (${response.status})`) as Error & {
      status?: number;
      body?: any;
    };
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

export default function AdminPage() {
  const { session } = useAuth();
  const { loading: roleLoading } = useUserRole();
  const token = session?.access_token || '';
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [rules, setRules] = useState<AdminRuleSet[]>([]);
  const [system, setSystem] = useState<AdminSystemStatus | null>(null);
  const [search, setSearch] = useState('');
  const [billingFilter, setBillingFilter] = useState('all');
  const [selectedPlans, setSelectedPlans] = useState<Record<string, string>>({});
  const [planForm, setPlanForm] = useState({
    id: '',
    name: '',
    slug: '',
    account_limit: '1',
    price_amount: '',
    billing_interval: 'month',
    currency: 'brl',
    support_tier: 'basic',
    stripe_product_id: '',
    stripe_price_id: '',
    display_order: '100',
    active: 'true',
  });
  const [ruleReview, setRuleReview] = useState<Record<string, { reviewStatus: string; sourceUrl: string; sourceNotes: string }>>({});

  const visibleUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !q || JSON.stringify(user).toLowerCase().includes(q);
      const matchesFilter =
        billingFilter === 'all' ||
        (billingFilter === 'priority' && ['priority', 'enterprise'].includes(String(user.support_tier || '').toLowerCase())) ||
        (billingFilter === 'enterprise' && String(user.plan_family || user.plan || '').toLowerCase().includes('enterprise')) ||
        (billingFilter === 'pro' && String(user.plan_family || user.plan || '').toLowerCase().includes('pro')) ||
        (billingFilter === 'active' && ['active', 'trialing'].includes(String(user.subscription_status || '').toLowerCase())) ||
        (billingFilter === 'past_due' && String(user.subscription_status || '').toLowerCase() === 'past_due') ||
        (billingFilter === 'no_plan' && !user.subscription_status) ||
        (billingFilter === 'limit_reached' && Boolean(user.account_limit_reached));
      return matchesSearch && matchesFilter;
    });
  }, [billingFilter, search, users]);

  const loadAdminData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setForbidden(false);
    try {
      const [summaryBody, usersBody, plansBody, accountsBody, rulesBody, systemBody] = await Promise.all([
        adminFetch('/admin/summary', token),
        adminFetch('/admin/users?limit=100', token),
        adminFetch('/admin/plans', token),
        adminFetch('/admin/accounts?limit=100', token),
        adminFetch('/admin/rules', token),
        adminFetch('/admin/system', token),
      ]);
      setSummary(summaryBody);
      setUsers(usersBody.users || []);
      setPlans(plansBody.plans || []);
      setAccounts(accountsBody.accounts || []);
      setRules(rulesBody.ruleSets || []);
      setSystem(systemBody);
      setSelectedPlans((usersBody.users || []).reduce((acc: Record<string, string>, user: AdminUser) => {
        acc[user.user_id] = user.plan || 'beta_free';
        return acc;
      }, {}));
    } catch (error: any) {
      if (error?.status === 401 || error?.status === 403) {
        setForbidden(true);
      } else {
        toast({ title: 'Admin indisponível', description: error?.message || 'Falha ao carregar dados administrativos.', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const runAction = async (label: string, action: () => Promise<void>) => {
    setBusyAction(label);
    try {
      await action();
      await loadAdminData();
    } catch (error: any) {
      toast({ title: 'Ação não concluída', description: error?.message || 'Revise os dados e tente novamente.', variant: 'destructive' });
    } finally {
      setBusyAction(null);
    }
  };

  const assignPlan = (user: AdminUser, status = 'active') => runAction(`plan-${user.user_id}`, async () => {
    const planId = selectedPlans[user.user_id] || user.plan || 'beta_free';
    await adminFetch(`/admin/users/${user.user_id}/subscription`, token, {
      method: 'POST',
      body: JSON.stringify({ planId, status }),
    });
    toast({ title: 'Assinatura atualizada', description: user.email });
  });

  const blockUser = (user: AdminUser, blocked: boolean) => runAction(`block-${user.user_id}`, async () => {
    await adminFetch(`/admin/users/${user.user_id}/block`, token, {
      method: 'POST',
      body: JSON.stringify({ blocked }),
    });
    toast({ title: blocked ? 'Usuário suspenso' : 'Usuário reativado', description: user.email });
  });

  const savePlan = () => runAction('plan-save', async () => {
    await adminFetch('/admin/plans', token, {
      method: 'POST',
      body: JSON.stringify({
        id: planForm.id || planForm.slug,
        name: planForm.name,
        slug: planForm.slug || planForm.id,
        account_limit: Number(planForm.account_limit),
        price_amount: planForm.price_amount ? Number(planForm.price_amount) : null,
        billing_interval: planForm.billing_interval || null,
        currency: planForm.currency || 'brl',
        support_tier: planForm.support_tier || 'basic',
        stripe_product_id: planForm.stripe_product_id || null,
        stripe_price_id: planForm.stripe_price_id || null,
        display_order: Number(planForm.display_order || 100),
        active: planForm.active === 'true',
      }),
    });
    toast({ title: 'Plano salvo' });
    setPlanForm({
      id: '',
      name: '',
      slug: '',
      account_limit: '1',
      price_amount: '',
      billing_interval: 'month',
      currency: 'brl',
      support_tier: 'basic',
      stripe_product_id: '',
      stripe_price_id: '',
      display_order: '100',
      active: 'true',
    });
  });

  const editPlan = (plan: AdminPlan) => {
    setPlanForm({
      id: plan.id || '',
      name: plan.name || plan.plan_name || '',
      slug: plan.slug || plan.id || '',
      account_limit: String(plan.account_limit ?? 1),
      price_amount: plan.price_amount ? String(plan.price_amount) : '',
      billing_interval: plan.billing_interval || 'month',
      currency: plan.currency || 'brl',
      support_tier: plan.support_tier || 'basic',
      stripe_product_id: plan.stripe_product_id && plan.stripe_product_id.includes('...')
        ? ''
        : plan.stripe_product_id || '',
      stripe_price_id: plan.stripe_price_id && plan.stripe_price_id.includes('...')
        ? ''
        : plan.stripe_price_id || '',
      display_order: String(plan.display_order ?? 100),
      active: plan.active === false ? 'false' : 'true',
    });
  };

  const resolveStripePrices = () => runAction('resolve-prices', async () => {
    const body = await adminFetch('/admin/plans/resolve-stripe-prices', token, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    toast({
      title: 'Resolução Stripe concluída',
      description: `${body?.resolved?.length || 0} planos resolvidos; ${body?.missing?.length || 0} pendentes.`,
    });
  });

  const forceSync = (account: AdminAccount) => runAction(`sync-${account.id}`, async () => {
    const body = await adminFetch(`/admin/accounts/${account.id}/force-sync`, token, { method: 'POST', body: JSON.stringify({}) });
    toast({ title: 'Sync executado', description: body?.success ? 'Conta sincronizada.' : 'Resposta recebida do gateway.' });
  });

  const softRemove = (account: AdminAccount) => runAction(`remove-${account.id}`, async () => {
    await adminFetch(`/admin/accounts/${account.id}/soft-remove`, token, { method: 'POST', body: JSON.stringify({}) });
    toast({ title: 'Conta removida do monitoramento' });
  });

  const reviewRule = (rule: AdminRuleSet) => runAction(`rule-${rule.id}`, async () => {
    const form = ruleReview[rule.id] || {
      reviewStatus: rule.review_status || 'needs_review',
      sourceUrl: rule.source_url || '',
      sourceNotes: rule.source_notes || '',
    };
    await adminFetch(`/admin/rules/${rule.id}/review`, token, {
      method: 'POST',
      body: JSON.stringify(form),
    });
    toast({ title: 'Revisão de regras atualizada', description: rule.name });
  });

  if (loading || roleLoading) {
    return (
      <div className="p-6 flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando painel administrativo...
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="p-6 flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-destructive/10">
          <ShieldOff className="h-7 w-7 text-destructive" />
        </div>
        <div className="max-w-md text-center">
          <h1 className="text-lg font-bold text-foreground">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta área exige sessão autenticada e role admin validada pelo backend.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow mb-2">Fortify Admin</p>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Área administrativa
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Usuários, assinaturas, planos, contas MT5, regras e saúde do gateway.
          </p>
        </div>
        <Button variant="outline" onClick={loadAdminData} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Usuários', value: summary?.totalUsers ?? 0, icon: Users },
          { label: 'Assinaturas', value: summary?.activeSubscriptions ?? 0, icon: CreditCard },
          { label: 'Beta', value: summary?.betaUsers ?? 0, icon: CheckCircle2 },
          { label: 'MT5 conectadas', value: summary?.connectedAccounts ?? 0, icon: Server },
          { label: 'Erros de sync', value: summary?.syncErrors ?? 0, icon: AlertTriangle },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2 text-primary">
                <item.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-7">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="subscriptions">Assinaturas</TabsTrigger>
          <TabsTrigger value="plans">Planos</TabsTrigger>
          <TabsTrigger value="accounts">MT5</TabsTrigger>
          <TabsTrigger value="rules">Regras</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-4 lg:grid-cols-2">
          <AdminCard title="Usuários recentes">
            <SimpleTable
              headers={['Email', 'Criado em']}
              rows={(summary?.recentUsers || []).map((user: any) => [user.email || 'sem email', fmtDate(user.created_at)])}
            />
          </AdminCard>
          <AdminCard title="Conexões recentes">
            <SimpleTable
              headers={['Conta', 'Usuário', 'Status']}
              rows={(summary?.recentConnections || []).map((connection: AdminAccount) => [
                connection.account_name || connection.mt5_server || 'MT5',
                connection.user_email || 'sem email',
                <Badge key={connection.id} className={statusClass(connection.connection_status)}>{statusLabel(connection.connection_status || 'unknown')}</Badge>,
              ])}
            />
          </AdminCard>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por e-mail, plano ou status" className="pl-9" />
            </div>
            <Select value={billingFilter} onValueChange={setBillingFilter}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Filtro de cobrança" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="priority">Suporte prioritário/VIP</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
                <SelectItem value="past_due">Pagamento pendente</SelectItem>
                <SelectItem value="no_plan">Sem plano</SelectItem>
                <SelectItem value="limit_reached">Limite de contas atingido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AdminCard title="Usuários">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Suporte</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contas</TableHead>
                  <TableHead>Último sync</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <Select value={selectedPlans[user.user_id] || user.plan || 'beta_free'} onValueChange={(value) => setSelectedPlans((prev) => ({ ...prev, [user.user_id]: value }))}>
                        <SelectTrigger className="h-8 w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {plans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>{plan.name || plan.plan_name || plan.id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{user.support_tier || '-'}</TableCell>
                    <TableCell><Badge className={statusClass(user.subscription_status)}>{statusLabel(user.subscription_status || 'none')}</Badge></TableCell>
                    <TableCell>{user.connected_accounts_count}/{user.account_limit}</TableCell>
                    <TableCell>{fmtDate(user.last_sync_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => assignPlan(user)} disabled={busyAction === `plan-${user.user_id}`}>Ativar</Button>
                        <Button size="sm" variant="outline" onClick={() => blockUser(user, user.subscription_status !== 'suspended')} disabled={busyAction === `block-${user.user_id}`}>
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminCard>
        </TabsContent>

        <TabsContent value="subscriptions">
          <AdminCard title="Assinaturas">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Suporte</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Limite</TableHead>
                  <TableHead>Pago até</TableHead>
                  <TableHead>Falha/Suspensão</TableHead>
                  <TableHead>MT5</TableHead>
                  <TableHead>Stripe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.plan_name || user.plan || 'sem plano'}</TableCell>
                    <TableCell>{user.support_tier || '-'}</TableCell>
                    <TableCell><Badge className={statusClass(user.subscription_status)}>{statusLabel(user.subscription_status || 'none')}</Badge></TableCell>
                    <TableCell>{user.account_limit}</TableCell>
                    <TableCell>{fmtDate(user.paid_until || user.subscription?.paid_until || user.subscription?.current_period_end)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>Falha: {fmtDate(user.last_payment_failed_at || user.subscription?.last_payment_failed_at)}</div>
                      <div>Suspenso: {fmtDate(user.suspended_at || user.subscription?.suspended_at)}</div>
                      {(user.suspension_reason || user.subscription?.suspension_reason) && (
                        <div className="max-w-[180px] truncate">Motivo: {user.suspension_reason || user.subscription?.suspension_reason}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>Deployed: {user.deployed_mt5_count ?? 0}</div>
                      <div>Pendente: {user.suspension_pending_count ?? 0}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>{user.subscription?.stripe_customer_id || (user.subscription?.has_stripe_customer ? 'cliente configurado' : 'sem cliente')}</div>
                      <div>{user.subscription?.stripe_subscription_id || (user.subscription?.has_stripe_subscription ? 'assinatura configurada' : 'sem assinatura')}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminCard>
        </TabsContent>

        <TabsContent value="plans" className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <AdminCard title="Planos">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Produto e preço Stripe são validados por status, sem exibir chaves secretas.</p>
              <Button size="sm" variant="outline" onClick={resolveStripePrices} disabled={busyAction === 'resolve-prices'}>
                Resolver Price IDs
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plano</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Limite</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Intervalo</TableHead>
                  <TableHead>Suporte</TableHead>
                  <TableHead>Product ID</TableHead>
                  <TableHead>Preço Stripe</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name || plan.plan_name}</TableCell>
                    <TableCell>{plan.slug || plan.id}</TableCell>
                    <TableCell>{plan.account_limit}</TableCell>
                    <TableCell>{fmtPrice(plan.price_amount)}</TableCell>
                    <TableCell>{plan.billing_interval === 'year' ? 'anual' : plan.billing_interval === 'month' ? 'mensal' : '-'}</TableCell>
                    <TableCell>{plan.support_tier || 'basic'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>{plan.stripe_product_id || 'ausente'}</div>
                      <Badge className={statusClass(plan.stripe_product_id_status)}>{statusLabel(plan.stripe_product_id_status || 'missing')}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>{plan.stripe_price_id || 'ausente'}</div>
                      <Badge className={statusClass(plan.stripe_price_id_status)}>{statusLabel(plan.stripe_price_id_status || 'missing')}</Badge>
                    </TableCell>
                    <TableCell><Badge className={statusClass(plan.active ? 'active' : 'inactive')}>{statusLabel(plan.active ? 'active' : 'inactive')}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => editPlan(plan)}>Editar</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminCard>
          <AdminCard title="Criar/atualizar plano">
            <div className="space-y-3">
              <Field label="ID"><Input value={planForm.id} onChange={(e) => setPlanForm((p) => ({ ...p, id: e.target.value }))} placeholder="monthly" /></Field>
              <Field label="Nome"><Input value={planForm.name} onChange={(e) => setPlanForm((p) => ({ ...p, name: e.target.value }))} placeholder="Monthly" /></Field>
              <Field label="Slug"><Input value={planForm.slug} onChange={(e) => setPlanForm((p) => ({ ...p, slug: e.target.value }))} placeholder="monthly" /></Field>
              <Field label="Limite de contas"><Input value={planForm.account_limit} onChange={(e) => setPlanForm((p) => ({ ...p, account_limit: e.target.value }))} type="number" min="0" /></Field>
              <Field label="Preço em centavos"><Input value={planForm.price_amount} onChange={(e) => setPlanForm((p) => ({ ...p, price_amount: e.target.value }))} type="number" min="0" placeholder="4900" /></Field>
              <Field label="Intervalo">
                <Select value={planForm.billing_interval} onValueChange={(value) => setPlanForm((p) => ({ ...p, billing_interval: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Mensal</SelectItem>
                    <SelectItem value="year">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Moeda"><Input value={planForm.currency} onChange={(e) => setPlanForm((p) => ({ ...p, currency: e.target.value }))} placeholder="brl" /></Field>
              <Field label="Suporte"><Input value={planForm.support_tier} onChange={(e) => setPlanForm((p) => ({ ...p, support_tier: e.target.value }))} placeholder="basic, standard, priority, enterprise" /></Field>
              <Field label="Stripe product ID"><Input value={planForm.stripe_product_id} onChange={(e) => setPlanForm((p) => ({ ...p, stripe_product_id: e.target.value }))} placeholder="prod_..." /></Field>
              <Field label="Stripe price ID"><Input value={planForm.stripe_price_id} onChange={(e) => setPlanForm((p) => ({ ...p, stripe_price_id: e.target.value }))} placeholder="price_..." /></Field>
              <Field label="Ordem"><Input value={planForm.display_order} onChange={(e) => setPlanForm((p) => ({ ...p, display_order: e.target.value }))} type="number" min="0" /></Field>
              <Field label="Ativo">
                <Select value={planForm.active} onValueChange={(value) => setPlanForm((p) => ({ ...p, active: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ativo</SelectItem>
                    <SelectItem value="false">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Button onClick={savePlan} disabled={busyAction === 'plan-save'} className="w-full">Salvar plano</Button>
            </div>
          </AdminCard>
        </TabsContent>

        <TabsContent value="accounts">
          <AdminCard title="Contas MT5 conectadas">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conta</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Servidor</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sync</TableHead>
                  <TableHead>Suspensão</TableHead>
                  <TableHead>Regra</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.trading_account_nickname || account.account_name || 'MT5'}</TableCell>
                    <TableCell>{account.user_email || 'sem email'}</TableCell>
                    <TableCell>{account.mt5_server}</TableCell>
                    <TableCell>{account.mt5_login}</TableCell>
                    <TableCell><Badge className={statusClass(account.connection_status)}>{statusLabel(account.connection_status || 'unknown')}</Badge></TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge className={statusClass(account.sync_status)}>{statusLabel(account.sync_status || 'none')}</Badge>
                        {account.sync_error && <p className="max-w-[220px] truncate text-xs text-destructive">{account.sync_error}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {account.suspended_at ? (
                        <div className="space-y-1">
                          <p>{fmtDate(account.suspended_at)}</p>
                          <p className="max-w-[160px] truncate">{account.suspension_reason || 'assinatura inativa'}</p>
                        </div>
                      ) : 'Ativa'}
                    </TableCell>
                    <TableCell>{account.rule_status || 'unconfigured'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => forceSync(account)} disabled={busyAction === `sync-${account.id}`}>Sync</Button>
                        <Button size="sm" variant="outline" onClick={() => softRemove(account)} disabled={busyAction === `remove-${account.id}`}>Remover</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminCard>
        </TabsContent>

        <TabsContent value="rules">
          <AdminCard title="Biblioteca de regras">
            <div className="space-y-3">
              {rules.map((rule) => {
                const form = ruleReview[rule.id] || {
                  reviewStatus: rule.review_status || 'needs_review',
                  sourceUrl: rule.source_url || '',
                  sourceNotes: rule.source_notes || '',
                };
                return (
                  <div key={rule.id} className="rounded-lg border border-border p-4 space-y-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{rule.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {rule.prop_firm?.name || 'Genérico'} · {rule.program?.name || 'Sem programa'} · {rule.rule_count} regras
                        </p>
                      </div>
                      <Badge className={statusClass(rule.review_status)}>
                        {rule.is_user_custom ? 'Personalizada' : statusLabel(rule.review_status)}
                      </Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[180px_1fr_1fr_auto]">
                      <Select value={form.reviewStatus} onValueChange={(value) => setRuleReview((prev) => ({ ...prev, [rule.id]: { ...form, reviewStatus: value } }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="verified">Oficial verificada</SelectItem>
                          <SelectItem value="needs_review">Precisa de revisão</SelectItem>
                          <SelectItem value="deprecated">Descontinuada</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input value={form.sourceUrl} onChange={(e) => setRuleReview((prev) => ({ ...prev, [rule.id]: { ...form, sourceUrl: e.target.value } }))} placeholder="URL da fonte" />
                      <Textarea value={form.sourceNotes} onChange={(e) => setRuleReview((prev) => ({ ...prev, [rule.id]: { ...form, sourceNotes: e.target.value } }))} placeholder="Notas de revisão" className="min-h-10" />
                      <Button onClick={() => reviewRule(rule)} disabled={busyAction === `rule-${rule.id}`}>Salvar</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </AdminCard>
        </TabsContent>

        <TabsContent value="system">
          <AdminCard title="Status do sistema">
            <div className="grid gap-3 md:grid-cols-2">
              <StatusLine icon={Activity} label="Gateway" ok={Boolean(system?.gateway?.ok)} detail={`região ${system?.gateway?.region || 'desconhecida'} · porta ${system?.gateway?.port || '-'}`} />
              <StatusLine icon={Database} label="Supabase" ok={Boolean(system?.supabaseConnected)} detail={system?.supabaseError || 'conectado'} />
              <StatusLine icon={CreditCard} label="Chave Stripe" ok={Boolean(system?.stripeConfigured)} detail={system?.stripeConfigured ? 'configurada' : 'ausente'} />
              <StatusLine icon={CreditCard} label="Webhook Stripe" ok={Boolean(system?.stripeWebhookConfigured)} detail={system?.stripeWebhookConfigured ? 'configurado' : 'ausente'} />
              <StatusLine icon={CreditCard} label="Produtos e preços" ok={Boolean(system?.productPriceMappingComplete)} detail={system?.productPriceMappingComplete ? 'mapeamento completo' : 'mapeamento pendente'} />
              <StatusLine icon={Server} label="MetaApi token" ok={Boolean(system?.metaapiTokenConfigured)} detail={system?.metaapiTokenConfigured ? 'configurado' : 'ausente'} />
            </div>
          </AdminCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AdminCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {headers.map((header) => <TableHead key={header}>{header}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={index}>
            {row.map((cell, cellIndex) => <TableCell key={cellIndex}>{cell}</TableCell>)}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function StatusLine({ icon: Icon, label, ok, detail }: { icon: LucideIcon; label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-muted p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
      <Badge className={ok ? 'bg-success/15 text-success border-0' : 'bg-destructive/15 text-destructive border-0'}>
        {ok ? 'ok' : 'ação'}
      </Badge>
    </div>
  );
}
