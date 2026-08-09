import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Brain, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function CoachAvatar() {
  return (
    <Avatar className="h-8 w-8 shrink-0 border border-primary/25">
      <AvatarFallback className="bg-primary/15 text-primary">
        <Brain className="h-4 w-4" />
      </AvatarFallback>
    </Avatar>
  );
}

export function ChatMessageBubble({ role, content }: ChatMessage) {
  const isAssistant = role === 'assistant';

  return (
    <div className={cn('flex items-start gap-3', isAssistant ? 'flex-row' : 'flex-row-reverse')}>
      {isAssistant ? (
        <CoachAvatar />
      ) : (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-muted text-muted-foreground">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-sm',
          isAssistant
            ? 'bg-muted/40 text-foreground border border-border rounded-tl-sm'
            : 'bg-primary text-primary-foreground rounded-tr-sm',
        )}
      >
        {content}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <CoachAvatar />
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border bg-muted/40 px-4 py-3.5">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
      </div>
    </div>
  );
}
