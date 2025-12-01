import { useEffect, useState } from 'react';
import type { Chat } from 'shared';
import { AppLayout } from '@/components/layout/AppLayout';
import { ChatListItem } from '@/components/chat/ChatListItem';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut } from 'lucide-react';

export function ChatListPage() {
  const { currentUser, logout, chatApi } = useAuth();
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
  }, [chatApi]);

  return (
    <AppLayout title="Chats">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
              {currentUser?.avatar || currentUser?.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{currentUser?.name}</p>
              <p className="text-sm text-muted-foreground">Logged in</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
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
