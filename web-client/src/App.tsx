import {
  AuthProvider,
  useAuth,
  useAuthUser,
  useChatApi,
} from '@/contexts/AuthContext';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { UserSelectionPage } from '@/pages/UserSelectionPage';
import { LogOut, Send } from 'lucide-react';
import {
  startTransition,
  Suspense,
  use,
  useEffect,
  useLayoutEffect,
  useOptimistic,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useOutletContext,
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
import { useFailedMessages } from './hooks/useFailedMessages';
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

type ChatDashboardOutletContext = {
  chats: Chat[];
  markChatAsReadAction: (chatId: string) => void;
};

function ChatDashboard({
  chatsPromise,
  refetchChats,
}: {
  chatsPromise: Promise<Chat[]>;
  refetchChats: () => void;
}) {
  const { chatId } = useParams<{ chatId: string }>();
  const { chatApi } = useChatApi();
  const chats = use(chatsPromise);

  const [optimisticChats, optimisticChatDispatch] = useOptimistic(
    chats,
    (
      state,
      action:
        | { type: 'markAsRead'; chat: Chat }
        | { type: 'rollback'; chat: Chat },
    ) => {
      switch (action.type) {
        case 'markAsRead':
          return state.map((c) =>
            c.id === action.chat.id ? { ...c, unreadCount: 0 } : c,
          );
        case 'rollback':
          return state.map((c) => (c.id === action.chat.id ? action.chat : c));
      }
    },
  );

  const markChatAsRead = (chat: Chat) => {
    optimisticChatDispatch({
      type: 'markAsRead',
      chat,
    });
    return () => {
      optimisticChatDispatch({
        type: 'rollback',
        chat,
      });
    };
  };

  if (!chatId && chats.length > 0) {
    return <Navigate to={`/chat/${chats[0].id}`} />;
  }

  const markChatAsReadAction = (chatId: string) => {
    const chat = optimisticChats.find((c) => c.id === chatId);
    if (!chat || chat.unreadCount === 0) return;
    startTransition(async () => {
      const rollback = markChatAsRead(chat);
      try {
        await chatApi.markChatAsRead(chatId);

        startTransition(() => {
          refetchChats();
        });
      } catch {
        rollback();
      }
    });
  };

  return (
    <div className="flex gap-4 h-full">
      <ChatList className="w-80" chats={optimisticChats} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Outlet
          context={
            {
              chats: optimisticChats,
              markChatAsReadAction,
            } satisfies ChatDashboardOutletContext
          }
        />
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
  const { chatApi } = useChatApi();
  const [chatPromise, setChatPromise] = useState(() => chatApi.getAllChats());

  const refetchChats = () => {
    setChatPromise(chatApi.getAllChats());
  };

  return (
    <ChatDasboardLayout>
      <ErrorBoundary fallback={<ChatDashboard.Error />}>
        <Suspense fallback={<ChatDashboard.Loading />}>
          <ChatDashboard
            chatsPromise={chatPromise}
            refetchChats={refetchChats}
          />
        </Suspense>
      </ErrorBoundary>
    </ChatDasboardLayout>
  );
}

export function MessageInput({
  sendMessageAction,
}: {
  sendMessageAction: (content: string) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const submitAction = async (formData: FormData) => {
    const message = formData.get('message');
    if (message && typeof message === 'string' && message.trim()) {
      formRef.current?.reset();

      await sendMessageAction(message.trim());
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

function createOptimisticMessage(
  content: string,
  sender: User,
  chatId: string,
): ClientMessage {
  const timestamp = new Date().toISOString();
  return {
    id: `optimistic-${timestamp}`,
    chatId,
    content,
    sender,
    timestamp,
    isCurrentUser: true,
    sending: true,
  };
}

function ChatMessages({
  chatId,
  messagesPromise,
  refetchMessages,
  onMessagesRead,
}: {
  chatId: string;
  messagesPromise: Promise<ClientMessage[]>;
  refetchMessages: () => void;
  onMessagesRead: (chatId: string) => void;
}) {
  const { currentUser } = useAuthUser();
  const { chatApi } = useChatApi();
  const viewportRef = useRef<HTMLDivElement>(null);
  const messages = use(messagesPromise);

  const {
    failedMessages,
    saveFailedMessage: addFailedMessage,
    deleteFailedMessage: removeFailedMessage,
  } = useFailedMessages(chatId);

  const [optimisticMessages, optimisticMessageDispatch] = useOptimistic(
    [...messages, ...failedMessages],
    (
      state,
      action: { type: 'add' | 'remove' | 'update'; message: ClientMessage },
    ) => {
      switch (action.type) {
        case 'add': {
          const messages = state.filter((m) => !m.error);
          const failedMessages = state.filter((m) => m.error);
          return [...messages, action.message, ...failedMessages];
        }
        case 'update':
          return state.map((m) =>
            m.id === action.message.id ? action.message : m,
          );
        case 'remove':
          return state.filter((m) => m.id !== action.message.id);
      }
    },
  );

  const addOptimisticMessage = (message: ClientMessage) => {
    optimisticMessageDispatch({ type: 'add', message });
  };
  const updateOptimisticMessage = (message: ClientMessage) => {
    optimisticMessageDispatch({ type: 'update', message });
  };
  const removeOptimisticMessage = (message: ClientMessage) => {
    optimisticMessageDispatch({ type: 'remove', message });
  };

  const sendMessageAction = async (content: string) => {
    const optimisticMessage = createOptimisticMessage(
      content,
      currentUser,
      chatId,
    );

    addOptimisticMessage(optimisticMessage);

    try {
      await chatApi.sendMessage(chatId, content);

      updateOptimisticMessage({ ...optimisticMessage, sending: false });

      startTransition(() => {
        refetchMessages();
      });
    } catch {
      startTransition(() => {
        removeOptimisticMessage(optimisticMessage);
        addFailedMessage({ ...optimisticMessage, error: true, sending: false });
      });
    }
  };

  const retryMessage = (messageId: string, content: string) => {
    removeFailedMessage(messageId);

    startTransition(async () => {
      await sendMessageAction(content);
    });
  };

  const deleteMessage = (messageId: string) => {
    removeFailedMessage(messageId);
  };

  useEffect(() => {
    onMessagesRead(chatId);
  }, [chatId, onMessagesRead]);

  useLayoutEffect(() => {
    viewportRef.current?.scroll({
      behavior: 'instant',
      top: viewportRef.current.scrollHeight,
    });
  }, [optimisticMessages.length]);

  return (
    <Card className="flex-1 flex flex-col overflow-hidden">
      <ScrollArea className="flex-1 p-4" viewportRef={viewportRef}>
        {optimisticMessages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onRetry={message.error ? retryMessage : undefined}
            onDelete={message.error ? deleteMessage : undefined}
          />
        ))}

        {optimisticMessages.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}
      </ScrollArea>
      <div className="border-t p-4">
        <MessageInput sendMessageAction={sendMessageAction} />
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

function ChatBox() {
  const { chatId } = useParams<{ chatId: string }>();
  const { chatApi } = useChatApi();
  const { chats, markChatAsReadAction } =
    useOutletContext<ChatDashboardOutletContext>();
  const chat = chats.find((c) => c.id === chatId);

  const [messagesPromise, setMessagesPromise] =
    useState<Promise<ClientMessage[]>>();

  useEffect(() => {
    startTransition(() => {
      setMessagesPromise(chatApi.getChatMessages(chatId!));
    });
  }, [chatId, chatApi]);

  if (!chat) {
    return <ChatMessages.Error />;
  }

  const refetchMessages = () => {
    setMessagesPromise(chatApi.getChatMessages(chatId!));
  };

  return (
    chatId &&
    messagesPromise && (
      <ErrorBoundary fallback={<ChatMessages.Error />}>
        <Suspense fallback={<ChatMessages.Loading />}>
          {
            <ChatMessages
              chatId={chatId}
              messagesPromise={messagesPromise}
              refetchMessages={refetchMessages}
              onMessagesRead={markChatAsReadAction}
            />
          }
        </Suspense>
      </ErrorBoundary>
    )
  );
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
        <Route path=":chatId?" element={<ChatBox />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
