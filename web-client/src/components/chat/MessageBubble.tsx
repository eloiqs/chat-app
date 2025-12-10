import { cn } from '@/lib/utils';
import type { ClientMessage } from '@/types/types';
import { Loader2, AlertCircle, X, RotateCcw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState } from 'react';

export function MessageBubble({
  message,
  onRetry,
  onDelete,
}: {
  message: ClientMessage;
  onRetry?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);

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
      data-testid={`message-${message.id}`}
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
          message.error && 'opacity-60',
          message.sending && 'opacity-70',
        )}
      >
        <p className="text-sm">{message.content}</p>
      </div>

      {message.error ? (
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              className="text-xs text-red-500 dark:text-red-400 mt-1 px-2 flex items-center gap-1 hover:text-red-600 dark:hover:text-red-300 cursor-pointer"
            >
              <AlertCircle className="h-3 w-3" />
              Not sent. Tap for options.
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-auto p-2 flex flex-col gap-1">
            <button
              onClick={() => {
                onRetry?.(message.id, message.content);
                setPopoverOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 hover:bg-accent rounded text-sm whitespace-nowrap"
            >
              <RotateCcw className="h-4 w-4" />
              Retry
            </button>
            {onDelete && (
              <button
                onClick={() => {
                  onDelete(message.id);
                  setPopoverOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2 hover:bg-accent rounded text-sm whitespace-nowrap"
              >
                <X className="h-4 w-4" />
                Delete
              </button>
            )}
          </PopoverContent>
        </Popover>
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
