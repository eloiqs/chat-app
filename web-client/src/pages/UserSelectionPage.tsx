import { getAllUsers } from '@/api/client';
import { ErrorBoundary } from '@/components/error-boundary';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Suspense, use, useState } from 'react';
import type { User } from 'shared';

function UserSelectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout title="Select User">
      <div className="max-w-2xl mx-auto py-12">{children}</div>
    </AppLayout>
  );
}

export function UserSelection({
  usersPromise,
}: {
  usersPromise: Promise<User[]>;
}) {
  const { login } = useAuth();
  const users = use(usersPromise);

  const handleSelectUser = (user: User) => {
    login(user);
  };

  if (!users) {
    throw new Error('users is undefined');
  }

  return (
    <>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold mb-2">Welcome to Chat App</h2>
        <p className="text-muted-foreground">Select a user to continue</p>
      </div>

      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user.id} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-semibold">
                  {user.avatar || user.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-sm text-muted-foreground">ID: {user.id}</p>
                </div>
              </div>
              <Button onClick={() => handleSelectUser(user)}>Select</Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

UserSelection.Loading = function UserSelectionPageLoading() {
  return <p>Loading users...</p>;
};

UserSelection.Error = function UserSelectionPageError() {
  return <p>Something went wrong</p>;
};

export function UserSelectionPage() {
  const [usersPromise] = useState(() => getAllUsers());
  return (
    <UserSelectionLayout>
      <ErrorBoundary fallback={<UserSelection.Error />}>
        <Suspense fallback={<UserSelection.Loading />}>
          <UserSelection usersPromise={usersPromise} />
        </Suspense>
      </ErrorBoundary>
    </UserSelectionLayout>
  );
}
