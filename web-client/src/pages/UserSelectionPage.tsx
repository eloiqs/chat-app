import { useState, useEffect } from 'react';
import type { User } from 'shared';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getAllUsers } from '@/api/client';
import { useQuery } from '@tanstack/react-query';

export function UserSelectionPage() {
  const { login } = useAuth();

  const {
    data: users,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      return await getAllUsers();
    },
  });

  const handleSelectUser = (user: User) => {
    login(user);
  };

  if (isLoading) {
    return (
      <AppLayout title="Select User">
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Select User">
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-destructive mb-4">
            {typeof error === 'string' ? error : error.message}
          </p>
        </div>
      </AppLayout>
    );
  }

  if (!users) {
    throw new Error('users is undefined');
  }

  return (
    <AppLayout title="Select User">
      <div className="max-w-2xl mx-auto py-12">
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
                    <p className="text-sm text-muted-foreground">
                      ID: {user.id}
                    </p>
                  </div>
                </div>
                <Button onClick={() => handleSelectUser(user)}>Select</Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
