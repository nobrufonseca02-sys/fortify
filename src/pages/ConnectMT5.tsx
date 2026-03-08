import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Cable, Info, Server, ShieldCheck } from "lucide-react";
import { useCreateMT5Connection } from "@/hooks/useMT5Connections";

export default function ConnectMT5() {
  const navigate = useNavigate();
  const createConnection = useCreateMT5Connection();

  const [form, setForm] = useState({
    account_name: "",
    mt5_login: "",
    mt5_server: "",
    broker_name: "",
    account_type: "demo",
    prop_firm: "",
  });

  const isValid = form.account_name && form.mt5_login && form.mt5_server && form.broker_name;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    createConnection.mutate(form, {
      onSuccess: () => navigate("/mt5"),
    });
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/mt5")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Conectar Conta MT5</h1>
          <p className="text-xs text-muted-foreground">Adicione suas credenciais para sincronização automática</p>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-info/30 bg-info/5">
        <CardContent className="p-4 flex gap-3">
          <Info className="h-5 w-5 text-info shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Como funciona a integração?</p>
            <p>Suas credenciais serão armazenadas de forma segura. Um backend externo realizará a conexão real com o servidor MT5 e sincronizará seus dados automaticamente (trades, saldo, equity, posições).</p>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Cable className="h-4 w-4 text-primary" />
              Dados da Conta
            </CardTitle>
            <CardDescription>Preencha as informações da sua conta MetaTrader 5</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account_name">Nome da Conta</Label>
                <Input
                  id="account_name"
                  placeholder="Ex: Conta FTMO Phase 1"
                  value={form.account_name}
                  onChange={(e) => updateField("account_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mt5_login">Login MT5</Label>
                <Input
                  id="mt5_login"
                  placeholder="Ex: 12345678"
                  value={form.mt5_login}
                  onChange={(e) => updateField("mt5_login", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mt5_server">Servidor MT5</Label>
                <div className="relative">
                  <Server className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="mt5_server"
                    className="pl-9"
                    placeholder="Ex: FTMO-Server3"
                    value={form.mt5_server}
                    onChange={(e) => updateField("mt5_server", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="broker_name">Broker</Label>
                <Input
                  id="broker_name"
                  placeholder="Ex: FTMO, Darwinex"
                  value={form.broker_name}
                  onChange={(e) => updateField("broker_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Conta</Label>
                <Select value={form.account_type} onValueChange={(v) => updateField("account_type", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="demo">Demo</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="challenge">Challenge / Avaliação</SelectItem>
                    <SelectItem value="funded">Funded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prop_firm">Prop Firm (opcional)</Label>
                <Input
                  id="prop_firm"
                  placeholder="Ex: FTMO, Alpha Capital"
                  value={form.prop_firm}
                  onChange={(e) => updateField("prop_firm", e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              Credenciais armazenadas com criptografia. Somente leitura — sem acesso a ordens.
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate("/mt5")}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!isValid || createConnection.isPending}>
                {createConnection.isPending ? "Registrando..." : "Conectar Conta"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
