import { useState, useEffect } from 'react';
import type { ClientMessage } from '@/types/types';
import { useAuth, useAuthUser } from '@/contexts/AuthContext';

const STORAGE_KEY_PREFIX = 'chat-failed-messages';

function getStorageKey(userId: string, chatId: string): string {
  return `${STORAGE_KEY_PREFIX}-${userId}-${chatId}`;
}

function getFailedMessagesFromStorage(
  userId: string,
  chatId: string,
): ClientMessage[] {
  const key = getStorageKey(userId, chatId);
  const stored = sessionStorage.getItem(key);

  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse stored failed messages:', error);
      sessionStorage.removeItem(key);
    }
  }

  return [];
}

function saveFailedMessagesToStorage(
  userId: string,
  chatId: string,
  messages: ClientMessage[],
): void {
  const key = getStorageKey(userId, chatId);

  if (messages.length === 0) {
    sessionStorage.removeItem(key);
  } else {
    sessionStorage.setItem(key, JSON.stringify(messages));
  }
}

export function clearAllFailedMessages(userId: string): void {
  console.log('clearAllFailedMessages', userId);
  const keys = Object.keys(sessionStorage);
  const prefix = `${STORAGE_KEY_PREFIX}-${userId}-`;

  keys.forEach((key) => {
    if (key.startsWith(prefix)) {
      sessionStorage.removeItem(key);
    }
  });
}

export function useFailedMessages(chatId: string) {
  const { currentUser } = useAuthUser();
  const { onLogout } = useAuth();

  const [failedMessages, setFailedMessagesState] = useState<ClientMessage[]>(
    () => getFailedMessagesFromStorage(currentUser.id, chatId),
  );

  const setFailedMessages = (
    updater: ClientMessage[] | ((prev: ClientMessage[]) => ClientMessage[]),
  ) => {
    setFailedMessagesState((prev) => {
      const newState = typeof updater === 'function' ? updater(prev) : updater;
      saveFailedMessagesToStorage(currentUser.id, chatId, newState);
      return newState;
    });
  };

  const saveFailedMessage = (message: ClientMessage) => {
    setFailedMessages((prev) => [...prev, message]);
  };

  const deleteFailedMessage = (messageId: string) => {
    setFailedMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  const clearFailedMessages = () => {
    setFailedMessages([]);
  };

  // Register cleanup on logout
  useEffect(() => {
    onLogout(() => {
      clearAllFailedMessages(currentUser.id);
    });
  }, [currentUser.id, onLogout]);

  return {
    failedMessages,
    setFailedMessages,
    saveFailedMessage,
    deleteFailedMessage,
    clearFailedMessages,
  };
}
