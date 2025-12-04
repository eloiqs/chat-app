import { MessageBubble } from '@/components/chat/MessageBubble';
import { useError } from '@/components/error-boundary';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuthUser, useChatApi } from '@/contexts/AuthContext';
import { useFailedMessages } from '@/hooks/useFailedMessages';
import type { ClientMessage, User } from '@/types/types';
import { Send } from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type FormEvent,
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

  const submitAction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = event.currentTarget.message.value;
    if (message && typeof message === 'string' && message.trim()) {
      formRef.current?.reset();

      await sendMessageAction(message.trim());
    }
  };

  return (
    <form onSubmit={submitAction} className="flex gap-2" ref={formRef}>
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
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);

  const { failedMessages, saveFailedMessage, deleteFailedMessage } =
    useFailedMessages(chatId);

  const [optimisticMessages, optimisticMessageDispatch] = useReducer(
    (
      state,
      action:
        | { type: 'sync'; messages: ClientMessage[] }
        | { type: 'add'; message: ClientMessage }
        | { type: 'update'; messageId: string; message: ClientMessage }
        | { type: 'remove'; messageId: string },
    ) => {
      switch (action.type) {
        case 'sync': {
          return [...action.messages, ...failedMessages];
        }
        case 'add': {
          const messages = state.filter((m) => !m.error);
          return [...messages, action.message, ...failedMessages];
        }
        case 'update':
          return state.map((m) =>
            m.id === action.messageId ? action.message : m,
          );
        case 'remove':
          return state.filter((m) => m.id !== action.messageId);
      }
    },
    [...failedMessages],
  );

  const syncOptimisticMessages = (messages: ClientMessage[]) => {
    optimisticMessageDispatch({ type: 'sync', messages });
  };

  const addOptimisticMessage = (message: ClientMessage) => {
    optimisticMessageDispatch({ type: 'add', message });
  };

  const updateOptimisticMessage = (
    messageId: string,
    message: ClientMessage,
  ) => {
    optimisticMessageDispatch({ type: 'update', messageId, message });
  };

  const removeOptimisticMessage = (messageId: string) => {
    optimisticMessageDispatch({ type: 'remove', messageId });
  };

  const fetchMessages = async (isRefetch = false) => {
    if (!isRefetch) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const messages = await chatApi.getChatMessages(chatId);
      syncOptimisticMessages(messages);
    } catch (error) {
      if (!isRefetch) {
        setError(error);
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, [chatId, fetchMessages]);

  const sendMessageAction = async (content: string) => {
    const optimisticMessage = createOptimisticMessage(
      content,
      currentUser,
      chatId,
    );

    addOptimisticMessage(optimisticMessage);

    try {
      const newMessage = await chatApi.sendMessage(chatId, content);

      updateOptimisticMessage(optimisticMessage.id, newMessage);

      fetchMessages(true);
    } catch {
      const failedMessage = {
        ...optimisticMessage,
        error: true,
        sending: false,
      };
      saveFailedMessage(failedMessage);
      updateOptimisticMessage(optimisticMessage.id, failedMessage);
    }
  };

  const retryMessage = async (messageId: string, content: string) => {
    deleteFailedMessage(messageId);
    removeOptimisticMessage(messageId);

    await sendMessageAction(content);
  };

  const deleteMessage = (messageId: string) => {
    deleteFailedMessage(messageId);
    removeOptimisticMessage(messageId);
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

  if (isLoading) {
    return <ChatBox.Loading />;
  }

  if (error) {
    return <ChatBox.Error />;
  }

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

export function ChatDetailPageLegacy() {
  const { chatId } = useParams<{ chatId: string }>();

  if (!chatId) {
    // ChatDetailPage should only be rendered when there is a chatId in the URL
    throw new Error('chatId is undefined');
  }

  return (
    <ChatDetailLayout>
      <ChatBox chatId={chatId} />
    </ChatDetailLayout>
  );
}
