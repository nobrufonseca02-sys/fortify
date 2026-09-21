# Fortify Design Direction

Fortify is a risk-command product for MT5 prop-firm traders. Its interface
must feel calm, precise, and operational. It helps a trader understand account
health and rule exposure; it must never resemble a speculative trading
terminal, a generic AI dashboard, or a marketing template.

## Design Sources

The full MIT-licensed `awesome-design-md` collection is vendored at
`docs/design/awesome-design-md/`. Read only the individual reference that is
relevant to the task before changing a visual surface:

- `design-md/linear.app/DESIGN.md`: dense, highly scannable product surfaces.
- `design-md/stripe/DESIGN.md`: public conversion hierarchy and checkout
  clarity. Use its structure, never its identity.
- `design-md/kraken/DESIGN.md`: disciplined financial-product density.
- `design-md/framer/DESIGN.md`: restrained motion and interaction timing.
- `design-md/apple/DESIGN.md`: product storytelling and focused empty states.

These documents are design analysis, not a component package. Do not copy a
reference brand's logo, trademark, typography asset, proprietary copy, or
distinctive color identity into Fortify.

## Fortify Visual System

- Keep the application dark, information-forward, and easy to scan.
- Use cyan as a signal for primary actions and healthy monitored states;
  reserve red and amber for real risk or warning states.
- Prefer compact operational panels, explicit labels, and stable table/grid
  dimensions over decorative cards and oversized marketing surfaces.
- Use one clear primary action in each context. Secondary actions should not
  compete with it.
- Make loading, empty, offline, and error states factual and actionable in
  Portuguese-BR.
- Preserve the existing Tailwind, shadcn-ui, Lucide, and Motion patterns.
- Honor `prefers-reduced-motion`; motion should clarify hierarchy, never
  distract from risk information.

## Guardrails

- Never fabricate account balances, profits, testimonials, live quotes, or
  trading outcomes for a visual treatment.
- Do not use third-party brand assets unless Fortify already has a legitimate
  local asset and the product feature requires it.
- Do not change financial calculations, rule enforcement, billing, MT5, or
  Supabase behavior as part of a visual-only request.
- Verify desktop and mobile layouts after visual changes. Keep text readable,
  controls reachable, and state colors accessible.

## Workflow

1. Read this document and the relevant source DESIGN.md.
2. Inspect the existing Fortify component and preserve its domain behavior.
3. Apply the smallest visual change that improves hierarchy or comprehension.
4. Run the focused build or test and visually inspect the affected route.

