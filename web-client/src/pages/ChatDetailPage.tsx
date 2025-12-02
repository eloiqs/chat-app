import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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

export function ChatDetailPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { chatApi } = useAuth();

  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChatData = async () => {
      if (!chatId) {
        setError('No chat ID provided');
        setLoading(false);
        return;
      }

      try {
        const [chatData, messages] = await Promise.all([
          chatApi.getChatById(chatId),
          chatApi.getChatMessages(chatId)
        ]);
        setChat(chatData);
        setMessages(messages);

        // Mark all messages in this chat as read (fire and forget, ignore errors)
        chatApi.markChatAsRead(chatId).catch(() => {
          // Silently ignore errors
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load chat');
      } finally {
        setLoading(false);
      }
    };

    fetchChatData();
  }, [chatId, chatApi]);

  if (loading) {
    return (
      <AppLayout title="Loading...">
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-muted-foreground">Loading chat...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !chat) {
    return (
      <AppLayout title="Chat Not Found">
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-muted-foreground mb-2">
            {error}
          </p>
          <Button onClick={() => navigate('/')}>
            Back to Chats
          </Button>
        </div>
      </AppLayout>
    );
  }

  const handleSendMessage = async (content: string) => {
    if (!chatId) return;

    try {
      const newMessage = await chatApi.sendMessage(chatId, content);
      setMessages([...messages, newMessage]);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const isGroupChat = chat.participants.length > 1;
  const participantNames = chat.participants.map((p) => p.name).join(', ');
  const displayTitle = isGroupChat && chat.name ? chat.name : participantNames;

  const chatTitle = (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {chat.participants.slice(0, 3).map((participant) => (
          <Avatar
            key={participant.id}
            className="border-2 border-background h-10 w-10"
          >
            <AvatarFallback>
              {participant.avatar ||
                participant.name.slice(0, 2).toUpperCase()}
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

  return (
    <AppLayout title={chatTitle}>
      <div className="max-w-2xl mx-auto h-[calc(100vh-180px)] flex flex-col">
        <div className="mb-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Chats
            </Button>
          </Link>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                <p>No messages yet. Start the conversation!</p>
              </div>
            )}
          </ScrollArea>

          <div className="border-t p-4">
            <MessageInput onSendMessage={handleSendMessage} />
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
