import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ChatListItem } from '@/components/chat/ChatListItem';
import { chatApi } from '@/api/client';
import type { Chat } from '@/types/chat';

export function ChatListPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const data = await chatApi.getAllChats();
        setChats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load chats');
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, []);

  return (
    <AppLayout title="Chats">
      <div className="max-w-2xl mx-auto">
        {loading && (
          <div className="text-center text-muted-foreground py-12">
            <p>Loading chats...</p>
          </div>
        )}

        {error && (
          <div className="text-center text-destructive py-12">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
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
          </>
        )}
      </div>
    </AppLayout>
  );
}
