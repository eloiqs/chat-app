import { createContext, useContext, type ReactNode } from 'react';
import type { User } from 'shared';

interface UserContextType {
  currentUser: User;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({
  children,
  user,
}: {
  children: ReactNode;
  user: User;
}) {
  return (
    <UserContext.Provider value={{ currentUser: user }}>
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useCurrentUser must be used within an UserProvider');
  }
  return context;
}
