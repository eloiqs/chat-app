import { MessageBubble } from '@/components/chat/MessageBubble';
import { ErrorBoundary, useError } from '@/components/error-boundary';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import type { OptimisticMessage } from '@/types/types';
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { Send } from 'lucide-react';
import {
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
  onSendMessage,
  sendMessagePending,
}: {
  onSendMessage: (content: string) => void;
  sendMessagePending: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = (event.target as HTMLFormElement).message.value;
    if (message && typeof message === 'string' && message.trim()) {
      formRef.current?.reset();
      onSendMessage(message);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex gap-2" ref={formRef}>
      <Input
        type="text"
        name="message"
        placeholder="Type a message..."
        className="flex-1"
      />
      <Button type="submit" size="icon" disabled={sendMessagePending}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}

function ChatBox() {
  const { chatId } = useParams<{ chatId: string }>();
  const { currentUser, chatApi } = useAuth();
  const queryClient = useQueryClient();
  const viewportRef = useRef<HTMLDivElement>(null);

  const { data: chat } = useSuspenseQuery({
    queryKey: ['chat', chatId],
    queryFn: () => chatApi.getChatById(chatId!),
    networkMode: 'always',
  });

  const { data: messages } = useSuspenseQuery({
    queryKey: ['chatMessages', chatId],
    queryFn: () =>
      chatApi.getChatMessages(chatId!) as Promise<OptimisticMessage[]>,
    networkMode: 'always',
  });

  const { mutate: sendMessage, isPending: sendMessagePending } = useMutation({
    mutationFn: async (content: string) => {
      return chatApi.sendMessage(chatId!, content);
    },
    onMutate: async (content: string) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({
        queryKey: ['chatMessages', chatId],
      });

      // Snapshot the previous messages
      const previousMessages =
        queryClient.getQueryData<OptimisticMessage[]>([
          'chatMessages',
          chatId,
        ]) || [];

      // Separate successful and failed messages
      const successfulMessages = previousMessages.filter((m) => !m.error);
      const failedMessages = previousMessages.filter((m) => m.error);

      // Create optimistic message
      const optimisticMessage: OptimisticMessage = {
        id: `optimistic-${Date.now()}`,
        chatId: chat.id,
        content,
        sender: currentUser!,
        timestamp: new Date().toISOString(),
        isCurrentUser: true,
        sending: true,
      };

      // Optimistically update the cache with failed messages at the bottom
      queryClient.setQueryData<OptimisticMessage[]>(
        ['chatMessages', chatId],
        [...successfulMessages, optimisticMessage, ...failedMessages],
      );

      // Return context with previous messages and optimistic message
      return { previousMessages, optimisticMessage };
    },
    onSuccess: (newMessage, _variables, context) => {
      // Replace the optimistic message with the real one, keeping failed messages at bottom
      queryClient.setQueryData<OptimisticMessage[]>(
        ['chatMessages', chatId],
        (old = []) => {
          const successfulMessages = old.filter(
            (m) => !m.error && m.id !== context?.optimisticMessage.id,
          );
          const failedMessages = old.filter((m) => m.error);
          return [...successfulMessages, newMessage, ...failedMessages];
        },
      );
    },
    onError: (_error, _variables, context) => {
      // Rollback to previous messages
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ['chatMessages', chatId],
          context.previousMessages,
        );
      }

      // Add the failed message back with error flag at the bottom
      const failedMessage: OptimisticMessage = {
        ...context!.optimisticMessage,
        error: true,
        sending: false,
      };

      queryClient.setQueryData<OptimisticMessage[]>(
        ['chatMessages', chatId],
        (old = []) => {
          const successfulMessages = old.filter((m) => !m.error);
          const failedMessages = old.filter((m) => m.error);
          return [...successfulMessages, ...failedMessages, failedMessage];
        },
      );
    },
  });

  useEffect(() => {
    chatApi.markChatAsRead(chatId!);
  }, [chatId, chatApi]);

  useLayoutEffect(() => {
    viewportRef.current?.scroll({
      behavior: 'instant',
      top: viewportRef.current.scrollHeight,
    });
  }, [messages?.length]);

  const onSendMessage = (content: string) => {
    if (!chatId) return;
    sendMessage(content);
  };

  const retryMessage = (messageId: string, content: string) => {
    // Remove the failed message from cache
    queryClient.setQueryData<OptimisticMessage[]>(
      ['chatMessages', chatId],
      (old = []) => old.filter((m) => m.id !== messageId),
    );

    // Retry sending the message
    sendMessage(content);
  };

  return (
    <Card className="flex-1 flex flex-col overflow-hidden">
      <ScrollArea className="flex-1 p-4" viewportRef={viewportRef}>
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onRetry={message.error ? retryMessage : undefined}
          />
        ))}

        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}
      </ScrollArea>

      <div className="border-t p-4">
        <MessageInput
          onSendMessage={onSendMessage}
          sendMessagePending={sendMessagePending}
        />
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

  const message =
    error && typeof error === 'object' && 'message' in error
      ? (error.message as string)
      : 'Unknown error';

  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <p className="text-muted-foreground mb-2">{message}</p>
    </div>
  );
};

export function ChatDetailPage() {
  return (
    <ChatDetailLayout>
      <ErrorBoundary fallback={<ChatBox.Error />}>
        <Suspense fallback={<ChatBox.Loading />}>
          <ChatBox />
        </Suspense>
      </ErrorBoundary>
    </ChatDetailLayout>
  );
}
