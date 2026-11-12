import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import type { PropFirmRuleProgram, RuleAccountSize } from '@/data/propFirmRules';
import { formatAccountLabel } from '@/lib/propFirmSummary';
import { createGuardAccount, fetchUsedAccountSlots, guardAccountSizes, planFullMessage } from '@/lib/guardAccount';
import { useSubscriptionPlan } from '@/hooks/useSubscriptionPlan';
import { OfficialRulesDialog } from '@/components/library/OfficialRulesDialog';
import { FileText } from 'lucide-react';
import { inferStage, type AccountStage } from '@/lib/ruleEngine/guardRules';

// "Usar este modelo": cria a conta que o Fortify Guard vai alimentar. O aceite
// das regras oficiais começa desmarcado e só o trader marca (requisito de auditoria).

const STAGES: Array<{ id: AccountStage; label: string }> = [
  { id: 'evaluation', label: 'Avaliação' },
  { id: 'funded', label: 'Funded' },
];

export function GuardAccountSheet({
  open,
  onOpenChange,
  program,
  initialAccount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program: PropFirmRuleProgram;
  initialAccount?: RuleAccountSize | null;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { accountLimit, isLoading: planLoading } = useSubscriptionPlan();
  const [usedSlots, setUsedSlots] = useState<number | null>(null);
  const [slotsFailed, setSlotsFailed] = useState(false);
  const sizes = useMemo(() => guardAccountSizes(program), [program]);
  const [accountId, setAccountId] = useState<string>('');
  const [stage, setStage] = useState<AccountStage>('evaluation');
  const [nickname, setNickname] = useState('');
  const [nicknameEdited, setNicknameEdited] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rulesRead, setRulesRead] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const start = initialAccount && sizes.some((size) => size.id === initialAccount.id) ? initialAccount : sizes[0];
    setAccountId(start?.id ?? '');
    setStage(inferStage({ program: { name: program.programName, type: program.programType } as any }));
    setNickname(start ? `${program.firm} ${formatAccountLabel(start.label)}` : program.firm);
    setNicknameEdited(false);
    setAcknowledged(false);
    setRulesRead(false);
  }, [open, initialAccount, program, sizes]);

  useEffect(() => {
    if (!open || !user?.id) return;
    let active = true;
    setUsedSlots(null);
    setSlotsFailed(false);
    fetchUsedAccountSlots(user.id)
      .then((count) => active && setUsedSlots(count))
      .catch(() => active && setSlotsFailed(true)); // a criação confere de novo
    return () => {
      active = false;
    };
  }, [open, user?.id]);

  const slotsKnown = !planLoading && (usedSlots !== null || slotsFailed);
  const planFull = !planLoading && usedSlots !== null && usedSlots >= accountLimit;

  const account = sizes.find((size) => size.id === accountId) ?? null;

  const submit = async () => {
    if (!user?.id || !account) return;
    setSaving(true);
    try {
      await createGuardAccount({ userId: user.id, program, account, stage, nickname, acknowledged, accountLimit });
      toast({ title: 'Conta criada', description: 'Abra o MT5 com o Fortify Guard.' });
      onOpenChange(false);
      navigate('/fortify-guard');
    } catch (error: any) {
      toast({ title: 'Conta não criada', description: error?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Usar este modelo</p>
          <SheetTitle>
            {program.firm} · {program.programName}
          </SheetTitle>
          <SheetDescription className="sr-only">Criar a conta com as regras deste modelo.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tamanho da conta</p>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Tamanho da conta">
              {sizes.map((size) => (
                <button
                  key={size.id}
                  type="button"
                  role="radio"
                  aria-checked={accountId === size.id}
                  onClick={() => {
                    setAccountId(size.id);
                    // Outro tamanho, outras regras: precisa ler e concordar de novo.
                    setRulesRead(false);
                    setAcknowledged(false);
                    // O nome acompanha o tamanho até o trader escrever um nome próprio.
                    if (!nicknameEdited) setNickname(`${program.firm} ${formatAccountLabel(size.label)}`);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    accountId === size.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {formatAccountLabel(size.label)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fase</p>
            <div className="mt-2 inline-flex rounded-lg border border-border p-1" role="radiogroup" aria-label="Fase da conta">
              {STAGES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={stage === option.id}
                  onClick={() => {
                    setStage(option.id);
                    setRulesRead(false);
                    setAcknowledged(false);
                  }}
                  className={`rounded-md px-4 py-1.5 text-xs font-medium ${
                    stage === option.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="guard-account-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nome da conta
            </label>
            <Input id="guard-account-name" className="mt-2" value={nickname} onChange={(event) => {
                setNickname(event.target.value);
                setNicknameEdited(true);
              }} maxLength={60} />
          </div>

          {account && (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                setRulesOpen(true);
                setRulesRead(true);
              }}
            >
              <FileText className="h-4 w-4" />
              Ler regras oficiais
            </Button>
          )}

          <label className={`flex items-start gap-3 text-sm ${rulesRead ? 'text-foreground' : 'text-muted-foreground'}`}>
            <Checkbox
              checked={acknowledged}
              disabled={!rulesRead}
              onCheckedChange={(checked) => setAcknowledged(checked === true)}
              aria-label="Li as regras oficiais desta mesa"
              className="mt-0.5"
            />
            <span>{rulesRead ? 'Li e concordo com as regras oficiais desta conta.' : 'Abra as regras oficiais para concordar.'}</span>
          </label>

          {account && (
            <OfficialRulesDialog open={rulesOpen} onOpenChange={setRulesOpen} program={program} account={account} stage={stage} />
          )}

          {planFull ? (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-4" role="alert">
              <p className="text-sm font-semibold text-foreground">Plano cheio</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{planFullMessage(accountLimit)}</p>
              <Button variant="outline" className="mt-3" onClick={() => navigate('/pricing')}>
                Ver planos
              </Button>
            </div>
          ) : (
            <>
              <Button className="w-full gap-2" onClick={submit} disabled={!acknowledged || !account || saving || !slotsKnown}>
                {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
                Criar conta e conectar pelo Fortify Guard
              </Button>
              {!planLoading && usedSlots !== null && (
                <p className="text-center text-xs text-muted-foreground">
                  {usedSlots} de {accountLimit} {accountLimit === 1 ? 'conta' : 'contas'} do seu plano em uso
                </p>
              )}
            </>
          )}

          <p className="text-center text-xs text-muted-foreground">Depois: abra o MT5 com o Fortify Guard.</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
