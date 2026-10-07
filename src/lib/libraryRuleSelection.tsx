import { AlertTriangle, Check } from 'lucide-react';
import { type RuleBindingInitialSelection } from '@/components/rules/RuleBindingSelector';
import { resolveRuleBinding, type ResolvedRuleBinding } from '@/lib/ruleBinding';
import { findMt5ProgramBySlug } from '@/lib/accountSizeDetection';
import type { AccountLevelPropFirmRuleProgram } from '@/data/prop-firms/accountLevelRules';

export type LibraryRuleSelectionResult =
  | { status: 'none'; initialSelection?: undefined; resolved?: undefined }
  | { status: 'invalid'; initialSelection?: undefined; resolved?: undefined }
  | { status: 'valid'; initialSelection: RuleBindingInitialSelection; resolved: ResolvedRuleBinding }
  // Mesa + programa escolhidos na Biblioteca, mas sem tamanho de conta ainda —
  // o trader clicou "Conectar conta" no fluxo de auto-detecção. O tamanho é
  // preenchido depois, em /accounts/:id/rules, a partir do saldo sincronizado.
  | { status: 'auto_detect'; program: AccountLevelPropFirmRuleProgram; initialSelection?: undefined; resolved?: undefined };

export const LIBRARY_RULE_PARAMS = [
  'propFirmSlug',
  'programSlug',
  'accountSizeId',
  'platform',
  'ruleVersionId',
] as const;

export function parseLibraryRuleSelection(search: string): LibraryRuleSelectionResult {
  const params = new URLSearchParams(search);
  if (!LIBRARY_RULE_PARAMS.some((key) => params.has(key)) && !params.has('autoDetectSize')) {
    return { status: 'none' };
  }

  const propFirmSlug = params.get('propFirmSlug')?.trim() ?? '';
  const programSlug = params.get('programSlug')?.trim() ?? '';

  if (params.get('autoDetectSize') === '1') {
    const program = findMt5ProgramBySlug(propFirmSlug, programSlug);
    if (!program) return { status: 'invalid' };
    return { status: 'auto_detect', program };
  }

  const initialSelection = {
    propFirmSlug,
    programSlug,
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
  const autoDetect = status === 'auto_detect';

  return (
    <div
      role={valid || autoDetect ? 'status' : 'alert'}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs ${
        valid || autoDetect
          ? 'border-primary/25 bg-primary/5 text-foreground'
          : 'border-warning/30 bg-warning/5 text-muted-foreground'
      }`}
    >
      {valid || autoDetect ? (
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
        ) : autoDetect ? (
          <>
            <strong>Mesa e programa escolhidos na Biblioteca.</strong>{' '}
            Conecte sua conta — o tamanho é detectado automaticamente a partir do saldo sincronizado, e você confirma antes de ativar o monitoramento.
          </>
        ) : (
          `Não foi possível carregar a regra enviada pela Biblioteca. ${invalidHint}`
        )}
      </span>
    </div>
  );
}
