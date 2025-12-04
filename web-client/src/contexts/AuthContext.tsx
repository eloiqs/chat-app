import { createContext, useContext, useState, type ReactNode } from 'react';
import type { User } from 'shared';
import { createChatApi, type ChatApiClient } from '@/api/client';

interface AuthContextType {
  login: (user: User) => void;
  logout: () => void;
  currentUser: User | null;
  onLogout: (callback: () => void) => () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface UserContextType {
  currentUser: User;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface ChatApiContextType {
  chatApi: ChatApiClient;
}

const ChatApiContext = createContext<ChatApiContextType | undefined>(undefined);

const STORAGE_KEY = 'chat-app-user';

function getStoredUser(): User | null {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse stored user:', error);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }
  return null;
}

function UserProvider({ children, user }: { children: ReactNode; user: User }) {
  return (
    <UserContext.Provider value={{ currentUser: user }}>
      {children}
    </UserContext.Provider>
  );
}

export function useAuthUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useAuthUser must be used within an UserProvider');
  }
  return context;
}

function ChatApiProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuthUser();
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState(getStoredUser);
  const [logoutCallbacks, setLogoutCallbacks] = useState<Set<() => void>>(
    () => new Set(),
  );

  const login = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  };

  const logout = () => {
    logoutCallbacks.forEach((callback) => callback());
    setCurrentUser(null);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const onLogout = (callback: () => void) => {
    setLogoutCallbacks((prev) => new Set(prev).add(callback));
    return () => {
      setLogoutCallbacks((prev) => {
        console.log('logoutCallbacks', prev);
        const next = new Set(prev);
        next.delete(callback);
        return next;
      });
    };
  };

  return (
    <AuthContext.Provider value={{ login, logout, currentUser, onLogout }}>
      {currentUser ? (
        <UserProvider user={currentUser}>
          <ChatApiProvider>{children}</ChatApiProvider>
        </UserProvider>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
