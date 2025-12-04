import { MessageBubble } from '@/components/chat/MessageBubble';
import { ErrorBoundary, useError } from '@/components/error-boundary';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuthUser, useChatApi } from '@/contexts/AuthContext';
import type { ClientMessage, User } from '@/types/types';
import { Send } from 'lucide-react';
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
import { useParams } from 'react-router-dom';

function ChatDetailLayout({ children }: { children: ReactNode }) {
  return (
    <AppLayout title="Chat">
      <div className="max-w-2xl mx-auto h-[calc(100vh-180px)] flex flex-col">
        {children}
      </div>
    </AppLayout>
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

function ChatBox({
  chatId,
  messagesPromise,
  refetchMessages,
}: {
  chatId: string;
  messagesPromise: Promise<ClientMessage[]>;
  refetchMessages: () => void;
}) {
  const { currentUser } = useAuthUser();
  const { chatApi } = useChatApi();
  const viewportRef = useRef<HTMLDivElement>(null);
  const messages = use(messagesPromise);

  const [failedMessages, setFailedMessages] = useState<ClientMessage[]>([]);

  const [optimisticMessages, optimisticMessageDispatch] = useOptimistic(
    [...messages, ...failedMessages],
    (
      state,
      action: { type: 'add' | 'remove' | 'update'; message: ClientMessage },
    ) => {
      switch (action.type) {
        case 'add':
          return [...state, action.message];
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
        setFailedMessages((state) => {
          return [
            ...state,
            { ...optimisticMessage, error: true, sending: false },
          ];
        });
      });
    }
  };

  const retryMessage = (messageId: string, content: string) => {
    setFailedMessages((state) => state.filter((m) => m.id !== messageId));

    startTransition(async () => {
      await sendMessageAction(content);
    });
  };

  useEffect(() => {
    chatApi.markChatAsRead(chatId);
  }, [chatId, chatApi]);

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

ChatBox.Loading = function ChatBoxLoading() {
  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <p className="text-muted-foreground">Loading chat...</p>
    </div>
  );
};

ChatBox.Error = function ChatBoxError() {
  const { error } = useError();

  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <p className="text-muted-foreground mb-2">{error}</p>
    </div>
  );
};

export function ChatDetailPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const { chatApi } = useChatApi();
  const [messagesPromise, setMessagesPromise] = useState(() =>
    chatApi.getChatMessages(chatId!),
  );

  const refetchMessages = () => {
    setMessagesPromise(chatApi.getChatMessages(chatId!));
  };

  if (!chatId) {
    // ChatDetailPage should only be rendered when there is a chatId in the URL
    throw new Error('chatId is undefined');
  }

  return (
    <ChatDetailLayout>
      <ErrorBoundary fallback={<ChatBox.Error />}>
        <Suspense fallback={<ChatBox.Loading />}>
          <ChatBox
            chatId={chatId}
            messagesPromise={messagesPromise}
            refetchMessages={refetchMessages}
          />
        </Suspense>
      </ErrorBoundary>
    </ChatDetailLayout>
  );
}
