import { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateMT5Connection } from '@/hooks/useMT5';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface FixConnectionTarget {
  tradingAccountId: string;
  accountName: string;
  mt5Login: string;
  mt5Server: string;
  brokerName?: string | null;
}

/**
 * Reenvia a senha MT5 para a MetaApi pela conta já existente do usuário.
 * A senha vai só para o gateway (que a repassa à MetaApi) e não é guardada no
 * Fortify: o campo é limpo ao fechar e em qualquer resultado.
 */
export function FixConnectionDialog({
  target,
  onOpenChange,
}: {
  target: FixConnectionTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const connect = useCreateMT5Connection();
  const [password, setPassword] = useState('');

  const close = () => {
    setPassword('');
    onOpenChange(false);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!target || !user?.id || !password) return;
    try {
      await connect.mutateAsync({
        accountName: target.accountName,
        mt5Login: target.mt5Login,
        mt5Server: target.mt5Server,
        brokerName: target.brokerName || 'Unknown',
        mt5Password: password,
        tradingAccountId: target.tradingAccountId,
        userId: user.id,
      });
      toast({
        title: 'Credenciais enviadas',
        description: 'A MetaApi vai reconectar a conta. Sincronize novamente em alguns minutos.',
      });
      close();
    } catch (error: any) {
      setPassword('');
      toast({
        title: 'Não foi possível reconectar',
        description: error?.message || 'Confira a senha e o servidor e tente de novo.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => (open ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Corrigir conexão MT5</DialogTitle>
          <DialogDescription>
            Informe a senha atual da conta. Ela é enviada só para a MetaApi e não fica salva no Fortify.
          </DialogDescription>
        </DialogHeader>
        {target && (
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">Login</p>
                <p className="font-mono text-foreground">{target.mt5Login}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Servidor</p>
                <p className="font-mono text-foreground break-all">{target.mt5Server}</p>
              </div>
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs text-muted-foreground">Senha MT5</span>
              <Input
                type="password"
                autoComplete="off"
                aria-label="Senha MT5"
                value={password}
                maxLength={256}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
              <Button type="submit" disabled={!password || connect.isPending}>
                {connect.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                Reconectar
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
