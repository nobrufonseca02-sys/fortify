import { useMemo, useState } from 'react';
import {
  Beaker,
  Database,
  ExternalLink,
  FlaskConical,
  ShieldCheck,
} from 'lucide-react';
import { BoundRuleEvaluationCard } from './BoundRuleEvaluationCard';
import {
  getRuleEngineDemoScenario,
  ruleEngineDemoScenarios,
  type RuleEngineDemoScenarioId,
} from '@/lib/ruleEngine/demoFixtures';

export function RuleEngineDemoPanel() {
  const [scenarioId, setScenarioId] =
    useState<RuleEngineDemoScenarioId>('safe');
  const scenario = useMemo(
    () => getRuleEngineDemoScenario(scenarioId),
    [scenarioId],
  );
  const snapshot = scenario.binding.rule_snapshot;

  return (
    <div className="space-y-5">
      <section className="border-y border-primary/25 bg-primary/5 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-primary">
              <FlaskConical className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  data-testid="demo-mode-badge"
                  className="rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase text-primary"
                >
                  Modo demonstração
                </span>
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Ambiente de demonstração interna
                </span>
              </div>
              <h1 className="mt-3 text-xl font-semibold text-foreground">
                Motor de regras versionado
              </h1>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
                Dados simulados. Não representa conexão MT5 real. Esta tela não
                cria conta, não conecta MT5 e não gera custo MetaApi.
              </p>
            </div>
          </div>

          <div className="w-full lg:max-w-sm">
            <label
              htmlFor="demo-scenario"
              className="text-[10px] font-semibold uppercase text-muted-foreground"
            >
              Cenário de validação
            </label>
            <select
              id="demo-scenario"
              value={scenarioId}
              onChange={(event) =>
                setScenarioId(event.target.value as RuleEngineDemoScenarioId)
              }
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {ruleEngineDemoScenarios.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-muted-foreground">
              {scenario.description}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-card p-4">
          <p className="text-[10px] uppercase text-muted-foreground">Mesa</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {snapshot.propFirm.name}
          </p>
        </div>
        <div className="bg-card p-4">
          <p className="text-[10px] uppercase text-muted-foreground">Programa</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {snapshot.program.name}
          </p>
        </div>
        <div className="bg-card p-4">
          <p className="text-[10px] uppercase text-muted-foreground">
            Conta / plataforma
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {snapshot.accountSize.label} · {snapshot.platform}
          </p>
        </div>
        <div className="bg-card p-4">
          <p className="text-[10px] uppercase text-muted-foreground">Versão</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {snapshot.version.label}
          </p>
        </div>
      </section>

      <BoundRuleEvaluationCard evaluation={scenario.evaluation} />

      <section className="grid gap-5 border-t border-border pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">
              Fontes oficiais do snapshot
            </h2>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {scenario.evaluation.source.officialSourceUrls.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-2 text-xs text-primary hover:underline"
              >
                Fonte oficial
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        <div className="space-y-3 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <Beaker className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <p>
              O cenário usa o mesmo motor operacional das contas vinculadas,
              com valores locais controlados.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <p>Nenhum registro é criado ou atualizado no Supabase.</p>
          </div>
          <p className="break-all font-mono text-[10px]">
            Assinatura demo: {scenario.evaluation.source.snapshotHash}
          </p>
        </div>
      </section>
    </div>
  );
}
