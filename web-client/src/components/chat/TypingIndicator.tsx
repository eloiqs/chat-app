interface TypingIndicatorProps {
  userNames: string[];
}

export function TypingIndicator({ userNames }: TypingIndicatorProps) {
  if (userNames.length === 0) return null;

  const formatTypingText = () => {
    if (userNames.length === 1) {
      return `${userNames[0]} is typing`;
    } else if (userNames.length === 2) {
      return `${userNames[0]} and ${userNames[1]} are typing`;
    } else {
      return `${userNames.slice(0, -1).join(', ')}, and ${userNames[userNames.length - 1]} are typing`;
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
      <span>{formatTypingText()}</span>
      <div className="flex gap-1">
        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>
          •
        </span>
        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>
          •
        </span>
        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>
          •
        </span>
      </div>
    </div>
  );
}
