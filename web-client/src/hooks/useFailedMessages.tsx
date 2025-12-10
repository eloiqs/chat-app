import { useState, useEffect, createContext, use, type ReactNode } from 'react';
import type { ClientMessage } from '@/types/types';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentUser } from '@/contexts/UserProvider';

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
  messagesByChatId: Record<string, ClientMessage[]>,
): void {
  const key = getStorageKey(userId, chatId);
  const messages = messagesByChatId[chatId];

  if (messages.length === 0) {
    sessionStorage.removeItem(key);
  } else {
    sessionStorage.setItem(key, JSON.stringify(messages));
  }
}

function clearAllFailedMessages(userId: string): void {
  console.log('clearAllFailedMessages', userId);
  const keys = Object.keys(sessionStorage);
  const prefix = `${STORAGE_KEY_PREFIX}-${userId}-`;

  keys.forEach((key) => {
    if (key.startsWith(prefix)) {
      sessionStorage.removeItem(key);
    }
  });
}

type FailedMessagesContext = {
  failedMessagesByChatId: Record<string, ClientMessage[]>;
  setFailedMessagesState: (
    updater: (
      prev: Record<string, ClientMessage[]>,
    ) => Record<string, ClientMessage[]>,
  ) => void;
  saveFailedMessage: (chatId: string, message: ClientMessage) => void;
  deleteFailedMessage: (chatId: string, messageId: string) => void;
};

const FailedMessagesContext = createContext<FailedMessagesContext | undefined>(
  undefined,
);

function useFailedMessagesContext() {
  const context = use(FailedMessagesContext);
  if (!context) {
    throw new Error(
      'useFailedMessagesContext must be used within a FailedMessagesProvider',
    );
  }
  return context;
}

export function FailedMessagesProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useCurrentUser();
  const { onLogout } = useAuth();

  const [failedMessagesByChatId, setFailedMessagesState] = useState<
    Record<string, ClientMessage[]>
  >({});

  const setFailedMessages = (
    chatId: string,
    updater: (
      prev: Record<string, ClientMessage[]>,
    ) => Record<string, ClientMessage[]>,
  ) => {
    setFailedMessagesState((prev) => {
      const newState = updater(prev);
      saveFailedMessagesToStorage(currentUser.id, chatId, newState);
      return newState;
    });
  };

  const saveFailedMessage = (chatId: string, message: ClientMessage) => {
    setFailedMessages(chatId, (prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] ?? []), message],
    }));
  };

  const deleteFailedMessage = (chatId: string, messageId: string) => {
    setFailedMessages(chatId, (prev) => ({
      ...prev,
      [chatId]: prev[chatId]?.filter((m) => m.id !== messageId),
    }));
  };

  // Register cleanup on logout
  useEffect(() => {
    onLogout(() => {
      clearAllFailedMessages(currentUser.id);
    });
  }, [currentUser.id, onLogout]);

  const value = {
    failedMessagesByChatId,
    setFailedMessagesState,
    saveFailedMessage,
    deleteFailedMessage,
  };

  return (
    <FailedMessagesContext.Provider value={value}>
      {children}
    </FailedMessagesContext.Provider>
  );
}

export function useFailedMessages(chatId: string) {
  const { currentUser } = useCurrentUser();
  const {
    failedMessagesByChatId,
    setFailedMessagesState,
    saveFailedMessage: saveMessage,
    deleteFailedMessage: deleteMessage,
  } = useFailedMessagesContext();

  useEffect(() => {
    setFailedMessagesState((prev) => ({
      ...prev,
      [chatId]: getFailedMessagesFromStorage(currentUser.id, chatId),
    }));
  }, [chatId]);

  const saveFailedMessage = (message: ClientMessage) => {
    saveMessage(chatId, message);
  };

  const deleteFailedMessage = (messageId: string) => {
    deleteMessage(chatId, messageId);
  };

  return {
    failedMessages: failedMessagesByChatId[chatId] ?? [],
    saveFailedMessage,
    deleteFailedMessage,
  };
}
