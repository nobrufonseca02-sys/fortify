import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Loader2, Save, User } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import { createPortalSession } from "@/lib/billing";
import { supabase } from "@/integrations/supabase/client";

const supportLabels: Record<string, string> = {
  basic: "Suporte básico",
  standard: "Suporte padrão",
  priority: "Suporte prioritário",
  enterprise: "Suporte VIP/Enterprise",
  add_on: "Adicional",
};

function displayPlanName(planId?: string | null, planName?: string | null) {
  const source = String(planId || planName || "").toLowerCase();
  if (source.includes("enterprise")) return "Enterprise";
  if (source.includes("advanced")) return "Advanced";
  if (source.includes("pro")) return "Pro";
  if (source.includes("beginner")) return "Beginner";
  if (source.includes("beta")) return "Beta Free";
  return planName || "Sem plano ativo";
}

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const {
    subscription,
    accountLimit,
    activeAccountCount,
    plans,
    isLoading: planLoading,
  } = useSubscriptionPlan();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openingPlan, setOpeningPlan] = useState(false);

  const currentPlan = useMemo(
    () => plans.find((plan) => plan.id === subscription?.plan_id || plan.slug === subscription?.plan_id) ?? null,
    [plans, subscription?.plan_id],
  );

  const hasActivePaidStripeSubscription = Boolean(
    subscription?.stripe_customer_id &&
    subscription?.stripe_subscription_id &&
    subscription.plan_id !== "beta_free",
  );

  const supportTier = currentPlan?.support_tier || subscription?.support_tier || null;
  const supportLabel = supportTier ? supportLabels[String(supportTier)] || String(supportTier) : "Não informado";
  const planName = displayPlanName(subscription?.plan_id, currentPlan?.name || subscription?.plan_name);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!user?.id) {
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      const { data, error } = await (supabase
        .from("user_profiles" as any)
        .select("full_name,phone")
        .eq("user_id", user.id)
        .maybeSingle() as any);

      if (cancelled) return;

      if (error) {
        toast({
          title: "Perfil indisponível",
          description: "Não foi possível carregar suas informações.",
          variant: "destructive",
        });
      }

      setFullName(data?.full_name || user.user_metadata?.full_name || "");
      setPhone(data?.phone || "");
      setProfileLoading(false);
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.user_metadata?.full_name]);

  const saveProfile = async () => {
    if (!user?.id) {
      toast({
        title: "Sessão necessária",
        description: "Entre novamente para salvar suas informações.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const { error } = await (supabase
      .from("user_profiles" as any)
      .upsert({
        user_id: user.id,
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" }) as any);

    setSaving(false);

    if (error) {
      console.error("settings_profile_save_failed", {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar suas informações.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Informações salvas com sucesso.",
      description: "Seus dados de conta foram atualizados.",
    });
  };

  const managePlan = async () => {
    if (!hasActivePaidStripeSubscription) {
      navigate("/pricing");
      return;
    }

    if (!session?.access_token) {
      toast({
        title: "Sessão necessária",
        description: "Entre novamente para gerenciar seu plano.",
        variant: "destructive",
      });
      return;
    }

    setOpeningPlan(true);
    try {
      const portal = await createPortalSession(session.access_token);
      window.location.assign(portal.portal_url);
    } catch (error: any) {
      toast({
        title: "Portal indisponível",
        description: error?.message || "Não foi possível abrir o gerenciamento do plano.",
        variant: "destructive",
      });
    } finally {
      setOpeningPlan(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-lg font-black text-foreground">Configurações</h1>
        <p className="text-xs text-muted-foreground">Gerencie seus dados de conta e assinatura.</p>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-lg shadow-background/30"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Dados da conta</h2>
            <p className="text-xs text-muted-foreground">Atualize as informações usadas pelo Fortify.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="full-name" className="text-xs text-muted-foreground">Nome completo</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Seu nome completo"
              disabled={profileLoading || saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs text-muted-foreground">E-mail</Label>
            <Input id="email" value={user?.email || ""} readOnly className="font-mono text-xs" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="phone" className="text-xs text-muted-foreground">Telefone / WhatsApp</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+55 11 99999-9999"
              disabled={profileLoading || saving}
            />
          </div>
        </div>

        <Button type="button" onClick={saveProfile} disabled={profileLoading || saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar alterações
        </Button>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-lg shadow-background/30"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Assinatura</h2>
            <p className="text-xs text-muted-foreground">Resumo do seu plano Fortify atual.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">Plano atual</p>
            <p className="text-sm text-foreground font-semibold">{planLoading ? "Carregando..." : planName}</p>
          </div>
          <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">Contas utilizadas</p>
            <p className="text-sm text-foreground font-semibold">{activeAccountCount}/{accountLimit || 0}</p>
          </div>
          <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">Suporte</p>
            <p className="text-sm text-foreground font-semibold">{supportLabel}</p>
          </div>
        </div>

        <Button type="button" onClick={managePlan} disabled={openingPlan} className="gap-2" variant="outline">
          {openingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
          Gerenciar plano
        </Button>
      </motion.section>
    </div>
  );
};

export default SettingsPage;
