import { type Chat } from '@/types/chat';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';

interface ChatListItemProps {
  chat: Chat;
}

export function ChatListItem({ chat }: ChatListItemProps) {
  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Link to={`/chat/${chat.id}`} className="block">
      <Card className="p-4 hover:bg-accent transition-colors cursor-pointer">
        <div className="flex items-start gap-4">
          <Avatar>
            <AvatarFallback>{chat.avatar}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-1">
              <h3 className="font-semibold truncate">{chat.name}</h3>
              <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                {formatTimestamp(chat.lastMessage?.timestamp)}
              </span>
            </div>

            <p className="text-sm text-muted-foreground truncate">
              {chat.lastMessage?.content || 'No messages yet'}
            </p>
          </div>

          {chat.unreadCount && chat.unreadCount > 0 && (
            <div className="flex-shrink-0 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
              {chat.unreadCount}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
