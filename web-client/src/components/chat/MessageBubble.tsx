import { cn } from '@/lib/utils';
import type { Message } from '@/types/types';
import { Loader2, AlertCircle } from 'lucide-react';

export function MessageBubble({
  message,
  onRetry,
}: {
  message: Message;
  onRetry?: (messageId: string, content: string) => void;
}) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={cn(
        'flex flex-col mb-4',
        message.isCurrentUser ? 'items-end' : 'items-start',
      )}
    >
      {!message.isCurrentUser && (
        <span className="text-xs text-muted-foreground mb-1 px-2">
          {message.sender.name}
        </span>
      )}

      <div
        className={cn(
          'max-w-[70%] rounded-lg px-4 py-2',
          message.isCurrentUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted',
          message.error &&
            'opacity-60 cursor-pointer hover:opacity-50 transition-opacity',
          message.sending && 'opacity-70',
        )}
        onClick={
          message.error && onRetry
            ? () => onRetry(message.id, message.content)
            : undefined
        }
      >
        <p className="text-sm">{message.content}</p>
      </div>

      {message.error ? (
        <button
          onClick={() => onRetry?.(message.id, message.content)}
          className="text-xs text-red-500 dark:text-red-400 mt-1 px-2 flex items-center gap-1 hover:text-red-600 dark:hover:text-red-300 cursor-pointer"
        >
          <AlertCircle className="h-3 w-3" />
          Not sent. Tap to retry.
        </button>
      ) : message.sending ? (
        <span className="text-xs text-muted-foreground mt-1 px-2 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Sending...
        </span>
      ) : (
        <span className="text-xs text-muted-foreground mt-1 px-2">
          {formatTime(message.timestamp)}
        </span>
      )}
    </div>
  );
}
