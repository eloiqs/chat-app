import { MessageBubble } from '@/components/chat/MessageBubble';
import { ErrorBoundary, useError } from '@/components/error-boundary';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuthUser, useChatApi } from '@/contexts/AuthContext';
import type { ClientMessage, User } from '@/types/types';
import { useFailedMessages } from '@/hooks/useFailedMessages';
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { Send } from 'lucide-react';
import {
  startTransition,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
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
  sendMessage,
}: {
  sendMessage: (content: string) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const submitAction = async (formData: FormData) => {
    const message = formData.get('message');
    if (message && typeof message === 'string' && message.trim()) {
      formRef.current?.reset();

      sendMessage(message.trim());
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

function ChatBox({ chatId }: { chatId: string }) {
  const { currentUser } = useAuthUser();
  const { chatApi } = useChatApi();
  const queryClient = useQueryClient();
  const viewportRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useSuspenseQuery({
    queryKey: ['messages', chatId],
    queryFn: () => chatApi.getChatMessages(chatId),
  });

  const { failedMessages, addFailedMessage, removeFailedMessage } =
    useFailedMessages(chatId);

  const optimisticMessages = [...messages, ...failedMessages];

  const { mutate: sendMessage } = useMutation({
    mutationFn: (content: string) => chatApi.sendMessage(chatId, content),
    onMutate: (content) => {
      const optimisticMessage = createOptimisticMessage(
        content,
        currentUser,
        chatId,
      );
      queryClient.setQueryData(
        ['messages', chatId],
        (state: ClientMessage[]) => {
          return [...state, optimisticMessage];
        },
      );
      return { optimisticMessage };
    },
    onSuccess: (message, _variables, context) => {
      queryClient.setQueryData(
        ['messages', chatId],
        (state: ClientMessage[]) => {
          return state.map((m) =>
            m.id === context.optimisticMessage.id ? message : m,
          );
        },
      );
      queryClient.invalidateQueries({
        queryKey: ['messages', chatId],
      });
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      queryClient.setQueryData(
        ['messages', chatId],
        (state: ClientMessage[]) => {
          return state.filter((m) => m.id !== context.optimisticMessage.id);
        },
      );
      addFailedMessage({
        ...context.optimisticMessage,
        error: true,
        sending: false,
      });
    },
  });

  const retryMessage = (messageId: string, content: string) => {
    removeFailedMessage(messageId);

    startTransition(() => {
      sendMessage(content);
    });
  };

  const deleteMessage = (messageId: string) => {
    removeFailedMessage(messageId);
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
        <MessageInput sendMessage={sendMessage} />
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

export function ChatDetailPageWithTanstack() {
  const { chatId } = useParams<{ chatId: string }>();

  if (!chatId) {
    // ChatDetailPage should only be rendered when there is a chatId in the URL
    throw new Error('chatId is undefined');
  }

  return (
    <ChatDetailLayout>
      <ErrorBoundary fallback={<ChatBox.Error />}>
        <Suspense fallback={<ChatBox.Loading />}>
          <ChatBox chatId={chatId} />
        </Suspense>
      </ErrorBoundary>
    </ChatDetailLayout>
  );
}
