import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Users, Shield, ScrollText, Activity, Settings2, AlertTriangle,
  FileText, Plus, Pencil, Trash2, Search, Eye, Ban, CheckCircle2, ShieldOff
} from 'lucide-react';
import { RULE_SET_TEMPLATES, TEMPLATE_RULES, MOCK_ACCOUNTS, MOCK_EVALUATIONS } from '@/data/mockData';
import { RULE_TYPE_LABELS, type RuleType } from '@/types/fortify';
import { toast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';

// ─── Mock Admin Data ───
const MOCK_USERS = [
  { id: 'u1', name: 'Carlos Souza', email: 'carlos@email.com', plan: 'pro', active: true, accounts: 3, joinedAt: '2026-01-15' },
  { id: 'u2', name: 'Ana Lima', email: 'ana@email.com', plan: 'free', active: true, accounts: 1, joinedAt: '2026-02-02' },
  { id: 'u3', name: 'Pedro Ramos', email: 'pedro@email.com', plan: 'pro', active: false, accounts: 2, joinedAt: '2026-01-20' },
  { id: 'u4', name: 'Julia Costa', email: 'julia@email.com', plan: 'enterprise', active: true, accounts: 5, joinedAt: '2025-12-10' },
  { id: 'u5', name: 'Marcos Dias', email: 'marcos@email.com', plan: 'free', active: true, accounts: 0, joinedAt: '2026-03-01' },
];

const MOCK_LOGS = [
  { id: 'l1', timestamp: '2026-03-08 09:12', user: 'Carlos Souza', action: 'Conta criada', detail: 'FTMO 100k Challenge' },
  { id: 'l2', timestamp: '2026-03-08 08:45', user: 'Sistema', action: 'Regra violada', detail: 'Hantec 50k — Daily Loss' },
  { id: 'l3', timestamp: '2026-03-07 22:10', user: 'Ana Lima', action: 'Login', detail: 'IP 189.44.x.x' },
  { id: 'l4', timestamp: '2026-03-07 18:30', user: 'Admin', action: 'Template editado', detail: 'FTMO Challenge v2' },
  { id: 'l5', timestamp: '2026-03-07 14:00', user: 'Pedro Ramos', action: 'Conta desativada', detail: 'Topstep 100k' },
  { id: 'l6', timestamp: '2026-03-06 11:20', user: 'Sistema', action: 'Warning emitido', detail: 'FTMO 100k — Max Loss 72%' },
];

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-muted text-muted-foreground',
  pro: 'bg-primary/15 text-primary',
  enterprise: 'bg-warning/15 text-warning',
};

const fmt = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

// ─── Global Config Mock ───
const DEFAULT_GLOBAL_CONFIG = {
  appName: 'FORTIFY',
  tagline: 'Controle de Risco para Prop Firms',
  maxAccountsPerUser: '10',
  defaultRiskPercent: '1',
  maintenanceMode: false,
  signupEnabled: true,
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState(MOCK_USERS);
  const [searchUser, setSearchUser] = useState('');
  const [templateModal, setTemplateModal] = useState<{ open: boolean; mode: 'create' | 'edit'; templateId?: string }>({ open: false, mode: 'create' });
  const [templateForm, setTemplateForm] = useState({ name: '', firmName: '' });
  const [globalConfig, setGlobalConfig] = useState(DEFAULT_GLOBAL_CONFIG);

  // ─── Users ───
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  const toggleUserActive = (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: !u.active } : u));
    toast({ title: 'Usuário atualizado' });
  };

  const setUserPlan = (userId: string, plan: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan } : u));
    toast({ title: 'Plano atualizado' });
  };

  // ─── Risk Accounts ───
  const riskAccounts = MOCK_ACCOUNTS.filter(acc => {
    const evals = MOCK_EVALUATIONS.filter(e => e.tradingAccountId === acc.id);
    return evals.some(e => e.status === 'WARNING' || e.status === 'VIOLATED');
  });

  // ─── Stats ───
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.active).length;
  const totalAccounts = MOCK_ACCOUNTS.length;
  const riskCount = riskAccounts.length;

  const openTemplateEditor = (mode: 'create' | 'edit', templateId?: string) => {
    if (mode === 'edit' && templateId) {
      const t = RULE_SET_TEMPLATES.find(t => t.id === templateId);
      if (t) setTemplateForm({ name: t.name, firmName: t.firmName || '' });
    } else {
      setTemplateForm({ name: '', firmName: '' });
    }
    setTemplateModal({ open: true, mode, templateId });
  };

  const saveTemplate = () => {
    toast({ title: templateModal.mode === 'create' ? 'Template criado' : 'Template atualizado', description: templateForm.name });
    setTemplateModal({ open: false, mode: 'create' });
  };

  const saveGlobalConfig = () => {
    toast({ title: 'Configurações globais salvas' });
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" /> Painel Administrativo
        </h1>
        <p className="text-sm text-muted-foreground">Gerencie usuários, templates, contas em risco e configurações globais.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Usuários', value: totalUsers, icon: Users, accent: 'text-primary' },
          { label: 'Ativos', value: activeUsers, icon: CheckCircle2, accent: 'text-success' },
          { label: 'Contas', value: totalAccounts, icon: Activity, accent: 'text-info' },
          { label: 'Em Risco', value: riskCount, icon: AlertTriangle, accent: 'text-warning' },
        ].map(s => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${s.accent}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted border border-border grid grid-cols-5 w-full md:w-auto md:inline-grid">
          <TabsTrigger value="users" className="text-xs gap-1"><Users className="h-3 w-3" /> Usuários</TabsTrigger>
          <TabsTrigger value="templates" className="text-xs gap-1"><ScrollText className="h-3 w-3" /> Templates</TabsTrigger>
          <TabsTrigger value="risk" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" /> Risco</TabsTrigger>
          <TabsTrigger value="logs" className="text-xs gap-1"><FileText className="h-3 w-3" /> Logs</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs gap-1"><Settings2 className="h-3 w-3" /> Config</TabsTrigger>
        </TabsList>

        {/* ── TAB: USERS ── */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar usuário..." value={searchUser} onChange={e => setSearchUser(e.target.value)} className="pl-9 bg-card border-border" />
            </div>
          </div>

          <Card className="bg-card border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Nome</TableHead>
                  <TableHead className="text-muted-foreground">Email</TableHead>
                  <TableHead className="text-muted-foreground">Plano</TableHead>
                  <TableHead className="text-muted-foreground text-center">Contas</TableHead>
                  <TableHead className="text-muted-foreground text-center">Status</TableHead>
                  <TableHead className="text-muted-foreground text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(u => (
                  <TableRow key={u.id} className="border-border">
                    <TableCell className="font-medium text-foreground">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Select value={u.plan} onValueChange={v => setUserPlan(u.id, v)}>
                        <SelectTrigger className="w-28 h-7 text-xs bg-transparent border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center text-foreground">{u.accounts}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={u.active ? 'bg-success/15 text-success border-0' : 'bg-destructive/15 text-destructive border-0'}>
                        {u.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleUserActive(u.id)}>
                          {u.active ? <Ban className="h-3.5 w-3.5 text-destructive" /> : <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── TAB: TEMPLATES ── */}
        <TabsContent value="templates" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Templates de regras para prop firms</p>
            <Button size="sm" onClick={() => openTemplateEditor('create')} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Novo Template
            </Button>
          </div>

          <div className="grid gap-3">
            {RULE_SET_TEMPLATES.map(tpl => {
              const rules = TEMPLATE_RULES.filter(r => r.ruleSetId === tpl.id);
              return (
                <Card key={tpl.id} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{tpl.name}</h3>
                        <p className="text-xs text-muted-foreground">{tpl.firmName} · v{tpl.version} · {rules.length} regras</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openTemplateEditor('edit', tpl.id)}>
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {rules.map(r => (
                        <Badge key={r.id} variant="secondary" className="text-xs bg-muted border-0 text-muted-foreground">
                          {RULE_TYPE_LABELS[r.type as RuleType] || r.type}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── TAB: RISK ── */}
        <TabsContent value="risk" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">Contas com regras em Warning ou Violadas</p>
          {riskAccounts.length === 0 ? (
            <Card className="bg-card border-border"><CardContent className="p-6 text-center text-muted-foreground text-sm">Nenhuma conta em risco no momento.</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {riskAccounts.map(acc => {
                const evals = MOCK_EVALUATIONS.filter(e => e.tradingAccountId === acc.id);
                const warnings = evals.filter(e => e.status === 'WARNING');
                const violations = evals.filter(e => e.status === 'VIOLATED');
                const user = MOCK_USERS.find(u => u.id === acc.userId);
                return (
                  <Card key={acc.id} className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{acc.nickname}</h3>
                          <p className="text-xs text-muted-foreground">{user?.name || acc.userId} · {acc.broker}</p>
                        </div>
                        <div className="flex gap-2">
                          {warnings.length > 0 && (
                            <Badge className="bg-warning/15 text-warning border-0 text-xs">{warnings.length} Warning</Badge>
                          )}
                          {violations.length > 0 && (
                            <Badge className="bg-destructive/15 text-destructive border-0 text-xs">{violations.length} Violada</Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-xs mt-2">
                        <div><span className="text-muted-foreground">Saldo Inicial</span><p className="text-foreground font-medium">{fmt(acc.startBalance)}</p></div>
                        <div><span className="text-muted-foreground">Saldo Atual</span><p className="text-foreground font-medium">{fmt(acc.currentBalance)}</p></div>
                        <div><span className="text-muted-foreground">Equity</span><p className="text-foreground font-medium">{fmt(acc.currentEquity)}</p></div>
                      </div>
                      <div className="mt-3 space-y-1">
                        {evals.filter(e => e.status === 'WARNING' || e.status === 'VIOLATED').map(e => (
                          <div key={e.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-muted">
                            <span className="text-foreground">{e.rule.name}</span>
                            <span className={e.status === 'VIOLATED' ? 'text-destructive' : 'text-warning'}>{e.message}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TAB: LOGS ── */}
        <TabsContent value="logs" className="space-y-4 mt-4">
          <Card className="bg-card border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Timestamp</TableHead>
                  <TableHead className="text-muted-foreground">Usuário</TableHead>
                  <TableHead className="text-muted-foreground">Ação</TableHead>
                  <TableHead className="text-muted-foreground">Detalhe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_LOGS.map(log => (
                  <TableRow key={log.id} className="border-border">
                    <TableCell className="text-xs text-muted-foreground font-mono">{log.timestamp}</TableCell>
                    <TableCell className="text-sm text-foreground">{log.user}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs bg-muted border-0">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── TAB: SETTINGS ── */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">Configurações Globais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Nome da Plataforma</Label>
                  <Input value={globalConfig.appName} onChange={e => setGlobalConfig(p => ({ ...p, appName: e.target.value }))} className="bg-muted border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tagline</Label>
                  <Input value={globalConfig.tagline} onChange={e => setGlobalConfig(p => ({ ...p, tagline: e.target.value }))} className="bg-muted border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Máx. Contas por Usuário</Label>
                  <Input type="number" value={globalConfig.maxAccountsPerUser} onChange={e => setGlobalConfig(p => ({ ...p, maxAccountsPerUser: e.target.value }))} className="bg-muted border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Risco Padrão por Trade (%)</Label>
                  <Input type="number" value={globalConfig.defaultRiskPercent} onChange={e => setGlobalConfig(p => ({ ...p, defaultRiskPercent: e.target.value }))} className="bg-muted border-border" />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground">Modo Manutenção</p>
                    <p className="text-xs text-muted-foreground">Desabilita acesso de usuários</p>
                  </div>
                  <Switch checked={globalConfig.maintenanceMode} onCheckedChange={v => setGlobalConfig(p => ({ ...p, maintenanceMode: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground">Cadastro Habilitado</p>
                    <p className="text-xs text-muted-foreground">Permite novos registros</p>
                  </div>
                  <Switch checked={globalConfig.signupEnabled} onCheckedChange={v => setGlobalConfig(p => ({ ...p, signupEnabled: v }))} />
                </div>
              </div>

              <Button onClick={saveGlobalConfig} className="mt-2">Salvar Configurações</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Editor Modal */}
      <Dialog open={templateModal.open} onOpenChange={o => setTemplateModal(p => ({ ...p, open: o }))}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{templateModal.mode === 'create' ? 'Novo Template' : 'Editar Template'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">Configure o nome e a prop firm do template de regras.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nome do Template</Label>
              <Input value={templateForm.name} onChange={e => setTemplateForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: FTMO Challenge Phase 1" className="bg-muted border-border" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Prop Firm</Label>
              <Input value={templateForm.firmName} onChange={e => setTemplateForm(p => ({ ...p, firmName: e.target.value }))} placeholder="Ex: FTMO" className="bg-muted border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateModal(p => ({ ...p, open: false }))}>Cancelar</Button>
            <Button onClick={saveTemplate}>{templateModal.mode === 'create' ? 'Criar' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
