import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Loader2, Save, User } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import { supabase } from "@/integrations/supabase/client";
import { fortifyMotion } from "@/lib/motion";

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

function SettingsIconChip({ icon }: { icon: React.ReactNode }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background/80">
      {icon}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-card/55 p-4">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
      <dd className="mt-2 break-words text-sm font-semibold leading-5 text-foreground">{value}</dd>
    </div>
  );
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
    hasActivePlan,
  } = useSubscriptionPlan();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const revealY = shouldReduceMotion ? 0 : 10;

  const currentPlan = useMemo(
    () => plans.find((plan) => plan.id === subscription?.plan_id || plan.slug === subscription?.plan_id) ?? null,
    [plans, subscription?.plan_id],
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

  const managePlan = () => {
    navigate(hasActivePlan ? "/subscription" : "/pricing");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-7 px-4 py-6 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: revealY }}
        animate={{ opacity: 1, y: 0 }}
        transition={fortifyMotion.gentle}
        className="flex flex-col gap-6 border-b border-border pb-6 md:flex-row md:items-end md:justify-between"
      >
        <div className="max-w-xl">
          <p className="eyebrow mb-3">Conta</p>
          <h1 className="display-editorial-sm text-foreground">Configurações</h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
            Gerencie seus dados de conta e assinatura.
          </p>
        </div>
        <button
          type="button"
          onClick={managePlan}
          className="pill-btn pill-btn-primary shrink-0"
        >
          <CreditCard className="h-4 w-4" />
          Gerenciar plano
        </button>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: revealY }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...fortifyMotion.gentle, delay: 0.05 }}
        className="card-premium space-y-5 rounded-lg p-6"
        data-testid="settings-profile-section"
      >
        <div className="flex items-center gap-3">
          <SettingsIconChip icon={<User className="h-5 w-5 text-foreground" />} />
          <div>
            <h2 className="text-sm font-bold text-foreground">Dados da conta</h2>
            <p className="text-xs text-muted-foreground">Atualize as informações usadas pelo Fortify.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

        <button
          type="button"
          onClick={saveProfile}
          disabled={profileLoading || saving}
          className="pill-btn pill-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar alterações
        </button>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: revealY }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...fortifyMotion.gentle, delay: 0.1 }}
        className="card-premium space-y-5 rounded-lg p-6"
        data-testid="settings-subscription-section"
      >
        <div className="flex items-center gap-3">
          <SettingsIconChip icon={<CreditCard className="h-5 w-5 text-foreground" />} />
          <div>
            <h2 className="text-sm font-bold text-foreground">Assinatura</h2>
            <p className="text-xs text-muted-foreground">Plano, limite de contas e suporte.</p>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatTile label="Plano atual" value={planLoading ? "Carregando..." : planName} />
          <StatTile label="Contas utilizadas" value={`${activeAccountCount}/${accountLimit || 0}`} />
          <StatTile label="Suporte" value={supportLabel} />
        </dl>

        <button type="button" onClick={managePlan} className="pill-btn">
          <CreditCard className="h-4 w-4" />
          Gerenciar plano
        </button>
      </motion.section>
    </div>
  );
};

export default SettingsPage;
