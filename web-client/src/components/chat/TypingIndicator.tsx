import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  userNames?: string[];
  compact?: boolean;
  className?: string;
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="animate-pulse [animation-delay:0ms]">•</span>
      <span className="animate-pulse [animation-delay:300ms]">•</span>
      <span className="animate-pulse [animation-delay:600ms]">•</span>
    </span>
  );
}

export function TypingIndicator({
  userNames = [],
  compact,
  className,
}: TypingIndicatorProps) {
  if (!compact && userNames.length === 0) return null;

  const formatTypingText = () => {
    if (userNames.length === 1) {
      return `${userNames[0]} is typing`;
    } else if (userNames.length === 2) {
      return `${userNames[0]} and ${userNames[1]} are typing`;
    } else {
      return `${userNames.slice(0, -1).join(', ')}, and ${userNames[userNames.length - 1]} are typing`;
    }
  };

  if (compact) {
    return (
      <span
        className={cn(
          'text-sm text-muted-foreground italic inline-flex items-center gap-1',
          className,
        )}
      >
        <TypingDots />
      </span>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground',
        className,
      )}
    >
      <span>{formatTypingText()}</span>
      <TypingDots />
    </div>
  );
}
