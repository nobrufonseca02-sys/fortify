import { useState } from 'react';
import { motion } from 'motion/react';
import { FileCheck, Save, CheckCircle2, Star } from 'lucide-react';
import { AccountSelector } from '@/components/AccountSelector';
import { useAccountsStore } from '@/hooks/useAccountsStore';
import { TradingAccount } from '@/types/fortify';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

const ADHERENCE_OPTIONS = ['Segui o plano', 'Desviei parcialmente', 'Não segui o plano', 'Não tinha plano'];

const PostSessionReview = () => {
  const { accounts } = useAccountsStore();
  const { session } = useAuth();
  const [selectedAccount, setSelectedAccount] = useState<TradingAccount>(accounts[0]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [result, setResult] = useState('');
  const [adherence, setAdherence] = useState('');
  const [opError, setOpError] = useState('');
  const [emoError, setEmoError] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSave = async () => {
    if (!session?.user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('post_session_reviews').insert({
        user_id: session.user.id,
        trading_account_id: selectedAccount?.id || null,
        result: result ? parseFloat(result) : null,
        plan_adherence: adherence || null,
        operational_error: opError || null,
        emotional_error: emoError || null,
        session_rating: rating > 0 ? rating : null,
        comment: comment || null,
      });
      if (error) throw error;
      setSaved(true);
      toast({ title: 'Revisão salva', description: 'Sua revisão pós-sessão foi registrada.' });
    } catch {
      toast({ title: 'Erro ao salvar', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setResult('');
    setAdherence('');
    setOpError('');
    setEmoError('');
    setRating(0);
    setComment('');
    setSaved(false);
  };

  if (!selectedAccount) {
    return <div className="p-6 text-center text-muted-foreground">Nenhuma conta cadastrada.</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FileCheck className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Revisão Pós-Sessão</h1>
        </div>
        <p className="text-xs text-muted-foreground">Registre o que aconteceu hoje. Disciplina se constrói com reflexão.</p>
      </div>

      <AccountSelector accounts={accounts} selected={selectedAccount} onSelect={setSelectedAccount} />

      {saved ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl border border-success/20 bg-success/10 p-8 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
          <div>
            <p className="text-lg font-bold text-foreground">Revisão registrada</p>
            <p className="text-sm text-muted-foreground mt-1">Você está construindo disciplina. Continue assim.</p>
          </div>
          <Button variant="outline" onClick={resetForm}>Nova revisão</Button>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-6 space-y-5">
          {/* Result */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Resultado do dia ($)</label>
            <Input type="number" value={result} onChange={e => setResult(e.target.value)} placeholder="Ex.: 350 ou -200" step="1" />
          </div>

          {/* Adherence */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Aderência ao plano</label>
            <div className="flex flex-wrap gap-2">
              {ADHERENCE_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => setAdherence(opt)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    adherence === opt
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Errors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Erro operacional</label>
              <textarea
                value={opError}
                onChange={e => setOpError(e.target.value)}
                placeholder="Ex.: Entrei sem confirmação, movi o stop..."
                className="flex w-full rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 min-h-[70px] resize-none transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Erro emocional</label>
              <textarea
                value={emoError}
                onChange={e => setEmoError(e.target.value)}
                placeholder="Ex.: Operei por vingança, ansiedade, tilt..."
                className="flex w-full rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 min-h-[70px] resize-none transition-all duration-200"
              />
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Nota da sessão (1-10)</label>
            <div className="flex gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  className={`w-9 h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                    n <= rating
                      ? n <= 3 ? 'bg-destructive/20 text-destructive' :
                        n <= 6 ? 'bg-warning/20 text-warning' :
                        'bg-success/20 text-success'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Comentário rápido</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Qualquer observação relevante sobre a sessão..."
              className="flex w-full rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 min-h-[70px] resize-none transition-all duration-200"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="btn-glow w-full md:w-auto">
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Revisão'}
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default PostSessionReview;
