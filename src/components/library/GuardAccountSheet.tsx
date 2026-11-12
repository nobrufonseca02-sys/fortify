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
import { createGuardAccount, guardAccountSizes } from '@/lib/guardAccount';
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
  const sizes = useMemo(() => guardAccountSizes(program), [program]);
  const [accountId, setAccountId] = useState<string>('');
  const [stage, setStage] = useState<AccountStage>('evaluation');
  const [nickname, setNickname] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const start = initialAccount && sizes.some((size) => size.id === initialAccount.id) ? initialAccount : sizes[0];
    setAccountId(start?.id ?? '');
    setStage(inferStage({ program: { name: program.programName, type: program.programType } as any }));
    setNickname(start ? `${program.firm} ${formatAccountLabel(start.label)}` : program.firm);
    setAcknowledged(false);
  }, [open, initialAccount, program, sizes]);

  const account = sizes.find((size) => size.id === accountId) ?? null;

  const submit = async () => {
    if (!user?.id || !account) return;
    setSaving(true);
    try {
      await createGuardAccount({ userId: user.id, program, account, stage, nickname, acknowledged });
      toast({ title: 'Conta criada', description: 'Abra o MT5 com o Fortify Guard no gráfico desta conta: ele conecta sozinho.' });
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
          <SheetDescription>Confirme a sua conta. A partir daqui o Fortify Guard alimenta tudo o que você operar.</SheetDescription>
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
                  onClick={() => setAccountId(size.id)}
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
                  onClick={() => setStage(option.id)}
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
            <Input id="guard-account-name" className="mt-2" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={60} />
          </div>

          <label className="flex items-start gap-3 text-sm text-foreground">
            <Checkbox
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked === true)}
              aria-label="Li as regras oficiais desta mesa"
              className="mt-0.5"
            />
            <span>Li as regras oficiais desta mesa e confirmo que são as da minha conta.</span>
          </label>

          <Button className="w-full gap-2" onClick={submit} disabled={!acknowledged || !account || saving}>
            {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
            Criar conta e conectar pelo Fortify Guard
          </Button>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">Depois de criar</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Abra o MT5 com o Fortify Guard no gráfico desta conta. Ele se conecta sozinho e os dados começam a chegar em até 15
              segundos. O Fortify registra as operações a partir desse momento.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
