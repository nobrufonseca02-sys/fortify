import { ExternalLink, FileDown } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { PropFirmRuleProgram, RuleAccountSize } from '@/data/propFirmRules';
import { formatAccountLabel } from '@/lib/propFirmSummary';
import { officialRuleRows, officialDocumentUrl, type OfficialRuleRow } from '@/lib/officialRules';
import type { AccountStage } from '@/lib/ruleEngine/guardRules';

// "Usar este modelo": as regras exatas da conta escolhida, com o trecho oficial
// e a fonte, antes do "li e concordo". O documento da mesa abre embutido quando
// ela permite; o botão "Abrir na mesa" funciona sempre.

const STAGE_LABEL: Record<AccountStage, string> = { evaluation: 'Avaliação', funded: 'Funded' };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

/** PDF gerado pelo Fortify: abre a versão para imprimir e o navegador salva em PDF. */
function printRules(title: string, rows: OfficialRuleRow[], sources: Array<{ label: string; url: string; date: string }>) {
  const win = window.open('', '_blank', 'noopener=no,width=820,height=900');
  if (!win) return;
  const body = rows
    .map(
      (row) => `<tr><th>${escapeHtml(row.label)}</th><td>${escapeHtml(row.value)}${
        row.quote ? `<blockquote>"${escapeHtml(row.quote)}"</blockquote>` : ''
      }</td></tr>`,
    )
    .join('');
  const list = sources
    .map((source) => `<li>${escapeHtml(source.label)}: ${escapeHtml(source.url)} (conferido em ${escapeHtml(source.date)})</li>`)
    .join('');
  win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{font-family:Inter,Arial,sans-serif;color:#111;margin:32px}h1{font-size:18px;margin:0 0 4px}p{color:#555;font-size:12px;margin:0 0 16px}
table{width:100%;border-collapse:collapse;font-size:13px}th{width:30%;text-align:left;vertical-align:top;padding:8px;border-bottom:1px solid #ddd}
td{padding:8px;border-bottom:1px solid #ddd}blockquote{margin:6px 0 0;color:#555;font-style:italic}ul{font-size:11px;color:#555}</style></head>
<body><h1>${escapeHtml(title)}</h1><p>Regras desta conta conforme a fonte oficial da mesa. Gerado pelo Fortify.</p>
<table>${body}</table><h2 style="font-size:13px;margin-top:20px">Fontes oficiais</h2><ul>${list}</ul></body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

export function OfficialRulesDialog({
  open,
  onOpenChange,
  program,
  account,
  stage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program: PropFirmRuleProgram;
  account: RuleAccountSize;
  stage: AccountStage;
}) {
  const rows = officialRuleRows(program, account, stage);
  const documentUrl = officialDocumentUrl(program);
  const sources = (program.officialSources ?? [])
    .slice()
    .sort((a, b) => a.precedence - b.precedence)
    .map((source) => ({ label: source.label, url: source.url, date: source.lastAccessedAt }));
  if (sources.length === 0 && program.officialSourceUrl) {
    sources.push({ label: program.sourceLabel || program.firm, url: program.officialSourceUrl, date: program.lastReviewedAt });
  }
  const title = `${program.firm} · ${program.programName} · ${formatAccountLabel(account.label)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Regras oficiais</DialogTitle>
          <DialogDescription>
            {title} · {STAGE_LABEL[stage]}
          </DialogDescription>
        </DialogHeader>

        <dl className="divide-y divide-border rounded-lg border border-border">
          {rows.map((row) => (
            <div key={row.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[150px_1fr]">
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{row.label}</dt>
              <dd className="text-sm text-foreground">
                {row.value}
                {row.quote && (
                  <blockquote className="mt-1 border-l-2 border-primary/40 pl-2 text-xs italic text-muted-foreground">"{row.quote}"</blockquote>
                )}
                {row.estimated && <span className="mt-1 block text-[11px] text-warning">Estimativa: a mesa não detalha a fórmula.</span>}
              </dd>
            </div>
          ))}
        </dl>

        {documentUrl && (
          <div className="overflow-hidden rounded-lg border border-border">
            <iframe
              title={`Documento oficial ${program.firm}`}
              src={documentUrl}
              className="h-[380px] w-full bg-white"
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
            <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
              Página em branco? A mesa não deixa abrir aqui. Use "Abrir na mesa".
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            Fonte: {sources[0]?.label ?? program.firm} · conferido em {sources[0]?.date ?? program.lastReviewedAt}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => printRules(title, rows, sources)}>
              <FileDown className="h-3.5 w-3.5" />
              Baixar PDF
            </Button>
            {(documentUrl || sources[0]?.url) && (
              <Button asChild size="sm" className="gap-1.5">
                <a href={documentUrl ?? sources[0].url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir na mesa
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
