import {
  AuthProvider,
  useAuth,
  useAuthUser,
  useChatApi,
} from '@/contexts/AuthContext';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { UserSelectionPage } from '@/pages/UserSelectionPage';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { LogOut, Send } from 'lucide-react';
import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from 'react';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useParams,
} from 'react-router-dom';
import type { Chat, User } from 'shared';
import { ChatListItem } from './components/chat/ChatListItem';
import { MessageBubble } from './components/chat/MessageBubble';
import { ErrorBoundary, useError } from './components/error-boundary';
import { AppLayout } from './components/layout/AppLayout';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Input } from './components/ui/input';
import { ScrollArea } from './components/ui/scroll-area';
import {
  FailedMessagesProvider,
  useFailedMessages,
} from './hooks/useFailedMessages';
import type { ClientMessage } from './types/types';

function ChatList({ chats, className }: { chats: Chat[]; className?: string }) {
  const viewportRef = useRef<HTMLDivElement>(null);

  const scrollToItem = (item: HTMLAnchorElement) => {
    viewportRef.current?.scrollTo({ top: item.offsetTop });
  };

  return (
    <ScrollArea className={className} viewportRef={viewportRef}>
      <div className="flex">
        <div className="w-0 grow">
          <div className="space-y-3">
            {chats.map((chat) => (
              <ChatListItem key={chat.id} chat={chat} onMatch={scrollToItem} />
            ))}
          </div>

          {chats.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <p>No chats yet</p>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

function ChatDasboardLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const { currentUser } = useAuthUser();

  return (
    <AppLayout title="Chat">
      <div className="flex flex-col h-full">
        <div className="mb-4 flex items-center justify-between shrink-0">
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
        <div className="flex-1 min-h-0">{children}</div>
      </div>
    </AppLayout>
  );
}

function useChats() {
  const { chatApi } = useChatApi();
  const { data, ...query } = useSuspenseQuery<Chat[]>({
    queryKey: ['chats'],
    queryFn: chatApi.getAllChats,
  });

  return { chats: data, ...query };
}

function useMarkChatAsRead({ chatId }: { chatId: string }) {
  const { chatApi } = useChatApi();
  const queryClient = useQueryClient();

  const { chats } = useChats();

  const { mutateAsync, ...mutation } = useMutation({
    mutationFn: chatApi.markChatAsRead,
    onMutate: () => {
      const originalChat = chats.find((c) => c.id === chatId);
      queryClient.setQueryData(['chats'], (state: Chat[]) => {
        return state.map((chat) =>
          chat.id === chatId ? { ...chat, unreadCount: 0 } : chat,
        );
      });
      return { originalChat };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
    onError: (_error, _variables, context) => {
      if (!context?.originalChat) return;
      queryClient.setQueryData(['chats'], (state: Chat[]) => {
        return state.map((chat) =>
          chat.id === chatId ? { ...context.originalChat } : chat,
        );
      });
    },
  });

  return [mutateAsync, mutation] as const;
}

function useOptimisticChatUpdate() {
  const queryClient = useQueryClient();

  return (chat: Chat) => {
    const originalChat = queryClient
      .getQueryData<Chat[]>(['chats'])
      ?.find((c) => c.id === chat.id);
    if (!originalChat) return;

    queryClient.setQueryData(['chats'], (state: Chat[]) => {
      return state.map((c: Chat) => (c.id === chat.id ? { ...c, ...chat } : c));
    });

    return {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['chats'] });
      },
      onError: () => {
        queryClient.setQueryData(['chats'], (state: Chat[]) => {
          return state.map((c: Chat) =>
            c.id === chat.id ? { ...originalChat } : c,
          );
        });
      },
    } as const;
  };
}

function ChatDashboard() {
  const { chatId } = useParams<{ chatId: string }>();
  const { chats } = useChats();

  if (chats.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <p>No chats yet</p>
      </div>
    );
  }

  if (!chatId) {
    return <Navigate to={`/chat/${chats[0].id}`} />;
  }

  return (
    <div className="flex gap-4 h-full">
      <ChatList className="w-80" chats={chats} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Outlet />
      </div>
    </div>
  );
}

ChatDashboard.Loading = function ChatDashboardLoading() {
  return (
    <div className="text-center text-muted-foreground py-12">
      <p>Loading chats...</p>
    </div>
  );
};

ChatDashboard.Error = function ChatDashboardError() {
  return (
    <div className="text-center text-destructive py-12">
      <p>Something went wrong</p>
    </div>
  );
};

function ChatDashboardPage() {
  return (
    <ChatDasboardLayout>
      <ErrorBoundary fallback={<ChatDashboard.Error />}>
        <Suspense fallback={<ChatDashboard.Loading />}>
          <ChatDashboard />
        </Suspense>
      </ErrorBoundary>
    </ChatDasboardLayout>
  );
}

export function MessageInput({
  sendMessageAction,
}: {
  sendMessageAction: (content: string) => Promise<ClientMessage>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const submitAction = async (formData: FormData) => {
    const message = formData.get('message');
    if (message && typeof message === 'string' && message.trim()) {
      formRef.current?.reset();

      sendMessageAction(message.trim());
    }
  };

  return (
    <form action={submitAction} className="flex gap-2" ref={formRef}>
      <Input
        type="text"
        name="message"
        placeholder="Type a message..."
        className="flex-1"
      />
      <Button type="submit" size="icon">
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}

function useMessages({ chatId }: { chatId: string }) {
  const { chatApi } = useChatApi();

  const { data, ...query } = useSuspenseQuery<ClientMessage[]>({
    queryKey: ['messages', chatId],
    queryFn: () => chatApi.getChatMessages(chatId),
  });

  const { failedMessages } = useFailedMessages(chatId);

  return { messages: [...data, ...failedMessages], ...query } as const;
}

function createOptimisticMessage(
  content: string,
  sender: User,
  chatId: string,
  sending = true,
): ClientMessage {
  const timestamp = new Date().toISOString();
  return {
    id: `optimistic-${timestamp}`,
    chatId,
    content,
    sender,
    timestamp,
    isCurrentUser: true,
    sending,
  };
}

function useSendMessage({
  chatId,
  onMutate,
}: {
  chatId: string;
  onMutate: (message: ClientMessage) =>
    | {
        onSuccess?: () => void;
        onError?: () => void;
      }
    | undefined;
}) {
  const { chatApi } = useChatApi();
  const { currentUser } = useAuthUser();
  const queryClient = useQueryClient();
  const { failedMessages, saveFailedMessage, deleteFailedMessage } =
    useFailedMessages(chatId);

  const { mutateAsync, ...mutation } = useMutation({
    mutationFn: (content: string) => chatApi.sendMessage(chatId, content),
    onMutate: (content) => {
      const message = createOptimisticMessage(content, currentUser, chatId);
      queryClient.setQueryData(
        ['messages', chatId],
        (state: ClientMessage[] = []) => {
          return state.concat([message]);
        },
      );
      const updatable = onMutate(message);
      return {
        message,
        onSuccess: updatable?.onSuccess,
        onError: updatable?.onError,
      };
    },
    onSuccess: (_message, _content, context) => {
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
      context.onSuccess?.();
    },
    onError: (_error, _content, context) => {
      if (!context?.message) return;
      queryClient.setQueryData(
        ['messages', chatId],
        (state: ClientMessage[]) => {
          if (!context?.message) return state;
          return state.filter((m) => m.id !== context.message.id);
        },
      );
      saveFailedMessage({ ...context.message, error: true, sending: false });
      context?.onError?.();
    },
  });

  const retry = (messageId: string) => {
    const failedMessage = cancel(messageId);
    if (!failedMessage) return;
    return mutateAsync(failedMessage.content);
  };

  const cancel = (messageId: string) => {
    const failedMessage = failedMessages.find((m) => m.id === messageId);
    if (!failedMessage) return;
    deleteFailedMessage(messageId);
    return failedMessage;
  };

  return [mutateAsync, { ...mutation, retry, cancel }] as const;
}

function ChatMessages({ chat }: { chat: Chat }) {
  const viewportRef = useRef<HTMLDivElement>(null);

  const { messages } = useMessages({ chatId: chat.id });

  const [markChatAsRead] = useMarkChatAsRead({ chatId: chat.id });

  const updateChat = useOptimisticChatUpdate();

  const [sendMessage, { retry: retrySendMessage, cancel: cancelSendMessage }] =
    useSendMessage({
      chatId: chat.id,
      onMutate: (message) => {
        const updatable = updateChat({
          ...chat,
          lastMessage: message,
        });
        if (!updatable) return;
        return updatable;
      },
    });

  useEffect(() => {
    if (!chat.unreadCount) return;
    markChatAsRead(chat.id);
  }, [chat.id, chat.unreadCount, markChatAsRead]);

  useLayoutEffect(() => {
    viewportRef.current?.scroll({
      behavior: 'instant',
      top: viewportRef.current.scrollHeight,
    });
  }, [messages.length]);

  return (
    <Card className="flex-1 flex flex-col overflow-hidden">
      <ScrollArea className="flex-1 p-4" viewportRef={viewportRef}>
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onRetry={message.error ? retrySendMessage : undefined}
            onDelete={message.error ? cancelSendMessage : undefined}
          />
        ))}

        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}
      </ScrollArea>
      <div className="border-t p-4">
        <MessageInput sendMessageAction={sendMessage} />
      </div>
    </Card>
  );
}

ChatMessages.Loading = function ChatMessagesLoading() {
  return null;
};

ChatMessages.Error = function ChatMessagesError() {
  const { error } = useError();

  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <p className="text-muted-foreground mb-2">{error}</p>
    </div>
  );
};

function ChatBox({ chat }: { chat: Chat }) {
  return (
    <ErrorBoundary fallback={<ChatMessages.Error />}>
      <Suspense fallback={<ChatMessages.Loading />}>
        <ChatMessages chat={chat} />
      </Suspense>
    </ErrorBoundary>
  );
}

function ChatBoxOutlet() {
  const { chatId } = useParams<{ chatId: string }>();
  const { chats } = useChats();
  const chat = chats.find((c) => c.id === chatId);

  if (!chat) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-muted-foreground mb-2">Chat not found</p>
      </div>
    );
  }

  return <ChatBox chat={chat} />;
}

function AppRoutes() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <UserSelectionPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/chat" />} />
      <Route path="/chat" element={<ChatDashboardPage />}>
        <Route path=":chatId?" element={<ChatBoxOutlet />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

const queryClient = new QueryClient();

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <FailedMessagesProvider>
            <AppRoutes />
          </FailedMessagesProvider>
        </QueryClientProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
