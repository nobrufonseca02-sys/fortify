import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Cable, PlusCircle, Trash2, RefreshCw, Wifi, TrendingUp, TrendingDown, Clock, Activity } from "lucide-react";
import { MT5StatusBadge } from "@/components/MT5StatusBadge";
import { useMT5Connections, useDeleteMT5Connection, useMT5Positions, useMT5Snapshots, useMT5Trades, type MT5Connection } from "@/hooks/useMT5Connections";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

function ConnectionCard({ conn, onDelete }: { conn: MT5Connection; onDelete: (id: string) => void }) {
  const navigate = useNavigate();
  const { data: positions } = useMT5Positions(conn.id);
  const { data: snapshots } = useMT5Snapshots(conn.id);
  const latestSnapshot = snapshots?.[0];
  const totalFloating = positions?.reduce((sum, p) => sum + Number(p.floating_pnl), 0) ?? 0;

  return (
    <Card className="group hover:border-primary/30 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wifi className="h-3.5 w-3.5 text-primary" />
              {conn.account_name}
            </CardTitle>
            <CardDescription className="text-xs space-x-2">
              <span className="font-mono">{conn.mt5_login}</span>
              <span>•</span>
              <span>{conn.broker_name}</span>
              <span>•</span>
              <span>{conn.mt5_server}</span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <MT5StatusBadge status={conn.connection_status} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover conta MT5?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso removerá a conexão e todos os dados sincronizados. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(conn.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Saldo</p>
            <p className="font-mono text-sm font-semibold text-foreground">
              {latestSnapshot ? `$${Number(latestSnapshot.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Equity</p>
            <p className="font-mono text-sm font-semibold text-foreground">
              {latestSnapshot ? `$${Number(latestSnapshot.equity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">PnL Diário</p>
            <p className={`font-mono text-sm font-semibold ${latestSnapshot && Number(latestSnapshot.daily_pnl) >= 0 ? 'text-success' : 'text-destructive'}`}>
              {latestSnapshot ? `${Number(latestSnapshot.daily_pnl) >= 0 ? '+' : ''}$${Number(latestSnapshot.daily_pnl).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Floating PnL</p>
            <p className={`font-mono text-sm font-semibold ${totalFloating >= 0 ? 'text-success' : 'text-destructive'}`}>
              {positions && positions.length > 0
                ? `${totalFloating >= 0 ? '+' : ''}$${totalFloating.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                : '—'}
            </p>
          </div>
        </div>

        {/* Positions */}
        {positions && positions.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Activity className="h-3 w-3" /> Posições Abertas ({positions.length})
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] h-8">Símbolo</TableHead>
                    <TableHead className="text-[10px] h-8">Volume</TableHead>
                    <TableHead className="text-[10px] h-8">Preço Abertura</TableHead>
                    <TableHead className="text-[10px] h-8">Preço Atual</TableHead>
                    <TableHead className="text-[10px] h-8 text-right">PnL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.slice(0, 5).map((pos) => (
                    <TableRow key={pos.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs font-medium py-2">{pos.symbol}</TableCell>
                      <TableCell className="font-mono text-xs py-2">{Number(pos.volume).toFixed(2)}</TableCell>
                      <TableCell className="font-mono text-xs py-2">{Number(pos.open_price).toFixed(5)}</TableCell>
                      <TableCell className="font-mono text-xs py-2">{Number(pos.current_price).toFixed(5)}</TableCell>
                      <TableCell className={`font-mono text-xs py-2 text-right font-semibold ${Number(pos.floating_pnl) >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {Number(pos.floating_pnl) >= 0 ? '+' : ''}${Number(pos.floating_pnl).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
          <div className="flex items-center gap-3">
            {conn.prop_firm && <Badge variant="outline" className="text-[10px] h-5">{conn.prop_firm}</Badge>}
            <Badge variant="outline" className="text-[10px] h-5">{conn.account_type}</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {conn.last_sync_at
              ? `Sincronizado ${formatDistanceToNow(new Date(conn.last_sync_at), { addSuffix: true, locale: ptBR })}`
              : 'Nunca sincronizado'}
          </div>
        </div>

        {/* Error display */}
        {conn.sync_error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
            <strong>Erro:</strong> {conn.sync_error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MT5Dashboard() {
  const navigate = useNavigate();
  const { data: connections, isLoading } = useMT5Connections();
  const deleteConnection = useDeleteMT5Connection();

  const connected = connections?.filter(c => c.connection_status === 'connected').length ?? 0;
  const total = connections?.length ?? 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Cable className="h-5 w-5 text-primary" />
            Integração MT5
          </h1>
          <p className="text-xs text-muted-foreground">Gerencie suas contas MetaTrader 5 conectadas ao Fortify</p>
        </div>
        <Button onClick={() => navigate("/mt5/connect")} size="sm" className="gap-1.5">
          <PlusCircle className="h-4 w-4" />
          Conectar Conta
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
              <Cable className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Contas Registradas</p>
              <p className="font-mono text-xl font-bold text-foreground">{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/15 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Conectadas</p>
              <p className="font-mono text-xl font-bold text-success">{connected}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/15 flex items-center justify-center">
              <RefreshCw className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Com Erros</p>
              <p className="font-mono text-xl font-bold text-warning">
                {connections?.filter(c => c.connection_status === 'auth_error').length ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connection list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-40" />
            </Card>
          ))}
        </div>
      ) : connections && connections.length > 0 ? (
        <div className="space-y-4">
          {connections.map((conn) => (
            <ConnectionCard
              key={conn.id}
              conn={conn}
              onDelete={(id) => deleteConnection.mutate(id)}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Cable className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Nenhuma conta MT5 conectada</h3>
            <p className="text-xs text-muted-foreground mb-4 max-w-sm">
              Conecte sua conta MetaTrader 5 para sincronizar trades, saldo e equity automaticamente com o Fortify.
            </p>
            <Button onClick={() => navigate("/mt5/connect")} size="sm" className="gap-1.5">
              <PlusCircle className="h-4 w-4" />
              Conectar Primeira Conta
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Integration info */}
      <Card className="border-info/20 bg-info/5">
        <CardContent className="p-4 text-xs text-muted-foreground space-y-2">
          <p className="font-medium text-foreground text-sm">ℹ️ Sobre a integração</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Os dados são sincronizados por um backend externo via API segura</li>
            <li>O Fortify recebe e exibe: saldo, equity, trades, posições e PnL em tempo real</li>
            <li>Regras de risco são avaliadas automaticamente com base nos dados sincronizados</li>
            <li>Nenhuma ordem é executada — acesso somente leitura</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
