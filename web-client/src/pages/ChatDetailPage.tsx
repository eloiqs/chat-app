import { MessageBubble } from '@/components/chat/MessageBubble';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { ErrorBoundary, useError } from '@/components/error-boundary';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuthUser } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import type { OptimisticMessage } from '@/types/types';
import type { Message } from 'shared';
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
  useState,
  type ReactNode,
} from 'react';
import { useParams } from 'react-router-dom';

function toOptimisticMessage(
  message: Message,
  currentUserId: string,
): OptimisticMessage {
  return {
    ...message,
    isCurrentUser: message.sender.id === currentUserId,
  };
}

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
  chatId,
  onSendMessage,
  sendMessagePending,
}: {
  chatId: string;
  onSendMessage: (content: string) => void;
  sendMessagePending: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { emitTyping } = useSocket();
  const { currentUser } = useAuthUser();

  const handleTyping = () => {
    // Emit typing started
    emitTyping(chatId, currentUser.id, true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to emit typing stopped after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(chatId, currentUser.id, false);
    }, 2000);
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = (event.target as HTMLFormElement).message.value;
    if (message && typeof message === 'string' && message.trim()) {
      formRef.current?.reset();

      // Stop typing indicator immediately on send
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      emitTyping(chatId, currentUser.id, false);

      onSendMessage(message);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup: stop typing indicator on unmount
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      emitTyping(chatId, currentUser.id, false);
    };
  }, [chatId, currentUser.id, emitTyping]);

  return (
    <form onSubmit={onSubmit} className="flex gap-2" ref={formRef}>
      <Input
        type="text"
        name="message"
        placeholder="Type a message..."
        className="flex-1"
        onChange={handleTyping}
      />
      <Button type="submit" size="icon" disabled={sendMessagePending}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}

function ChatBox() {
  const { chatId } = useParams<{ chatId: string }>();
  const { currentUser, chatApi } = useAuthUser();
  const queryClient = useQueryClient();
  const viewportRef = useRef<HTMLDivElement>(null);
  const { joinChat, leaveChat, onUserTyping, onNewMessage } = useSocket();
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(
    new Map(),
  );

  const { data: chat } = useSuspenseQuery({
    queryKey: ['chat', chatId],
    queryFn: () => chatApi.getChatById(chatId!),
    networkMode: 'always',
  });

  const { data: messages } = useSuspenseQuery({
    queryKey: ['chatMessages', chatId],
    queryFn: async () => {
      const msgs = await chatApi.getChatMessages(chatId!);
      return msgs.map((m) => toOptimisticMessage(m, currentUser.id));
    },
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
        sender: currentUser,
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
          return [
            ...successfulMessages,
            toOptimisticMessage(newMessage, currentUser.id),
            ...failedMessages,
          ];
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

  // Join chat room and listen for real-time events
  useEffect(() => {
    if (!chatId) return;

    joinChat(chatId);

    // Listen for typing indicators
    const unsubscribeTyping = onUserTyping((data) => {
      if (data.chatId !== chatId || data.userId === currentUser.id) return;

      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (data.isTyping) {
          next.set(data.userId, data.userName);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    });

    // Listen for new messages
    const unsubscribeNewMessage = onNewMessage((data) => {
      if (data.chatId !== chatId) return;

      // Skip messages from the current user (already handled by optimistic updates)
      if (data.message.sender.id === currentUser.id) return;

      // Update the messages in the query cache
      queryClient.setQueryData<OptimisticMessage[]>(
        ['chatMessages', chatId],
        (old = []) => {
          // Check if message already exists (avoid duplicates)
          if (old.some((m) => m.id === data.message.id)) {
            return old;
          }
          return [...old, toOptimisticMessage(data.message, currentUser.id)];
        },
      );
    });

    return () => {
      leaveChat(chatId);
      unsubscribeTyping();
      unsubscribeNewMessage();
    };
  }, [
    chatId,
    currentUser.id,
    joinChat,
    leaveChat,
    onUserTyping,
    onNewMessage,
    queryClient,
  ]);

  useEffect(() => {
    chatApi.markChatAsRead(chatId!);
  }, [chatId, chatApi]);

  useLayoutEffect(() => {
    viewportRef.current?.scroll({
      behavior: 'instant',
      top: viewportRef.current.scrollHeight,
    });
  }, [messages?.length, typingUsers.size]);

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

        {/* Show typing indicator */}
        <TypingIndicator userNames={Array.from(typingUsers.values())} />
      </ScrollArea>

      <div className="border-t p-4">
        <MessageInput
          chatId={chatId!}
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
