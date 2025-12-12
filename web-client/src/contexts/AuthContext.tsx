import { createContext, useContext, useState, type ReactNode } from 'react';
import type { User } from 'shared';

interface AuthContextType {
  login: (user: User) => void;
  logout: () => void;
  currentUser: User | null;
  onLogout: (callback: () => void) => () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
        const next = new Set(prev);
        next.delete(callback);
        return next;
      });
    };
  };

  return (
    <AuthContext.Provider value={{ login, logout, currentUser, onLogout }}>
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
