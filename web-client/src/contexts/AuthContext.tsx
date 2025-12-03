import { createContext, useContext, useState, type ReactNode } from 'react';
import type { User } from 'shared';
import { createChatApi, type ChatApiClient } from '@/api/client';

interface AuthContextType {
  login: (user: User) => void;
  logout: () => void;
  currentUser: User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface UserContextType {
  currentUser: User;
  chatApi: ChatApiClient;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

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
    <UserContext.Provider
      value={{ currentUser: user, chatApi: createChatApi(user.id) }}
    >
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState(getStoredUser);

  const login = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ login, logout, currentUser }}>
      {currentUser ? (
        <UserProvider user={currentUser}>{children}</UserProvider>
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
