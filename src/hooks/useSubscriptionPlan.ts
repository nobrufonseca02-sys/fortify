import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface FortifyPlan {
  id: string;
  plan_name: string;
  name?: string | null;
  slug?: string | null;
  status: string;
  active?: boolean | null;
  stripe_price_id?: string | null;
  stripe_product_id?: string | null;
  account_limit: number;
  support_tier?: string | null;
  billing_interval: string | null;
  price_amount?: number | null;
  price_cents: number | null;
  currency?: string | null;
  plan_features?: string[] | null;
  display_order?: number | null;
  highlighted?: boolean | null;
  recommended_badge?: string | null;
}

export interface FortifySubscription {
  id: string;
  user_id: string;
  plan_id: string;
  plan_name: string;
  status: string;
  account_limit: number;
  current_period_start?: string | null;
  current_period_end: string | null;
  cancel_at_period_end?: boolean | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  support_tier?: string | null;
}

function isSubscriptionUsable(subscription: FortifySubscription | null | undefined) {
  if (!subscription) return false;
  if (!['active', 'trialing'].includes(String(subscription.status))) return false;
  if (!subscription.current_period_end) return true;
  const expiresAt = Date.parse(subscription.current_period_end);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export function useSubscriptionPlan() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const query = useQuery({
    queryKey: ['fortify_subscription_plan', userId],
    enabled: true,
    queryFn: async () => {
      const plansRes = await (supabase
          .from('plans' as any)
          .select('*')
          .eq('status', 'active')
          .eq('active', true)
          .order('display_order', { ascending: true }) as any);

      if (plansRes.error) throw plansRes.error;
      const plans = (plansRes.data ?? []) as FortifyPlan[];

      if (!userId) {
        return {
          subscription: null,
          plans,
          activeAccountCount: 0,
          accountLimit: 0,
          remainingAccounts: 0,
          hasActivePlan: false,
        };
      }

      const [subscriptionRes, connectionCountRes] = await Promise.all([
        (supabase
          .from('user_subscriptions' as any)
          .select('*')
          .eq('user_id', userId)
          .in('status', ['active', 'trialing'])
          .order('current_period_end', { ascending: false })
          .limit(5) as any),
        supabase
          .from('mt5_connections')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('connection_status', ['connected', 'connecting', 'syncing'] as any),
      ]);

      if (subscriptionRes.error) throw subscriptionRes.error;
      if (connectionCountRes.error) throw connectionCountRes.error;

      const subscriptions = (subscriptionRes.data ?? []) as FortifySubscription[];
      const activeSubscription = subscriptions.find(isSubscriptionUsable) ?? null;
      const activeAccountCount = Number(connectionCountRes.count ?? 0);
      const accountLimit = Number(activeSubscription?.account_limit ?? 0);

      return {
        subscription: activeSubscription,
        plans,
        activeAccountCount,
        accountLimit,
        remainingAccounts: Math.max(0, accountLimit - activeAccountCount),
        hasActivePlan: isSubscriptionUsable(activeSubscription),
      };
    },
  });

  return {
    subscription: query.data?.subscription ?? null,
    plans: query.data?.plans ?? [],
    activeAccountCount: query.data?.activeAccountCount ?? 0,
    accountLimit: query.data?.accountLimit ?? 0,
    remainingAccounts: query.data?.remainingAccounts ?? 0,
    hasActivePlan: query.data?.hasActivePlan ?? false,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
