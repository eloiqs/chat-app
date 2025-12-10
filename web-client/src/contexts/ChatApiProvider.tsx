import { createChatApi, type ChatApiClient } from '@/api/client';
import { createContext, useContext, type ReactNode } from 'react';
import { useCurrentUser } from './UserProvider';

interface ChatApiContextType {
  chatApi: ChatApiClient;
}

const ChatApiContext = createContext<ChatApiContextType | undefined>(undefined);

export function ChatApiProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useCurrentUser();
  const chatApi = createChatApi(currentUser.id);

  return (
    <ChatApiContext.Provider value={{ chatApi }}>
      {children}
    </ChatApiContext.Provider>
  );
}

export function useChatApi() {
  const context = useContext(ChatApiContext);
  if (context === undefined) {
    throw new Error('useChatApi must be used within a ChatApiProvider');
  }
  return context;
}
