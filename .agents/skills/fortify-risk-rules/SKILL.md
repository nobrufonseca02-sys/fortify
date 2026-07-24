---
name: fortify-risk-rules
description: Work on Fortify prop-firm rules, risk calculations, rule bindings, challenge constraints, drawdown logic, trading limits, and related tests or documentation.
---

# Fortify Risk Rules

Use this skill when a task touches prop-firm rules or trading-risk behavior.

## Source Order

1. Read `docs/fortify/09-regras-e-calculo-de-risco.md`.
2. Read `docs/fortify/rule-engine.md` and `docs/fortify/rule-binding.md` when relevant.
3. Inspect `src/data/propFirmRules.ts`, `src/lib/riskCalculator.ts`, `src/lib/ruleBinding.ts`, and related tests.
4. Check research notes under `docs/fortify/research/prop-firms/` when firm-specific behavior matters.

## Rules

- Treat rule logic as high-risk product behavior.
- Do not change calculations based on memory or guesswork.
- Add tests for every new rule type, edge case, or firm-specific interpretation.
- Prefer explicit names for rule types and calculation assumptions.
- Preserve backward compatibility for existing accounts unless migration is intentional.

## Output Format

Return:

- affected rule area
- source evidence
- implementation change
- tests updated or needed
- unresolved assumptions
