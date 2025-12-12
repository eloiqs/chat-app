import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Chat, NewMessageEvent } from 'shared';
import { useSocket } from '@/contexts/SocketProvider';
import { useCurrentUser } from '@/contexts/UserProvider';

/**
 * Subscribes to all user's chats and updates the chat list
 * when new messages arrive in any chat.
 */
export function useRealtimeChats(chats: Chat[]) {
  const { joinChat, leaveChat, onNewMessage } = useSocket();
  const { currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Join all chat rooms
    const chatIds = chats.map((chat) => chat.id);
    chatIds.forEach((chatId) => joinChat(chatId));

    // Listen for new messages in any chat
    const unsubscribe = onNewMessage((event: NewMessageEvent) => {
      // Skip messages from current user (handled optimistically)
      if (event.message.sender.id === currentUser.id) return;

      // Update the chat list with new last message and increment unread
      queryClient.setQueryData(['chats'], (oldChats: Chat[] | undefined) => {
        if (!oldChats) return oldChats;

        return oldChats.map((chat) => {
          if (chat.id !== event.chatId) return chat;

          return {
            ...chat,
            lastMessage: event.message,
            unreadCount: chat.unreadCount + 1,
          };
        });
      });
    });

    return () => {
      unsubscribe();
      chatIds.forEach((chatId) => leaveChat(chatId));
    };
  }, [chats, currentUser.id, joinChat, leaveChat, onNewMessage, queryClient]);
}
