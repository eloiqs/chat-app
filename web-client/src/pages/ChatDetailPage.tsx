import {
  useEffect,
  use,
  useOptimistic,
  Suspense,
  type ReactNode,
  useState,
  startTransition,
  useRef,
  useLayoutEffect,
} from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Chat, Message } from 'shared';
import { AppLayout } from '@/components/layout/AppLayout';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageInput } from '@/components/chat/MessageInput';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ErrorBoundary, useError } from '@/components/error-boundary';
import type { OptimisticMessage } from '@/types/types';

function ChatDetailLayout({
  children,
  title,
}: {
  children: ReactNode;
  title: ReactNode;
}) {
  return (
    <AppLayout title={title}>
      <div className="max-w-2xl mx-auto h-[calc(100vh-180px)] flex flex-col">
        <div className="mb-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Chats
            </Button>
          </Link>
        </div>

        {children}
      </div>
    </AppLayout>
  );
}

function ChatDetailTitle({ chatPromise }: { chatPromise: Promise<Chat> }) {
  const chat = use(chatPromise);
  const isGroupChat = chat.participants.length > 1;
  const participantNames = chat.participants.map((p) => p.name).join(', ');
  const displayTitle = isGroupChat && chat.name ? chat.name : participantNames;

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {chat.participants.slice(0, 3).map((participant) => (
          <Avatar
            key={participant.id}
            className="border-2 border-background h-10 w-10"
          >
            <AvatarFallback>
              {participant.avatar || participant.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
        {chat.participants.length > 3 && (
          <div className="w-10 h-10 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
            +{chat.participants.length - 3}
          </div>
        )}
      </div>
      <div className="flex flex-col min-w-0">
        <h1 className="text-2xl font-bold truncate">{displayTitle}</h1>
        {isGroupChat && chat.name && (
          <p className="text-sm text-muted-foreground truncate">
            {participantNames}
          </p>
        )}
      </div>
    </div>
  );
}

function ChatDetailTitleUnknown() {
  return (
    <div className="h-10 flex items-center">
      <h1 className="text-2xl font-bold truncate">Chat</h1>
    </div>
  );
}

ChatDetailTitle.Loading = ChatDetailTitleUnknown;
ChatDetailTitle.Error = ChatDetailTitleUnknown;

function ChatBox({
  chatPromise,
  messagesPromise,
  onMessageSent,
}: {
  chatPromise: Promise<Chat>;
  messagesPromise: Promise<Message[]>;
  onMessageSent: () => void;
}) {
  const { chatId } = useParams<{ chatId: string }>();
  const { currentUser, chatApi } = useAuth();
  const viewportRef = useRef<HTMLDivElement>(null);
  const chat = use(chatPromise);
  const messages = use(messagesPromise);

  const [clientMessages, setClientMessages] =
    useState<OptimisticMessage[]>(messages);

  useEffect(() => {
    setClientMessages((prevMessages) => {
      // Preserve any failed messages from the previous state
      const failedMessages = prevMessages.filter((m) => m.error);
      return [...messages, ...failedMessages];
    });
  }, [messages]);

  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    clientMessages,
    (state, message: Message) => {
      return state.concat(message);
    },
  );

  useEffect(() => {
    chatApi.markChatAsRead(chatId!);
  }, [chatId, chatApi]);

  useLayoutEffect(() => {
    viewportRef.current?.scroll({
      behavior: 'instant',
      top: viewportRef.current.scrollHeight,
    });
  }, [optimisticMessages.length]);

  const sendMessageAction = async (content: string) => {
    if (!chatId) return;

    const timestamp = new Date().toISOString();
    const optimisticMessage: OptimisticMessage = {
      id: `optimistic-${timestamp}`,
      chatId: chat.id,
      content: content,
      sender: currentUser!,
      timestamp,
      isCurrentUser: true,
      sending: true,
    };
    addOptimisticMessage(optimisticMessage);

    try {
      await chatApi.sendMessage(chatId, content);
      startTransition(() => {
        onMessageSent();
      });
    } catch {
      // persist the optimistic message in error state on the client to allow retries
      startTransition(() => {
        setClientMessages((state) =>
          state.concat({ ...optimisticMessage, error: true, sending: false }),
        );
      });
    }
  };

  const retryMessage = (messageId: string, content: string) => {
    // Remove the failed message from clientMessages
    setClientMessages((state) => state.filter((m) => m.id !== messageId));

    // Retry sending the message
    startTransition(async () => {
      await sendMessageAction(content);
    });
  };

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
  const { chatId } = useParams<{ chatId: string }>();
  const { chatApi } = useAuth();

  const chatPromise = chatApi.getChatById(chatId!);
  const [messagesPromise, setMessagesPromise] = useState(() =>
    chatApi.getChatMessages(chatId!),
  );

  const refetchMessages = () =>
    setMessagesPromise(chatApi.getChatMessages(chatId!).catch());

  return (
    <ChatDetailLayout
      title={
        <ErrorBoundary fallback={<ChatDetailTitle.Error />}>
          <Suspense fallback={<ChatDetailTitle.Loading />}>
            <ChatDetailTitle chatPromise={chatPromise} />
          </Suspense>
        </ErrorBoundary>
      }
    >
      <ErrorBoundary fallback={<ChatBox.Error />}>
        <Suspense fallback={<ChatBox.Loading />}>
          <ChatBox
            chatPromise={chatPromise}
            messagesPromise={messagesPromise}
            onMessageSent={refetchMessages}
          />
        </Suspense>
      </ErrorBoundary>
    </ChatDetailLayout>
  );
}
