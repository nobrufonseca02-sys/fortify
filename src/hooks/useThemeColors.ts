import { useEffect, useState } from 'react';

/**
 * Resolves design tokens (CSS custom properties defined in src/index.css, e.g. `--primary`)
 * to concrete `hsl(...)` strings.
 *
 * Why this exists: Recharts renders `stroke`/`fill` as raw SVG presentation attributes, which
 * do not reliably resolve `var(--token)` the way a `style` property would across browsers —
 * passing `hsl(var(--primary))` directly to `<Area stroke=... />` silently falls back to the
 * literal string instead of the theme color. There is no proven pattern for this elsewhere in
 * the codebase yet (grepped for `getComputedStyle`/`hsl(var(--` in .tsx — no hits), so this
 * reads the computed values off `document.documentElement` once and re-reads them whenever the
 * `data-theme` attribute changes (the theme toggle in AppLayout.tsx flips
 * `document.documentElement.dataset.theme` between "dark"/"light" — see that file).
 *
 * Pass a map of `{ resultKey: '--css-custom-property-name' }`; get back `{ resultKey: 'hsl(h s% l%)' }`.
 */
export function useThemeColors<T extends Record<string, string>>(tokens: T): Record<keyof T, string> {
  const resolve = (): Record<keyof T, string> => {
    const out = {} as Record<keyof T, string>;
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      for (const key in tokens) out[key] = 'currentColor';
      return out;
    }
    const styles = getComputedStyle(document.documentElement);
    for (const key in tokens) {
      const raw = styles.getPropertyValue(tokens[key]).trim();
      out[key] = raw ? `hsl(${raw})` : 'currentColor';
    }
    return out;
  };

  const [colors, setColors] = useState<Record<keyof T, string>>(resolve);

  useEffect(() => {
    setColors(resolve());
    const target = document.documentElement;
    const observer = new MutationObserver(() => setColors(resolve()));
    observer.observe(target, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
    // Token key set is expected to be stable across renders — only the resolved values change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return colors;
}
