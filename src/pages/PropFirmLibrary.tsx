import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Check, ChevronRight, Globe, ExternalLink, BookOpen,
  Shield, Flame, TrendingUp, Target, Clock, BarChart3, Newspaper,
  Zap, Layers, Activity, Calendar, DollarSign, Percent, Building2,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  usePropFirms, usePrograms, useProgramRules,
  type PropFirm, type Program, type RuleInstance,
} from '@/hooks/usePropFirmLibrary';
import { Button } from '@/components/ui/button';
import { BetaResponsibilityNotice } from '@/components/BetaReadinessChecklist';

const RULE_ICONS: Record<string, React.ElementType> = {
  max_daily_loss: Flame,
  max_total_loss: Shield,
  trailing_drawdown: TrendingUp,
  floating_loss_limit: Activity,
  profit_target: Target,
  min_trading_days: Clock,
  profitable_days: Calendar,
  consistency_best_day_cap: BarChart3,
  inactivity_limit: Activity,
  news_restriction: Newspaper,
  scalping_restriction: Zap,
  weekend_holding: Calendar,
  payout_eligibility: DollarSign,
  profit_split: Percent,
  payout_frequency: Calendar,
  leverage_limit: Layers,
};

const CATEGORY_ORDER = ['risk', 'target', 'activity', 'consistency', 'restriction', 'payout'];

const CATEGORY_LABELS: Record<string, string> = {
  risk: 'Regras Principais',
  target: 'Metas',
  activity: 'Regras de Avaliação',
  consistency: 'Consistência',
  restriction: 'Regras Operacionais',
  payout: 'Regras de Payout',
};

const CATEGORY_COLORS: Record<string, string> = {
  risk: 'text-destructive bg-destructive/10',
  target: 'text-primary bg-primary/10',
  activity: 'text-warning bg-warning/10',
  consistency: 'text-info bg-info/10',
  restriction: 'text-muted-foreground bg-muted',
  payout: 'text-success bg-success/10',
};

const FIRM_LOGOS: Record<string, string> = {
  ftmo: 'F',
  hantec: 'H',
  topstep: 'T',
  fundednext: 'FN',
  the5ers: '5',
  apex: 'AT',
  e8markets: 'E8',
  fxify: 'FX',
  fundscap: 'FC',
  alphacapitalgroup: 'AC',
  thetradingpit: 'TP',
  fundingpips: 'FP',
  custom: 'C',
};

const PropFirmLibrary = () => {
  const navigate = useNavigate();
  const [selectedFirmId, setSelectedFirmId] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  const { data: firms = [], isLoading: firmsLoading } = usePropFirms();
  const { data: programs = [], isLoading: programsLoading } = usePrograms(selectedFirmId);
  const { data: programData, isLoading: rulesLoading } = useProgramRules(selectedProgramId);

  const rules = programData?.rules ?? [];
  const version = programData?.version;

  const selectedFirm = firms.find(f => f.id === selectedFirmId);
  const selectedProgram = programs.find(p => p.id === selectedProgramId);

  const currentStep = selectedProgramId ? 2 : selectedFirmId ? 1 : 0;

  const handleSelectFirm = (firm: PropFirm) => {
    setSelectedFirmId(firm.id);
    setSelectedProgramId(null);
  };

  const handleSelectProgram = (program: Program) => {
    setSelectedProgramId(program.id);
  };

  const goBack = () => {
    if (selectedProgramId) setSelectedProgramId(null);
    else if (selectedFirmId) setSelectedFirmId(null);
  };

  // Group rules by category in defined order
  const groupedRules = rules.reduce<Record<string, RuleInstance[]>>((acc, rule) => {
    const cat = rule.rule_definition?.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(rule);
    return acc;
  }, {});

  const sortedCategories = CATEGORY_ORDER.filter(c => groupedRules[c]);

  const steps = ['Prop Firm', 'Programa', 'Regras'];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => currentStep === 0 ? navigate('/') : goBack()} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Prop Firm Library</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {currentStep === 0 && 'Selecione uma prop firm para ver seus programas e regras'}
            {currentStep === 1 && `${selectedFirm?.name} — Escolha um programa`}
            {currentStep === 2 && `${selectedFirm?.name} • ${selectedProgram?.name}`}
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <span
              className={`px-2 py-1 rounded-md transition-colors ${
                i < currentStep ? 'bg-primary/15 text-primary cursor-pointer' :
                i === currentStep ? 'bg-primary text-primary-foreground font-medium' :
                'bg-muted text-muted-foreground'
              }`}
              onClick={() => {
                if (i === 0) { setSelectedFirmId(null); setSelectedProgramId(null); }
                if (i === 1 && selectedFirmId) { setSelectedProgramId(null); }
              }}
            >
              {i < currentStep ? (
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {i === 0 && selectedFirm?.name}
                  {i === 1 && selectedProgram?.name}
                </span>
              ) : s}
            </span>
            {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
          </div>
        ))}
      </div>

      <BetaResponsibilityNotice variant="rules" />

      <AnimatePresence mode="wait">
        {/* ─── Step 0: Prop Firms ─── */}
        {currentStep === 0 && (
          <motion.div key="firms" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {firmsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
                    <div className="w-12 h-12 rounded-lg bg-muted mb-3" />
                    <div className="h-4 w-24 bg-muted rounded mb-2" />
                    <div className="h-3 w-32 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {firms.map(firm => {
                  const logo = FIRM_LOGOS[firm.slug] || firm.name.charAt(0);
                  const firmColor = firm.color ? `hsl(${firm.color})` : 'hsl(var(--primary))';
                  return (
                    <button
                      key={firm.id}
                      onClick={() => handleSelectFirm(firm)}
                      className="group relative rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
                    >
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold mb-3" style={{ background: `${firmColor}20`, color: firmColor }}>
                        {logo}
                      </div>
                      <h3 className="font-semibold text-foreground text-sm">{firm.name}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{firm.category.replace('_', ' ')}</span>
                        {firm.website && <Globe className="w-3 h-3 text-muted-foreground" />}
                      </div>
                      <ChevronRight className="absolute top-1/2 right-3 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ─── Step 1: Programs ─── */}
        {currentStep === 1 && (
          <motion.div key="programs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {selectedFirm && (
              <div className="rounded-xl border border-border bg-card p-4 mb-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: `hsl(${selectedFirm.color || 'var(--primary)'})20`, color: `hsl(${selectedFirm.color || 'var(--primary)'})` }}>
                  {FIRM_LOGOS[selectedFirm.slug] || selectedFirm.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">{selectedFirm.name}</h3>
                  <p className="text-xs text-muted-foreground capitalize">{selectedFirm.category.replace('_', ' ')}</p>
                </div>
                {selectedFirm.website && (
                  <a href={selectedFirm.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                    <ExternalLink className="w-3 h-3" /> Site
                  </a>
                )}
              </div>
            )}

            {programsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse">
                    <div className="h-4 w-40 bg-muted rounded mb-2" />
                    <div className="h-3 w-60 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : programs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum programa encontrado</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {programs.map(prog => (
                  <button
                    key={prog.id}
                    onClick={() => handleSelectProgram(prog)}
                    className="group rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground text-sm">{prog.name}</h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{prog.account_type.replace('_', ' ')}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{prog.market_type}</span>
                        </div>
                        {prog.notes && <p className="text-[11px] text-muted-foreground mt-2">{prog.notes}</p>}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ─── Step 2: Rules ─── */}
        {currentStep === 2 && (
          <motion.div key="rules" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-4">
            {/* Program header with CTA */}
            <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground text-sm">
                  {selectedFirm?.name} — {selectedProgram?.name}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {rules.length} regra{rules.length !== 1 ? 's' : ''} configurada{rules.length !== 1 ? 's' : ''}
                  {version?.source_url && (
                    <a href={version.source_url} target="_blank" rel="noopener noreferrer" className="text-primary ml-2 hover:underline inline-flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Fonte oficial
                    </a>
                  )}
                </p>
                {!version?.source_url && (
                  <p className="text-[11px] text-warning mt-1">
                    Sem fonte oficial anexada nesta versão. Valide no dashboard/contrato da mesa antes de depender do template.
                  </p>
                )}
              </div>
              <Button
                onClick={() => navigate('/accounts/new', {
                  state: {
                    firmId: selectedFirmId,
                    programId: selectedProgramId,
                    firmName: selectedFirm?.name,
                    programName: selectedProgram?.name,
                  }
                })}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Criar conta com este template
              </Button>
            </div>

            {rulesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-muted" />
                      <div className="h-4 w-32 bg-muted rounded" />
                    </div>
                    <div className="h-3 w-48 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : rules.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma regra configurada para este programa</p>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedCategories.map(category => (
                  <div key={category}>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      {CATEGORY_LABELS[category] || category}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {groupedRules[category].map(rule => {
                        const def = rule.rule_definition;
                        const Icon = def ? RULE_ICONS[def.key] || Shield : Shield;
                        const catColor = CATEGORY_COLORS[category] || 'text-muted-foreground bg-muted';
                        return (
                          <div
                            key={rule.id}
                            className={`rounded-xl border p-4 transition-all ${
                              rule.enabled ? 'border-border bg-card' : 'border-border/50 bg-muted/20 opacity-60'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${catColor}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-foreground">{def?.name || 'Regra'}</h3>
                                {def?.description && (
                                  <p className="text-[11px] text-muted-foreground mt-1">{def.description}</p>
                                )}
                                <div className="flex flex-wrap gap-2 mt-2">
                                  <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-foreground">
                                    Limite: {rule.limit_value}{rule.mode === 'percent' ? '%' : ''}
                                  </span>
                                  <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                                    rule.severity === 'hard' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                                  }`}>
                                    {rule.severity}
                                  </span>
                                  {rule.includes_floating && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-info/10 text-info">inclui floating</span>
                                  )}
                                  {rule.daily_reset && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">reset diário</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom CTA */}
            {rules.length > 0 && (
              <div className="pt-4 border-t border-border">
                <Button
                  size="lg"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => navigate('/accounts/new', {
                    state: {
                      firmId: selectedFirmId,
                      programId: selectedProgramId,
                      firmName: selectedFirm?.name,
                      programName: selectedProgram?.name,
                    }
                  })}
                >
                  <Plus className="w-4 h-4" />
                  Criar conta com este template de regras
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PropFirmLibrary;
