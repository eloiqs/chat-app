import { AppLayout } from '@/components/layout/AppLayout';
import { ChatListItem } from '@/components/chat/ChatListItem';
import { chats } from '@/data/chats';

export function ChatListPage() {
  return (
    <AppLayout title="Chats">
      <div className="max-w-2xl mx-auto">
        <div className="space-y-3">
          {chats.map((chat) => (
            <ChatListItem key={chat.id} chat={chat} />
          ))}
        </div>

        {chats.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <p>No chats yet</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
