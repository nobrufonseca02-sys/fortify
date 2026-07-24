import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Upload, Link2, Loader2, Sparkles, Check, AlertTriangle,
  Shield, Flame, Target, TrendingUp, Clock, BarChart3,
  Newspaper, Zap, Layers, Activity, FileText, X
} from 'lucide-react';
import { RuleType } from '@/types/fortify';
import type { TemplateRule } from '@/data/propFirmLibrary';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface ExtractedData {
  firmName: string;
  rules: Array<{
    type: string;
    name: string;
    severity: 'hard' | 'soft';
    defaultValue: number;
    unit: '%' | '$' | 'days' | 'min';
    enabled: boolean;
    description?: string;
  }>;
  summary: string;
  accountTypes: string[];
}

interface RuleExtractorProps {
  onRulesExtracted: (rules: TemplateRule[], firmName: string, accountTypes: string[], summary: string) => void;
  className?: string;
}

const RULE_ICONS: Partial<Record<RuleType, React.ElementType>> = {
  MAX_DAILY_LOSS: Flame,
  MAX_TOTAL_LOSS: Shield,
  TRAILING_MAX_LOSS: TrendingUp,
  PROFIT_TARGET: Target,
  MIN_TRADING_DAYS: Clock,
  CONSISTENCY_BEST_DAY_CAP: BarChart3,
  NEWS_RESTRICTION_WINDOW: Newspaper,
  SCALPING_RULE: Zap,
  MAX_STACKING_TRADES: Layers,
  INACTIVITY_LIMIT: Activity,
};

export function RuleExtractor({ onRulesExtracted, className = '' }: RuleExtractorProps) {
  const [mode, setMode] = useState<'idle' | 'url' | 'pdf'>('idle');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const extractFromText = useCallback(async (text: string, sourceUrl?: string) => {
    setIsLoading(true);
    setError(null);
    setExtractedData(null);

    try {
      const body: Record<string, string> = {};
      if (sourceUrl) body.url = sourceUrl;
      else body.text = text;

      const { data, error: fnError } = await supabase.functions.invoke('extract-rules', {
        body,
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to extract rules');
      }

      if (!data?.success || !data?.data) {
        throw new Error(data?.error || 'Failed to extract rules from content');
      }

      const extracted = data.data as ExtractedData;
      setExtractedData(extracted);
      toast.success(`${extracted.rules.length} regras extraídas de "${extracted.firmName}"`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao extrair regras';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleUrlSubmit = async () => {
    if (!url.trim()) return;
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http')) formattedUrl = `https://${formattedUrl}`;
    await extractFromText('', formattedUrl);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setMode('pdf');

    if (file.type === 'application/pdf') {
      try {
        // Use pdfjs to extract text
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs`;

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= Math.min(pdf.numPages, 50); i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          fullText += pageText + '\n';
        }

        if (fullText.trim().length < 100) {
          setError('O PDF parece não conter texto legível. Tente colar o link da página de regras.');
          return;
        }

        await extractFromText(fullText.slice(0, 30000));
      } catch (err) {
        console.error('PDF parse error:', err);
        setError('Erro ao ler o PDF. Tente colar o link da página de regras.');
      }
    } else {
      // Plain text file
      const text = await file.text();
      await extractFromText(text.slice(0, 30000));
    }

    e.target.value = '';
  };

  const handleApplyRules = () => {
    if (!extractedData) return;

    const templateRules: TemplateRule[] = extractedData.rules.map(r => ({
      type: r.type as RuleType,
      name: r.name,
      severity: r.severity,
      defaultValue: r.defaultValue,
      unit: r.unit,
      editable: true,
      enabled: r.enabled,
    }));

    onRulesExtracted(
      templateRules,
      extractedData.firmName,
      extractedData.accountTypes || ['Challenge', 'Funded'],
      extractedData.summary
    );

    toast.success('Regras aplicadas com sucesso!');
  };

  const reset = () => {
    setMode('idle');
    setUrl('');
    setExtractedData(null);
    setError(null);
    setFileName(null);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mode Selection */}
      {mode === 'idle' && !isLoading && !extractedData && (
        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Reconhecimento Automático de Regras</h3>
              <p className="text-xs text-muted-foreground">Envie o PDF ou link dos termos da prop firm e as regras serão extraídas automaticamente</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => setMode('url')}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left hover:border-primary/50 transition-all"
            >
              <Link2 className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Colar Link</p>
                <p className="text-[10px] text-muted-foreground">URL da página de regras</p>
              </div>
            </button>

            <label className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left hover:border-primary/50 transition-all cursor-pointer">
              <Upload className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Upload PDF</p>
                <p className="text-[10px] text-muted-foreground">Termos e condições em PDF</p>
              </div>
              <input
                type="file"
                accept=".pdf,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* URL Input */}
      {mode === 'url' && !isLoading && !extractedData && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Link da Página de Regras</h3>
            </div>
            <button onClick={reset} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://ftmo.com/trading-rules"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
            />
            <button
              onClick={handleUrlSubmit}
              disabled={!url.trim()}
              className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">Cole o link da página de termos, regras ou FAQ da prop firm</p>
        </div>
      )}

      {/* PDF uploaded state */}
      {mode === 'pdf' && !isLoading && !extractedData && fileName && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground">{fileName}</span>
            </div>
            <button onClick={reset} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-8 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
          <div>
            <p className="text-sm font-semibold text-foreground">Analisando regras com IA...</p>
            <p className="text-xs text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-foreground">{error}</p>
            <button onClick={reset} className="text-xs text-primary mt-2 hover:underline">Tentar novamente</button>
          </div>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {extractedData && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Summary */}
            <div className="rounded-xl border border-success/30 bg-success/5 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-success" />
                <h3 className="text-sm font-semibold text-foreground">
                  {extractedData.rules.length} regras encontradas — {extractedData.firmName}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">{extractedData.summary}</p>
              {extractedData.accountTypes.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {extractedData.accountTypes.map(t => (
                    <span key={t} className="text-[9px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Extracted Rules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {extractedData.rules.map((rule, idx) => {
                const Icon = RULE_ICONS[rule.type as RuleType] || Shield;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="rounded-xl border border-border bg-card p-4 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        rule.severity === 'hard' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                      }`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-foreground truncate">{rule.name}</h4>
                        <span className={`text-[9px] font-mono uppercase ${
                          rule.severity === 'hard' ? 'text-destructive' : 'text-warning'
                        }`}>{rule.severity}</span>
                      </div>
                      <span className="text-sm font-mono font-bold text-foreground">
                        {rule.defaultValue}{rule.unit}
                      </span>
                    </div>
                    {rule.description && (
                      <p className="text-[10px] text-muted-foreground">{rule.description}</p>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleApplyRules}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <Check className="w-4 h-4" />
                Aplicar Regras
              </button>
              <button
                onClick={reset}
                className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Tentar outro documento
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
