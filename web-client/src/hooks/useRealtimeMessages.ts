import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { NewMessageEvent } from 'shared';
import { useSocket } from '@/contexts/SocketProvider';
import { useCurrentUser } from '@/contexts/UserProvider';
import { toMessage } from '@/api/utils';
import type { ClientMessage } from '@/types/types';

/**
 * Updates the messages query cache when new messages arrive for the active chat.
 * Note: Room joining is handled by useRealtimeChats at the dashboard level.
 */
export function useRealtimeMessages(chatId: string) {
  const { onNewMessage } = useSocket();
  const { currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Listen for new messages in this chat
    const unsubscribe = onNewMessage((event: NewMessageEvent) => {
      if (event.chatId !== chatId) return;

      // Skip if the message is from the current user (we handle it optimistically)
      if (event.message.sender.id === currentUser.id) return;

      // Add the new message to the query cache
      queryClient.setQueryData(
        ['messages', chatId],
        (oldMessages: ClientMessage[] = []) => {
          // Avoid duplicates
          if (oldMessages.some((m) => m.id === event.message.id)) {
            return oldMessages;
          }
          return [...oldMessages, toMessage(event.message, currentUser.id)];
        },
      );
    });

    return () => {
      unsubscribe();
    };
  }, [chatId, currentUser.id, onNewMessage, queryClient]);
}
