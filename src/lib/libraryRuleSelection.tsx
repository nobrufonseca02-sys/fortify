import { AlertTriangle, Check } from 'lucide-react';
import { type RuleBindingInitialSelection } from '@/components/rules/RuleBindingSelector';
import { resolveRuleBinding, type ResolvedRuleBinding } from '@/lib/ruleBinding';

export type LibraryRuleSelectionResult =
  | { status: 'none'; initialSelection?: undefined; resolved?: undefined }
  | { status: 'invalid'; initialSelection?: undefined; resolved?: undefined }
  | { status: 'valid'; initialSelection: RuleBindingInitialSelection; resolved: ResolvedRuleBinding };

export const LIBRARY_RULE_PARAMS = [
  'propFirmSlug',
  'programSlug',
  'accountSizeId',
  'platform',
  'ruleVersionId',
] as const;

export function parseLibraryRuleSelection(search: string): LibraryRuleSelectionResult {
  const params = new URLSearchParams(search);
  if (!LIBRARY_RULE_PARAMS.some((key) => params.has(key))) return { status: 'none' };

  const initialSelection = {
    propFirmSlug: params.get('propFirmSlug')?.trim() ?? '',
    programSlug: params.get('programSlug')?.trim() ?? '',
    accountSizeId: params.get('accountSizeId')?.trim() ?? '',
    platform: params.get('platform')?.trim() ?? '',
    ruleVersionId: params.get('ruleVersionId')?.trim() ?? '',
  } satisfies RuleBindingInitialSelection;

  if (Object.values(initialSelection).some((value) => !value)) return { status: 'invalid' };
  const resolved = resolveRuleBinding(initialSelection);
  if (!resolved) return { status: 'invalid' };

  return { status: 'valid', initialSelection, resolved };
}

export function LibraryRuleSelectionNotice({
  status,
  // Recovery instruction for a broken Library link. Defaults to "pick it
  // yourself", which is only true on surfaces that always render a
  // RuleBindingSelector (CreateAccount). The fast-connect form on /accounts
  // hides the selector when there is no resolved selection, so it overrides
  // this with the deferred-binding wording instead of telling the trader to
  // select something that isn't on screen.
  invalidHint = 'Selecione manualmente.',
}: {
  status: LibraryRuleSelectionResult['status'];
  invalidHint?: string;
}) {
  if (status === 'none') return null;
  const valid = status === 'valid';

  return (
    <div
      role={valid ? 'status' : 'alert'}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs ${
        valid
          ? 'border-primary/25 bg-primary/5 text-foreground'
          : 'border-warning/30 bg-warning/5 text-muted-foreground'
      }`}
    >
      {valid ? (
        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      ) : (
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
      )}
      <span>
        {valid ? (
          <>
            <strong>Regra pré-selecionada a partir da Biblioteca.</strong>{' '}
            Revise os dados antes de conectar sua conta.
          </>
        ) : (
          `Não foi possível carregar a regra enviada pela Biblioteca. ${invalidHint}`
        )}
      </span>
    </div>
  );
}
