import { Suspense } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ChatListItem } from '@/components/chat/ChatListItem';
import { Button } from '@/components/ui/button';
import { useAuth, useAuthUser } from '@/contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import { useSuspenseQuery } from '@tanstack/react-query';

function ChatList() {
  const { chatApi } = useAuthUser();

  const { data: chats } = useSuspenseQuery({
    queryKey: ['chats'],
    queryFn: () => chatApi.getAllChats(),
    networkMode: 'always',
  });

  return (
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
  );
}

ChatList.Loading = () => {
  return (
    <div className="text-center text-muted-foreground py-12">
      <p>Loading chats...</p>
    </div>
  );
};

ChatList.Error = () => {
  return (
    <div className="text-center text-destructive py-12">
      <p>Something went wrong</p>
    </div>
  );
};

export function ChatListPage() {
  const { logout } = useAuth();
  const { currentUser } = useAuthUser();

  return (
    <AppLayout title="Chats">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
              {currentUser.avatar || currentUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{currentUser.name}</p>
              <p className="text-sm text-muted-foreground">Logged in</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
        <ErrorBoundary fallback={<ChatList.Error />}>
          <Suspense fallback={<ChatList.Loading />}>
            <ChatList />
          </Suspense>
        </ErrorBoundary>
      </div>
    </AppLayout>
  );
}
