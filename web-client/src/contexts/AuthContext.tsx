import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useMemo,
} from 'react';
import type { User } from 'shared';
import { createChatApi, type ChatApiClient } from '@/api/client';

interface AuthContextType {
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
  isLoading: boolean;
  chatApi: ChatApiClient;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'chat-app-user';

function getStoredUser(): User | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse stored user:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser);
  const isLoading = false;

  const login = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const chatApi = useMemo(
    () => createChatApi(currentUser?.id || null),
    [currentUser?.id],
  );

  return (
    <AuthContext.Provider
      value={{ currentUser, login, logout, isLoading, chatApi }}
    >
      {children}
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
