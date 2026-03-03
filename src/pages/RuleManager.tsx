import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Plus, Trash2, Copy, ToggleLeft, ToggleRight,
  ChevronDown, Settings2, Layers, FileText, Pencil, Check, X, ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RULE_SET_TEMPLATES, TEMPLATE_RULES } from '@/data/mockData';
import { Rule, RuleType, RuleSeverity, EvaluationScope, RULE_TYPE_LABELS, RULE_TYPE_DESCRIPTIONS } from '@/types/fortify';
import { RuleEditorModal } from '@/components/RuleEditorModal';
import { toast } from 'sonner';

const RuleManager = () => {
  const [customRuleSets, setCustomRuleSets] = useState<{ id: string; name: string; rules: Rule[] }[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tpl-ftmo');
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newRuleSetName, setNewRuleSetName] = useState('');
  const [showNewRuleSetInput, setShowNewRuleSetInput] = useState(false);

  // Template rules for selected template
  const templateRules = TEMPLATE_RULES.filter(r => r.ruleSetId === selectedTemplateId);
  const selectedTemplate = RULE_SET_TEMPLATES.find(t => t.id === selectedTemplateId);

  // Duplicate template as custom
  const duplicateTemplate = () => {
    const rules = TEMPLATE_RULES.filter(r => r.ruleSetId === selectedTemplateId).map((r, i) => ({
      ...r,
      id: `custom-${Date.now()}-${i}`,
      ruleSetId: `crs-${Date.now()}`,
    }));
    const newSet = {
      id: `crs-${Date.now()}`,
      name: `${selectedTemplate?.name || 'Template'} (Cópia)`,
      rules,
    };
    setCustomRuleSets(prev => [...prev, newSet]);
    toast.success('Template duplicado como conjunto customizado');
  };

  // Add new custom rule set
  const addCustomRuleSet = () => {
    if (!newRuleSetName.trim()) return;
    setCustomRuleSets(prev => [...prev, {
      id: `crs-${Date.now()}`,
      name: newRuleSetName.trim(),
      rules: [],
    }]);
    setNewRuleSetName('');
    setShowNewRuleSetInput(false);
    toast.success('Conjunto de regras criado');
  };

  // Delete custom rule set
  const deleteRuleSet = (setId: string) => {
    setCustomRuleSets(prev => prev.filter(s => s.id !== setId));
    toast.success('Conjunto removido');
  };

  // Toggle rule enabled
  const toggleRule = (setId: string, ruleId: string) => {
    setCustomRuleSets(prev => prev.map(s =>
      s.id === setId ? {
        ...s,
        rules: s.rules.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r)
      } : s
    ));
  };

  // Delete rule from custom set
  const deleteRule = (setId: string, ruleId: string) => {
    setCustomRuleSets(prev => prev.map(s =>
      s.id === setId ? { ...s, rules: s.rules.filter(r => r.id !== ruleId) } : s
    ));
    toast.success('Regra removida');
  };

  // Save rule (create or edit)
  const saveRule = (rule: Rule, setId: string) => {
    setCustomRuleSets(prev => prev.map(s => {
      if (s.id !== setId) return s;
      const exists = s.rules.find(r => r.id === rule.id);
      if (exists) {
        return { ...s, rules: s.rules.map(r => r.id === rule.id ? rule : r) };
      }
      return { ...s, rules: [...s.rules, rule] };
    }));
    setEditingRule(null);
    setIsCreating(false);
    toast.success(editingRule ? 'Regra atualizada' : 'Regra criada');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">GERENCIAR REGRAS</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Rule Engine Config</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="w-full max-w-md">
            <TabsTrigger value="templates" className="flex-1 gap-2">
              <Layers className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex-1 gap-2">
              <FileText className="w-4 h-4" />
              Customizados
            </TabsTrigger>
          </TabsList>

          {/* === TEMPLATES TAB === */}
          <TabsContent value="templates" className="space-y-4 mt-4">
            <div className="flex items-center gap-3">
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RULE_SET_TEMPLATES.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={duplicateTemplate} className="gap-2">
                <Copy className="w-4 h-4" />
                Duplicar como Custom
              </Button>
            </div>

            <div className="grid gap-3">
              {templateRules.map((rule, i) => (
                <TemplateRuleRow key={rule.id} rule={rule} index={i} />
              ))}
            </div>

            {templateRules.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma regra neste template.</p>
            )}
          </TabsContent>

          {/* === CUSTOM TAB === */}
          <TabsContent value="custom" className="space-y-4 mt-4">
            {/* New rule set button */}
            <div className="flex items-center gap-3">
              {showNewRuleSetInput ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newRuleSetName}
                    onChange={e => setNewRuleSetName(e.target.value)}
                    placeholder="Nome do conjunto (ex: Minha Mesa FTMO)"
                    className="w-72"
                    onKeyDown={e => e.key === 'Enter' && addCustomRuleSet()}
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" onClick={addCustomRuleSet}><Check className="w-4 h-4 text-success" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setShowNewRuleSetInput(false)}><X className="w-4 h-4" /></Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setShowNewRuleSetInput(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Conjunto de Regras
                </Button>
              )}
            </div>

            {/* Custom rule sets */}
            <AnimatePresence>
              {customRuleSets.map(ruleSet => (
                <motion.div
                  key={ruleSet.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <CustomRuleSetCard
                    ruleSet={ruleSet}
                    onToggleRule={(ruleId) => toggleRule(ruleSet.id, ruleId)}
                    onDeleteRule={(ruleId) => deleteRule(ruleSet.id, ruleId)}
                    onEditRule={(rule) => { setEditingRule(rule); setIsCreating(false); }}
                    onAddRule={() => { setEditingRule(null); setIsCreating(true); }}
                    onDeleteSet={() => deleteRuleSet(ruleSet.id)}
                    onSaveRule={(rule) => saveRule(rule, ruleSet.id)}
                    isCreating={isCreating}
                    editingRule={editingRule}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {customRuleSets.length === 0 && (
              <div className="text-center py-12 text-muted-foreground space-y-2">
                <Settings2 className="w-10 h-10 mx-auto opacity-30" />
                <p className="text-sm">Nenhum conjunto customizado ainda.</p>
                <p className="text-xs">Crie um novo ou duplique um template.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

// === Template Rule Row (read-only) ===
function TemplateRuleRow({ rule, index }: { rule: Rule; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="rounded-lg border border-border bg-card">
          <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm text-foreground">{rule.name}</span>
              <Badge variant={rule.severity === 'hard' ? 'destructive' : 'secondary'} className="text-[10px]">
                {rule.severity}
              </Badge>
              <Badge variant="outline" className="text-[10px] font-mono">
                {rule.evaluationScope}
              </Badge>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 pb-3 border-t border-border/50 pt-3 space-y-2">
              <p className="text-xs text-muted-foreground">{RULE_TYPE_DESCRIPTIONS[rule.type]}</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(rule.params).map(([key, val]) => (
                  <span key={key} className="text-[10px] font-mono px-2 py-1 rounded bg-muted text-muted-foreground">
                    {key}: {String(val)}
                  </span>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </motion.div>
  );
}

// === Custom Rule Set Card ===
interface CustomRuleSetCardProps {
  ruleSet: { id: string; name: string; rules: Rule[] };
  onToggleRule: (ruleId: string) => void;
  onDeleteRule: (ruleId: string) => void;
  onEditRule: (rule: Rule) => void;
  onAddRule: () => void;
  onDeleteSet: () => void;
  onSaveRule: (rule: Rule) => void;
  isCreating: boolean;
  editingRule: Rule | null;
}

function CustomRuleSetCard({
  ruleSet, onToggleRule, onDeleteRule, onEditRule, onAddRule, onDeleteSet, onSaveRule, isCreating, editingRule
}: CustomRuleSetCardProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [localEditRule, setLocalEditRule] = useState<Rule | null>(null);

  const openCreate = () => {
    setLocalEditRule(null);
    setShowEditor(true);
  };

  const openEdit = (rule: Rule) => {
    setLocalEditRule(rule);
    setShowEditor(true);
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            {ruleSet.name}
            <Badge variant="outline" className="text-[10px] font-mono ml-2">{ruleSet.rules.length} regras</Badge>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={openCreate} className="gap-1 text-xs">
              <Plus className="w-3 h-3" /> Regra
            </Button>
            <Button variant="ghost" size="icon" onClick={onDeleteSet} className="text-destructive/70 hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {ruleSet.rules.map(rule => (
          <div key={rule.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30 border border-border/50">
            <Switch checked={rule.enabled} onCheckedChange={() => onToggleRule(rule.id)} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${!rule.enabled ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                  {rule.name}
                </span>
                <Badge variant={rule.severity === 'hard' ? 'destructive' : 'secondary'} className="text-[10px]">
                  {rule.severity}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono">
                {RULE_TYPE_LABELS[rule.type]} • {rule.evaluationScope}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(rule)}>
              <Pencil className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={() => onDeleteRule(rule.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}

        {ruleSet.rules.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhuma regra. Clique em "+ Regra" para adicionar.
          </p>
        )}
      </CardContent>

      <RuleEditorModal
        open={showEditor}
        onClose={() => setShowEditor(false)}
        onSave={(rule) => {
          onSaveRule({ ...rule, ruleSetId: ruleSet.id });
          setShowEditor(false);
        }}
        existingRule={localEditRule}
        ruleSetId={ruleSet.id}
      />
    </Card>
  );
}

export default RuleManager;
