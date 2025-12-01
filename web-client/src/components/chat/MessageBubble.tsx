import type { Message } from '@/types/chat';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
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
        message.isCurrentUser ? 'items-end' : 'items-start'
      )}
    >
      {!message.isCurrentUser && (
        <span className="text-xs text-muted-foreground mb-1 px-2">
          {message.sender}
        </span>
      )}

      <div
        className={cn(
          'max-w-[70%] rounded-lg px-4 py-2',
          message.isCurrentUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}
      >
        <p className="text-sm">{message.content}</p>
      </div>

      <span className="text-xs text-muted-foreground mt-1 px-2">
        {formatTime(message.timestamp)}
      </span>
    </div>
  );
}
