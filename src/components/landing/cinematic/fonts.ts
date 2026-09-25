import { useEffect, type CSSProperties } from 'react';

// Geist, Geist Mono e Syne: todas OFL, servidas pelo Google Fonts. Carregadas só na
// /vendas para o app não pagar esse peso.
const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&family=Syne:wght@500;600;700&display=swap';
const LINK_ID = 'fortify-cinematic-fonts';

export const FONT_SANS = "font-['Geist',ui-sans-serif,system-ui,sans-serif]";
export const FONT_MONO = "font-['Geist_Mono',ui-monospace,monospace]";
export const FONT_DISPLAY = "font-['Syne','Geist',ui-sans-serif,sans-serif]";

// O CSS global aplica var(--font-display) em h1–h4 e var(--font-body) no body;
// redefinir as variáveis no contêiner troca a família só dentro da landing.
export const CINEMATIC_FONT_VARS = {
  '--font-display': "'Geist', ui-sans-serif, system-ui, sans-serif",
  '--font-body': "'Geist', ui-sans-serif, system-ui, sans-serif",
  '--font-mono': "'Geist Mono', ui-monospace, monospace",
} as CSSProperties;

export function useCinematicFonts() {
  useEffect(() => {
    if (document.getElementById(LINK_ID)) return;
    const link = document.createElement('link');
    link.id = LINK_ID;
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);
}
