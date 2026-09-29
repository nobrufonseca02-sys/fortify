import { describe, expect, it } from 'vitest';
import { isAppHost } from '../lib/hostRouting';

describe('isAppHost', () => {
  it('hoje (sem VITE_APP_HOSTS configurada) nunca é o host do app', () => {
    // Enquanto não existir domínio configurado, nenhum host deve mudar de
    // comportamento — nem localhost, nem o domínio de preview da Vercel.
    expect(isAppHost('localhost')).toBe(false);
    expect(isAppHost('fortify-delta.vercel.app')).toBe(false);
    expect(isAppHost('app.fortify.com.br')).toBe(false);
  });
});
