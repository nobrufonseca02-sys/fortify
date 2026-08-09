import { useState, type KeyboardEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';

export function ChatComposer({
  onSend,
  disabled,
  sending,
  placeholder = 'Pergunte sobre disciplina, gestão de risco ou o próximo passo com esta conta...',
}: {
  onSend: (message: string) => void;
  disabled?: boolean;
  sending?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState('');

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || sending) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-end gap-2">
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || sending}
          rows={2}
          className="resize-none bg-background"
        />
        <Button
          type="button"
          onClick={submit}
          disabled={disabled || sending || !value.trim()}
          size="icon"
          className="shrink-0"
          aria-label="Enviar mensagem"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground px-1">Enter para enviar · Shift+Enter para nova linha</p>
    </div>
  );
}
