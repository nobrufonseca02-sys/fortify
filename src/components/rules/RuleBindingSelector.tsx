import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react';
import {
  getOperationalRulePrograms,
  isRuleBindingDraftComplete,
  platformMatchesConstraint,
  resolveRuleBinding,
  type RuleBindingDraft,
} from '@/lib/ruleBinding';

interface RuleBindingSelectorProps {
  value: RuleBindingDraft;
  onChange: (value: RuleBindingDraft) => void;
  platformConstraint?: string;
  disabled?: boolean;
}

const selectClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50';

const statusLabel = {
  high: 'Confiança alta',
  medium: 'Confiança média',
  low: 'Confiança baixa',
  complete: 'Dados completos',
  partial: 'Dados parciais',
  legacy: 'Dados legados',
};

export function RuleBindingSelector({
  value,
  onChange,
  platformConstraint,
  disabled = false,
}: RuleBindingSelectorProps) {
  const programs = useMemo(
    () => getOperationalRulePrograms(platformConstraint),
    [platformConstraint],
  );
  const firms = useMemo(() => {
    const bySlug = new Map<string, string>();
    for (const program of programs) bySlug.set(program.firmSlug, program.firm);
    return Array.from(bySlug, ([slug, name]) => ({ slug, name })).sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR'),
    );
  }, [programs]);

  const firmPrograms = programs.filter(
    (program) => program.firmSlug === value.propFirmSlug,
  );
  const selectedProgram = firmPrograms.find(
    (program) => program.programSlug === value.programSlug,
  );
  const accountSizes = (selectedProgram?.accountLevelRules ?? []).filter(
    (account) =>
      !platformConstraint ||
      account.platforms.some((platform) =>
        platformMatchesConstraint(platform, platformConstraint),
      ),
  );
  const selectedAccount = accountSizes.find(
    (account) => account.id === value.accountSizeId,
  );
  const platforms = (selectedAccount?.platforms ?? []).filter((platform) =>
    platformMatchesConstraint(platform, platformConstraint),
  );
  const resolved = resolveRuleBinding(value);
  const complete = isRuleBindingDraftComplete(value);

  const patch = (next: Partial<RuleBindingDraft>) =>
    onChange({ ...value, ...next });

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">Vínculo oficial de regras</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Selecione o perfil auditado que corresponde exatamente à conta contratada.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Mesa proprietária</span>
          <select
            aria-label="Mesa proprietária"
            value={value.propFirmSlug}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...value,
                propFirmSlug: event.target.value,
                programSlug: '',
                accountSizeId: '',
                platform: '',
                ruleVersionId: '',
                manualRuleAcknowledgement: false,
              })
            }
            className={selectClass}
          >
            <option value="">Selecione</option>
            {firms.map((firm) => (
              <option key={firm.slug} value={firm.slug}>{firm.name}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Programa</span>
          <select
            aria-label="Programa"
            value={value.programSlug}
            disabled={disabled || !value.propFirmSlug}
            onChange={(event) =>
              patch({
                programSlug: event.target.value,
                accountSizeId: '',
                platform: '',
                ruleVersionId: '',
                manualRuleAcknowledgement: false,
              })
            }
            className={selectClass}
          >
            <option value="">Selecione</option>
            {firmPrograms.map((program) => (
              <option key={program.id} value={program.programSlug}>
                {program.programName}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Tamanho / variante</span>
          <select
            aria-label="Tamanho ou variante"
            value={value.accountSizeId}
            disabled={disabled || !value.programSlug}
            onChange={(event) =>
              patch({
                accountSizeId: event.target.value,
                platform: '',
                ruleVersionId: '',
                manualRuleAcknowledgement: false,
              })
            }
            className={selectClass}
          >
            <option value="">Selecione</option>
            {accountSizes.map((account) => (
              <option key={account.id} value={account.id}>{account.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Plataforma</span>
          <select
            aria-label="Plataforma"
            value={value.platform}
            disabled={disabled || !value.accountSizeId}
            onChange={(event) =>
              patch({
                platform: event.target.value,
                ruleVersionId: '',
                manualRuleAcknowledgement: false,
              })
            }
            className={selectClass}
          >
            <option value="">Selecione</option>
            {platforms.map((platform) => (
              <option key={platform} value={platform}>{platform}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Versão da regra</span>
          <select
            aria-label="Versão da regra"
            value={value.ruleVersionId}
            disabled={disabled || !value.platform}
            onChange={(event) =>
              patch({
                ruleVersionId: event.target.value,
                manualRuleAcknowledgement: false,
              })
            }
            className={selectClass}
          >
            <option value="">Selecione</option>
            {(selectedAccount?.versions ?? []).map((version) => (
              <option key={version.id} value={version.id}>{version.label}</option>
            ))}
          </select>
        </label>
      </div>

      {resolved ? (
        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
              {statusLabel[resolved.accountSize.confidence]}
            </span>
            <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
              {statusLabel[resolved.accountSize.dataCompleteness]}
            </span>
            <span className="text-[10px] text-muted-foreground">
              Revisado em {new Date(`${resolved.accountSize.lastReviewedAt}T00:00:00`).toLocaleDateString('pt-BR')}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Perda diária</p>
              <p className="font-medium text-foreground">{resolved.accountSize.dailyLoss}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Perda máxima</p>
              <p className="font-medium text-foreground">{resolved.accountSize.maxLoss}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Drawdown</p>
              <p className="font-medium text-foreground">{resolved.accountSize.drawdownType}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Meta</p>
              <p className="font-medium text-foreground">
                {resolved.accountSize.phases.map((phase) => phase.profitTarget).join(' · ')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-background p-3">
              <p className="font-medium text-success">Automático via MT5</p>
              <p className="text-muted-foreground mt-1">
                {resolved.accountSize.monitorability.automatic_mt5.length > 0
                  ? resolved.accountSize.monitorability.automatic_mt5.join(' · ')
                  : 'Nenhuma regra automática compatível com esta plataforma.'}
              </p>
            </div>
            <div className="rounded-lg bg-background p-3">
              <p className="font-medium text-warning">Conferência manual</p>
              <p className="text-muted-foreground mt-1">
                {resolved.accountSize.monitorability.manual_check.length > 0
                  ? resolved.accountSize.monitorability.manual_check.join(' · ')
                  : 'Sem itens manuais classificados no dataset.'}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Payout: {resolved.accountSize.payoutSplit} · {resolved.accountSize.firstPayoutTiming}
            </p>
            <div className="flex flex-wrap gap-2">
              {resolved.accountSize.sourceRefs.map((url, index) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Fonte oficial {index + 1}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
          <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Complete mesa, programa, variante, plataforma e versão para revisar o vínculo.
          </p>
        </div>
      )}

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          aria-label="Aceitar regras manuais"
          checked={value.manualRuleAcknowledgement}
          disabled={disabled || !resolved}
          onChange={(event) => patch({ manualRuleAcknowledgement: event.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
        />
        <span className="text-xs text-muted-foreground">
          Li e entendo que regras manuais e termos oficiais devem ser conferidos na mesa proprietária.
        </span>
      </label>

      <div
        data-testid="rule-binding-readiness"
        className={`flex items-center gap-2 text-xs font-medium ${complete ? 'text-success' : 'text-muted-foreground'}`}
      >
        {complete ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
        {complete ? 'Vínculo pronto para salvar' : 'Seleção incompleta'}
      </div>
    </section>
  );
}
